"""
fetch_amfi_static.py — Monthly pipeline to auto-update AUM and Expense Ratio.

Uses Playwright (headless Chromium) to scrape AMFI's scheme performance report,
which is the only reliable free source for Indian MF AUM and TER data.

Only updates `aum_cr` and `expense_ratio` fields in static_fund_data.json.
Manually-maintained fields (managers, style, concentration) are left untouched.

Run: python3 scripts/fetch_amfi_static.py
Deps: pip install playwright && playwright install chromium
"""

import json, sys, os, time, datetime, re
from pathlib import Path

STATIC_PATH = Path(__file__).parent / "data" / "static_fund_data.json"
SCHEMES_PATH = Path(__file__).parent / "fetch_funds.py"

# Scheme codes we care about — read from fetch_funds.py at runtime
def load_scheme_codes():
    import importlib.util
    spec = importlib.util.spec_from_file_location("fetch_funds", SCHEMES_PATH)
    mod = importlib.util.module_from_spec(spec)
    # Just regex out the SCHEMES dict keys rather than executing the module
    text = SCHEMES_PATH.read_text()
    codes = re.findall(r'"(\d{6})"\s*:', text)
    return codes

def load_static():
    with open(STATIC_PATH) as f:
        return json.load(f)

def save_static(data):
    data["_meta"]["last_updated"] = datetime.date.today().isoformat()
    with open(STATIC_PATH, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Saved {STATIC_PATH}")

def scrape_amfi(scheme_codes: list[str]) -> dict[str, dict]:
    """
    Scrape AMFI's scheme performance report for AUM and TER.
    Returns dict: scheme_code -> {aum_cr, expense_ratio}
    """
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    except ImportError:
        print("ERROR: playwright not installed. Run: pip install playwright && playwright install chromium", file=sys.stderr)
        sys.exit(1)

    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
            viewport={"width": 1280, "height": 900},
        )
        page = context.new_page()

        print("Navigating to AMFI scheme performance report...", file=sys.stderr)
        try:
            page.goto("https://www.amfiindia.com/scheme-performance-report", timeout=30000)
            page.wait_for_load_state("networkidle", timeout=20000)
        except PWTimeout:
            print("WARN: Page load timed out — proceeding anyway", file=sys.stderr)

        for code in scheme_codes:
            try:
                result = _scrape_scheme(page, code)
                if result:
                    results[code] = result
                    print(f"  {code}: AUM={result.get('aum_cr')} ER={result.get('expense_ratio')}", file=sys.stderr)
                else:
                    print(f"  {code}: not found", file=sys.stderr)
                time.sleep(1.0)
            except Exception as e:
                print(f"  {code}: ERROR {e}", file=sys.stderr)

        browser.close()

    return results

def _scrape_scheme(page, scheme_code: str) -> dict | None:
    """
    Search for a scheme by code and extract AUM + TER from the result table.
    Returns dict with aum_cr and expense_ratio, or None if not found.
    """
    from playwright.sync_api import TimeoutError as PWTimeout

    # Use AMFI's scheme search input
    try:
        search_input = page.locator("input[placeholder*='scheme'], input[placeholder*='Scheme'], #schemeSearch, input[name*='scheme']").first
        search_input.wait_for(timeout=5000)
        search_input.fill("")
        search_input.fill(scheme_code)
        page.keyboard.press("Enter")
        page.wait_for_timeout(2000)
    except PWTimeout:
        # Try alternative navigation: direct URL with scheme code
        page.goto(f"https://www.amfiindia.com/scheme-performance-report?schemeCode={scheme_code}", timeout=15000)
        page.wait_for_load_state("networkidle", timeout=10000)

    # Parse AUM and TER from visible table
    aum = _extract_aum(page)
    er = _extract_er(page)

    if aum is None and er is None:
        return None
    return {"aum_cr": aum, "expense_ratio": er}

def _extract_aum(page) -> float | None:
    """Look for AUM value (in Crores) in the page."""
    try:
        # Common patterns: "AUM" label followed by a number
        text = page.locator("body").inner_text()
        # Pattern: number followed by "Cr" or "crore" near "AUM"
        match = re.search(r'AUM[^₹\d]*₹?\s*([\d,]+\.?\d*)\s*(?:Cr|crore)', text, re.IGNORECASE)
        if match:
            return float(match.group(1).replace(",", ""))
        # Try without currency symbol
        match = re.search(r'(?:Total\s+)?AUM\s*:?\s*([\d,]+\.?\d*)', text, re.IGNORECASE)
        if match:
            return float(match.group(1).replace(",", ""))
    except Exception:
        pass
    return None

def _extract_er(page) -> float | None:
    """Look for Expense Ratio / TER in the page."""
    try:
        text = page.locator("body").inner_text()
        match = re.search(r'(?:Expense\s+Ratio|TER)[^%\d]*([\d.]+)\s*%', text, re.IGNORECASE)
        if match:
            val = float(match.group(1))
            if 0.0 < val < 5.0:  # sanity check
                return val
    except Exception:
        pass
    return None

def main():
    print("Loading scheme codes...", file=sys.stderr)
    codes = load_scheme_codes()
    print(f"Found {len(codes)} schemes", file=sys.stderr)

    static = load_static()
    scraped = scrape_amfi(codes)

    updated = 0
    for code, data in scraped.items():
        if code not in static:
            static[code] = {}
        changed = False
        if data.get("aum_cr") is not None:
            static[code]["aum_cr"] = data["aum_cr"]
            changed = True
        if data.get("expense_ratio") is not None:
            static[code]["expense_ratio"] = data["expense_ratio"]
            changed = True
        if changed:
            updated += 1

    print(f"\nUpdated {updated}/{len(codes)} funds", file=sys.stderr)
    save_static(static)

if __name__ == "__main__":
    main()
