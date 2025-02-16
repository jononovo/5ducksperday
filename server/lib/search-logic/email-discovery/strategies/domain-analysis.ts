import type { EmailSearchStrategy, EmailSearchContext, EmailSearchResult } from '../types';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);

interface DomainAnalysisMetadata {
  searchDate: string;
  domain: string;
  hasMxRecords: boolean;
  mxRecords?: dns.MxRecord[];
  spfRecord?: string;
  dmarcRecord?: string;
  error?: string;
}

export const domainAnalysisStrategy: EmailSearchStrategy = {
  name: "Domain Analysis",
  description: "Analyze domain MX records and email configurations",

  async execute(context: EmailSearchContext): Promise<EmailSearchResult> {
    const { companyName, companyDomain } = context;

    if (!companyDomain) {
      return {
        source: "domain_analysis",
        emails: [],
        metadata: {
          searchDate: new Date().toISOString(),
          error: "No company domain provided"
        }
      };
    }

    try {
      const metadata: DomainAnalysisMetadata = {
        searchDate: new Date().toISOString(),
        domain: companyDomain,
        hasMxRecords: false
      };

      // Check MX records
      try {
        const mxRecords = await resolveMx(companyDomain);
        metadata.hasMxRecords = mxRecords.length > 0;
        metadata.mxRecords = mxRecords;
      } catch (error) {
        metadata.hasMxRecords = false;
      }

      // Check SPF record
      try {
        const txtRecords = await resolveTxt(companyDomain);
        const spfRecord = txtRecords.flat().find(record => record.startsWith('v=spf1'));
        if (spfRecord) {
          metadata.spfRecord = spfRecord;
        }
      } catch (error) {
        // SPF record check failed, continue
      }

      // Check DMARC record
      try {
        const dmarcRecords = await resolveTxt(`_dmarc.${companyDomain}`);
        const dmarcRecord = dmarcRecords.flat().find(record => record.startsWith('v=DMARC1'));
        if (dmarcRecord) {
          metadata.dmarcRecord = dmarcRecord;
        }
      } catch (error) {
        // DMARC record check failed, continue
      }

      // If we have MX records, the domain is capable of receiving email
      return {
        source: "domain_analysis",
        emails: [], // Domain analysis doesn't find specific emails
        metadata
      };

    } catch (error) {
      console.error(`Domain analysis failed for ${companyName}:`, error);
      return {
        source: "domain_analysis",
        emails: [],
        metadata: {
          searchDate: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          domain: companyDomain
        }
      };
    }
  }
};
