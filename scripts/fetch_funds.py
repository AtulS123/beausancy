import urllib.request, json, math, datetime, time, sys

SCHEMES = {
    "122639": ("Parag Parikh Flexi Cap Fund", "Flexi Cap", "PPFAS"),
    "118955": ("HDFC Flexi Cap Fund", "Flexi Cap", "HDFC"),
    "118825": ("Mirae Asset Large Cap Fund", "Large Cap", "Mirae Asset"),
    "118778": ("Nippon India Small Cap Fund", "Small Cap", "Nippon India"),
    "120828": ("quant Small Cap Fund", "Small Cap", "Quant"),
    "125497": ("SBI Small Cap Fund", "Small Cap", "SBI"),
    "127042": ("Motilal Oswal Midcap Fund", "Mid Cap", "Motilal Oswal"),
    "120377": ("ICICI Prudential Balanced Advantage Fund", "Hybrid", "ICICI Prudential"),
    "120716": ("UTI Nifty 50 Index Fund", "Index", "UTI"),
    "135781": ("Mirae Asset ELSS Tax Saver Fund", "ELSS", "Mirae Asset"),
    "120503": ("Axis ELSS Tax Saver Fund", "ELSS", "Axis"),
    "150346": ("WhiteOak Capital Flexi Cap Fund", "Flexi Cap", "WhiteOak"),
    "120348": ("Invesco India Contra Fund", "Flexi Cap", "Invesco"),
    "119581": ("Sundaram Mid Cap Fund", "Mid Cap", "Sundaram"),
    "148595": ("DSP Value Fund", "Flexi Cap", "DSP"),
    "118617": ("Edelweiss Large Cap Fund", "Large Cap", "Edelweiss"),
    "135800": ("Tata Digital India Fund", "Others", "Tata"),
    "129220": ("L&T Emerging Businesses Fund", "Small Cap", "L&T"),
    "119062": ("HDFC Hybrid Equity Fund", "Hybrid", "HDFC"),
    "118989": ("HDFC Mid-Cap Opportunities Fund", "Mid Cap", "HDFC"),
    "133839": ("PGIM India Flexi Cap Fund", "Flexi Cap", "PGIM India"),
}

CATEGORY_AVG = {
    "Large Cap":  {"1y": 10.8, "3y": 13.1, "5y": 14.9},
    "Flexi Cap":  {"1y": 11.0, "3y": 15.3, "5y": 17.8},
    "Mid Cap":    {"1y": 16.2, "3y": 19.4, "5y": 22.1},
    "Small Cap":  {"1y": 19.4, "3y": 22.8, "5y": 25.1},
    "ELSS":       {"1y": 13.2, "3y": 16.1, "5y": 18.4},
    "Hybrid":     {"1y": 9.8,  "3y": 11.4, "5y": 12.6},
    "Index":      {"1y": 11.0, "3y": 13.2, "5y": 14.8},
    "Others":     {"1y": 14.2, "3y": 10.8, "5y": 21.2},
}

