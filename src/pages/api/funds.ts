import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try database first if configured
    if (process.env.DATABASE_URL) {
      const { getFunds } = await import('@/lib/db');
      const funds = await getFunds();
      if (funds.length > 0) {
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        return res.json({ funds, source: 'db', count: funds.length });
      }
    }
  } catch (err) {
    console.warn('Database fetch failed:', err);
  }

  try {
    // Use static real data file (updated daily by pipeline)
    const filePath = path.join(process.cwd(), 'public', 'data', 'funds.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const funds = JSON.parse(raw);
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.json({ funds, source: 'static', count: funds.length });
  } catch (err) {
    console.warn('Static file read failed:', err);
  }

  // Final fallback: mock data
  const { MOCK_FUNDS } = await import('@/lib/mock-funds');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.json({ funds: MOCK_FUNDS, source: 'mock', count: MOCK_FUNDS.length });
}
