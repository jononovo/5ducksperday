import type { IN8nUISettings } from 'n8n-workflow';

export const N8N_PORT = 5678;
export const N8N_WEBHOOK_PATH = '/webhook';
export const N8N_HOST = `http://localhost:${N8N_PORT}`;
export const N8N_API_PATH = '/api/v1';

export const n8nConfig = {
  endpoint: `${N8N_HOST}${N8N_API_PATH}`,
  workflows: {
    companySearch: {
      name: 'Company Search',
      path: '/workflows/company-search'
    },
    companyAnalysis: {
      name: 'Company Analysis',
      path: '/workflows/company-analysis'
    }
  }
};