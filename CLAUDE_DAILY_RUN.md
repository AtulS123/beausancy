# Beausancy — Claude Daily Maintenance Run

This document is a self-contained prompt for Claude to execute the Beausancy
data maintenance tasks. Hand it to Claude with: "Run the Beausancy daily
maintenance described in CLAUDE_DAILY_RUN.md".

---

## Context

- **Repo / working directory:** `C:\Users\atuls\Documents\Claude\Projects\Beausancy website\beausancy`
- **Deployed at:** https://beausancy.vercel.app (auto-deploys from `master`)
- **GitHub:** AtulS123/beausancy (push to `master`)
- **Data store:** `scripts/data/static_fund_data.json` — manually maintained AUM, ER, managers, concentration
- **Live data:** `public/data/funds.json` — rebuilt by `scripts/fetch_funds.py` from mfapi.in

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

## Step 3 — Monthly: Update AUM from Groww (semi-automated)

Run the Groww scraper to refresh AUM, expense ratio, and manager data for all
funds that have a Groww page (approximately 41 of 57):

```bash
python scripts/fetch_groww_static.py 2>&1
```

This updates `scripts/data/static_fund_data.json` in place. The script prints
each fund it scraped and what it found. Review the output for:
- Funds that `FAILED` (not on Groww — expected for the 16 AMC-direct funds)
- Unexpected failures (network error for a fund that should work)

After running, verify the JSON is still valid:

```bash
python -c "import json; d=json.load(open('scripts/data/static_fund_data.json')); print('OK —', len(d)-1, 'funds')"
```

---

## Step 4 — Monthly: Update the 16 non-Groww funds manually

These funds are NOT on Groww and need manual data from AMC factsheets.
The Groww scraper leaves them untouched, so you update them yourself in
`scripts/data/static_fund_data.json`.

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

For each fund, update these fields from the latest factsheet:
- `aum_cr` — Direct plan AAUM in crores (or use AMFI AAUM table below)
- `expense_ratio` — Direct plan TER %
- `managers[].tenure_years` — increment by ~1/12 per month, or reset if changed
- `managers[].changed_last_12mo` — set `true` if new manager this year

**AUM shortcut** — AMFI AAUM table covers all funds at once:
> https://www.amfiindia.com/research-information/other-data/amfi-monthly-average-aum

---

## Step 5 — Monthly: Update concentration data for all funds

This is the most time-consuming step and is the biggest data gap in the screener
(most funds show `—` for Top-10% and # stocks). Do it when you have 30 minutes.

For each fund in `scripts/data/static_fund_data.json`, open its AMC factsheet
and update:

```json
"concentration": {
  "top_10_pct": 42.3,    ← sum of top-10 holding weights from factsheet
  "num_stocks":  56,     ← total number of equity holdings
  "top_sector_pct": 28.1 ← weight of the largest sector
}
```

The **factsheet URLs** for the remaining Groww-covered funds are listed in
`MAINTENANCE.md`. Priority order (biggest user impact first):
1. Nippon Small Cap (118778) — large fund, widely searched
2. HDFC Small Cap (130503)
3. Canara Robeco Small Cap (146130)
4. Axis Small Cap (125354)
5. Franklin India Small Cap (118525)
6. All remaining Small Cap funds
7. Flexi Cap and other categories

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

## What Claude can do automatically vs what needs you

| Task | Automated by Claude? |
|---|---|
| Run `fetch_funds.py` and commit | ✅ fully |
| Run `fetch_groww_static.py` and commit | ✅ fully |
| Check validation warnings | ✅ fully |
| Update AUM/ER from AMFI table | ✅ Claude can fetch the web page and parse it |
| Update manager names/tenures | ⚠️ Claude can fetch factsheet pages; you confirm |
| Update concentration data | ⚠️ Claude can read factsheet PDFs if you provide them |
| Update style/r_squared | ❌ quarterly judgment call — you do this |

---

## Notes

- The Groww scraper uses a 1.5s delay per fund to avoid rate-limiting. It takes
  ~5 minutes for 41 funds. Run it from a stable network connection.
- `static_fund_data.json` is the source of truth for all non-NAV data. Never
  edit `public/data/funds.json` directly — it gets overwritten.
- If a fund is completely new (just launched), its 1Y/3Y/5Y returns will show
  `null` until enough NAV history exists. That is expected and correct.
