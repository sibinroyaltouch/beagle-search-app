
export interface CompanyInfo {
  name: string;
  website: string;
  linkedin: string;
  country: string;
  state: string;
  industry: string;
}

export interface SearchResult {
  no: number;
  company: CompanyInfo;
}

export interface GeminiResponse {
  companies: CompanyInfo[];
}

export interface SearchHistoryEntry {
  id: string;
  date: string;
  query: string;
  results: CompanyInfo[];
}
