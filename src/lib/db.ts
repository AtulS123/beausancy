import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export { sql };

export async function getFunds(): Promise<any[]> {
  const rows = await sql`SELECT * FROM funds ORDER BY rolling_consistency_3y_pct DESC NULLS LAST`;
  return rows.map(row => ({
    ...row,
    returns: row.returns,
    category_avg_returns: row.category_avg_returns,
    manager: row.manager,
    style: row.style,
    concentration: row.concentration,
    nav_history_3y: row.nav_history_3y,
  }));
}

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS funds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amc TEXT NOT NULL,
  category TEXT NOT NULL,
  aum_cr NUMERIC,
  expense_ratio NUMERIC,
  inception_date DATE,
  nav NUMERIC,
  returns JSONB,
  category_avg_returns JSONB,
  rolling_consistency_3y_pct NUMERIC,
  max_drawdown_5y_pct NUMERIC,
  recovery_months INTEGER,
  manager JSONB,
  managers JSONB,
  style JSONB,
  concentration JSONB,
  nav_history_3y JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);
`;
