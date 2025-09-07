import type { EmailSearchStrategy, EmailSearchContext, EmailSearchResult } from '../types';
import { validateEmailPattern, isValidBusinessEmail } from '../../../results-analysis/email-analysis';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Extracts email addresses from HTML content using various techniques
 */
async function extractEmailsFromHtml(html: string, domain: string): Promise<Set<string>> {
  const $ = cheerio.load(html);
  const foundEmails = new Set<string>();

  // Direct email extraction from text content
  const emailRegex = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
  const pageText = $('body').text();
  const matches = pageText.match(emailRegex) || [];

  matches.forEach(email => {
    const lowercaseEmail = email.toLowerCase();
    if (isValidBusinessEmail(lowercaseEmail) && !foundEmails.has(lowercaseEmail)) {
      foundEmails.add(lowercaseEmail);
    }
  });

  // Extract from mailto links
  $('a[href^="mailto:"]').each((_, element) => {
    const href = $(element).attr('href');
    if (href) {
      const email = href.replace('mailto:', '').split('?')[0].toLowerCase();
      if (isValidBusinessEmail(email)) {
        foundEmails.add(email);
      }
    }
  });

  return foundEmails;
}

/**
 * Follows links to likely contact pages
 */
async function findContactPages($: cheerio.CheerioAPI, baseUrl: string): Promise<string[]> {
  const contactUrls = new Set<string>();
  const contactKeywords = ['contact', 'about', 'team', 'people', 'staff'];

  $('a').each((_, element) => {
    const href = $(element).attr('href');
    const text = $(element).text().toLowerCase();

    if (href && contactKeywords.some(keyword => text.includes(keyword))) {
      try {
        const url = new URL(href, baseUrl);
        if (url.hostname === new URL(baseUrl).hostname) {
          contactUrls.add(url.href);
        }
      } catch (e) {
        // Skip invalid URLs
      }
    }
  });

  return Array.from(contactUrls);
}

export const websiteCrawlerStrategy: EmailSearchStrategy = {
  name: "Website Crawler",
  description: "Extracts email addresses from company website and related pages",

  async execute(context: EmailSearchContext): Promise<EmailSearchResult> {
    const { companyName, companyWebsite, maxDepth = 2 } = context;

    if (!companyWebsite) {
      return {
        source: "website_crawler",
        emails: [],
        metadata: {
          searchDate: new Date().toISOString(),
          error: "No website URL provided"
        }
      };
    }

    try {
      const allEmails = new Set<string>();
      const crawledPages = new Set<string>();
      const pagesToCrawl = [companyWebsite];
      const domain = new URL(companyWebsite).hostname;

      // Breadth-first crawl of the website
      for (let depth = 0; depth < maxDepth && pagesToCrawl.length > 0; depth++) {
        const currentPage = pagesToCrawl.shift();
        if (!currentPage || crawledPages.has(currentPage)) continue;

        try {
          console.log(`Crawling page: ${currentPage}`);
          const response = await axios.get(currentPage, {
            timeout: context.timeout || 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; EmailDiscoveryBot/1.0)',
              'Accept': 'text/html'
            }
          });

          crawledPages.add(currentPage);

          if (response.headers['content-type']?.includes('text/html')) {
            const $ = cheerio.load(response.data);

            // Extract emails from current page
            const foundEmails = await extractEmailsFromHtml(response.data, domain);
            foundEmails.forEach(email => allEmails.add(email));

            // Find contact pages to crawl next
            if (depth < maxDepth - 1) {
              const contactUrls = await findContactPages($, currentPage);
              contactUrls.forEach(url => {
                if (!crawledPages.has(url)) {
                  pagesToCrawl.push(url);
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error crawling ${currentPage}:`, error);
          // Continue with next page
        }
      }

      return {
        source: "website_crawler",
        emails: Array.from(allEmails),
        metadata: {
          searchDate: new Date().toISOString(),
          url: companyWebsite,
          crawledPages: Array.from(crawledPages),
          crawlDepth: maxDepth,
          totalPagesScanned: crawledPages.size,
          emailsFound: allEmails.size
        }
      };

    } catch (error) {
      console.error(`Website crawler failed for ${companyName}:`, error);
      return {
        source: "website_crawler",
        emails: [],
        metadata: {
          searchDate: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          url: companyWebsite
        }
      };
    }
  }
};