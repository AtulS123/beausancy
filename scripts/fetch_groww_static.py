"""
fetch_groww_static.py — Monthly refresh of Groww-hosted fund data.

Scrapes all 57 funds on each monthly run (not just those with missing data).
For the ~41 funds that exist on Groww, updates:
  - aum_cr, expense_ratio
  - managers[] (name, tenure_years)
  - concentration (top_10_pct, num_stocks, top_sector_pct)

For the ~16 not on Groww: logs failure, leaves existing values untouched.
Style, funds_managed, and changed_last_12mo are always preserved (manual fields).

Run: python3 scripts/fetch_groww_static.py
"""

from __future__ import annotations
import urllib.request, json, re, datetime, sys, time
from collections import defaultdict
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


# ─── HTML parsers ─────────────────────────────────────────────────────────────

class NameParser(HTMLParser):
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


# ─── Slug helpers ──────────────────────────────────────────────────────────────

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


# ─── HTTP fetch ───────────────────────────────────────────────────────────────

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
                if re.search(r'<title[^>]*>\s*404\b', html, re.I):
                    return None
                if '"statusCode":404' in html or '"error":"Not Found"' in html:
                    return None
                return html
    except Exception as e:
        print(f"    {slug}: {type(e).__name__}: {e}", file=sys.stderr)
    return None


# ─── Data extraction ──────────────────────────────────────────────────────────

def parse_tenure(html: str) -> list[float]:
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


def _extract_from_holdings(holdings: list, result: dict) -> None:
    """
    Groww stores portfolio as a flat list of individual holdings, each with
    nature_name ('EQ'/'Debt'), sector_name, and corpus_per (% of AUM).
    Derive num_stocks, top_10_pct, and top_sectors from this list.
    """
    eq = [h for h in holdings if isinstance(h, dict) and h.get('nature_name') == 'EQ']
    if not eq:
        return

    if 'num_stocks' not in result:
        result['num_stocks'] = len(eq)

    if 'top_10_pct' not in result:
        sorted_h = sorted(eq, key=lambda h: float(h.get('corpus_per') or 0), reverse=True)
        t10 = sum(float(h.get('corpus_per') or 0) for h in sorted_h[:10])
        if 0 < t10 <= 100:
            result['top_10_pct'] = round(t10, 1)

    if 'top_sectors' not in result:
        sector_totals: dict[str, float] = defaultdict(float)
        for h in eq:
            sname = (h.get('sector_name') or '').strip()
            pct = float(h.get('corpus_per') or 0)
            if sname and pct > 0:
                sector_totals[sname] += pct
        if sector_totals:
            entries = sorted(sector_totals.items(), key=lambda x: x[1], reverse=True)
            result['top_sectors'] = [{'name': n, 'pct': round(p, 1)} for n, p in entries[:3]]
            result['top_sector_pct'] = round(entries[0][1], 1)


