export interface Manager {
  name: string;
  tenure_years: number;
  funds_managed: number;
  changed_last_12mo: boolean;
  linkedin?: string;
}

export interface Fund {
  id: string;
  name: string;
  amc: string;
  category: string;
  aum_cr: number;
  expense_ratio: number;
  inception_date: string;
  nav: number;
  returns: { "1y": number | null; "3y": number | null; "5y": number | null };
  category_avg_returns: { "1y": number | null; "3y": number | null; "5y": number | null };
  rolling_consistency_3y_pct: number | null;
  max_drawdown_5y_pct: number;
  recovery_months: number;
  manager: Manager;
  managers?: Manager[];
  style: {
    declared: string;
    actual: string;
    r_squared: number;
    match: "strict" | "moderate" | "drifted";
    basis: string;
  };
  concentration: {
    top_10_pct: number;
    num_stocks: number;
    top_sector_pct: number;
  };
  nav_history_3y: number[];
}

export interface FilterState {
  categories: string[];
  aum: [number, number];
  expense: [number, number];
  fundAge: number;
  consistency: number;
  rollingWindow: "1Y" | "3Y" | "5Y";
  minCagr: number;
  maxDd: number;
  recovery: number;
  hideNoDd: boolean;
  mgrTenure: number;
  excludeRecentChange: boolean;
  styleMatch: string[];
  styleBasis: string;
  top10: [number, number];
  numStocks: [number, number];
  topSector: [number, number];
}

export interface SortState {
  col: string;
  dir: "asc" | "desc";
}

export interface TweaksState {
  accent: string;
  density: "compact" | "normal" | "comfortable";
  tableFontSize: number;
  sparklines: boolean;
  zebra: boolean;
  railWidth: number;
}
