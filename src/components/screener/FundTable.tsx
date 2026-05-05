import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { Fund, SortState } from '@/lib/types';
import { fmtAUM, fmtAUMFull } from './Controls';
import { IcColumns, IcReset } from './Icons';

// ─── Sparkline ────────────────────────────────────────────────────────────
interface SparkProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Spark({ data, width = 88, height = 20, color }: SparkProps) {
  if (!data || data.length < 2) return <span style={{color:"var(--text-quiet)"}}>—</span>;
  const lo = Math.min(...data), hi = Math.max(...data);
  const range = hi - lo || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - ((v - lo) / range) * height
  ]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const up = data[data.length - 1] >= data[0];
  const stroke = color || (up ? "var(--pos)" : "var(--neg)");
  const area = path + ` L${width},${height} L0,${height} Z`;
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={area} fill={stroke} opacity="0.08"/>
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Column definitions ────────────────────────────────────────────────────
export interface ColDef {
  id: string;
  label: string;
  num: boolean;
  w: number;
  always?: boolean;
  help: string;
}

export const ALL_COLS: ColDef[] = [
  { id: "name",     label: "Fund",           num: false, w: 260, always: true, help: "Scheme name, AMC, ID and benchmark." },
  { id: "category", label: "Cat",            num: false, w: 90,  help: "SEBI scheme category (Flexi Cap, Large Cap, Mid Cap, Small Cap, ELSS, Hybrid, Index, Sectoral, Contra)." },
  { id: "aum",      label: "AUM (Cr)",       num: true,  w: 100, help: "Assets Under Management in ₹ crore (AAUM as of last monthly update). Very small funds (< ₹100 Cr) can be volatile and illiquid; very large small-cap funds can struggle to deploy fresh inflows." },
  { id: "er",       label: "ER (Direct)",   num: true,  w: 74,  help: "Expense Ratio for the Direct Plan (no distributor commission), as % of assets per year. This is the TER you actually pay when investing directly. Compounds against returns — a 0.5% lower ER over 20 years is meaningful." },
  { id: "r3y",      label: "3Y CAGR",        num: true,  w: 96,  help: "3-year Compound Annual Growth Rate of NAV. A single window — easily cherry-picked. Check rolling consistency alongside." },
  { id: "r5y",      label: "5Y CAGR",        num: true,  w: 96,  help: "5-year Compound Annual Growth Rate. Smoother than 3Y but still a single window; use rolling consistency to see if the fund actually stays good." },
  { id: "cons",     label: "Rolling cons.",  num: true,  w: 130, help: "Rolling 3Y consistency over the last 7 years: share of overlapping 3-year windows where the fund beat its category average 3Y return. Benchmark = average 3Y CAGR of all funds in the same category. High = repeatable alpha, not one lucky year." },
  { id: "dd",       label: "Max DD",         num: true,  w: 78,  help: "Maximum drawdown over last 5 years — the worst peak-to-trough NAV fall. Tells you how ugly it got, not how often." },
  { id: "rec",      label: "Recov",          num: true,  w: 68,  help: "Recovery time in months: how long the fund took to climb back to its pre-drawdown peak NAV. Short recovery = the dip was fast; long recovery = sustained pain." },
  { id: "mgr",      label: "Manager",        num: false, w: 150, help: "Fund manager name and tenure at this fund. Hover the funds count to see which other funds in this screener the manager runs (workload indicator). Click '+N' to expand all managers. Each name links to LinkedIn. ⚠ = manager changed in last 12 months." },
  { id: "t10",      label: "Top-10 %",       num: true,  w: 80,  help: "% of portfolio in the top 10 stocks. >60% = concentrated conviction; <30% = broadly diversified. Concentrated funds can be great or disastrous depending on the manager." },
  { id: "sectors",  label: "Top Sectors",    num: false, w: 170, help: "Top 3 equity sectors by allocation weight. Shows sector name and % of portfolio. Useful for spotting hidden concentration — two funds with similar returns may have very different sector bets. Source: Groww, updated monthly." },
  { id: "style",    label: "Style",          num: false, w: 90,  help: "Style integrity (R²): how closely the fund's actual holdings match its declared category. Strict (R²>0.85) = tight adherence. Mod (0.65–0.85) = some drift. Drift (<0.65) = effectively a different style. Hover a cell to see declared vs actual style and the factor basis (Value/Growth/Quality/Momentum/Low-Vol/Blend)." },
  { id: "spark",    label: "3Y trend",       num: false, w: 110, help: "Sparkline of NAV over the last 3 years. Visual shape only — use for pattern recognition, not precise reads." }
];

