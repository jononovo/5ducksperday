import type { EmailSearchStrategy, EmailSearchContext, EmailSearchResult } from '../types';
import { validateEmailPattern, isValidBusinessEmail } from '../../../results-analysis/email-analysis';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Define social platforms to search
const SOCIAL_PLATFORMS = [
  {
    name: 'LinkedIn',
    baseUrl: 'https://www.linkedin.com',
    searchEndpoint: '/company'
  },
  {
    name: 'Twitter',
    baseUrl: 'https://twitter.com',
    searchEndpoint: '/search'
  }
  // Add more platforms as needed
];

export const socialProfileStrategy: EmailSearchStrategy = {
  name: "Social Profile Search",
  description: "Extract email addresses from public social media profiles",

  async execute(context: EmailSearchContext): Promise<EmailSearchResult> {
    const { companyName, companyWebsite } = context;
    const foundEmails = new Set<string>();
    const searchResults: Record<string, any> = {};

    try {
      for (const platform of SOCIAL_PLATFORMS) {
        try {
          const searchUrl = `${platform.baseUrl}${platform.searchEndpoint}`;
          const response = await axios.get(searchUrl, {
            params: { q: companyName },
            timeout: context.timeout || 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; EmailDiscoveryBot/1.0)',
              'Accept': 'text/html'
            }
          });

          if (response.status === 200) {
            const $ = cheerio.load(response.data);
            
            // Look for email patterns in bio sections, contact info, etc.
            const emailRegex = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
            const pageText = $('body').text();
            const matches = pageText.match(emailRegex) || [];

            matches.forEach(email => {
              const lowercaseEmail = email.toLowerCase();
              if (isValidBusinessEmail(lowercaseEmail) && validateEmailPattern(lowercaseEmail) >= 50) {
                foundEmails.add(lowercaseEmail);
              }
            });

            // Also look for "mailto:" links
            $('a[href^="mailto:"]').each((_, element) => {
              const href = $(element).attr('href');
              if (href) {
                const email = href.replace('mailto:', '').split('?')[0].toLowerCase();
                if (isValidBusinessEmail(email)) {
                  foundEmails.add(email);
                }
              }
            });

            searchResults[platform.name] = {
              success: true,
              emailsFound: matches.length
            };
          }
        } catch (error) {
          console.error(`Error searching ${platform.name}:`, error);
          searchResults[platform.name] = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }

      return {
        source: "social_profile",
        emails: Array.from(foundEmails),
        metadata: {
          searchDate: new Date().toISOString(),
          companyName,
          companyWebsite,
          platformsSearched: searchResults,
          totalEmailsFound: foundEmails.size
        }
      };

    } catch (error) {
      console.error(`Social profile search failed for ${companyName}:`, error);
      return {
        source: "social_profile",
        emails: [],
        metadata: {
          searchDate: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
};
