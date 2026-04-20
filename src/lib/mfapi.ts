export interface MFAPIScheme {
  schemeCode: number;
  schemeName: string;
  fundHouse: string;
}

export interface MFAPINAVData {
  date: string;
  nav: string;
}

export interface MFAPIResponse {
  meta: {
    fund_house: string;
    scheme_type: string;
    scheme_category: string;
    scheme_code: number;
    scheme_name: string;
  };
  data: MFAPINAVData[];
  status: string;
}

const BASE = 'https://api.mfapi.in';

export async function getAllSchemes(): Promise<MFAPIScheme[]> {
  const res = await fetch(`${BASE}/mf`);
  if (!res.ok) throw new Error(`Failed to fetch schemes: ${res.status}`);
  return res.json();
}

export async function getSchemeData(code: number): Promise<MFAPIResponse> {
  const res = await fetch(`${BASE}/mf/${code}`);
  if (!res.ok) throw new Error(`Failed to fetch scheme ${code}: ${res.status}`);
  return res.json();
}

// Helper: delay for rate limiting
export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Filter relevant equity/hybrid categories
export const RELEVANT_CATEGORIES = [
  "Large Cap Fund",
  "Mid Cap Fund",
  "Small Cap Fund",
  "Flexi Cap Fund",
  "Multi Cap Fund",
  "Large & Mid Cap Fund",
  "ELSS",
  "Hybrid",
  "Index Funds",
  "Sectoral/ Thematic",
  "Contra Fund",
  "Value Fund",
  "Focused Fund",
  "Dividend Yield Fund",
];

export function isRelevantCategory(category: string): boolean {
  return RELEVANT_CATEGORIES.some(c => category.toLowerCase().includes(c.toLowerCase())) ||
    category.includes("Equity") ||
    category.includes("ELSS");
}

export function normalizeCategory(apiCategory: string): string {
  const c = apiCategory.toLowerCase();
  if (c.includes("large cap")) return "Large Cap";
  if (c.includes("mid cap")) return "Mid Cap";
  if (c.includes("small cap")) return "Small Cap";
  if (c.includes("flexi cap") || c.includes("multi cap")) return "Flexi Cap";
  if (c.includes("elss")) return "ELSS";
  if (c.includes("hybrid") || c.includes("balanced") || c.includes("asset allocation")) return "Hybrid";
  if (c.includes("index") || c.includes("etf")) return "Index";
  return "Others";
}
