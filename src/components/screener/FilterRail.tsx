import React, { useState } from 'react';
import type { FilterState } from '@/lib/types';
import { Chip, DualSlider, SingleSlider, Toggle, Seg, Select } from './Controls';
import { IcChev, IcBasics, IcReturn, IcDraw, IcMgr, IcStyle, IcConc } from './Icons';

const CATEGORIES = ["Large Cap", "Flexi Cap", "Mid Cap", "Small Cap", "ELSS", "Hybrid", "Index", "Others"];
const STYLE_MATCHES = [
  { value: "strict",   label: "Strict",   sub: "R² > 0.85" },
  { value: "moderate", label: "Moderate", sub: "0.65–0.85" },
  { value: "drifted",  label: "Drifted",  sub: "< 0.65" }
];
const STYLE_BASES = ["Any", "Value", "Growth", "Quality", "Momentum", "Low-Vol", "Blend"];

export const FILTER_DEFAULTS: FilterState = {
  categories: [],
  aum: [0, 100000],
  expense: [0, 2.5],
  fundAge: 0,
  consistency: 0,
  rollingWindow: "3Y",
  minCagr: 0,
  maxDd: 50,
  recovery: 36,
  hideNoDd: false,
  mgrTenure: 0,
  excludeRecentChange: false,
  styleMatch: [],
  styleBasis: "Any",
  top10: [0, 100],
  numStocks: [0, 200],
  topSector: [0, 100]
};

// ─── Help tooltip ──────────────────────────────────────────────────────────
interface HelpProps {
  title?: string;
  children: React.ReactNode;
  stop?: boolean;
}

function Help({ title, children, stop }: HelpProps) {
  const onClick = stop ? (e: React.MouseEvent) => e.stopPropagation() : undefined;
  return (
    <span className="help" onClick={onClick} tabIndex={0} aria-label={typeof title === 'string' ? title : 'More info'}>
      <span className="help-tip" role="tooltip">
        {title && <span className="ht-title">{title}</span>}
        {children}
      </span>
    </span>
  );
}

// ─── activeCount helper ────────────────────────────────────────────────────
function activeCount(key: keyof FilterState, val: unknown): number {
  const d = FILTER_DEFAULTS[key] as unknown;
  if (Array.isArray(d)) {
    if (d.length === 0) return (val as unknown[]).length > 0 ? 1 : 0;
    if (d.length === 2 && typeof d[0] === 'number') {
      const v = val as [number, number];
      return (v[0] !== (d as [number,number])[0] || v[1] !== (d as [number,number])[1]) ? 1 : 0;
    }
  }
  if (typeof d === "boolean") return val !== d ? 1 : 0;
  return val !== d ? 1 : 0;
}

// ─── Group ────────────────────────────────────────────────────────────────
interface GroupProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  count: number;
  onClear: () => void;
  open: boolean;
  onToggle: () => void;
  help?: React.ReactNode;
}

function Group({ title, icon, children, count, onClear, open, onToggle, help }: GroupProps) {
  return (
    <div className={`fgroup ${open ? '' : 'closed'}`}>
      <div className="fgroup-head" onClick={onToggle}>
        <div className="l">
          {icon}
          <span className="title">{title}</span>
          {help}
          {count > 0 && <span className="badge">{count}</span>}
        </div>
        <div className="r">
          {count > 0 && (
            <span className="clear" onClick={(e) => { e.stopPropagation(); onClear(); }}>clear</span>
          )}
          <IcChev className="chev" size={12} />
        </div>
      </div>
      <div className="fgroup-body">{children}</div>
    </div>
  );
}

// ─── FilterRail ───────────────────────────────────────────────────────────
interface FilterRailProps {
  state: FilterState;
  set: (patch: Partial<FilterState>) => void;
  reset: () => void;
  collapsed: boolean;
  onToggleRail: () => void;
}

