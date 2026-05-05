# Beausancy — Claude Daily Maintenance Run

This document is a self-contained prompt for Claude to execute the Beausancy
data maintenance tasks. Hand it to Claude with: "Run the Beausancy daily
maintenance described in CLAUDE_DAILY_RUN.md".

---

## Context

- **Repo / working directory:** `C:\Users\atuls\Documents\Claude\Projects\Beausancy website\beausancy`
- **Deployed at:** https://beausancy.vercel.app (auto-deploys from `master`)
- **GitHub:** AtulS123/beausancy (push to `master`)
- **Data store:** `scripts/data/static_fund_data.json` — maintained AUM, ER, managers, concentration
- **Live data:** `public/data/funds.json` — rebuilt by `scripts/fetch_funds.py` from mfapi.in

---

## What is fully automated (GitHub Actions)

These run without any manual intervention:

| Schedule | Job | What it does |
|---|---|---|
| Mon–Fri 11:30pm IST | `update-nav` | Fetches NAV history from mfapi.in, rebuilds `funds.json`, pushes to master |
| 1st of each month 8:30am IST | `update-static` | Runs `fetch_amfi_aum.py` → `fetch_groww_static.py` → rebuilds and pushes |
| Every Monday 9:30am IST | `validate-static` | Warns if `static_fund_data.json` is older than 35 days |

**Everything below is only needed if automation has failed, or for the two remaining manual fields.**

---

## Step 1 — Always run (daily NAV refresh)

```bash
cd "C:\Users\atuls\Documents\Claude\Projects\Beausancy website\beausancy"
python scripts/fetch_funds.py > public/data/funds.json 2>_fetch_log.txt
```

Then check for errors and validation warnings:

```bash
grep -i "error\|warning\|VALIDATION" _fetch_log.txt
```

If there are **VALIDATION WARNINGS** (`aum_cr=0` or `expense_ratio=0`), note
which funds are affected and skip to Step 3 to fix them before committing.

If there are no warnings, commit and push:

```bash
git add public/data/funds.json
git commit -m "chore: daily NAV refresh $(date +%Y-%m-%d)"
git push origin master
```

Clean up the temp log:
```bash
del _fetch_log.txt
```

---

## Step 2 — Check if monthly static update is needed

Read the `_meta.last_updated` field at the top of `scripts/data/static_fund_data.json`.

If `last_updated` is **more than 30 days ago**, the monthly update is due —
proceed to Steps 3 and 4. Otherwise, you are done for today.

---

## Step 3 — Monthly: Automated AUM/ER/managers/concentration refresh

Run the AMFI and Groww scrapers to refresh all automated fields:

```bash
# Step 3a: AMFI AAUM — updates AUM for all 57 funds
python scripts/fetch_amfi_aum.py 2>&1

# Step 3b: Groww scraper — updates AUM, ER, managers, concentration for ~41 funds
python scripts/fetch_groww_static.py 2>&1
```

These update `scripts/data/static_fund_data.json` in place. Review output for:
- Funds that failed on Groww (expected for the 16 AMC-direct funds)
- Unexpected network failures

After running, verify the JSON is still valid:

```bash
python -c "import json; d=json.load(open('scripts/data/static_fund_data.json')); print('OK —', len(d)-1, 'funds')"
```

---

## Step 4 — Monthly: Manual update for the 16 non-Groww funds

The AMFI scraper covers AUM for these funds automatically. But **expense ratio (TER)**
and **manager tenures** still need manual updates from AMC factsheets when they change.

| Scheme code | Fund name | AMC factsheet |
|---|---|---|
| 122639 | Parag Parikh Flexi Cap | https://amc.ppfas.com/downloads/fund-factsheet/ |
| 118955 | HDFC Flexi Cap | https://www.hdfcfund.com/information-center/factsheets |
| 118989 | HDFC Mid-Cap Opportunities | https://www.hdfcfund.com/information-center/factsheets |
| 119062 | HDFC Hybrid Equity | https://www.hdfcfund.com/information-center/factsheets |
| 120828 | quant Small Cap | https://quantmutual.com/factsheets |
| 125497 | SBI Small Cap | https://www.sbimf.com/en-us/downloads/fact-sheet |
| 127042 | Motilal Oswal Midcap | https://www.motilaloswalmf.com/downloads/factsheet |
| 120716 | UTI Nifty 50 Index | https://utimf.com/forms-and-downloads/factsheets/ |
| 120503 | Axis ELSS Tax Saver | https://www.axismf.com/downloads |
| 119581 | Sundaram Mid Cap | https://sundarammf.com/downloads/factsheet |
| 119589 | Sundaram Small Cap | https://sundarammf.com/downloads/factsheet |
| 119556 | ABSL Small Cap | https://mutualfund.adityabirlacapital.com/Investor-Resources/Download/Factsheet |
| 119212 | DSP Small Cap | https://www.dspim.com/nfo/factsheets |
| 120164 | Kotak Small Cap | https://assetmanagement.kotak.com/mutual-fund-performance-report |
| 129649 | Union Small Cap | https://www.unionmf.com/downloads |
| 153859 | Jio BlackRock Flexi Cap | https://www.jioblackrock.com/downloads |