export const DEFAULT_COLS = ["name","category","aum","er","r3y","r5y","cons","dd","rec","mgr","t10","sectors","style","spark"];

// ─── Sort helpers ──────────────────────────────────────────────────────────
function numCompare(a: number | null | undefined, b: number | null | undefined, dir: string): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return dir === "asc" ? a - b : b - a;
}

function strCompare(a: string, b: string, dir: string): number {
  return dir === "asc" ? a.localeCompare(b) : b.localeCompare(a);
}

export function sortFunds(funds: Fund[], sort: SortState): Fund[] {
  const { col, dir } = sort;
  const s = [...funds];
  s.sort((a, b) => {
    switch (col) {
      case "name":     return strCompare(a.name, b.name, dir);
      case "category": return strCompare(a.category, b.category, dir);
      case "aum":      return numCompare(a.aum_cr, b.aum_cr, dir);
      case "er":       return numCompare(a.expense_ratio, b.expense_ratio, dir);
      case "r3y":      return numCompare(a.returns["3y"], b.returns["3y"], dir);
      case "r5y":      return numCompare(a.returns["5y"], b.returns["5y"], dir);
      case "cons":     return numCompare(a.rolling_consistency_3y_pct, b.rolling_consistency_3y_pct, dir);
      case "dd":       return numCompare(a.max_drawdown_5y_pct, b.max_drawdown_5y_pct, dir);
      case "rec":      return numCompare(a.recovery_months, b.recovery_months, dir);
      case "mgr":      return numCompare(a.manager.tenure_years, b.manager.tenure_years, dir);
      case "t10":      return numCompare(a.concentration.top_10_pct, b.concentration.top_10_pct, dir);
      case "sectors":  return numCompare(a.concentration.top_sector_pct, b.concentration.top_sector_pct, dir);
      case "style":    return numCompare(a.style.r_squared, b.style.r_squared, dir);
      default: return 0;
    }
  });
  return s;
}

// ─── Delta string ─────────────────────────────────────────────────────────
function deltaStr(v: number | null, base: number | null): { t: string; cls: string } | null {
  if (v == null || base == null) return null;
  const d = +(v - base).toFixed(1);
  if (d === 0) return { t: "±0.0", cls: "" };
  return { t: (d > 0 ? "+" : "") + d.toFixed(1), cls: d > 0 ? "pos" : "neg" };
}