def _scan_for_portfolio(obj: object, result: dict, depth: int = 0) -> None:
    """Recursively walk parsed JSON looking for portfolio keys Groww uses."""
    if depth > 10 or not obj:
        return

    if isinstance(obj, list):
        for item in obj[:100]:
            _scan_for_portfolio(item, result, depth + 1)
        return

    if not isinstance(obj, dict):
        return

    # Groww primary structure: mfServerSideData.holdings — flat list of per-holding dicts
    if 'holdings' in obj and isinstance(obj['holdings'], list):
        _extract_from_holdings(obj['holdings'], result)

    # Fallback: pre-aggregated sector allocation lists (older Groww layouts / other sources)
    if 'top_sectors' not in result:
        for sec_key in ('sectorAllocation', 'sectorList', 'sectorData', 'sectors'):
            if sec_key in obj:
                sectors = obj[sec_key]
                if isinstance(sectors, list) and sectors:
                    entries: list[tuple[str, float]] = []
                    for s in sectors:
                        if not isinstance(s, dict):
                            continue
                        sname = None
                        for nk in ('sectorName', 'sector', 'name', 'category', 'sectorDesc'):
                            if nk in s and isinstance(s[nk], str) and s[nk].strip():
                                sname = s[nk].strip()
                                break
                        spct = None
                        for pk in ('percentage', 'percent', 'value', 'allocation', 'allocationPercent'):
                            if pk in s:
                                try:
                                    spct = float(s[pk])
                                except (TypeError, ValueError):
                                    pass
                                break
                        if sname and spct is not None and 0 < spct < 100:
                            entries.append((sname, round(spct, 1)))
                    if entries:
                        entries.sort(key=lambda x: x[1], reverse=True)
                        result['top_sectors'] = [{'name': n, 'pct': p} for n, p in entries[:3]]
                        result['top_sector_pct'] = entries[0][1]
                break

    # Fallback: direct numeric keys for top_10_pct / num_stocks
    KEY_MAP: dict[str, tuple] = {
        'top10HoldingPercentage':  ('top_10_pct',  float, lambda v: 0 < v <= 100),
        'topTenHoldingPercentage': ('top_10_pct',  float, lambda v: 0 < v <= 100),
        'top10Percent':            ('top_10_pct',  float, lambda v: 0 < v <= 100),
        'totalStocks':             ('num_stocks',  int,   lambda v: 0 < v < 2000),
        'totalHolding':            ('num_stocks',  int,   lambda v: 0 < v < 2000),
        'totalEquityHolding':      ('num_stocks',  int,   lambda v: 0 < v < 2000),
        'numberOfStocks':          ('num_stocks',  int,   lambda v: 0 < v < 2000),
        'stockCount':              ('num_stocks',  int,   lambda v: 0 < v < 2000),
    }
    for src, (dst, cast, ok) in KEY_MAP.items():
        if src in obj and dst not in result:
            try:
                v = cast(obj[src])
                if ok(v):
                    result[dst] = round(v, 1) if dst != 'num_stocks' else v
            except (TypeError, ValueError):
                pass

    # Recurse into all child values
    for v in obj.values():
        if isinstance(v, (dict, list)):
            _scan_for_portfolio(v, result, depth + 1)


def extract_concentration(html: str) -> dict:
    """
    Try to extract top_10_pct, num_stocks, top_sector_pct from Groww HTML.
    Returns a (possibly empty) dict with whatever was found.
    """
    result: dict = {}

    # Strategy 1: parse the Next.js __NEXT_DATA__ JSON blob (most reliable)
    nd = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    if nd:
        try:
            page_data = json.loads(nd.group(1))
            _scan_for_portfolio(page_data, result)
        except Exception:
            pass

    # Strategy 2: direct regex fallbacks (for older page layouts)
    if 'top_10_pct' not in result:
        for pat in [r'"top10HoldingPercentage"\s*:\s*([\d.]+)',
                    r'"topTenHoldingPercentage"\s*:\s*([\d.]+)',
                    r'"top10Percent"\s*:\s*([\d.]+)']:
            m = re.search(pat, html, re.IGNORECASE)
            if m:
                v = float(m.group(1))
                if 0 < v <= 100:
                    result['top_10_pct'] = round(v, 1)
                break

    if 'num_stocks' not in result:
        for pat in [r'"totalStocks"\s*:\s*(\d+)',
                    r'"totalHolding"\s*:\s*(\d+)',
                    r'"stockCount"\s*:\s*(\d+)']:
            m = re.search(pat, html)
            if m:
                v = int(m.group(1))
                if 0 < v < 2000:
                    result['num_stocks'] = v
                break

    return result


