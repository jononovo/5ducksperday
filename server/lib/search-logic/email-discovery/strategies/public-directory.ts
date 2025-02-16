import type { EmailSearchStrategy, EmailSearchContext, EmailSearchResult } from '../types';
import { validateEmailPattern, isValidBusinessEmail } from '../../../results-analysis/email-analysis';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Common business directories where contact information might be found
const BUSINESS_DIRECTORIES = [
  {
    name: 'Better Business Bureau',
    baseUrl: 'https://www.bbb.org',
    searchEndpoint: '/search',
    selector: '.business-contact'
  },
  {
    name: 'Chamber of Commerce',
    baseUrl: 'https://www.chamberofcommerce.com',
    searchEndpoint: '/search',
    selector: '.member-contact'
  }
  // Add more directories as needed
];

export const publicDirectoryStrategy: EmailSearchStrategy = {
  name: "Public Directory Search",
  description: "Search public business directories and listing sites",

  async execute(context: EmailSearchContext): Promise<EmailSearchResult> {
    const { companyName, companyWebsite } = context;
    const foundEmails = new Set<string>();
    const searchResults: Record<string, any> = {};

    try {
      for (const directory of BUSINESS_DIRECTORIES) {
        try {
          // Search for the company in the directory
          const searchUrl = `${directory.baseUrl}${directory.searchEndpoint}`;
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
            
            // Extract emails using common patterns
            const emailRegex = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
            const pageText = $(directory.selector).text();
            const matches = pageText.match(emailRegex) || [];

            matches.forEach(email => {
              const lowercaseEmail = email.toLowerCase();
              if (isValidBusinessEmail(lowercaseEmail) && validateEmailPattern(lowercaseEmail) >= 50) {
                foundEmails.add(lowercaseEmail);
              }
            });

            searchResults[directory.name] = {
              success: true,
              emailsFound: matches.length
            };
          }
        } catch (error) {
          console.error(`Error searching ${directory.name}:`, error);
          searchResults[directory.name] = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }

      return {
        source: "public_directory",
        emails: Array.from(foundEmails),
        metadata: {
          searchDate: new Date().toISOString(),
          companyName,
          companyWebsite,
          directoriesSearched: searchResults,
          totalEmailsFound: foundEmails.size
        }
      };

    } catch (error) {
      console.error(`Public directory search failed for ${companyName}:`, error);
      return {
        source: "public_directory",
        emails: [],
        metadata: {
          searchDate: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
};
