# Beausancy Data Pipeline — Maintenance Guide

This document explains how the fund data pipeline works, what updates automatically,
what you need to maintain manually, and how to make common changes like adding a new fund.

---

## How the pipeline works

```
mfapi.in (free, live)          scripts/data/static_fund_data.json (you maintain)
       │                                         │
       └──────────── scripts/fetch_funds.py ─────┘
                              │
                    public/data/funds.json
                              │
                      GitHub Actions (daily)
                              │
                        Vercel (served to users)
```

**Daily (Mon–Fri at 6 pm IST):** GitHub Actions runs `fetch_funds.py`, which pulls
NAV history from mfapi.in, computes all return metrics, then reads AUM/expense
ratio/manager/concentration from `static_fund_data.json` and merges it all into
`public/data/funds.json`. The result is committed automatically.

**Weekly (every Monday):** A separate job checks whether `static_fund_data.json`
has been updated in the last 35 days and posts a GitHub Actions warning if not.

---

## What updates automatically (you never touch these)

| Field | Source | Frequency |
|---|---|---|
| NAV | mfapi.in | Daily |
| 1Y / 3Y / 5Y CAGR returns | Computed from NAV history | Daily |
| Rolling 3Y consistency | Computed from NAV history | Daily |
| Max drawdown (5Y) | Computed from NAV history | Daily |
| Recovery months | Computed from NAV history | Daily |
| 3Y NAV history (sparkline) | Computed from NAV history | Daily |
| Category average returns | Computed from funds in our list | Daily |
| Inception date | First date in NAV history | Daily |

---

## What you maintain manually (monthly)

Edit **`scripts/data/static_fund_data.json`** once a month after AMC factsheets
are published (usually by the 5th–10th of each month).

| Field | Where to find it | Update frequency |
|---|---|---|
| `aum_cr` | AMFI monthly AAUM table (see below) | Monthly |
| `expense_ratio` | Fund's own website, SEBI TER disclosure, or ValueResearch | Monthly |
| `managers[].name` | AMC factsheet or website fund page | On change |
| `managers[].tenure_years` | AMC factsheet or SEBI fund manager disclosure | Monthly (increment) |
| `managers[].funds_managed` | AMC website | On change |
| `managers[].changed_last_12mo` | Set to `true` if manager changed; reset to `false` after 12 months | On change |
| `concentration.top_10_pct` | AMC monthly factsheet → "Top 10 Holdings" section | Monthly |
| `concentration.num_stocks` | AMC monthly factsheet | Monthly |
| `concentration.top_sector_pct` | AMC monthly factsheet → sector allocation pie | Monthly |
| `style.actual` | Morningstar style box, or your own judgment | Quarterly |
| `style.r_squared` | Morningstar or manual computation | Quarterly |
| `style.match` | `"strict"` / `"moderate"` / `"drifted"` — your judgment | Quarterly |

After updating the file, bump the `_meta.last_updated` date at the top so the
weekly freshness check passes.

---

## Where to get the data

### AUM (aum_cr)
AMFI publishes the Average AUM (AAUM) report monthly at:
> https://www.amfiindia.com/research-information/other-data/amfi-monthly-average-aum

Find each fund by name, take the "Direct" plan AAUM figure in crores.
The report is usually available by the 10th of the following month.

### Expense ratio (expense_ratio)
Three reliable sources (pick any one — they should match):
1. **Fund website → Direct plan → Expense Ratio** (most direct)
2. **ValueResearch** → fund page → "Expense Ratio (Direct)"
   > https://valueresearchonline.com
3. **AMFI / SEBI TER disclosure** — AMCs are required to publish daily TER

Use the **Direct plan** TER only (not Regular).

### Fund managers
1. **AMC factsheet** (PDF) → first page usually lists fund managers with tenure
2. **AMC website → Fund page → Fund Manager tab**
3. **SEBI fund manager change disclosures** are published when a manager changes:
   > https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFcc=yes

When a manager changes:
- Update `name` and reset `tenure_years` to 0
- Set `changed_last_12mo: true`
- After 12 months, set `changed_last_12mo: false`