MOCK_MANAGERS = {
    "122639": [{"name": "Rajeev Thakkar", "tenure_years": 11.5, "funds_managed": 4, "changed_last_12mo": False}],
    "118955": [{"name": "Roshi Jain", "tenure_years": 3.2, "funds_managed": 2, "changed_last_12mo": False}],
    "118825": [{"name": "Gaurav Khandelwal", "tenure_years": 2.1, "funds_managed": 3, "changed_last_12mo": False}],
    "118778": [{"name": "Samir Rachh", "tenure_years": 8.7, "funds_managed": 2, "changed_last_12mo": False}],
    "120828": [{"name": "Ankit Pande", "tenure_years": 4.3, "funds_managed": 6, "changed_last_12mo": False}],
    "125497": [{"name": "R. Srinivasan", "tenure_years": 9.2, "funds_managed": 3, "changed_last_12mo": False}],
    "127042": [{"name": "Niket Shah", "tenure_years": 3.8, "funds_managed": 3, "changed_last_12mo": False}],
    "120377": [{"name": "Sankaran Naren", "tenure_years": 7.8, "funds_managed": 6, "changed_last_12mo": False}, {"name": "Ihab Dalwai", "tenure_years": 5.2, "funds_managed": 3, "changed_last_12mo": False}],
    "120716": [{"name": "Sharwan Kumar Goyal", "tenure_years": 6.4, "funds_managed": 8, "changed_last_12mo": False}],
    "135781": [{"name": "Neelesh Surana", "tenure_years": 10.3, "funds_managed": 5, "changed_last_12mo": False}],
    "120503": [{"name": "Shreyash Devalkar", "tenure_years": 2.6, "funds_managed": 4, "changed_last_12mo": False}],
    "150346": [{"name": "Ramesh Mantri", "tenure_years": 1.7, "funds_managed": 3, "changed_last_12mo": False}],
    "120348": [{"name": "Taher Badshah", "tenure_years": 6.8, "funds_managed": 2, "changed_last_12mo": False}],
    "119581": [{"name": "S. Bharath", "tenure_years": 0.6, "funds_managed": 4, "changed_last_12mo": True}],
    "148595": [{"name": "Aparna Karnik", "tenure_years": 3.1, "funds_managed": 2, "changed_last_12mo": False}],
    "118617": [{"name": "Trideep Bhattacharya", "tenure_years": 3.4, "funds_managed": 5, "changed_last_12mo": False}],
    "135800": [{"name": "Meeta Shetty", "tenure_years": 4.2, "funds_managed": 3, "changed_last_12mo": False}],
    "129220": [{"name": "Venugopal Manghat", "tenure_years": 7.2, "funds_managed": 2, "changed_last_12mo": False}],
    "119062": [{"name": "Chirag Setalvad", "tenure_years": 12.4, "funds_managed": 3, "changed_last_12mo": False}],
    "118989": [{"name": "Pankaj Tibrewal", "tenure_years": 0.8, "funds_managed": 2, "changed_last_12mo": True}],
    "133839": [{"name": "Aniruddha Naha", "tenure_years": 4.1, "funds_managed": 2, "changed_last_12mo": False}],
}

MOCK_STYLE = {
    "122639": {"declared": "Flexi Cap", "actual": "Quality-Value", "r_squared": 0.78, "match": "moderate", "basis": "Quality"},
    "118955": {"declared": "Flexi Cap", "actual": "Value", "r_squared": 0.88, "match": "strict", "basis": "Value"},
    "118825": {"declared": "Large Cap", "actual": "Blend", "r_squared": 0.91, "match": "strict", "basis": "Blend"},
    "118778": {"declared": "Small Cap", "actual": "Growth", "r_squared": 0.87, "match": "strict", "basis": "Growth"},
    "120828": {"declared": "Small Cap", "actual": "Momentum", "r_squared": 0.58, "match": "drifted", "basis": "Momentum"},
    "125497": {"declared": "Small Cap", "actual": "Quality", "r_squared": 0.79, "match": "moderate", "basis": "Quality"},
    "127042": {"declared": "Mid Cap", "actual": "Quality-Growth", "r_squared": 0.83, "match": "moderate", "basis": "Quality"},
    "120377": {"declared": "Hybrid", "actual": "Dynamic Asset", "r_squared": 0.84, "match": "moderate", "basis": "Blend"},
    "120716": {"declared": "Index", "actual": "Index", "r_squared": 0.99, "match": "strict", "basis": "Blend"},
    "135781": {"declared": "ELSS", "actual": "Blend", "r_squared": 0.89, "match": "strict", "basis": "Blend"},
    "120503": {"declared": "ELSS", "actual": "Growth", "r_squared": 0.72, "match": "moderate", "basis": "Growth"},
    "150346": {"declared": "Flexi Cap", "actual": "Quality", "r_squared": 0.82, "match": "moderate", "basis": "Quality"},
    "120348": {"declared": "Contra", "actual": "Value", "r_squared": 0.85, "match": "strict", "basis": "Value"},
    "119581": {"declared": "Mid Cap", "actual": "Growth", "r_squared": 0.78, "match": "moderate", "basis": "Growth"},
    "148595": {"declared": "Flexi Cap", "actual": "Value", "r_squared": 0.91, "match": "strict", "basis": "Value"},
    "118617": {"declared": "Large Cap", "actual": "Blend", "r_squared": 0.68, "match": "moderate", "basis": "Blend"},
    "135800": {"declared": "Sectoral", "actual": "Growth", "r_squared": 0.54, "match": "drifted", "basis": "Growth"},
    "129220": {"declared": "Small Cap", "actual": "Blend", "r_squared": 0.82, "match": "moderate", "basis": "Blend"},
    "119062": {"declared": "Hybrid", "actual": "Value", "r_squared": 0.76, "match": "moderate", "basis": "Value"},
    "118989": {"declared": "Mid Cap", "actual": "Growth", "r_squared": 0.86, "match": "strict", "basis": "Growth"},
    "133839": {"declared": "Flexi Cap", "actual": "Quality-Growth", "r_squared": 0.80, "match": "moderate", "basis": "Quality"},
}