export function FilterRail({ state, set, reset, collapsed }: FilterRailProps) {
  const [open, setOpen] = useState({
    basics: true, returns: true, drawdown: true,
    manager: true, style: true, conc: true
  });
  const toggle = (k: keyof typeof open) => setOpen({ ...open, [k]: !open[k] });

  const totalActive = (Object.keys(FILTER_DEFAULTS) as Array<keyof FilterState>)
    .reduce((acc, k) => acc + activeCount(k, state[k] as unknown), 0);

  const basicsN  = (["categories","aum","expense","fundAge"] as const).reduce((a, k) => a + activeCount(k, state[k] as unknown), 0);
  const returnsN = (["consistency","rollingWindow","minCagr"] as const).reduce((a, k) => a + activeCount(k, state[k] as unknown), 0);
  const ddN      = (["maxDd","recovery","hideNoDd"] as const).reduce((a, k) => a + activeCount(k, state[k] as unknown), 0);
  const mgrN     = (["mgrTenure","excludeRecentChange"] as const).reduce((a, k) => a + activeCount(k, state[k] as unknown), 0);
  const styleN   = (["styleMatch","styleBasis"] as const).reduce((a, k) => a + activeCount(k, state[k] as unknown), 0);
  const concN    = (["top10","numStocks","topSector"] as const).reduce((a, k) => a + activeCount(k, state[k] as unknown), 0);

  const clearKeys = (keys: Array<keyof FilterState>) => {
    const patch: Partial<FilterState> = {};
    keys.forEach(k => { (patch as Record<string, unknown>)[k] = FILTER_DEFAULTS[k]; });
    set(patch);
  };

  return (
    <aside className={`rail ${collapsed ? 'collapsed' : ''}`}>
      <div className="rail-head">
        <span className="rail-head-label">Filters</span>
        <span className={`clear-all ${totalActive > 0 ? 'on' : ''}`} onClick={reset}>
          {totalActive > 0 ? `Clear all · ${totalActive}` : 'Clear all'}
        </span>
      </div>
      <div className="rail-body">

        {/* Basics */}
        <Group
          title="Basics" icon={<IcBasics />} count={basicsN}
          open={open.basics} onToggle={() => toggle('basics')}
          onClear={() => clearKeys(["categories","aum","expense","fundAge"])}
          help={<Help title="Basics" stop>The floor set of fund attributes — category, size, cost, and how long the fund has existed. Start here to restrict the universe before applying behavioral filters.</Help>}
        >
          <div>
            <div className="flabel">
              <span>Category <Help title="Category">SEBI scheme category. Multi-select acts as OR. Leaving empty includes every category.</Help></span>
              <span className="val dim">{state.categories.length || 'any'}</span>
            </div>
            <div className="chips">
              {CATEGORIES.map(c => (
                <Chip key={c} active={state.categories.includes(c)}
                  onClick={() => set({
                    categories: state.categories.includes(c)
                      ? state.categories.filter(x => x !== c)
                      : [...state.categories, c]
                  })}
                >{c}</Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="flabel">
              <span>AUM <Help title="Assets under management">Total money the fund currently manages, in ₹ crore. Very small funds (&lt;₹500Cr) may be volatile; very large ones can struggle to deploy capital in mid/small caps. Log-scaled slider.</Help></span>
              <span className="val">
                ₹{state.aum[0] < 1000 ? state.aum[0] : (state.aum[0]/1000).toFixed(1)+'K'} – ₹{state.aum[1] >= 50000 ? '50K+' : (state.aum[1] >= 1000 ? (state.aum[1]/1000).toFixed(1)+'K' : state.aum[1])} Cr
              </span>
            </div>
            <DualSlider min={100} max={50000} value={state.aum} onChange={v => set({ aum: [Math.round(v[0]), Math.round(v[1])] })} log />
          </div>
          <div>
            <div className="flabel">
              <span>Expense ratio <Help title="Expense ratio">Annual fee the fund charges, as % of assets. Lower is better — this is a direct drag on your returns, compounded every year. Direct plans are shown.</Help></span>
              <span className="val">{state.expense[0].toFixed(2)}% – {state.expense[1].toFixed(2)}%</span>
            </div>
            <DualSlider min={0} max={2.5} step={0.05} value={state.expense} onChange={v => set({ expense: [+v[0].toFixed(2), +v[1].toFixed(2)] })} />
          </div>
          <div>
            <div className="flabel">
              <span>Minimum fund age <Help title="Fund age">Years since the scheme launched. A longer history gives more market cycles to evaluate against — useful when you care about consistency through downturns.</Help></span>
              <span className="val">{state.fundAge === 0 ? 'any' : state.fundAge + 'y'}</span>
            </div>
            <SingleSlider min={0} max={20} value={state.fundAge} onChange={v => set({ fundAge: v })} />
          </div>
        </Group>

        {/* Returns & Consistency */}
        <Group
          title="Returns & Consistency" icon={<IcReturn />} count={returnsN}
          open={open.returns} onToggle={() => toggle('returns')}
          onClear={() => clearKeys(["consistency","rollingWindow","minCagr"])}
          help={<Help title="Returns & Consistency" stop>Trailing returns lie. We evaluate every rolling N-year window over the last 7 years to see how often the fund actually beat its category — consistency matters more than a single good year.</Help>}
        >
          <div>
            <div className="flabel">
              <span>Rolling window <Help title="Rolling window">Holding period we evaluate. For each start date in the last 7y, we compute the return over the next 1/3/5 years and compare against the category average on that same window.</Help></span>
              <span className="val dim">over last 7y</span>
            </div>
            <Seg
              value={state.rollingWindow}
              onChange={v => set({ rollingWindow: v as "1Y" | "3Y" | "5Y" })}
              options={[{value:"1Y",label:"1Y"},{value:"3Y",label:"3Y"},{value:"5Y",label:"5Y"}]}
            />
          </div>
          <div>
            <div className="flabel">
              <span>Beats category in ≥ <Help title="Consistency">Share of rolling {state.rollingWindow} windows where the fund&apos;s return was above the category average. 60% means it beat peers in 6 out of every 10 holding periods. Sidesteps recency bias.</Help></span>
              <span className="val">{state.consistency}% of windows</span>
            </div>
            <SingleSlider min={0} max={100} value={state.consistency} onChange={v => set({ consistency: v })} />
            <div className="sublabel">Share of rolling {state.rollingWindow} windows where fund return &gt; category avg.</div>
          </div>
          <div>
            <div className="flabel">
              <span>Minimum {state.rollingWindow} CAGR <Help title="Trailing CAGR">Compound annual growth rate over the last {state.rollingWindow}. A floor — not the main screen. Consistency above is a better predictor.</Help></span>
              <span className="val">≥ {state.minCagr}%</span>
            </div>
            <SingleSlider min={0} max={40} value={state.minCagr} onChange={v => set({ minCagr: v })} />
          </div>
        </Group>

        {/* Drawdown behavior */}
        <Group
          title="Drawdown behavior" icon={<IcDraw />} count={ddN}
          open={open.drawdown} onToggle={() => toggle('drawdown')}
          onClear={() => clearKeys(["maxDd","recovery","hideNoDd"])}
          help={<Help title="Drawdown behavior" stop>How the fund behaves when markets fall. A fund that falls less and recovers faster is doing real risk management — filter here if you care about downside more than upside.</Help>}
        >
          <div>
            <div className="flabel">
              <span>Max drawdown (5Y) <Help title="Maximum drawdown">The worst peak-to-trough loss over the last 5 years, in %. −20% means the fund lost a fifth of its value at its worst point. Lower magnitude (less negative) = better downside protection.</Help></span>
              <span className="val">≤ −{state.maxDd}%</span>
            </div>
            <SingleSlider min={5} max={50} value={state.maxDd} onChange={v => set({ maxDd: v })} />
          </div>
          <div>
            <div className="flabel">
              <span>Recovery time <Help title="Recovery time">Months taken to return to the previous peak after the worst drawdown. Shorter = faster healing. A fund still underwater shows as the time since the bottom.</Help></span>
              <span className="val">≤ {state.recovery} mo</span>
            </div>
            <SingleSlider min={1} max={36} value={state.recovery} onChange={v => set({ recovery: v })} />
          </div>
          <Toggle on={state.hideNoDd} onChange={v => set({ hideNoDd: v })}
            label="Hide funds without a real drawdown" />
          <div className="sublabel" style={{marginTop: -2}}>Newer funds that never went through a meaningful downturn have no signal here — hide them if you want only tested funds.</div>
        </Group>

        {/* Manager */}
        <Group
          title="Manager" icon={<IcMgr />} count={mgrN}
          open={open.manager} onToggle={() => toggle('manager')}
          onClear={() => clearKeys(["mgrTenure","excludeRecentChange"])}
          help={<Help title="Manager" stop>Past returns belong to the manager who produced them, not the fund house. If the manager changed last year, the track record may be a different person&apos;s work.</Help>}
        >
          <div>
            <div className="flabel">
              <span>Current tenure <Help title="Manager tenure">Years the current lead manager has run this fund. Shorter tenure means the history you see wasn&apos;t theirs — returns before their start date are noise for your decision.</Help></span>
              <span className="val">≥ {state.mgrTenure}y</span>
            </div>
            <SingleSlider min={0} max={15} value={state.mgrTenure} onChange={v => set({ mgrTenure: v })} />
          </div>
          <Toggle on={state.excludeRecentChange} onChange={v => set({ excludeRecentChange: v })}
            label="Exclude recent manager change (12mo)" />
          <div className="sublabel" style={{marginTop: -2}}>Drops funds where the manager took over within the last 12 months — not enough time under them to judge.</div>
        </Group>

        {/* Style integrity */}
        <Group
          title="Style integrity" icon={<IcStyle />} count={styleN}
          open={open.style} onToggle={() => toggle('style')}
          onClear={() => clearKeys(["styleMatch","styleBasis"])}
          help={<Help title="Style integrity" stop>Does the fund actually invest the way it claims? We regress the portfolio&apos;s returns against known style factors (Value, Growth, Quality, Momentum, Low-Vol) and measure how tightly it fits. A &quot;growth fund&quot; that&apos;s secretly chasing momentum is style drift — a red flag.</Help>}
        >
          <div>
            <div className="flabel">
              <span>Style adherence <Help title="Style adherence">How closely the fund&apos;s returns track its declared style. R² is the fit quality of the style regression: <strong>Strict</strong> (&gt;0.85) is a faithful style fund; <strong>Drifted</strong> (&lt;0.65) is effectively a different product than advertised.</Help></span>
              <span className="val dim">{state.styleMatch.length || 'any'}</span>
            </div>
            <div className="chips">
              {STYLE_MATCHES.map(s => (
                <Chip key={s.value} active={state.styleMatch.includes(s.value)}
                  onClick={() => set({
                    styleMatch: state.styleMatch.includes(s.value)
                      ? state.styleMatch.filter(x => x !== s.value)
                      : [...state.styleMatch, s.value]
                  })}
                >
                  {s.label} <span style={{opacity:0.5, marginLeft:4, fontFamily:"'JetBrains Mono', monospace"}}>{s.sub}</span>
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="flabel">
              <span>Style basis <Help title="Style basis">The factor we measure adherence against. Pick <strong>Value</strong> to find clean value funds; pick <strong>Any</strong> to just require the fund to stick to whatever style it claims, without forcing one.</Help></span>
            </div>
            <Select value={state.styleBasis} onChange={v => set({ styleBasis: v })}
              options={STYLE_BASES.map(s => ({ value: s, label: s }))} />
          </div>
        </Group>

        {/* Portfolio concentration */}
        <Group
          title="Portfolio concentration" icon={<IcConc />} count={concN}
          open={open.conc} onToggle={() => toggle('conc')}
          onClear={() => clearKeys(["top10","numStocks","topSector"])}
          help={<Help title="Portfolio concentration" stop>How spread-out the fund&apos;s bets are. Highly concentrated funds can outperform, but one bad stock hurts more. Diversified funds dilute both winners and losers. Neither is wrong — this lets you match concentration to your risk appetite.</Help>}
        >
          <div>
            <div className="flabel">
              <span>Top-10 weight <Help title="Top-10 holdings weight">% of the portfolio held in the 10 largest positions. &gt;55% is a concentrated book (fund manager has strong conviction bets); &lt;35% means the top ideas are diluted across many names.</Help></span>
              <span className="val">{state.top10[0]}% – {state.top10[1]}%</span>
            </div>
            <DualSlider min={10} max={80} value={state.top10} onChange={v => set({ top10: [Math.round(v[0]), Math.round(v[1])] })} />
          </div>
          <div>
            <div className="flabel">
              <span>Number of stocks <Help title="Number of holdings">How many distinct stocks the fund owns. &lt;30 = high-conviction concentrated; 30–60 = typical active; &gt;80 = closet-index territory where it gets hard to beat the benchmark after fees.</Help></span>
              <span className="val">{state.numStocks[0]} – {state.numStocks[1]}</span>
            </div>
            <DualSlider min={15} max={150} value={state.numStocks} onChange={v => set({ numStocks: [Math.round(v[0]), Math.round(v[1])] })} />
          </div>
          <div>
            <div className="flabel">
              <span>Top-sector weight <Help title="Largest sector weight">% allocated to the single biggest sector (e.g. Financials, IT). High values mean the fund&apos;s fate is tied to one sector&apos;s cycle — fine if intentional, risky if unintended.</Help></span>
              <span className="val">{state.topSector[0]}% – {state.topSector[1]}%</span>
            </div>
            <DualSlider min={10} max={80} value={state.topSector} onChange={v => set({ topSector: [Math.round(v[0]), Math.round(v[1])] })} />
          </div>
        </Group>

      </div>
    </aside>
  );
}
