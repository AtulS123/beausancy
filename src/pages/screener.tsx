import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { SiteNav } from '@/components/SiteNav';
import { FilterRail, FILTER_DEFAULTS } from '@/components/screener/FilterRail';
import { FundTable, ColumnPicker, DEFAULT_COLS, sortFunds } from '@/components/screener/FundTable';
import { IcSearch, IcShare, IcDownload, IcSun, IcMoon, IcPanel, IcColumns, IcX } from '@/components/screener/Icons';
import { MOCK_FUNDS } from '@/lib/mock-funds';
import type { FilterState, SortState, TweaksState, Fund } from '@/lib/types';

// ─── URL encode / decode ───────────────────────────────────────────────────
function encodeState(s: FilterState, sort: SortState, cols: string[]): string {
  const p = new URLSearchParams();
  const d = FILTER_DEFAULTS;
  if (s.categories.length) p.set("cat", s.categories.join(","));
  if (s.aum[0] !== d.aum[0] || s.aum[1] !== d.aum[1]) p.set("aum", s.aum.join("-"));
  if (s.expense[0] !== d.expense[0] || s.expense[1] !== d.expense[1]) p.set("er", s.expense.join("-"));
  if (s.fundAge !== d.fundAge) p.set("age", String(s.fundAge));
  if (s.consistency !== d.consistency) p.set("cons", String(s.consistency));
  if (s.rollingWindow !== d.rollingWindow) p.set("win", s.rollingWindow);
  if (s.minCagr !== d.minCagr) p.set("cagr", String(s.minCagr));
  if (s.maxDd !== d.maxDd) p.set("dd", String(s.maxDd));
  if (s.recovery !== d.recovery) p.set("rec", String(s.recovery));
  if (s.hideNoDd) p.set("rdd", "1");
  if (s.mgrTenure !== d.mgrTenure) p.set("mt", String(s.mgrTenure));
  if (s.excludeRecentChange) p.set("mch", "1");
  if (s.styleMatch.length) p.set("sm", s.styleMatch.join(","));
  if (s.styleBasis !== d.styleBasis) p.set("sb", s.styleBasis);
  if (s.top10[0] !== d.top10[0] || s.top10[1] !== d.top10[1]) p.set("t10", s.top10.join("-"));
  if (s.numStocks[0] !== d.numStocks[0] || s.numStocks[1] !== d.numStocks[1]) p.set("ns", s.numStocks.join("-"));
  if (s.topSector[0] !== d.topSector[0] || s.topSector[1] !== d.topSector[1]) p.set("ts", s.topSector.join("-"));
  if (sort.col !== "cons" || sort.dir !== "desc") p.set("sort", `${sort.col}.${sort.dir}`);
  if (cols.join(",") !== DEFAULT_COLS.join(",")) p.set("cols", cols.join(","));
  return p.toString();
}

function decodeState(search: string): { filters: FilterState; sort: SortState; cols: string[] } {
  const p = new URLSearchParams(search);
  const s: FilterState = JSON.parse(JSON.stringify(FILTER_DEFAULTS));
  const pair = (k: string): [number, number] | null => {
    const v = p.get(k);
    if (!v) return null;
    const parts = v.split("-").map(Number);
    return [parts[0], parts[1]];
  };
  if (p.get("cat")) s.categories = p.get("cat")!.split(",");
  const aum = pair("aum"); if (aum) s.aum = aum;
  const er = pair("er"); if (er) s.expense = er;
  if (p.get("age")) s.fundAge = +p.get("age")!;
  if (p.get("cons")) s.consistency = +p.get("cons")!;
  if (p.get("win")) s.rollingWindow = p.get("win") as FilterState["rollingWindow"];
  if (p.get("cagr")) s.minCagr = +p.get("cagr")!;
  if (p.get("dd"))  s.maxDd = +p.get("dd")!;
  if (p.get("rec")) s.recovery = +p.get("rec")!;
  if (p.get("rdd")) s.hideNoDd = true;
  if (p.get("mt"))  s.mgrTenure = +p.get("mt")!;
  if (p.get("mch")) s.excludeRecentChange = true;
  if (p.get("sm"))  s.styleMatch = p.get("sm")!.split(",");
  if (p.get("sb"))  s.styleBasis = p.get("sb")!;
  const t10 = pair("t10"); if (t10) s.top10 = t10;
  const ns = pair("ns"); if (ns) s.numStocks = ns;
  const ts = pair("ts"); if (ts) s.topSector = ts;
  let sort: SortState = { col: "cons", dir: "desc" };
  if (p.get("sort")) {
    const parts = p.get("sort")!.split(".");
    sort = { col: parts[0], dir: parts[1] as "asc" | "desc" };
  }
  const cols = p.get("cols") ? p.get("cols")!.split(",") : DEFAULT_COLS;
  return { filters: s, sort, cols };
}

