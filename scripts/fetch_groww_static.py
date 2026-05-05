"""
fetch_groww_static.py — Scrape Groww fund pages for AUM, ER, and manager data.

Groww pages are server-rendered HTML — no browser/Playwright needed.
Only updates aum_cr, expense_ratio, and managers[] for funds with aum_cr == 0.
Manually-maintained style, concentration, and funds_managed fields are preserved.

Run: python3 scripts/fetch_groww_static.py
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

MONTH_MAP = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
}

# Manual slug overrides where the auto-derived slug doesn't match Groww's URL
SLUG_OVERRIDES: dict[str, list[str]] = {
    "125497": ["sbi-small-cap-fund-direct-plan-growth", "sbi-small-cap-fund-direct-growth"],
    "119556": ["aditya-birla-sun-life-small-cap-fund-direct-growth",
               "aditya-birla-sunlife-small-cap-fund-direct-growth"],
    "152128": ["baroda-bnp-paribas-small-cap-fund-direct-growth"],
    "153612": ["bajaj-finserv-small-cap-fund-direct-growth"],
    "153859": ["jio-blackrock-flexi-cap-fund-direct-growth"],
    "152584": ["trustmf-flexi-cap-fund-direct-growth",
               "trust-mutual-fund-flexi-cap-fund-direct-growth"],
    "152939": ["trustmf-small-cap-fund-direct-growth",
               "trust-mutual-fund-small-cap-fund-direct-growth"],
}


class NameParser(HTMLParser):
    """Extract text from elements whose class contains a given substring."""
    def __init__(self, class_substr: str):
        super().__init__()
        self._substr  = class_substr
        self._capture = False
        self.results: list[str] = []

    def handle_starttag(self, tag, attrs):
        cls = dict(attrs).get('class', '')
        self._capture = self._substr in cls

    def handle_data(self, data):
        if self._capture:
            t = data.strip()
            if t:
                self.results.append(t)

    def handle_endtag(self, tag):
        self._capture = False


def name_to_slug(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s]', '', slug)
    slug = re.sub(r'\s+', '-', slug.strip())
    return slug + "-direct-growth"


def candidate_slugs(name: str, code: str) -> list[str]:
    if code in SLUG_OVERRIDES:
        return SLUG_OVERRIDES[code]
    base = name_to_slug(name)
    alt  = base.replace("-direct-growth", "-direct-plan-growth")
    return [base, alt]


def fetch_page(slug: str) -> str | None:
    url = f"https://groww.in/mutual-funds/{slug}"
    req = urllib.request.Request(url, headers={
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            if resp.status == 200:
                html = resp.read().decode('utf-8', errors='replace')
                # Reject 404/error pages
                if re.search(r'<title[^>]*>\s*404\b', html, re.I):
                    return None
                if '"statusCode":404' in html or '"error":"Not Found"' in html:
                    return None
                return html
    except Exception as e:
        print(f"    {slug}: {type(e).__name__}: {e}", file=sys.stderr)
    return None


def parse_tenure(html: str) -> list[float]:
    """Return list of tenure_years (one per manager) based on start dates."""
    dates = re.findall(
        r'(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})',
        html
    )
    tenures = []
    for day, mon, yr in dates:
        start = datetime.date(int(yr), MONTH_MAP[mon], int(day))
        years = round((TODAY - start).days / 365.25, 1)
        tenures.append(max(0.1, years))
    return tenures


def extract(html: str) -> dict:
    result: dict = {}

    # AUM: "aum":209.24572365  (in crores on Groww)
    m = re.search(r'"aum"\s*:\s*([\d.]+)', html)
    if m:
        result['aum_cr'] = round(float(m.group(1)), 2)

    # Expense ratio: "expense_ratio":"1.02" or "expense_ratio":1.02
    m = re.search(r'"expense_ratio"\s*:\s*"?([\d.]+)"?', html)
    if m:
        er = float(m.group(1))
        if 0.0 < er < 5.0:
            result['expense_ratio'] = er

    # Manager names via HTML parser (class "Management_personName")
    parser = NameParser("Management_personName")
    parser.feed(html)
    names = [n for n in parser.results if len(n) > 2]

    if names:
        tenures = parse_tenure(html)
        managers = []
        for i, name in enumerate(names):
            tenure = tenures[i] if i < len(tenures) else 0.3
            managers.append({
                "name":              name,
                "tenure_years":      tenure,
                "funds_managed":     1,     # placeholder; preserve existing if known
                "changed_last_12mo": False,
            })
        result['managers'] = managers

    return result


def load_schemes() -> dict[str, str]:
    """Read scheme codes + names from fetch_funds.py."""
    text = FETCH_PATH.read_text(encoding='utf-8')
    return {m.group(1): m.group(2)
            for m in re.finditer(r'"(\d{6})"\s*:\s*\("([^"]+)"', text)}


def main() -> None:
    with open(STATIC_PATH, encoding='utf-8') as f:
        static = json.load(f)

    schemes  = load_schemes()
    missing  = {code: name for code, name in schemes.items()
                if code in static and not static[code].get('aum_cr')}

    print(f"Funds to scrape: {len(missing)}", file=sys.stderr)

    updated, failed = 0, []

    for code, name in sorted(missing.items()):
        print(f"\n[{code}] {name}", file=sys.stderr)
        html = None
        for slug in candidate_slugs(name, code):
            print(f"  → {slug}", file=sys.stderr)
            html = fetch_page(slug)
            if html:
                break
            time.sleep(0.5)

        if not html:
            print(f"  FAILED", file=sys.stderr)
            failed.append(f"{code} {name}")
            time.sleep(1)
            continue

        data = extract(html)
        aum  = data.get('aum_cr')
        er   = data.get('expense_ratio')
        mgrs = [m['name'] for m in data.get('managers', [])]
        print(f"  AUM={aum}  ER={er}  managers={mgrs}", file=sys.stderr)

        if not data:
            print(f"  no data found", file=sys.stderr)
            failed.append(f"{code} {name}")
            time.sleep(1.5)
            continue

        if aum  is not None: static[code]['aum_cr']        = aum
        if er   is not None: static[code]['expense_ratio'] = er
        if 'managers' in data:
            existing = static[code].get('managers', [])
            new_mgrs = data['managers']
            # Only preserve funds_managed from existing data (manual entry).
            # Always trust Groww for manager names and tenures.
            for i, mgr in enumerate(new_mgrs):
                if i < len(existing):
                    mgr['funds_managed'] = existing[i].get('funds_managed', 1)
            static[code]['managers'] = new_mgrs

        updated += 1
        time.sleep(1.5)

    static['_meta']['last_updated'] = TODAY.isoformat()
    with open(STATIC_PATH, 'w', encoding='utf-8') as f:
        json.dump(static, f, indent=2, ensure_ascii=False)

    print(f"\n--- Done: {updated}/{len(missing)} updated ---", file=sys.stderr)
    if failed:
        print(f"Failed ({len(failed)}):", file=sys.stderr)
        for x in failed:
            print(f"  {x}", file=sys.stderr)


if __name__ == "__main__":
    main()
