"""
fetch_funds.py — Daily fund data pipeline.

Fetches live NAV history from mfapi.in, computes return metrics, then merges
in static data (AUM, expense ratio, managers, concentration, style) from
scripts/data/static_fund_data.json.

Category average returns are auto-computed from the funds in our list,
so there is no hardcoded benchmark table.

Output: public/data/funds.json (committed by GitHub Actions)

See MAINTENANCE.md for how to add funds and update static fields.
"""

import urllib.request, json, math, datetime, time, sys, os, re
from collections import defaultdict

# ---------------------------------------------------------------------------
# Fund universe: scheme code -> (display name, category, AMC short label)
# To add a fund: add it here AND add a matching entry to scripts/data/static_fund_data.json
# To remove a fund: comment it out here (leave the JSON entry in place for history)
# ---------------------------------------------------------------------------
SCHEMES = {
    "122639": ("Parag Parikh Flexi Cap Fund",              "Flexi Cap", "PPFAS"),
    "118955": ("HDFC Flexi Cap Fund",                       "Flexi Cap", "HDFC"),
    "118825": ("Mirae Asset Large Cap Fund",                "Large Cap", "Mirae Asset"),
    "118778": ("Nippon India Small Cap Fund",               "Small Cap", "Nippon India"),
    "120828": ("quant Small Cap Fund",                      "Small Cap", "Quant"),
    "125497": ("SBI Small Cap Fund",                        "Small Cap", "SBI"),
    "127042": ("Motilal Oswal Midcap Fund",                 "Mid Cap",   "Motilal Oswal"),
    "120377": ("ICICI Prudential Balanced Advantage Fund",  "Hybrid",    "ICICI Prudential"),
    "120716": ("UTI Nifty 50 Index Fund",                   "Index",     "UTI"),
    "135781": ("Mirae Asset ELSS Tax Saver Fund",           "ELSS",      "Mirae Asset"),
    "120503": ("Axis ELSS Tax Saver Fund",                  "ELSS",      "Axis"),
    "150346": ("WhiteOak Capital Flexi Cap Fund",           "Flexi Cap", "WhiteOak"),
    "120348": ("Invesco India Contra Fund",                 "Flexi Cap", "Invesco"),
    "119581": ("Sundaram Mid Cap Fund",                     "Mid Cap",   "Sundaram"),
    "148595": ("DSP Value Fund",                            "Flexi Cap", "DSP"),
    "118617": ("Edelweiss Large Cap Fund",                  "Large Cap", "Edelweiss"),
    "135800": ("Tata Digital India Fund",                   "Others",    "Tata"),
    # "129220": ("L&T Emerging Businesses Fund", "Small Cap", "L&T"),  # defunct Nov 2022 — merged into HSBC Small Cap (151130)
    "119062": ("HDFC Hybrid Equity Fund",                   "Hybrid",    "HDFC"),
    "118989": ("HDFC Mid-Cap Opportunities Fund",           "Mid Cap",   "HDFC"),
    "133839": ("PGIM India Flexi Cap Fund",                 "Flexi Cap", "PGIM India"),
    # --- Small Cap universe (one per AMC) ---
    "154215": ("Abakkus Small Cap Fund",                    "Small Cap", "Abakkus"),
    "119556": ("Aditya Birla Sun Life Small Cap Fund",      "Small Cap", "ABSL"),
    "125354": ("Axis Small Cap Fund",                       "Small Cap", "Axis"),
    "153612": ("Bajaj Finserv Small Cap Fund",              "Small Cap", "Bajaj Finserv"),
    "147946": ("Bandhan Small Cap Fund",                    "Small Cap", "Bandhan"),
    "145678": ("Bank of India Small Cap Fund",              "Small Cap", "Bank of India"),
    "152128": ("Baroda BNP Paribas Small Cap Fund",         "Small Cap", "Baroda BNP Paribas"),
    "146130": ("Canara Robeco Small Cap Fund",              "Small Cap", "Canara Robeco"),
    "119212": ("DSP Small Cap Fund",                        "Small Cap", "DSP"),
    "146196": ("Edelweiss Small Cap Fund",                  "Small Cap", "Edelweiss"),
    "118525": ("Franklin India Small Cap Fund",             "Small Cap", "Franklin"),
    "154063": ("Groww Small Cap Fund",                      "Small Cap", "Groww"),
    "130503": ("HDFC Small Cap Fund",                       "Small Cap", "HDFC"),
    "151130": ("HSBC Small Cap Fund",                       "Small Cap", "HSBC"),
    "153912": ("Helios Small Cap Fund",                     "Small Cap", "Helios"),
    "147919": ("ITI Small Cap Fund",                        "Small Cap", "ITI"),
    "152614": ("JM Small Cap Fund",                         "Small Cap", "JM Financial"),
    "120164": ("Kotak Small Cap Fund",                      "Small Cap", "Kotak"),
    "152004": ("LIC MF Small Cap Fund",                     "Small Cap", "LIC MF"),
    "150915": ("Mahindra Manulife Small Cap Fund",          "Small Cap", "Mahindra Manulife"),
    "153196": ("Mirae Asset Small Cap Fund",                "Small Cap", "Mirae Asset"),
    "152237": ("Motilal Oswal Small Cap Fund",              "Small Cap", "Motilal Oswal"),
    "149019": ("PGIM India Small Cap Fund",                 "Small Cap", "PGIM India"),
    "152107": ("Quantum Small Cap Fund",                    "Small Cap", "Quantum"),
    "119589": ("Sundaram Small Cap Fund",                   "Small Cap", "Sundaram"),
    "145206": ("Tata Small Cap Fund",                       "Small Cap", "Tata"),
    "154269": ("The Wealth Company Small Cap Fund",         "Small Cap", "The Wealth Co"),
    "148618": ("UTI Small Cap Fund",                        "Small Cap", "UTI"),
    "129649": ("Union Small Cap Fund",                      "Small Cap", "Union"),
    # --- Boutique / newer AMCs ---
    # Note: most launched 2024-2025, so 1Y/3Y returns will be None initially
    "152358": ("Old Bridge Focused Fund",                   "Focused",   "Old Bridge"),
    "152584": ("Trust MF Flexi Cap Fund",                   "Flexi Cap", "Trust MF"),
    "152939": ("Trust MF Small Cap Fund",                   "Small Cap", "Trust MF"),
    "153543": ("Unifi Flexi Cap Fund",                      "Flexi Cap", "Unifi"),
    "153738": ("Capitalmind Flexi Cap Fund",                "Flexi Cap", "Capitalmind"),
    "153859": ("Jio BlackRock Flexi Cap Fund",              "Flexi Cap", "Jio BlackRock"),
    "153872": ("The Wealth Company Flexi Cap Fund",         "Flexi Cap", "The Wealth Co"),
    "154043": ("Abakkus Flexi Cap Fund",                    "Flexi Cap", "Abakkus"),
}

