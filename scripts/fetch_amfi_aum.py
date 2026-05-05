"""
fetch_amfi_aum.py — Update AUM and expense ratio for all 57 funds from AMFI.

AMFI publishes scheme-level AUM and TER data in two public files:
  - NAVAll.txt   → scheme code + name mapping (confirms our codes are AMFI codes)
  - Portfolio disclosure text files → AUM per scheme (monthly)

This script uses AMFI's scheme performance report page which is server-rendered
and returns per-scheme data by scheme code URL parameter. No Playwright needed.

Primary use: keep AUM and ER current for the 16 funds not available on Groww.
Also serves as a cross-check for the 41 Groww-covered funds.

Run: python3 scripts/fetch_amfi_aum.py
"""

from __future__ import annotations
import urllib.request, json, re, datetime, sys, time
from html.parser import HTMLParser
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

STATIC_PATH = Path(__file__).parent / "data" / "static_fund_data.json"
FETCH_PATH  = Path(__file__).parent / "fetch_funds.py"
TODAY       = datetime.date.today()

# AMFI NAVAll.txt gives us scheme code → full scheme name (confirms codes match)
AMFI_NAV_URL  = "https://www.amfiindia.com/spages/NAVAll.txt"
# AMFI scheme-specific performance page
AMFI_SCHEME_URL = "https://www.amfiindia.com/scheme-performance-report?sId={code}"

HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
    "Referer":         "https://www.amfiindia.com/",
}


def load_schemes() -> dict[str, str]:
    text = FETCH_PATH.read_text(encoding='utf-8')
    return {m.group(1): m.group(2)
            for m in re.finditer(r'"(\d{6})"\s*:\s*\("([^"]+)"', text)}


def fetch_url(url: str, timeout: int = 20) -> str | None:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode('utf-8', errors='replace')
    except Exception as e:
        print(f"  fetch failed: {type(e).__name__}: {e}", file=sys.stderr)
        return None


# ─── Strategy 1: AMFI NAVAll.txt + bulk AAUM download ────────────────────────

def parse_navall(text: str) -> dict[str, str]:
    """Parse NAVAll.txt → scheme_code: scheme_name mapping."""
    mapping: dict[str, str] = {}
    for line in text.splitlines():
        parts = line.split(';')
        if len(parts) >= 4:
            code = parts[0].strip()
            name = parts[3].strip()
            if code.isdigit() and name:
                mapping[code] = name
    return mapping


def fetch_amfi_aaum_bulk() -> dict[str, float]:
    """
    Try to download AMFI's bulk AAUM data file.
    AMFI provides AAUM as a downloadable report; we try the known URL pattern.
    Returns scheme_code → aum_cr dict (may be empty if unavailable).
    """
    # AMFI AAUM report — available as Excel but we try to find a text/JSON version
    # Try the raw data endpoint that some AMFI pages load via AJAX
    candidate_urls = [
        # Direct CSV/text endpoints (may or may not exist — fail gracefully)
        "https://www.amfiindia.com/data/AAUM.txt",
        "https://www.amfiindia.com/research-information/other-data/amfi-monthly-average-aum",
    ]

    for url in candidate_urls:
        print(f"  Trying {url} ...", file=sys.stderr)
        text = fetch_url(url, timeout=30)
        if not text:
            continue

        # Try to parse as delimited text (scheme_code;name;aum pattern)
        results = _parse_aaum_text(text)
        if results:
            print(f"  Got {len(results)} AUM entries from {url}", file=sys.stderr)
            return results

        # Try to parse as HTML table
        results = _parse_aaum_html(text)
        if results:
            print(f"  Got {len(results)} AUM entries (HTML table) from {url}", file=sys.stderr)
            return results

    return {}


def _parse_aaum_text(text: str) -> dict[str, float]:
    """Parse pipe/semicolon delimited AAUM text files."""
    results: dict[str, float] = {}
    for line in text.splitlines():
        for sep in (';', '|', '\t'):
            parts = line.split(sep)
            if len(parts) >= 3:
                code = parts[0].strip()
                if code.isdigit() and len(code) == 6:
                    # AUM is usually the last or second-to-last numeric column
                    for cell in reversed(parts):
                        clean = cell.replace(',', '').strip()
                        try:
                            v = float(clean)
                            if v > 10:  # AUM in crores > 10
                                results[code] = round(v, 2)
                                break
                        except ValueError:
                            continue
                    break
    return results


class _TableParser(HTMLParser):
    """Extract all text rows from HTML tables."""
    def __init__(self):
        super().__init__()
        self.rows: list[list[str]] = []
        self._row: list[str] | None = None
        self._cell = ''
        self._in_cell = False

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self._row = []
        elif tag in ('td', 'th') and self._row is not None:
            self._in_cell = True
            self._cell = ''

    def handle_data(self, data):
        if self._in_cell:
            self._cell += data

    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self._in_cell:
            self._row.append(self._cell.strip())  # type: ignore[union-attr]
            self._in_cell = False
        elif tag == 'tr' and self._row:
            self.rows.append(self._row)
            self._row = None


