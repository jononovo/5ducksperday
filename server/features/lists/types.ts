export interface ListRequest {
  companies: Array<{ id: number }>;
  prompt: string;
  contactSearchConfig?: {
    enableCustomSearch?: boolean;
    customSearchTarget?: string;
    enableCustomSearch2?: boolean;
    customSearchTarget2?: string;
  };
}

export interface UpdateListRequest extends ListRequest {
  // All same fields as create
}

export interface ListResponse {
  listId: number;
  name: string;
  prompt: string;
  resultCount: number;
  customSearchTargets?: string[] | null;
  userId: number;
  createdAt?: Date;
}

export interface ListWithCompanies extends ListResponse {
  companies: Array<{
    id: number;
    name: string;
    description?: string;
    createdAt?: Date;
  }>;
}