# Groww slug overrides for funds where auto-derived slug differs from actual Groww URL
GROWW_SLUG_OVERRIDES = {
    "152584": "trustmf-flexi-cap-fund-direct-growth",
    "152939": "trustmf-small-cap-fund-direct-growth",
}

def _name_to_groww_slug(name):
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s]', '', slug)
    slug = re.sub(r'\s+', '-', slug.strip())
    return slug + "-direct-growth"

def get_scheme_url(code, name, static_d):
    if 'scheme_url' in static_d:
        return static_d['scheme_url']
    slug = GROWW_SLUG_OVERRIDES.get(code) or _name_to_groww_slug(name)
    return "https://groww.in/mutual-funds/" + slug

# ---------------------------------------------------------------------------
# Load static overrides (AUM, ER, managers, style, concentration)
# ---------------------------------------------------------------------------
STATIC_DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "static_fund_data.json")

def load_static_data():
    try:
        with open(STATIC_DATA_PATH) as f:
            data = json.load(f)
        # Remove the _meta key -- it's documentation only
        data.pop("_meta", None)
        return data
    except FileNotFoundError:
        sys.stderr.write(f"WARNING: {STATIC_DATA_PATH} not found -- static fields will use defaults.\n")
        return {}
    except json.JSONDecodeError as e:
        sys.stderr.write(f"ERROR: {STATIC_DATA_PATH} is invalid JSON: {e}\n")
        sys.exit(1)

STATIC = load_static_data()

# Default values used when a fund has no entry in static_fund_data.json
STATIC_DEFAULTS = {
    "aum_cr": 0,
    "expense_ratio": 0.0,
    "managers": [{"name": "Unknown", "tenure_years": 0.0, "funds_managed": 1, "changed_last_12mo": False}],
    "style": {"declared": "Unknown", "actual": "Blend", "r_squared": 0.80, "match": "moderate", "basis": "Blend"},
    "concentration": {"top_10_pct": 0.0, "num_stocks": 0, "top_sector_pct": 0.0, "top_sectors": []},
}

def get_static(code, field):
    entry = STATIC.get(code, {})
    return entry.get(field, STATIC_DEFAULTS[field])