// ─── LinkedIn icon ────────────────────────────────────────────────────────
function LiLink({ name }: { name: string }) {
  const url = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name + ' fund manager india')}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Search ${name} on LinkedIn`}
      onClick={e => e.stopPropagation()}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 14, height: 14, borderRadius: 2, background: "#0a66c2",
        color: "#fff", fontSize: "8px", fontWeight: 700, textDecoration: "none",
        flexShrink: 0, lineHeight: 1, letterSpacing: 0,
      }}
    >
      in
    </a>
  );
}

// ─── Manager cell (click to expand all managers) ──────────────────────────
function FundsCountBadge({ name, managerFunds }: { name: string; managerFunds: Record<string, string[]> }) {
  const otherFunds = (managerFunds[name] || []).filter(n => n !== name);
  // "X funds" label — the full list on hover uses the tt pattern
  const allFunds = managerFunds[name] || [];
  if (allFunds.length <= 1) return null;
  return (
    <span className="tt" style={{position: "relative", display: "inline-block"}}>
      <span style={{
        fontSize: "9px", color: "var(--text-quiet)", cursor: "default",
        borderBottom: "1px dashed var(--border)",
      }}>
        {allFunds.length} fund{allFunds.length !== 1 ? "s" : ""}
      </span>
      <div className="tt-body" style={{minWidth: 180, left: 0, right: "auto"}}>
        <div style={{fontSize:"10px", color:"var(--text-dim)", marginBottom: 4, fontWeight: 600}}>
          Also manages in this screener:
        </div>
        {otherFunds.length === 0
          ? <div style={{fontSize:"9.5px", color:"var(--text-quiet)"}}>No other funds in screener</div>
          : otherFunds.map((fn, i) => (
            <div key={i} style={{fontSize:"9.5px", color:"var(--text)", padding: "1px 0"}}>{fn}</div>
          ))
        }
      </div>
    </span>
  );
}

function MgrCell({ f, managerFunds }: { f: Fund; managerFunds: Record<string, string[]> }) {
  const [expanded, setExpanded] = useState(false);
  const managers: typeof f.managers = f.managers?.length ? f.managers : [f.manager];
  const lead = managers[0];
  const rest = managers.slice(1);

  return (
    <td style={{verticalAlign: "top", padding: "6px 8px"}}>
      {/* Lead manager row */}
      <div style={{display: "flex", alignItems: "flex-start", gap: 5}}>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap"}}>
            <span className="fund-name" style={{fontSize: "11.5px"}}>{lead.name}</span>
            <LiLink name={lead.name} />
            {lead.changed_last_12mo && <span style={{color: "var(--warn)", fontSize: "11px"}}>⚠</span>}
          </div>
          <span className="fund-sub mono" style={{fontSize: "10px", display: "flex", alignItems: "center", gap: 4}}>
            {lead.tenure_years.toFixed(1)} yr
            {" · "}
            <FundsCountBadge name={lead.name} managerFunds={managerFunds} />
          </span>
        </div>
        {rest.length > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              fontSize: "9px", color: "var(--accent)", background: "var(--accent-bg)",
              border: "1px solid var(--accent-border)", borderRadius: 3, cursor: "pointer",
              padding: "1px 5px", flexShrink: 0, marginTop: 1,
            }}
          >
            {expanded ? "▲" : `+${rest.length}`}
          </button>
        )}
      </div>

      {/* Additional managers (expanded) */}
      {expanded && rest.map((m, i) => (
        <div key={i} style={{
          marginTop: 5, paddingTop: 5,
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "flex-start", gap: 5,
        }}>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{display: "flex", alignItems: "center", gap: 4}}>
              <span style={{fontSize: "11px", color: "var(--text)"}}>{m.name}</span>
              <LiLink name={m.name} />
              {m.changed_last_12mo && <span style={{color: "var(--warn)", fontSize: "11px"}}>⚠</span>}
            </div>
            <span className="fund-sub mono" style={{fontSize: "9.5px", display: "flex", alignItems: "center", gap: 4}}>
              {m.tenure_years.toFixed(1)} yr
              {" · "}
              <FundsCountBadge name={m.name} managerFunds={managerFunds} />
            </span>
          </div>
        </div>
      ))}
    </td>
  );
}

// ─── Cell ─────────────────────────────────────────────────────────────────
interface CellProps {
  col: string;
  f: Fund;
  managerFunds: Record<string, string[]>;
}

function Cell({ col, f, managerFunds }: CellProps) {
  switch (col) {
    case "name":
      return (
        <td className="fund-cell">
          {f.scheme_url
            ? <a href={f.scheme_url} target="_blank" rel="noopener noreferrer" className="fund-name fund-link" title={`${f.name} — ${f.amc} (opens fund page)`}>{f.name}</a>
            : <span className="fund-name" title={`${f.name} — ${f.amc}`}>{f.name}</span>
          }
          <span className="fund-sub mono"><span>{f.amc}</span> <span className="fund-id">· {f.id}</span></span>
        </td>
      );
    case "category":
      return <td><span className="cat-pill">{f.category}</span></td>;
    case "aum":
      if (!f.aum_cr) return <td className="num"><span style={{color:"var(--text-quiet)"}}>—</span></td>;
      return (
        <td className="num tt">
          <span className="val">{fmtAUM(f.aum_cr)}</span>
          <span className="delta" style={{marginLeft:2}}>Cr</span>
          <div className="tt-body">
            <div className="row"><span className="k">Total AUM</span><span className="v">{fmtAUMFull(f.aum_cr)}</span></div>
            <div style={{fontSize:"9.5px",color:"var(--text-quiet)",marginTop:4}}>Source: AMFI AAUM, updated monthly</div>
          </div>
        </td>
      );
    case "er":
      if (!f.expense_ratio) return <td className="num"><span style={{color:"var(--text-quiet)"}}>—</span></td>;
      return <td className="num"><span className="val">{f.expense_ratio.toFixed(2)}</span><span className="delta">%</span></td>;
    case "r3y": {
      const v = f.returns["3y"];
      const d = deltaStr(v, f.category_avg_returns["3y"]);
      if (v == null) return <td className="num"><span style={{color:"var(--text-quiet)"}}>—</span></td>;
      return (
        <td className="num">
          <span className={`val strong ${v < 0 ? 'neg' : ''}`}>{v > 0 ? '+' : ''}{v.toFixed(1)}%</span>
          {d && <span className={`delta ${d.cls}`}>{d.t} vs cat</span>}
        </td>
      );
    }
    case "r5y": {
      const v = f.returns["5y"];
      const d = deltaStr(v, f.category_avg_returns["5y"]);
      if (v == null) return <td className="num"><span style={{color:"var(--text-quiet)"}}>—</span></td>;
      return (
        <td className="num">
          <span className={`val strong ${v < 0 ? 'neg' : ''}`}>{v > 0 ? '+' : ''}{v.toFixed(1)}%</span>
          {d && <span className={`delta ${d.cls}`}>{d.t} vs cat</span>}
        </td>
      );
    }
    case "cons": {
      const v = f.rolling_consistency_3y_pct;
      if (v == null) return <td className="num"><span style={{color:"var(--text-quiet)"}}>—</span><span className="delta">n/a</span></td>;
      const fillCls = v >= 70 ? "" : v >= 50 ? "weak" : "bad";
      return (
        <td className="num">
          <span className="inline-bar">
            <span className="track"><span className={`fill ${fillCls}`} style={{width: v + "%"}} /></span>
            <span className="val">{v}%</span>
          </span>
        </td>
      );
    }
    case "dd":
      return <td className="num"><span className="val neg">{f.max_drawdown_5y_pct.toFixed(1)}%</span></td>;
    case "rec":
      return <td className="num"><span className="val">{f.recovery_months}</span><span className="delta">mo</span></td>;
    case "mgr":
      return <MgrCell f={f} managerFunds={managerFunds} />;
    case "t10":
      if (!f.concentration.top_10_pct) return <td className="num"><span style={{color:"var(--text-quiet)"}}>—</span></td>;
      return <td className="num"><span className="val">{f.concentration.top_10_pct.toFixed(1)}</span><span className="delta">%</span></td>;
    case "sectors": {
      const sectors = f.concentration.top_sectors;
      if (!sectors || sectors.length === 0)
        return <td><span style={{color:"var(--text-quiet)"}}>—</span></td>;
      return (
        <td style={{padding: "5px 8px"}}>
          {sectors.map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
              gap: 6, lineHeight: "1.55",
            }}>
              <span style={{
                fontSize: "10px",
                color: i === 0 ? "var(--text)" : "var(--text-dim)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: 118,
              }} title={s.name}>
                {s.name}
              </span>
              <span style={{
                fontSize: "9.5px", color: "var(--text-quiet)",
                fontVariantNumeric: "tabular-nums", flexShrink: 0,
              }}>
                {s.pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </td>
      );
    }
    case "style": {
      const m = f.style.match;
      const matchLabel: Record<string, string> = { strict: "Strict", moderate: "Mod", drifted: "Drift" };
      const matchDesc: Record<string, string> = {
        strict:   "R² > 0.85 — fund invests tightly within its declared style",
        moderate: "R² 0.65–0.85 — some drift from declared category",
        drifted:  "R² < 0.65 — fund is effectively a different style than declared",
      };
      const basisDesc: Record<string, string> = {
        Value:    "Buys cheap stocks relative to earnings/book",
        Growth:   "Targets high revenue/earnings growth companies",
        Quality:  "Focuses on high-ROE, low-debt businesses",
        Momentum: "Rides recent price winners",
        "Low-Vol":"Prefers low-volatility, defensive stocks",
        Blend:    "Mix of styles — no dominant factor",
      };
      return (
        <td className="tt">
          <span style={{display:"inline-flex", alignItems:"center", gap:4}}>
            <span className={`style-dot ${m}`} />
            <span style={{fontSize:"10.5px", color:"var(--text-dim)"}}>{matchLabel[m] ?? m}</span>
          </span>
          <div className="tt-body" style={{left:"-80px", minWidth:220}}>
            <div className="row">
              <span className="k">Declared</span>
              <span className="v">{f.style.declared}</span>
            </div>
            <div className="row">
              <span className="k">Actual</span>
              <span className="v">{f.style.actual}</span>
            </div>
            <div className="row">
              <span className="k">R²</span>
              <span className="v">{f.style.r_squared.toFixed(2)}</span>
            </div>
            <div style={{marginTop:5, padding:"5px 0 3px", borderTop:"1px solid var(--border)", fontSize:"10px", color:"var(--text-faint)", lineHeight:1.5}}>
              <strong style={{color:"var(--text-dim)", display:"block", marginBottom:2}}>{matchLabel[m]}: </strong>
              {matchDesc[m]}
            </div>
            {f.style.basis && basisDesc[f.style.basis] && (
              <div style={{marginTop:4, fontSize:"10px", color:"var(--text-faint)", lineHeight:1.5}}>
                <strong style={{color:"var(--text-dim)"}}>Basis ({f.style.basis}): </strong>
                {basisDesc[f.style.basis]}
              </div>
            )}
            <div style={{marginTop:4, fontSize:"9.5px", color:"var(--text-quiet)"}}>
              R² measures how closely portfolio holdings align with a style factor index. Computed from latest portfolio disclosure.
            </div>
          </div>
        </td>
      );
    }
    case "spark":
      return <td><span className="cell-spark"><Spark data={f.nav_history_3y} /></span></td>;
    default:
      return <td>—</td>;
  }
}

// ─── FundTable ────────────────────────────────────────────────────────────
interface FundTableProps {
  funds: Fund[];
  allFunds?: Fund[];
  sort: SortState;
  onSort: (col: string) => void;
  cols: string[];
  onReset: () => void;
}

export function FundTable({ funds, allFunds, sort, onSort, cols, onReset }: FundTableProps) {
  const visibleCols = ALL_COLS.filter(c => cols.includes(c.id));

  // Build manager → [fund names] map for cross-reference tooltips
  const managerFunds = useMemo<Record<string, string[]>>(() => {
    const source = allFunds ?? funds;
    const map: Record<string, string[]> = {};
    for (const fund of source) {
      const mgrs = fund.managers?.length ? fund.managers : [fund.manager];
      for (const m of mgrs) {
        const mgrName = m.name;
        if (mgrName && mgrName !== 'Unknown') {
          if (!map[mgrName]) map[mgrName] = [];
          map[mgrName].push(fund.name);
        }
      }
    }
    return map;
  }, [allFunds, funds]);

  if (funds.length === 0) {
    return (
      <div className="empty">
        <div className="msg">No funds match these filters.</div>
        <div className="sub">Loosen something.</div>
        <button className="btn" onClick={onReset}><IcReset size={12}/> Reset to defaults</button>
      </div>
    );
  }

  return (
    <table className="grid">
      <colgroup>{visibleCols.map(c => <col key={c.id} style={{width: c.w}}/>)}</colgroup>
      <thead>
        <tr>
          {visibleCols.map(c => (
            <th
              key={c.id}
              className={`${c.num ? 'num' : ''} ${sort.col === c.id ? 'sorted' : ''} th-help`}
              onClick={() => onSort(c.id)}
            >
              <span className="th-lbl">
                {c.label}
                <span className="th-i">?</span>
              </span>
              {sort.col === c.id && (
                <span className="sortchev">{sort.dir === "asc" ? "▲" : "▼"}</span>
              )}
              {c.help && (
                <div className="th-tip">
                  <div className="th-tip-title">{c.label}</div>
                  <div className="th-tip-body">{c.help}</div>
                </div>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {funds.map(f => (
          <tr key={f.id}>
            {visibleCols.map(c => <Cell key={c.id} col={c.id} f={f} managerFunds={managerFunds} />)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── ColumnPicker ─────────────────────────────────────────────────────────
interface ColumnPickerProps {
  cols: string[];
  setCols: (cols: string[]) => void;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
}

export function ColumnPicker({ cols, setCols, onClose, anchorEl }: ColumnPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && e.target !== anchorEl) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose, anchorEl]);

  return (
    <div ref={ref} className="popover" style={{top: 42, right: 100}}>
      <h5>Columns</h5>
      {ALL_COLS.map(c => {
        const on = cols.includes(c.id);
        return (
          <div key={c.id} className="pop-item" onClick={() => {
            if (c.always) return;
            setCols(on ? cols.filter(x => x !== c.id) : [...cols, c.id]);
          }}>
            <span className={`pop-check ${on ? 'on' : ''}`}>
              {on && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7"/>
                </svg>
              )}
            </span>
            <span className="lbl">{c.label}</span>
            {c.always && <span className="shortcut">locked</span>}
          </div>
        );
      })}
    </div>
  );
}

// Re-export IcColumns for use in parent
export { IcColumns };
