export interface EmailSearchContext {
  companyName: string;
  companyWebsite?: string;
  companyDomain?: string;
  maxDepth?: number;
  timeout?: number;
}

export interface EmailSearchResult {
  source: string;
  emails: string[];
  metadata: {
    searchDate: string;
    error?: string;
    [key: string]: any;
  };
}

export interface EmailSearchStrategy {
  name: string;
  description: string;
  execute(context: EmailSearchContext): Promise<EmailSearchResult>;
}
