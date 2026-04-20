import type { NextApiRequest, NextApiResponse } from 'next';
import { MOCK_FUNDS } from '@/lib/mock-funds';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to fetch from database if DATABASE_URL is configured
    if (process.env.DATABASE_URL) {
      const { getFunds } = await import('@/lib/db');
      const funds = await getFunds();
      if (funds.length > 0) {
        return res.json({ funds, source: 'db', count: funds.length });
      }
    }
  } catch (err) {
    // Database not configured or error — fall through to mock data
    console.warn('Database fetch failed, using mock data:', err);
  }

  // Return mock data
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.json({ funds: MOCK_FUNDS, source: 'mock', count: MOCK_FUNDS.length });
}
