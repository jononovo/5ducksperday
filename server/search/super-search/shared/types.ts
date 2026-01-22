export interface CustomColumn {
  key: string;
  label: string;
  description?: string;
}

export interface SearchPlan {
  targetCount: number;
  columns: CustomColumn[];
  searchStrategy: string;
  reasoning?: string;
}

export interface TableRow {
  name: string;
  website?: string;
  description?: string;
  customFields: Record<string, string | number | null>;
}

export interface SuperSearchTableResult {
  plan: SearchPlan;
  rows: TableRow[];
  citations?: string[];
}

export type StreamEvent = 
  | { type: 'plan'; data: SearchPlan }
  | { type: 'status'; data: string }
  | { type: 'row'; data: TableRow }
  | { type: 'complete'; data: SuperSearchTableResult }
  | { type: 'error'; data: string };

export interface SuperSearchRequest {
  query: string;
  variant?: string;
}

export interface SuperSearchVariant {
  name: string;
  description: string;
  execute(query: string, onEvent: (event: StreamEvent) => void): Promise<SuperSearchTableResult>;
}