### Portfolio concentration
The **AMC monthly factsheet** (PDF) is the primary source. Look for:
- **Top 10 Holdings** section → sum of the % column = `top_10_pct`
- **Number of stocks** = `num_stocks` (sometimes listed; otherwise count the holdings table)
- **Sector allocation** chart → largest sector % = `top_sector_pct`

Factsheets are published on each AMC's website, usually in an "Downloads" or
"Factsheets" section. Direct links for our funds:

| AMC | Factsheet URL |
|---|---|
| PPFAS | https://amc.ppfas.com/downloads/fund-factsheet/ |
| HDFC MF | https://www.hdfcfund.com/information-center/factsheets |
| Mirae Asset | https://miraeassetmf.co.in/fact-sheet |
| Nippon India | https://mf.nipponindiaim.com/investor-service/fund-factsheet |
| Quant MF | https://quantmutual.com/factsheets |
| SBI MF | https://www.sbimf.com/en-us/downloads/fact-sheet |
| Motilal Oswal | https://www.motilaloswalmf.com/downloads/factsheet |
| ICICI Prudential | https://www.icicipruamc.com/downloads/factsheets |
| UTI MF | https://utimf.com/forms-and-downloads/factsheets/ |
| Axis MF | https://www.axismf.com/downloads |
| WhiteOak | https://whiteoakcapital.com/mutual-fund/factsheet/ |
| Invesco | https://www.invescomf.com/documents/factsheet |
| Sundaram MF | https://sundarammf.com/downloads/factsheet |
| DSP MF | https://www.dspim.com/nfo/factsheets |
| Edelweiss MF | https://www.edelweissmf.com/downloads/factsheet |
| Tata MF | https://www.tatamutualfund.com/downloads |
| L&T MF (now Navi) | Check current AMC — L&T MF was acquired |
| PGIM India | https://www.pgimindiamf.com/factsheets |

### Style (style.actual, style.match, style.r_squared)
This is a qualitative judgment that only needs updating quarterly:
- **Morningstar style box** is the most rigorous external source:
  > https://www.morningstar.in
- `match`: Compare `style.declared` (the SEBI-mandated category) with `style.actual`:
  - `"strict"` — fund behaves exactly as the category implies
  - `"moderate"` — some deviation but broadly in category
  - `"drifted"` — fund has meaningfully diverged from its stated category

---

## Adding a new fund

1. Find the fund's **mfapi scheme code**:
   ```
   https://api.mfapi.in/mf/search?q=<fund+name>
   ```
   Use the **Direct Plan - Growth** variant.

2. Add an entry to the `SCHEMES` dict in `scripts/fetch_funds.py`:
   ```python
   "SCHEME_CODE": ("Full Fund Name", "Category", "AMC Short"),
   ```

3. Add a matching entry to `scripts/data/static_fund_data.json` with AUM,
   expense ratio, managers, style, and concentration. Copy an existing entry
   as a template and fill in real values from the factsheet.

4. Bump `_meta.last_updated` in `static_fund_data.json`.

5. Commit both files. The next daily run picks up the new fund automatically.

Valid categories: `Large Cap`, `Mid Cap`, `Small Cap`, `Flexi Cap`, `ELSS`, `Hybrid`, `Index`, `Others`

---

## Removing a fund

1. Comment out or delete the entry in `SCHEMES` in `fetch_funds.py`.
2. Leave the entry in `static_fund_data.json` (no harm, and makes it easy to re-add).
3. Commit. It disappears from the screener on the next daily run.

---

## Triggering a manual update

Go to **GitHub → Actions → "Update Fund Data" → Run workflow**.

This runs both the NAV fetch and the static-data freshness check immediately,
without waiting for the scheduled time.

---

## Running locally

```bash
cd beausancy
python3 scripts/fetch_funds.py > public/data/funds.json
```

Stderr shows fetch progress and any validation warnings. Stdout is the JSON.

To test without committing:
```bash
python3 scripts/fetch_funds.py 2>&1 | head -60   # just see logs
```

---

## Understanding validation warnings

If `static_fund_data.json` is missing an entry, or a fund has `aum_cr: 0` or
`expense_ratio: 0`, the script prints:

```
VALIDATION WARNINGS — update scripts/data/static_fund_data.json:
  aum_cr=0 for 123456 (Some Fund Name)
```

These also surface as GitHub Actions warnings (yellow ⚠️ badge) so you see them
without reading logs manually.