def extract(html: str) -> dict:
    result: dict = {}

    # AUM (in crores)
    m = re.search(r'"aum"\s*:\s*([\d.]+)', html)
    if m:
        result['aum_cr'] = round(float(m.group(1)), 2)

    # Expense ratio
    m = re.search(r'"expense_ratio"\s*:\s*"?([\d.]+)"?', html)
    if m:
        er = float(m.group(1))
        if 0.0 < er < 5.0:
            result['expense_ratio'] = er

    # Manager names + tenures
    parser = NameParser("Management_personName")
    parser.feed(html)
    names = [n for n in parser.results if len(n) > 2]
    if names:
        tenures = parse_tenure(html)
        result['managers'] = [
            {
                "name":              name,
                "tenure_years":      tenures[i] if i < len(tenures) else 0.3,
                "funds_managed":     1,
                "changed_last_12mo": False,
            }
            for i, name in enumerate(names)
        ]

    # Portfolio concentration
    conc = extract_concentration(html)
    if conc:
        result['concentration'] = conc

    return result


# ─── Static data helpers ──────────────────────────────────────────────────────

def load_schemes() -> dict[str, str]:
    text = FETCH_PATH.read_text(encoding='utf-8')
    return {m.group(1): m.group(2)
            for m in re.finditer(r'"(\d{6})"\s*:\s*\("([^"]+)"', text)}


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    with open(STATIC_PATH, encoding='utf-8') as f:
        static = json.load(f)

    schemes = load_schemes()
    # Process ALL funds every run — not just those with missing AUM.
    # Funds not on Groww will fail the fetch and their data is left unchanged.
    to_scrape = {code: name for code, name in schemes.items() if code in static}

    print(f"Funds to scrape: {len(to_scrape)}", file=sys.stderr)
    updated, not_on_groww = 0, []

    for code, name in sorted(to_scrape.items()):
        print(f"\n[{code}] {name}", file=sys.stderr)
        html = None
        for slug in candidate_slugs(name, code):
            print(f"  → {slug}", file=sys.stderr)
            html = fetch_page(slug)
            if html:
                break
            time.sleep(0.5)

        if not html:
            print(f"  not on Groww — keeping existing data", file=sys.stderr)
            not_on_groww.append(f"{code} {name}")
            time.sleep(1)
            continue

        data = extract(html)
        aum  = data.get('aum_cr')
        er   = data.get('expense_ratio')
        mgrs = [m['name'] for m in data.get('managers', [])]
        conc = data.get('concentration', {})
        print(f"  AUM={aum}  ER={er}  managers={mgrs}  conc={conc}", file=sys.stderr)

        if not data:
            print(f"  no data extracted", file=sys.stderr)
            not_on_groww.append(f"{code} {name}")
            time.sleep(1.5)
            continue

        if aum is not None:
            static[code]['aum_cr'] = aum
        if er is not None:
            static[code]['expense_ratio'] = er

        if 'managers' in data:
            existing = static[code].get('managers', [])
            new_mgrs = data['managers']
            for i, mgr in enumerate(new_mgrs):
                if i < len(existing):
                    # Preserve manually-set funds_managed and changed_last_12mo
                    mgr['funds_managed']     = existing[i].get('funds_managed', 1)
                    mgr['changed_last_12mo'] = existing[i].get('changed_last_12mo', False)
            static[code]['managers'] = new_mgrs

        if conc:
            existing_conc = static[code].get('concentration',
                {'top_10_pct': 0.0, 'num_stocks': 0, 'top_sector_pct': 0.0})
            for k, v in conc.items():
                if k == 'top_sectors':
                    if v:  # non-empty list
                        existing_conc[k] = v
                elif v and v > 0:
                    existing_conc[k] = v
            static[code]['concentration'] = existing_conc

        updated += 1
        time.sleep(1.5)

    static['_meta']['last_updated'] = TODAY.isoformat()
    with open(STATIC_PATH, 'w', encoding='utf-8') as f:
        json.dump(static, f, indent=2, ensure_ascii=False)

    print(f"\n--- Done: {updated}/{len(to_scrape)} updated ---", file=sys.stderr)
    print(f"Not on Groww ({len(not_on_groww)}): {[x.split()[0] for x in not_on_groww]}", file=sys.stderr)


if __name__ == "__main__":
    main()