// ─── Filter logic ────────────────────────────────────────────────────────
function matches(f: Fund, s: FilterState, searchQ: string): boolean {
  if (searchQ) {
    const q = searchQ.toLowerCase();
    if (!f.name.toLowerCase().includes(q) && !f.amc.toLowerCase().includes(q)) return false;
  }
  if (s.categories.length && !s.categories.includes(f.category)) return false;
  if (f.aum_cr < s.aum[0] || f.aum_cr > s.aum[1]) return false;
  if (f.expense_ratio < s.expense[0] || f.expense_ratio > s.expense[1]) return false;
  const age = (Date.now() - new Date(f.inception_date).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (age < s.fundAge) return false;
  if (f.rolling_consistency_3y_pct == null && s.consistency > 0) return false;
  if ((f.rolling_consistency_3y_pct ?? 0) < s.consistency) return false;
  const rKey = s.rollingWindow === "1Y" ? "1y" : s.rollingWindow === "5Y" ? "5y" : "3y";
  const rVal = f.returns[rKey as "1y"|"3y"|"5y"];
  if (s.minCagr > 0 && (rVal == null || rVal < s.minCagr)) return false;
  if (Math.abs(f.max_drawdown_5y_pct) > s.maxDd) return false;
  if (f.recovery_months > s.recovery) return false;
  if (s.hideNoDd) {
    if (age < 3) return false;
    if (Math.abs(f.max_drawdown_5y_pct) < 10) return false;
  }
  if (f.manager.tenure_years < s.mgrTenure) return false;
  if (s.excludeRecentChange && f.manager.changed_last_12mo) return false;
  if (s.styleMatch.length && !s.styleMatch.includes(f.style.match)) return false;
  if (s.styleBasis !== "Any" && f.style.basis !== s.styleBasis) return false;
  if (f.concentration.top_10_pct < s.top10[0] || f.concentration.top_10_pct > s.top10[1]) return false;
  if (f.concentration.num_stocks < s.numStocks[0] || f.concentration.num_stocks > s.numStocks[1]) return false;
  if (f.concentration.top_sector_pct < s.topSector[0] || f.concentration.top_sector_pct > s.topSector[1]) return false;
  return true;
}

// ─── CSV export ─────────────────────────────────────────────────────────
function toCSV(rows: Fund[]): string {
  const header = ["ID","Name","AMC","Category","AUM_Cr","ER_pct","3Y_CAGR","5Y_CAGR","Rolling_Consistency_3Y_pct","Max_DD_5Y_pct","Recovery_mo","Manager","Manager_Tenure_y","Top10_pct","NumStocks","Style_R2","Style_Match"];
  const lines = [header.join(",")];
  rows.forEach(f => {
    lines.push([
      f.id, `"${f.name}"`, f.amc, f.category, f.aum_cr, f.expense_ratio,
      f.returns["3y"] ?? "", f.returns["5y"] ?? "",
      f.rolling_consistency_3y_pct ?? "", f.max_drawdown_5y_pct,
      f.recovery_months, `"${f.manager.name}"`, f.manager.tenure_years,
      f.concentration.top_10_pct, f.concentration.num_stocks,
      f.style.r_squared, f.style.match
    ].join(","));
  });
  return lines.join("\n");
}

function labelFor(col: string): string {
  return ({
    name:"Fund", category:"Category", aum:"AUM", er:"Expense",
    r3y:"3Y CAGR", r5y:"5Y CAGR", cons:"Rolling consistency",
    dd:"Max DD", rec:"Recovery", mgr:"Mgr tenure", t10:"Top-10 %",
    style:"Style match"
  } as Record<string, string>)[col] || col;
}

// ─── Tweaks panel ─────────────────────────────────────────────────────────
const ACCENT_COLORS: Record<string, string[]> = {
  emerald: ["#10b981","#047857","rgba(16,185,129,0.08)","rgba(16,185,129,0.22)","rgba(16,185,129,0.12)","rgba(16,185,129,0.45)","#34d399"],
  indigo:  ["#6366f1","#4338ca","rgba(99,102,241,0.08)","rgba(99,102,241,0.22)","rgba(99,102,241,0.12)","rgba(99,102,241,0.45)","#818cf8"],
  amber:   ["#f59e0b","#b45309","rgba(245,158,11,0.08)","rgba(245,158,11,0.22)","rgba(245,158,11,0.12)","rgba(245,158,11,0.45)","#fbbf24"],
  rose:    ["#f43f5e","#be123c","rgba(244,63,94,0.08)","rgba(244,63,94,0.22)","rgba(244,63,94,0.12)","rgba(244,63,94,0.45)","#fb7185"],
  cyan:    ["#06b6d4","#0e7490","rgba(6,182,212,0.08)","rgba(6,182,212,0.22)","rgba(6,182,212,0.12)","rgba(6,182,212,0.45)","#22d3ee"],
};
const ACCENT_HEX: Record<string, string> = { emerald:"#10b981", indigo:"#6366f1", amber:"#f59e0b", rose:"#f43f5e", cyan:"#06b6d4" };

interface TweaksPanelProps {
  tweaks: TweaksState;
  update: (patch: Partial<TweaksState>) => void;
  onClose: () => void;
}

function TweaksPanel({ tweaks, update, onClose }: TweaksPanelProps) {
  return (
    <div className="tweaks-panel">
      <div className="tweaks-head">
        <span className="tweaks-title">Tweaks</span>
        <button className="iconbtn" onClick={onClose} title="Close"><IcX size={12}/></button>
      </div>
      <div className="tweaks-body">
        <div className="tweak-row">
          <label>Accent</label>
          <div className="tweak-swatches">
            {Object.entries(ACCENT_HEX).map(([a, hex]) => (
              <button key={a}
                className={`sw ${tweaks.accent === a ? 'on' : ''}`}
                style={{ background: hex }}
                onClick={() => update({ accent: a })}
                title={a}
              />
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <label>Density</label>
          <div className="tweak-seg">
            {(["compact","normal","comfortable"] as const).map(d => (
              <button key={d} className={`seg ${tweaks.density === d ? 'on' : ''}`}
                onClick={() => update({ density: d })}>{d}</button>
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <label>Table font <span className="tweak-val mono">{tweaks.tableFontSize}px</span></label>
          <input type="range" min="10" max="15" step="1" value={tweaks.tableFontSize}
            onChange={(e) => update({ tableFontSize: +e.target.value })} style={{pointerEvents:'auto'}}/>
        </div>
        <div className="tweak-row">
          <label>Filter rail <span className="tweak-val mono">{tweaks.railWidth}px</span></label>
          <input type="range" min="260" max="400" step="10" value={tweaks.railWidth}
            onChange={(e) => update({ railWidth: +e.target.value })} style={{pointerEvents:'auto'}}/>
        </div>
        <div className="tweak-row tweak-toggle">
          <label>Sparklines</label>
          <button
            className={`toggle ${tweaks.sparklines ? 'on' : ''}`}
            onClick={() => update({ sparklines: !tweaks.sparklines })}
            style={{border:0, cursor:'pointer'}}
          >
            <span className="dot"/>
          </button>
        </div>
        <div className="tweak-row tweak-toggle">
          <label>Zebra rows</label>
          <button
            className={`toggle ${tweaks.zebra ? 'on' : ''}`}
            onClick={() => update({ zebra: !tweaks.zebra })}
            style={{border:0, cursor:'pointer'}}
          >
            <span className="dot"/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast hook ──────────────────────────────────────────────────────────
function useToast(): [React.ReactElement, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  const show = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2200); };
  const el = (
    <div className={`toast ${msg ? 'show' : ''}`}>
      {msg && <><span className="dot"/>{msg}</>}
    </div>
  );
  return [el, show];
}

// ─── Main screener page ──────────────────────────────────────────────────
export default function Screener() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Parse initial state from URL
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [sort, setSort] = useState<SortState>({ col: "cons", dir: "desc" });
  const [cols, setCols] = useState<string[]>(DEFAULT_COLS);
  const [searchQ, setSearchQ] = useState("");
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [showColPicker, setShowColPicker] = useState(false);
  const [tweaksActive, setTweaksActive] = useState(false);
  const [tweaks, setTweaks] = useState<TweaksState>({
    accent: "emerald", density: "normal", tableFontSize: 12,
    sparklines: true, zebra: false, railWidth: 320
  });
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [toast, showToast] = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch funds from API
  useEffect(() => {
    fetch("/api/funds")
      .then(r => r.json())
      .then(data => setFunds(data.funds ?? []))
      .catch(() => setFunds(MOCK_FUNDS))
      .finally(() => setFundsLoading(false));
  }, []);

  // Initialize from URL on mount
  useEffect(() => {
    if (!router.isReady) return;
    const { filters: f, sort: s, cols: c } = decodeState(router.asPath.split("?")[1] || "");
    setFilters(f); setSort(s); setCols(c);
    // Load theme from localStorage
    const saved = localStorage.getItem("theme");
    if (saved) setTheme(saved);
    setReady(true);
  }, [router.isReady, router.asPath]);

  // Apply tweaks to CSS vars
  useEffect(() => {
    const root = document.documentElement;
    const colors = ACCENT_COLORS[tweaks.accent] || ACCENT_COLORS.emerald;
    const [a, ad, ab, abd, cba, cbd, sp] = colors;
    root.style.setProperty("--accent", a);
    root.style.setProperty("--accent-dim", ad);
    root.style.setProperty("--accent-bg", ab);
    root.style.setProperty("--accent-border", abd);
    root.style.setProperty("--chip-bg-active", cba);
    root.style.setProperty("--chip-border-active", cbd);
    root.style.setProperty("--sparkline", sp);
    root.style.setProperty("--slider-range", a);
    root.style.setProperty("--row-h", tweaks.density === "compact" ? "32px" : tweaks.density === "comfortable" ? "48px" : "40px");
    root.style.setProperty("--table-fs", tweaks.tableFontSize + "px");
    root.style.setProperty("--rail-w", tweaks.railWidth + "px");
    root.dataset.zebra = tweaks.zebra ? "1" : "0";
    root.dataset.sparklines = tweaks.sparklines ? "1" : "0";
  }, [tweaks]);

  // Apply theme
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  // URL sync (debounced)
  useEffect(() => {
    if (!ready) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const qs = encodeState(filters, sort, cols);
      const url = qs ? `/screener?${qs}` : "/screener";
      window.history.replaceState(null, "", url);
    }, 300);
  }, [filters, sort, cols, ready]);

  // Keyboard shortcuts
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") searchRef.current?.blur();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const setF = useCallback((patch: Partial<FilterState>) => setFilters(s => ({ ...s, ...patch })), []);
  const reset = useCallback(() => setFilters(FILTER_DEFAULTS), []);
  const updateTweaks = (patch: Partial<TweaksState>) => setTweaks(t => ({ ...t, ...patch }));

  const total = funds.length;
  const filtered = useMemo(
    () => funds.filter(f => matches(f, filters, searchQ)),
    [funds, filters, searchQ]
  );
  const sorted = useMemo(() => sortFunds(filtered, sort), [filtered, sort]);

  const onSort = (col: string) => {
    setSort(s => s.col === col
      ? { col, dir: s.dir === "asc" ? "desc" : "asc" }
      : { col, dir: col === "name" || col === "category" ? "asc" : "desc" }
    );
  };

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Screen URL copied");
    } catch { showToast("Copied"); }
  };

  const onExport = () => {
    const csv = toCSV(sorted);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beausancy-screen-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${sorted.length} funds`);
  };

  // Active filter pills
  const pills: Array<{k: keyof FilterState; t: string}> = [];
  if (filters.categories.length) pills.push({k:"categories", t: filters.categories.join(" · ")});
  if (filters.consistency !== FILTER_DEFAULTS.consistency) pills.push({k:"consistency", t:`consistency ≥ ${filters.consistency}%`});
  if (filters.maxDd !== FILTER_DEFAULTS.maxDd) pills.push({k:"maxDd", t:`maxDD ≤ −${filters.maxDd}%`});
  if (filters.mgrTenure > 0) pills.push({k:"mgrTenure", t:`mgr ≥ ${filters.mgrTenure}y`});
  if (filters.styleMatch.length) pills.push({k:"styleMatch", t:`style: ${filters.styleMatch.join("·")}`});
  if (filters.excludeRecentChange) pills.push({k:"excludeRecentChange", t:"exclude recent mgr change"});
  if (filters.hideNoDd) pills.push({k:"hideNoDd", t:"hide tiny DD"});
  if (filters.minCagr > 0) pills.push({k:"minCagr", t:`${filters.rollingWindow} CAGR ≥ ${filters.minCagr}%`});

  return (
    <>
      <Head>
        <title>Beausancy Screener — Indian Mutual Fund Screener</title>
        <meta name="description" content="Screen 1,400+ Indian mutual fund schemes by rolling consistency, drawdown, style integrity and manager tenure." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={`app ${railCollapsed ? 'rail-collapsed' : ''}`}>
        {/* Site nav */}
        <SiteNav activePage="screener" />

        {/* Topbar */}
        <header className={`topbar ${railCollapsed ? 'rail-collapsed' : ''}`}>
          <div className="wordmark">
            <span className="dim" style={{
              fontSize:"10.5px",
              textTransform:"uppercase",
              letterSpacing:"0.08em",
              fontFamily:"'JetBrains Mono', monospace"
            }}>
              Screener
            </span>
          </div>

          <div className="topbar-center">
            <button className="iconbtn" onClick={() => setRailCollapsed(v => !v)} title="Toggle filter rail">
              <IcPanel size={14}/>
            </button>
            <div className="search">
              <IcSearch/>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search by fund name or AMC…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
              <kbd>⌘K</kbd>
            </div>
            <div className="count">
              <span className="n mono">{sorted.length}</span>
              {" "}<span className="tot mono">of {total}</span> funds
              {sorted.length !== total && (
                <span className="diff mono">· {((sorted.length / total) * 100).toFixed(0)}%</span>
              )}
            </div>
          </div>

          <div className="topbar-right">
            <button className="btn" onClick={onShare}><IcShare size={12}/> Share screen</button>
            <button className="btn" onClick={onExport}><IcDownload size={12}/> CSV</button>
            <div className="sep"/>
            <button className="iconbtn" onClick={() => setTweaksActive(v => !v)} title="Tweaks">
              <span style={{fontSize:"11px", fontFamily:"'JetBrains Mono', monospace", color:"var(--text-dim)"}}>⚙</span>
            </button>
            <button
              className="iconbtn"
              onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              title="Toggle theme"
            >
              {theme === "dark" ? <IcSun size={14}/> : <IcMoon size={14}/>}
            </button>
          </div>
        </header>

        {/* Tweaks panel */}
        {tweaksActive && (
          <TweaksPanel tweaks={tweaks} update={updateTweaks} onClose={() => setTweaksActive(false)}/>
        )}

        {/* Main content */}
        <main className={`main ${railCollapsed ? 'rail-collapsed' : ''}`}>
          <FilterRail
            state={filters}
            set={setF}
            reset={reset}
            collapsed={railCollapsed}
            onToggleRail={() => setRailCollapsed(v => !v)}
          />

          <section className="results">
            {/* Table bar */}
            <div className="tablebar">
              <div className="l">
                <div className="sortinfo">
                  <span className="col">Sorted by</span>{" "}
                  <span style={{color:"var(--text)"}}>{labelFor(sort.col)}</span>{" "}
                  <span className="dir">{sort.dir === "asc" ? "↑" : "↓"}</span>
                </div>
                {pills.length > 0 && (
                  <div className="active-pills">
                    {pills.map(p => (
                      <span key={p.k} className="active-pill">
                        {p.t}
                        <span
                          className="x"
                          onClick={() => setF({ [p.k]: FILTER_DEFAULTS[p.k] } as Partial<FilterState>)}
                        >
                          <IcX size={10}/>
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="r">
                <button className="iconbtn" onClick={() => setShowColPicker(v => !v)}>
                  <IcColumns size={13}/> Columns
                </button>
                {showColPicker && (
                  <ColumnPicker
                    cols={cols}
                    setCols={setCols}
                    onClose={() => setShowColPicker(false)}
                  />
                )}
              </div>
            </div>

            {/* Table */}
            <div className="tablewrap">
              <FundTable
                funds={sorted}
                allFunds={funds}
                sort={sort}
                onSort={onSort}
                cols={cols}
                onReset={reset}
              />
            </div>

            {/* Table footer */}
            <div className="tabfoot">
              <div className="l">
                <span>{sorted.length} rows</span>
                <span>·</span>
                <span>sort: {labelFor(sort.col)} {sort.dir}</span>
              </div>
              <div className="l" style={{gap:12}}>
                <span>{fundsLoading ? "Loading…" : `${total} funds`}</span>
                <span>·</span>
                <span>Rolling windows computed over last 7y</span>
              </div>
            </div>
          </section>
        </main>

        {toast}
      </div>
    </>
  );
}