# ---------------------------------------------------------------------------
# NAV computation helpers
# ---------------------------------------------------------------------------
def parse_date(s):
    for fmt in ("%d-%m-%Y", "%d-%b-%Y"):
        try:
            return datetime.datetime.strptime(s, fmt)
        except Exception:
            pass
    return None

def cagr(nav_data, years):
    sorted_data = sorted(nav_data, key=lambda x: x["dt"], reverse=True)
    if not sorted_data:
        return None
    end = sorted_data[0]
    target = end["dt"] - datetime.timedelta(days=int(years * 365.25))
    start = next((d for d in sorted_data if d["dt"] <= target), None)
    if not start:
        return None
    actual_years = (end["dt"] - start["dt"]).days / 365.25
    if actual_years < years * 0.8:
        return None
    if start["nav"] <= 0:
        return None
    return round((math.pow(end["nav"] / start["nav"], 1 / actual_years) - 1) * 100, 1)

def rolling_consistency(nav_data, window_years=3, benchmark_annual=0.08):
    sorted_data = sorted(nav_data, key=lambda x: x["dt"])
    if len(sorted_data) < window_years * 12:
        return None
    wins, total = 0, 0
    step = max(1, len(sorted_data) // 84)
    window_days = int(window_years * 365.25)
    for i in range(0, len(sorted_data) - window_days // 30, step):
        start = sorted_data[i]
        end_dt = start["dt"] + datetime.timedelta(days=window_days)
        end_candidates = [d for d in sorted_data if d["dt"] >= end_dt]
        if not end_candidates:
            continue
        end = min(end_candidates, key=lambda x: abs((x["dt"] - end_dt).days))
        actual_years = (end["dt"] - start["dt"]).days / 365.25
        if actual_years < window_years * 0.8 or start["nav"] <= 0:
            continue
        fund_cagr = math.pow(end["nav"] / start["nav"], 1 / actual_years) - 1
        if fund_cagr > benchmark_annual:
            wins += 1
        total += 1
    return round((wins / total) * 100) if total > 0 else None

def max_drawdown(nav_data, years=5):
    cutoff = datetime.datetime.now() - datetime.timedelta(days=int(years * 365.25))
    recent = [d for d in nav_data if d["dt"] >= cutoff]
    if len(recent) < 2:
        return 0.0
    peak, max_dd = 0.0, 0.0
    for d in sorted(recent, key=lambda x: x["dt"]):
        if d["nav"] > peak:
            peak = d["nav"]
        if peak > 0:
            dd = (d["nav"] - peak) / peak * 100
            if dd < max_dd:
                max_dd = dd
    return round(max_dd, 1)

def recovery_months_fn(nav_data, years=5):
    cutoff = datetime.datetime.now() - datetime.timedelta(days=int(years * 365.25))
    recent = sorted([d for d in nav_data if d["dt"] >= cutoff], key=lambda x: x["dt"])
    if len(recent) < 2:
        return 1
    peak, trough_idx = 0.0, -1
    max_dd_pct = 0.0
    for i, d in enumerate(recent):
        if d["nav"] > peak:
            peak = d["nav"]
        if peak > 0:
            dd = (d["nav"] - peak) / peak * 100
            if dd < max_dd_pct:
                max_dd_pct = dd
                trough_idx = i
    if trough_idx < 0 or max_dd_pct > -5:
        return 1
    peak_before_trough = max(d["nav"] for d in recent[:trough_idx + 1])
    for d in recent[trough_idx + 1:]:
        if d["nav"] >= peak_before_trough:
            months = (d["dt"] - recent[trough_idx]["dt"]).days / 30.4
            return max(1, round(months))
    months = (recent[-1]["dt"] - recent[trough_idx]["dt"]).days / 30.4
    return max(1, round(months))

def monthly_nav_history(nav_data, months=36):
    sorted_data = sorted(nav_data, key=lambda x: x["dt"])
    by_month = {}
    for d in sorted_data:
        key = (d["dt"].year, d["dt"].month)
        by_month[key] = d["nav"]
    keys = sorted(by_month.keys())[-months:]
    return [round(by_month[k], 2) for k in keys]

def fetch(code):
    url = "https://api.mfapi.in/mf/" + code
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

# ---------------------------------------------------------------------------
# Build fund records  (Pass 1 — rolling_consistency filled in Pass 2)
# ---------------------------------------------------------------------------
results   = []
nav_cache = {}   # code -> nav_data, kept for the second-pass consistency calc

for code, (name, category, amc) in SCHEMES.items():
    sys.stderr.write("Fetching {}: {}...\n".format(code, name[:40]))

    if code not in STATIC:
        sys.stderr.write(f"  WARNING: no entry in static_fund_data.json for {code} ({name}) -- using defaults\n")

    try:
        data = fetch(code)
        raw = data["data"]
        nav_data = []
        for entry in raw:
            dt = parse_date(entry["date"])
            try:
                nav = float(entry["nav"])
            except Exception:
                continue
            if dt and nav > 0:
                nav_data.append({"dt": dt, "nav": nav})

        nav_cache[code] = nav_data
        latest_nav = nav_data[0]["nav"] if nav_data else 0
        managers = get_static(code, "managers")

        fund = {
            "id": code,
            "name": name,
            "amc": amc,
            "category": category,
            "scheme_url":    get_scheme_url(code, name, STATIC.get(code, {})),
            # --- static fields (updated monthly from factsheets) ---
            "aum_cr":        get_static(code, "aum_cr"),
            "expense_ratio": get_static(code, "expense_ratio"),
            "manager":       managers[0],
            "managers":      managers,
            "style":         get_static(code, "style"),
            "concentration": get_static(code, "concentration"),
            # --- live fields (computed daily from mfapi) ---
            "inception_date": str(min(d["dt"] for d in nav_data).date()) if nav_data else "2000-01-01",
            "nav": round(latest_nav, 2),
            "returns": {
                "1y": cagr(nav_data, 1),
                "3y": cagr(nav_data, 3),
                "5y": cagr(nav_data, 5),
            },
            # Both filled after all funds are fetched (Pass 2)
            "category_avg_returns":      None,
            "rolling_consistency_3y_pct": None,
            "max_drawdown_5y_pct":        max_drawdown(nav_data, 5),
            "recovery_months":            recovery_months_fn(nav_data, 5),
            "nav_history_3y":             monthly_nav_history(nav_data, 36),
        }
        results.append(fund)
        sys.stderr.write("  ok NAV:{:.2f} 1Y:{} 3Y:{}\n".format(
            fund["nav"], fund["returns"]["1y"], fund["returns"]["3y"]))
        time.sleep(0.4)

    except Exception as e:
        sys.stderr.write("  ERROR: {}\n".format(e))

# ---------------------------------------------------------------------------
# Compute category average returns from our own fund data.
# Replaces the old hardcoded CATEGORY_AVG table -- averages now reflect only
# the funds actually in the screener and update automatically each run.
# ---------------------------------------------------------------------------
cat_buckets = defaultdict(lambda: {"1y": [], "3y": [], "5y": []})
for f in results:
    for period in ("1y", "3y", "5y"):
        val = f["returns"].get(period)
        if val is not None:
            cat_buckets[f["category"]][period].append(val)

cat_avg = {
    cat: {
        p: round(sum(vals) / len(vals), 1) if vals else None
        for p, vals in periods.items()
    }
    for cat, periods in cat_buckets.items()
}

for fund in results:
    fund["category_avg_returns"] = cat_avg.get(fund["category"], {"1y": None, "3y": None, "5y": None})

# ---------------------------------------------------------------------------
# Pass 2 — rolling consistency vs category average 3Y CAGR.
# Using the category average 3Y CAGR (just computed above) as the benchmark
# gives a meaningful bar: "did this fund beat its peers on average?"
# The old approach used a fixed 8% which is too low for Indian equity and
# caused most equity funds to show 100% consistency.
# ---------------------------------------------------------------------------
for fund in results:
    nd = nav_cache.get(fund["id"], [])
    cat_3y = fund["category_avg_returns"].get("3y")
    # Convert % to decimal; fallback to 10% if category avg is unavailable
    benchmark = (cat_3y / 100.0) if cat_3y is not None else 0.10
    fund["rolling_consistency_3y_pct"] = rolling_consistency(nd, 3, benchmark)
    sys.stderr.write("  cons({}): {}\n".format(fund["id"], fund["rolling_consistency_3y_pct"]))

# ---------------------------------------------------------------------------
# Validation: surface missing or zero static fields so the maintainer notices
# ---------------------------------------------------------------------------
warnings = []
for fund in results:
    code = fund["id"]
    if fund["aum_cr"] == 0:
        warnings.append(f"  aum_cr=0 for {code} ({fund['name']})")
    if fund["expense_ratio"] == 0.0:
        warnings.append(f"  expense_ratio=0 for {code} ({fund['name']})")

if warnings:
    sys.stderr.write("\nVALIDATION WARNINGS -- update scripts/data/static_fund_data.json:\n")
    for w in warnings:
        sys.stderr.write(w + "\n")
    sys.stderr.write("\n")

print(json.dumps(results, indent=2, default=str))