MOCK_CONC = {
    "122639": {"top_10_pct": 48.2, "num_stocks": 31, "top_sector_pct": 28.4},
    "118955": {"top_10_pct": 52.4, "num_stocks": 48, "top_sector_pct": 32.1},
    "118825": {"top_10_pct": 54.1, "num_stocks": 62, "top_sector_pct": 29.8},
    "118778": {"top_10_pct": 22.4, "num_stocks": 142, "top_sector_pct": 19.6},
    "120828": {"top_10_pct": 38.7, "num_stocks": 78, "top_sector_pct": 24.3},
    "125497": {"top_10_pct": 34.2, "num_stocks": 56, "top_sector_pct": 22.7},
    "127042": {"top_10_pct": 58.4, "num_stocks": 26, "top_sector_pct": 31.2},
    "120377": {"top_10_pct": 38.4, "num_stocks": 84, "top_sector_pct": 24.1},
    "120716": {"top_10_pct": 58.2, "num_stocks": 50, "top_sector_pct": 35.4},
    "135781": {"top_10_pct": 41.2, "num_stocks": 72, "top_sector_pct": 26.4},
    "120503": {"top_10_pct": 56.7, "num_stocks": 42, "top_sector_pct": 33.1},
    "150346": {"top_10_pct": 36.8, "num_stocks": 62, "top_sector_pct": 24.2},
    "120348": {"top_10_pct": 42.4, "num_stocks": 54, "top_sector_pct": 26.8},
    "119581": {"top_10_pct": 34.8, "num_stocks": 72, "top_sector_pct": 24.6},
    "148595": {"top_10_pct": 46.2, "num_stocks": 38, "top_sector_pct": 28.9},
    "118617": {"top_10_pct": 44.8, "num_stocks": 58, "top_sector_pct": 28.3},
    "135800": {"top_10_pct": 72.4, "num_stocks": 28, "top_sector_pct": 78.4},
    "129220": {"top_10_pct": 28.4, "num_stocks": 112, "top_sector_pct": 22.4},
    "119062": {"top_10_pct": 42.8, "num_stocks": 56, "top_sector_pct": 27.6},
    "118989": {"top_10_pct": 29.8, "num_stocks": 68, "top_sector_pct": 21.4},
    "133839": {"top_10_pct": 40.2, "num_stocks": 45, "top_sector_pct": 26.1},
}

MOCK_AUM = {
    "122639": 78420, "118955": 64210, "118825": 38950, "118778": 52180,
    "120828": 21430, "125497": 28740, "127042": 18960, "120377": 58420,
    "120716": 19840, "135781": 24680, "120503": 34120, "150346": 2840,
    "120348": 13420, "119581": 9240, "148595": 1240, "118617": 3420,
    "135800": 11240, "129220": 14820, "119062": 22340, "118989": 42180,
    "133839": 8640,
}

