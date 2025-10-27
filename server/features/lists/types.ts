export interface SearchListRequest {
  companies: Array<{ id: number }>;
  prompt: string;
  contactSearchConfig?: {
    enableCustomSearch?: boolean;
    customSearchTarget?: string;
    enableCustomSearch2?: boolean;
    customSearchTarget2?: string;
  };
}

export interface UpdateSearchListRequest extends SearchListRequest {
  // All same fields as create
}

export interface SearchListResponse {
  listId: number;
  prompt: string;
  resultCount: number;
  customSearchTargets?: string[] | null;
  userId: number;
  createdAt?: Date;
}

export interface SearchListWithCompanies extends SearchListResponse {
  companies: Array<{
    id: number;
    name: string;
    description?: string;
    createdAt?: Date;
  }>;
}