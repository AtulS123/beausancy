import React, { useRef, useEffect } from 'react';
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
  { id: "aum",      label: "AUM",            num: true,  w: 90,  help: "Assets Under Management in ₹ crore. Very small funds (< ₹100 Cr) can be volatile and illiquid; very large small-cap funds can struggle to deploy fresh inflows." },
  { id: "er",       label: "ER",             num: true,  w: 62,  help: "Expense Ratio, annual fee charged by the scheme as % of assets. Compounds against returns — a 0.5% lower ER over 20 years is meaningful." },
  { id: "r3y",      label: "3Y CAGR",        num: true,  w: 96,  help: "3-year Compound Annual Growth Rate of NAV. A single window — easily cherry-picked. Check rolling consistency alongside." },
  { id: "r5y",      label: "5Y CAGR",        num: true,  w: 96,  help: "5-year Compound Annual Growth Rate. Smoother than 3Y but still a single window; use rolling consistency to see if the fund actually stays good." },
  { id: "cons",     label: "Rolling cons.",  num: true,  w: 130, help: "Rolling 3Y consistency over the last 7 years: share of overlapping 3-year windows where the fund beat its category average. High = repeatable alpha, not one lucky year." },
  { id: "dd",       label: "Max DD",         num: true,  w: 78,  help: "Maximum drawdown over last 5 years — the worst peak-to-trough NAV fall. Tells you how ugly it got, not how often." },
  { id: "rec",      label: "Recov",          num: true,  w: 68,  help: "Recovery time in months: how long the fund took to climb back to its pre-drawdown peak NAV. Short recovery = the dip was fast; long recovery = sustained pain." },
  { id: "mgr",      label: "Mgr tenure",     num: true,  w: 90,  help: "Years the current lead manager has been running this scheme. A fund's track record belongs to the manager, not the AMC — tenure ≥5y is meaningful, ≤3y means you're betting on a short sample." },
  { id: "t10",      label: "Top-10 %",       num: true,  w: 80,  help: "% of portfolio in the top 10 stocks. >60% = concentrated conviction; <30% = broadly diversified. Concentrated funds can be great or disastrous depending on the manager." },
  { id: "style",    label: "Style",          num: false, w: 70,  help: "Style integrity: does the fund actually invest like its declared category? Strict = tight adherence. Moderate = some drift. Drifted = the fund is effectively something else (e.g. a Flexi Cap running as momentum)." },
  { id: "spark",    label: "3Y trend",       num: false, w: 110, help: "Sparkline of NAV over the last 3 years. Visual shape only — use for pattern recognition, not precise reads." }
];

export const DEFAULT_COLS = ["name","category","aum","er","r3y","r5y","cons","dd","rec","mgr","t10","style","spark"];

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

// ─── Cell ─────────────────────────────────────────────────────────────────
interface CellProps {
  col: string;
  f: Fund;
}

function Cell({ col, f }: CellProps) {
  switch (col) {
    case "name":
      return (
        <td className="fund-cell">
          <span className="fund-name" title={`${f.name} — ${f.amc}`}>{f.name}</span>
          <span className="fund-sub mono"><span>{f.amc}</span> <span className="fund-id">· {f.id}</span></span>
        </td>
      );
    case "category":
      return <td><span className="cat-pill">{f.category}</span></td>;
    case "aum":
      return (
        <td className="num tt">
          <span className="val">{fmtAUM(f.aum_cr)}</span>
          <span className="delta">Cr</span>
          <div className="tt-body">
            <div className="row"><span className="k">Total AUM</span><span className="v">{fmtAUMFull(f.aum_cr)}</span></div>
          </div>
        </td>
      );
    case "er":
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
    case "mgr": {
      const t = f.manager.tenure_years;
      return (
        <td className="num tt">
          <span className="val">{t.toFixed(1)}</span>
          <span className="delta">yr{f.manager.changed_last_12mo ? ' ·' : ''}</span>
          {f.manager.changed_last_12mo && <span className="warn-dot"> ⚠</span>}
          <div className="tt-body">
            <div className="row"><span className="k">Manager</span><span className="v">{f.manager.name}</span></div>
            <div className="row"><span className="k">Funds run</span><span className="v">{f.manager.funds_managed}</span></div>
            {f.manager.changed_last_12mo && <div className="row"><span className="k" style={{color:"var(--warn)"}}>Changed</span><span className="v">&lt; 12 mo ago</span></div>}
          </div>
        </td>
      );
    }
    case "t10":
      return <td className="num"><span className="val">{f.concentration.top_10_pct.toFixed(1)}</span><span className="delta">%</span></td>;
    case "style": {
      const m = f.style.match;
      return (
        <td className="tt">
          <span className={`style-dot ${m}`} />
          <div className="tt-body" style={{left:"-60px"}}>
            <div className="row"><span className="k">Declared</span><span className="v">{f.style.declared}</span></div>
            <div className="row"><span className="k">Actual</span><span className="v">{f.style.actual}</span></div>
            <div className="row"><span className="k">R²</span><span className="v">{f.style.r_squared.toFixed(2)}</span></div>
            <div style={{marginTop:4, color:"var(--text-faint)", fontSize:"10.5px"}}>
              {m === "strict" && "Tight style adherence"}
              {m === "moderate" && "Some drift from declared"}
              {m === "drifted" && "Significant style drift"}
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
  sort: SortState;
  onSort: (col: string) => void;
  cols: string[];
  onReset: () => void;
}

export function FundTable({ funds, sort, onSort, cols, onReset }: FundTableProps) {
  const visibleCols = ALL_COLS.filter(c => cols.includes(c.id));

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
            {visibleCols.map(c => <Cell key={c.id} col={c.id} f={f} />)}
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