MOCK_ER = {
    "122639": 0.63, "118955": 0.78, "118825": 0.54, "118778": 0.73,
    "120828": 0.68, "125497": 0.71, "127042": 0.72, "120377": 0.88,
    "120716": 0.20, "135781": 0.58, "120503": 0.78, "150346": 0.62,
    "120348": 0.64, "119581": 0.91, "148595": 0.89, "118617": 0.42,
    "135800": 0.34, "129220": 0.74, "119062": 0.94, "118989": 0.67,
    "133839": 0.42,
}

def parse_date(s):
    for fmt in ("%d-%m-%Y", "%d-%b-%Y"):
        try:
            return datetime.datetime.strptime(s, fmt)
        except:
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
    window_days = int(window_years * 365.25)
    step = max(1, len(sorted_data) // 84)
    for i in range(0, len(sorted_data) - window_days // 30, step):
        start = sorted_data[i]
        end_dt = start["dt"] + datetime.timedelta(days=window_days)
        end_candidates = [d for d in sorted_data if d["dt"] >= end_dt]
        if not end_candidates:
            continue
        end = min(end_candidates, key=lambda x: abs((x["dt"] - end_dt).days))
        actual_years = (end["dt"] - start["dt"]).days / 365.25
        if actual_years < window_years * 0.8:
            continue
        if start["nav"] <= 0:
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

results = []
for code, (name, category, amc) in SCHEMES.items():
    sys.stderr.write("Fetching {}: {}...\n".format(code, name[:40]))
    try:
        data = fetch(code)
        raw = data["data"]
        nav_data = []
        for entry in raw:
            dt = parse_date(entry["date"])
            try:
                nav = float(entry["nav"])
            except:
                continue
            if dt and nav > 0:
                nav_data.append({"dt": dt, "nav": nav})

        latest_nav = nav_data[0]["nav"] if nav_data else 0
        managers = MOCK_MANAGERS.get(code, [{"name": "Unknown", "tenure_years": 1.0, "funds_managed": 1, "changed_last_12mo": False}])

        fund = {
            "id": code,
            "name": name,
            "amc": amc,
            "category": category,
            "aum_cr": MOCK_AUM.get(code, 5000),
            "expense_ratio": MOCK_ER.get(code, 0.70),
            "inception_date": str(min(d["dt"] for d in nav_data).date()) if nav_data else "2000-01-01",
            "nav": round(latest_nav, 2),
            "returns": {
                "1y": cagr(nav_data, 1),
                "3y": cagr(nav_data, 3),
                "5y": cagr(nav_data, 5),
            },
            "category_avg_returns": CATEGORY_AVG.get(category, CATEGORY_AVG["Flexi Cap"]),
            "rolling_consistency_3y_pct": rolling_consistency(nav_data, 3),
            "max_drawdown_5y_pct": max_drawdown(nav_data, 5),
            "recovery_months": recovery_months_fn(nav_data, 5),
            "manager": managers[0],
            "managers": managers,
            "style": MOCK_STYLE.get(code, {"declared": category, "actual": "Blend", "r_squared": 0.80, "match": "moderate", "basis": "Blend"}),
            "concentration": MOCK_CONC.get(code, {"top_10_pct": 45.0, "num_stocks": 50, "top_sector_pct": 28.0}),
            "nav_history_3y": monthly_nav_history(nav_data, 36),
        }
        results.append(fund)
        sys.stderr.write("  ok NAV:{:.2f} 1Y:{} 3Y:{} cons:{}\n".format(
            fund["nav"], fund["returns"]["1y"], fund["returns"]["3y"], fund["rolling_consistency_3y_pct"]))
        time.sleep(0.4)
    except Exception as e:
        sys.stderr.write("  ERROR: {}\n".format(e))

print(json.dumps(results, indent=2, default=str))