For each fund, check and update if changed:
- `expense_ratio` — Direct plan TER % (if it changed from last month)
- `managers[].tenure_years` — Groww scraper handles the 41 automated funds; for these 16, increment by ~1/12 per month or reset if manager changed
- `managers[].changed_last_12mo` — set `true` if a new manager joined this year

**AUM shortcut** — already automated via `fetch_amfi_aum.py`, but you can cross-check:
> https://www.amfiindia.com/research-information/other-data/amfi-monthly-average-aum

---

## Step 5 — Monthly: Concentration data for non-Groww funds

Concentration (`top_10_pct`, `num_stocks`, `top_sector_pct`) is **automated for the
~41 Groww-covered funds** via `fetch_groww_static.py`. For the 16 non-Groww funds,
update from their factsheets when you have 15 minutes.

Priority order (biggest user impact first):
1. SBI Small Cap (125497)
2. HDFC Mid-Cap Opportunities (118989)
3. Motilal Oswal Midcap (127042)
4. ABSL Small Cap (119556)
5. DSP Small Cap (119212)
6. All remaining non-Groww funds

---

## Step 6 — After all updates, bump the date and rebuild

After any changes to `static_fund_data.json`:

1. Set `_meta.last_updated` to today's date (ISO format: `"2026-05-06"`)

2. Rebuild `funds.json`:
   ```bash
   python scripts/fetch_funds.py > public/data/funds.json 2>_fetch_log.txt
   grep -i "warning\|error" _fetch_log.txt
   del _fetch_log.txt
   ```

3. Commit everything:
   ```bash
   git add public/data/funds.json scripts/data/static_fund_data.json
   git commit -m "data: monthly static update $(date +%Y-%m-%d)"
   git push origin master
   ```

---

## Quick-check: verify the output

After pushing, confirm the data looks right:

```bash
python -c "
import json
funds = json.load(open('public/data/funds.json'))
missing_aum = [f['name'] for f in funds if not f['aum_cr']]
missing_conc = [f['name'] for f in funds if not f['concentration']['top_10_pct']]
print(f'Total funds: {len(funds)}')
print(f'Missing AUM ({len(missing_aum)}): {missing_aum[:5]}')
print(f'Missing concentration ({len(missing_conc)}): {missing_conc[:5]}...')
"
```

Ideal state: 0 missing AUM, and concentration count shrinking over time toward 0.

---

## What is automated vs what needs you

| Task | Automated? |
|---|---|
| Daily NAV/returns refresh | ✅ GitHub Actions (Mon–Fri 11:30pm IST) |
| Monthly AUM refresh (all 57 funds) | ✅ GitHub Actions via AMFI scraper (1st of month) |
| Monthly AUM/ER/managers/concentration (41 Groww funds) | ✅ GitHub Actions via Groww scraper |
| Monthly TER for the 16 non-Groww funds | ⚠️ Check factsheets if changed |
| Manager tenures for the 16 non-Groww funds | ⚠️ Increment monthly or reset on change |
| Concentration for the 16 non-Groww funds | ⚠️ Read factsheet PDFs |
| Style (value/growth/blend) | ❌ Quarterly judgment call — you do this |
| R-squared / benchmark correlation | ❌ Quarterly judgment call — you do this |

---

## Notes

- The Groww scraper uses a 1.5s delay per fund to avoid rate-limiting. It takes
  ~5 minutes for 41 funds.
- `static_fund_data.json` is the source of truth for all non-NAV data. Never
  edit `public/data/funds.json` directly — it gets overwritten.
- If a fund is completely new (just launched), its 1Y/3Y/5Y returns will show
  `null` until enough NAV history exists. That is expected and correct.
- `fetch_amfi_aum.py` tries a bulk AAUM download first, then falls back to per-scheme
  pages. It never crashes CI — failures are logged as warnings only.