def _parse_aaum_html(html: str) -> dict[str, float]:
    """Try to extract AUM from an HTML page containing a table."""
    parser = _TableParser()
    parser.feed(html)

    results: dict[str, float] = {}
    for row in parser.rows:
        if len(row) < 2:
            continue
        # Look for a 6-digit scheme code in the first few cells
        code = None
        for cell in row[:3]:
            if re.fullmatch(r'\d{6}', cell.strip()):
                code = cell.strip()
                break
        if not code:
            continue
        # Find a large numeric value (AUM in crores)
        for cell in reversed(row):
            clean = cell.replace(',', '').strip()
            try:
                v = float(clean)
                if v > 10:
                    results[code] = round(v, 2)
                    break
            except ValueError:
                continue

    return results


# ─── Strategy 2: per-scheme AMFI page ────────────────────────────────────────

def fetch_scheme_aum(code: str) -> tuple[float | None, float | None]:
    """
    Fetch AUM and ER for a single scheme from AMFI's scheme performance page.
    Returns (aum_cr, expense_ratio) — either may be None if not found.
    """
    url = AMFI_SCHEME_URL.format(code=code)
    html = fetch_url(url)
    if not html:
        return None, None

    aum = None
    er  = None

    # AUM patterns on AMFI scheme pages
    for pat in [
        r'(?:AUM|Assets\s+Under\s+Management)[^\d₹]*₹?\s*([\d,]+\.?\d*)\s*(?:Cr|crore)',
        r'(?:Average\s+AUM|AAUM)[^\d]*\s*([\d,]+\.?\d*)',
        r'"aum"\s*:\s*"?([\d,]+\.?\d*)"?',
    ]:
        m = re.search(pat, html, re.IGNORECASE)
        if m:
            try:
                aum = round(float(m.group(1).replace(',', '')), 2)
                break
            except ValueError:
                pass

    # ER patterns
    for pat in [
        r'(?:Expense\s+Ratio|TER)[^\d%]*([\d.]+)\s*%',
        r'"expense_ratio"\s*:\s*"?([\d.]+)"?',
    ]:
        m = re.search(pat, html, re.IGNORECASE)
        if m:
            try:
                v = float(m.group(1))
                if 0.0 < v < 5.0:
                    er = v
                    break
            except ValueError:
                pass

    return aum, er


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    with open(STATIC_PATH, encoding='utf-8') as f:
        static = json.load(f)

    schemes = load_schemes()

    # Step 1: try bulk AAUM download (covers all funds at once)
    print("Attempting AMFI bulk AAUM download...", file=sys.stderr)
    bulk = fetch_amfi_aaum_bulk()

    bulk_updated = 0
    if bulk:
        for code, aum in bulk.items():
            if code in static:
                static[code]['aum_cr'] = aum
                bulk_updated += 1
        print(f"Bulk: updated {bulk_updated} funds", file=sys.stderr)
    else:
        print("Bulk download unavailable — falling back to per-scheme fetch", file=sys.stderr)

    # Step 2: per-scheme fallback for any fund still missing AUM
    # (or for all funds if bulk failed)
    missing = [
        (code, name) for code, name in schemes.items()
        if code in static and not static[code].get('aum_cr')
    ]

    if not bulk:
        # Bulk failed — try per-scheme for ALL funds (prioritise the 16 non-Groww)
        missing = list(schemes.items())

    if missing:
        print(f"\nPer-scheme fetch for {len(missing)} funds...", file=sys.stderr)
        per_updated = 0
        for code, name in sorted(missing):
            print(f"  [{code}] {name}", file=sys.stderr)
            aum, er = fetch_scheme_aum(code)
            print(f"    AUM={aum}  ER={er}", file=sys.stderr)
            if code in static:
                if aum is not None:
                    static[code]['aum_cr'] = aum
                    per_updated += 1
                if er is not None and static[code].get('expense_ratio', 0) == 0:
                    static[code]['expense_ratio'] = er
            time.sleep(1.5)
        print(f"Per-scheme: updated {per_updated} funds", file=sys.stderr)

    # Validate — warn if any fund still has AUM = 0
    still_missing = [
        f"{code} ({schemes.get(code, '?')})"
        for code in schemes
        if code in static and not static[code].get('aum_cr')
    ]
    if still_missing:
        print(f"\nWARNING: AUM still 0 for {len(still_missing)} funds:", file=sys.stderr)
        for x in still_missing:
            print(f"  {x}", file=sys.stderr)

    static['_meta']['last_updated'] = TODAY.isoformat()
    with open(STATIC_PATH, 'w', encoding='utf-8') as f:
        json.dump(static, f, indent=2, ensure_ascii=False)

    print(f"\nDone. Static data saved.", file=sys.stderr)


if __name__ == "__main__":
    main()
