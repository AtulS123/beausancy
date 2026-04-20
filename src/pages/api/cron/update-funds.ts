import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllSchemes, getSchemeData, isRelevantCategory, normalizeCategory, delay } from '@/lib/mfapi';
import { computeCAGR, computeRollingConsistency, computeMaxDrawdown, computeRecoveryMonths, get3YNavHistory, computeFundAge } from '@/lib/compute';

// This cron job is called by Vercel Cron (configured in vercel.json)
// and requires a Bearer token matching the CRON_SECRET env variable.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify authorization
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }

  try {
    const { sql, SCHEMA } = await import('@/lib/db');

    // Ensure schema exists
    await sql(SCHEMA);

    // Fetch all schemes from MFAPI
    console.log('[cron] Fetching all schemes from MFAPI...');
    const allSchemes = await getAllSchemes();
    console.log(`[cron] Got ${allSchemes.length} schemes`);

    // Fetch individual scheme data with rate limiting
    let processed = 0, errors = 0;
    const BATCH_SIZE = 50;
    const DELAY_MS = 200;

    // Process in batches
    for (let i = 0; i < Math.min(allSchemes.length, 1000); i += BATCH_SIZE) {
      const batch = allSchemes.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (scheme) => {
        try {
          const data = await getSchemeData(scheme.schemeCode);
          if (!data || !data.data || data.data.length < 12) return;
          if (!isRelevantCategory(data.meta.scheme_category)) return;

          const navData = data.data;
          const category = normalizeCategory(data.meta.scheme_category);
          const cagr1y = computeCAGR(navData, 1);
          const cagr3y = computeCAGR(navData, 3);
          const cagr5y = computeCAGR(navData, 5);
          const consistency = computeRollingConsistency(navData, 3);
          const maxDD = computeMaxDrawdown(navData, 5);
          const recovery = computeRecoveryMonths(navData);
          const navHistory = get3YNavHistory(navData);
          const currentNav = navData[0] ? parseFloat(navData[0].nav) : 0;

          // Estimate inception date from oldest data point
          const oldestDate = navData[navData.length - 1]?.date ?? new Date().toISOString().slice(0,10);

          const fundRecord = {
            id: String(scheme.schemeCode),
            name: data.meta.scheme_name,
            amc: data.meta.fund_house,
            category,
            aum_cr: null as unknown as number, // Not available in MFAPI free tier
            expense_ratio: null as unknown as number, // Not available in MFAPI free tier
            inception_date: oldestDate,
            nav: currentNav,
            returns: JSON.stringify({ "1y": cagr1y, "3y": cagr3y, "5y": cagr5y }),
            category_avg_returns: JSON.stringify({ "1y": null, "3y": null, "5y": null }),
            rolling_consistency_3y_pct: consistency,
            max_drawdown_5y_pct: maxDD,
            recovery_months: recovery,
            manager: JSON.stringify({
              name: "Unknown",
              tenure_years: computeFundAge(oldestDate),
              funds_managed: 1,
              changed_last_12mo: false
            }),
            style: JSON.stringify({
              declared: category,
              actual: category,
              r_squared: 0.8,
              match: "moderate",
              basis: "Blend"
            }),
            concentration: JSON.stringify({
              top_10_pct: 0,
              num_stocks: 0,
              top_sector_pct: 0
            }),
            nav_history_3y: JSON.stringify(navHistory),
          };

          await sql`
            INSERT INTO funds (id, name, amc, category, aum_cr, expense_ratio, inception_date, nav,
              returns, category_avg_returns, rolling_consistency_3y_pct, max_drawdown_5y_pct,
              recovery_months, manager, style, concentration, nav_history_3y, updated_at)
            VALUES (
              ${fundRecord.id}, ${fundRecord.name}, ${fundRecord.amc}, ${fundRecord.category},
              ${fundRecord.aum_cr}, ${fundRecord.expense_ratio}, ${fundRecord.inception_date},
              ${fundRecord.nav}, ${fundRecord.returns}::jsonb, ${fundRecord.category_avg_returns}::jsonb,
              ${fundRecord.rolling_consistency_3y_pct}, ${fundRecord.max_drawdown_5y_pct},
              ${fundRecord.recovery_months}, ${fundRecord.manager}::jsonb,
              ${fundRecord.style}::jsonb, ${fundRecord.concentration}::jsonb,
              ${fundRecord.nav_history_3y}::jsonb, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name, amc = EXCLUDED.amc, category = EXCLUDED.category,
              nav = EXCLUDED.nav, returns = EXCLUDED.returns,
              rolling_consistency_3y_pct = EXCLUDED.rolling_consistency_3y_pct,
              max_drawdown_5y_pct = EXCLUDED.max_drawdown_5y_pct,
              recovery_months = EXCLUDED.recovery_months,
              nav_history_3y = EXCLUDED.nav_history_3y,
              updated_at = NOW()
          `;

          processed++;
        } catch (err) {
          errors++;
          if (errors < 10) console.error(`[cron] Error processing scheme ${scheme.schemeCode}:`, err);
        }
      }));

      await delay(DELAY_MS);
      console.log(`[cron] Processed batch ${i/BATCH_SIZE + 1}, total: ${processed} funds`);
    }

    return res.json({
      ok: true,
      processed,
      errors,
      message: `Updated ${processed} funds with ${errors} errors`
    });

  } catch (err) {
    console.error('[cron] Fatal error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
