/**
 * Standalone data pipeline script for GitHub Actions.
 * Run with: npm run update-funds
 *
 * Requires: DATABASE_URL environment variable
 */

import { getAllSchemes, getSchemeData, isRelevantCategory, normalizeCategory, delay } from '../src/lib/mfapi';
import { computeCAGR, computeRollingConsistency, computeMaxDrawdown, computeRecoveryMonths, get3YNavHistory, computeFundAge } from '../src/lib/compute';

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('[update-funds] DATABASE_URL environment variable is required');
    process.exit(1);
  }

  // Dynamic import to avoid issues with module resolution
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(DATABASE_URL);

  // Ensure schema
  const SCHEMA = `
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

  console.log('[update-funds] Ensuring schema...');
  await sql(SCHEMA);

  // Fetch all schemes
  console.log('[update-funds] Fetching scheme list from MFAPI.in...');
  let allSchemes;
  try {
    allSchemes = await getAllSchemes();
    console.log(`[update-funds] Found ${allSchemes.length} schemes`);
  } catch (err) {
    console.error('[update-funds] Failed to fetch schemes:', err);
    process.exit(1);
  }

  let processed = 0, skipped = 0, errors = 0;
  const BATCH_SIZE = 20;
  const DELAY_MS = 300;
  const MAX_FUNDS = parseInt(process.env.MAX_FUNDS || '500');

  console.log(`[update-funds] Processing up to ${MAX_FUNDS} funds in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < Math.min(allSchemes.length, MAX_FUNDS); i += BATCH_SIZE) {
    const batch = allSchemes.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(batch.map(async (scheme) => {
      try {
        const data = await getSchemeData(scheme.schemeCode);

        if (!data || !data.data || data.data.length < 12) {
          skipped++;
          return;
        }

        if (!isRelevantCategory(data.meta.scheme_category)) {
          skipped++;
          return;
        }

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
        const oldestDate = navData[navData.length - 1]?.date ?? new Date().toISOString().slice(0,10);

        const fundRecord = {
          id: String(scheme.schemeCode),
          name: data.meta.scheme_name,
          amc: data.meta.fund_house,
          category,
          inception_date: oldestDate,
          nav: currentNav,
          returns: JSON.stringify({ "1y": cagr1y, "3y": cagr3y, "5y": cagr5y }),
          category_avg_returns: JSON.stringify({ "1y": null, "3y": null, "5y": null }),
          rolling_consistency_3y_pct: consistency,
          max_drawdown_5y_pct: maxDD,
          recovery_months: recovery,
          manager: JSON.stringify({
            name: "Fund Manager",
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
          INSERT INTO funds (
            id, name, amc, category, inception_date, nav,
            returns, category_avg_returns, rolling_consistency_3y_pct,
            max_drawdown_5y_pct, recovery_months, manager, style,
            concentration, nav_history_3y, updated_at
          ) VALUES (
            ${fundRecord.id}, ${fundRecord.name}, ${fundRecord.amc},
            ${fundRecord.category}, ${fundRecord.inception_date}, ${fundRecord.nav},
            ${fundRecord.returns}::jsonb, ${fundRecord.category_avg_returns}::jsonb,
            ${fundRecord.rolling_consistency_3y_pct}, ${fundRecord.max_drawdown_5y_pct},
            ${fundRecord.recovery_months}, ${fundRecord.manager}::jsonb,
            ${fundRecord.style}::jsonb, ${fundRecord.concentration}::jsonb,
            ${fundRecord.nav_history_3y}::jsonb, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            amc = EXCLUDED.amc,
            category = EXCLUDED.category,
            nav = EXCLUDED.nav,
            returns = EXCLUDED.returns,
            rolling_consistency_3y_pct = EXCLUDED.rolling_consistency_3y_pct,
            max_drawdown_5y_pct = EXCLUDED.max_drawdown_5y_pct,
            recovery_months = EXCLUDED.recovery_months,
            nav_history_3y = EXCLUDED.nav_history_3y,
            updated_at = NOW()
        `;

        processed++;
      } catch (err) {
        errors++;
        if (errors <= 5) {
          console.error(`[update-funds] Error processing ${scheme.schemeCode}:`, err);
        }
      }
    }));

    await delay(DELAY_MS);

    if (i % (BATCH_SIZE * 5) === 0) {
      console.log(`[update-funds] Progress: ${i + BATCH_SIZE}/${Math.min(allSchemes.length, MAX_FUNDS)} — ${processed} processed, ${skipped} skipped, ${errors} errors`);
    }
  }

  console.log(`[update-funds] Complete! Processed: ${processed}, Skipped: ${skipped}, Errors: ${errors}`);
}

main().catch(err => {
  console.error('[update-funds] Fatal:', err);
  process.exit(1);
});
