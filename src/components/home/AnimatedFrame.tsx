import React, { useEffect, useRef, useState } from 'react';

interface FundEntry {
  nm: string;
  sub: string;
  cat: string;
  cons: number;
  dd: number;
  r5y: number;
  rk: string;
  strict: boolean;
}

const FUNDS: FundEntry[] = [
  { nm: "Parag Parikh Flexi Cap", sub: "PPFAS · Flexi Cap", cat: "Flexi Cap", cons: 84, dd: 22.5, r5y: 23.4, rk: "2/24", strict: true },
  { nm: "HDFC Flexi Cap",         sub: "HDFC · Flexi Cap",  cat: "Flexi Cap", cons: 71, dd: 28.1, r5y: 22.8, rk: "5/24", strict: true },
  { nm: "Quant Active",           sub: "Quant · Flexi Cap", cat: "Flexi Cap", cons: 69, dd: 32.4, r5y: 28.1, rk: "8/24", strict: false },
  { nm: "SBI Small Cap",          sub: "SBI · Small Cap",   cat: "Small Cap", cons: 74, dd: 34.1, r5y: 26.4, rk: "4/26", strict: true },
  { nm: "Axis Bluechip",          sub: "Axis · Large Cap",  cat: "Large Cap", cons: 42, dd: 26.7, r5y: 11.2, rk: "24/29", strict: false },
  { nm: "Kotak Emerging Equity",  sub: "Kotak · Mid Cap",   cat: "Mid Cap",   cons: 72, dd: 30.4, r5y: 24.1, rk: "9/29", strict: true },
  { nm: "Mirae ELSS Tax Saver",   sub: "Mirae · ELSS",      cat: "ELSS",      cons: 74, dd: 25.2, r5y: 19.8, rk: "6/32", strict: true },
  { nm: "Motilal Oswal Midcap",   sub: "Motilal · Mid Cap", cat: "Mid Cap",   cons: 76, dd: 32.8, r5y: 27.4, rk: "2/29", strict: false },
];

interface AnimState {
  cats: string[];
  cons: number;
  dd: number;
  strict: boolean;
}

export function AnimatedFrame() {
  const [animState, setAnimState] = useState<AnimState>({ cats: [], cons: 60, dd: 25, strict: false });
  const [ghostMsg, setGhostMsg] = useState<string | null>(null);
  const seqRef = useRef(0);

  const filtered = (s: AnimState) => FUNDS.filter(f =>
    (s.cats.length === 0 || s.cats.includes(f.cat)) &&
    f.cons >= s.cons &&
    f.dd <= s.dd &&
    (!s.strict || f.strict)
  );

  const flash = (msg: string) => {
    setGhostMsg(msg);
    setTimeout(() => setGhostMsg(null), 1400);
  };

  useEffect(() => {
    const seq: Array<() => AnimState> = [
      () => ({ cats: [], cons: 0, dd: 50, strict: false }),
      () => { flash("+ category: Flexi Cap"); return { cats: ["Flexi Cap"], cons: 0, dd: 50, strict: false }; },
      () => { flash("rolling consistency ≥ 70%"); return { cats: ["Flexi Cap"], cons: 70, dd: 50, strict: false }; },
      () => { flash("max drawdown ≤ −25%"); return { cats: ["Flexi Cap"], cons: 70, dd: 25, strict: false }; },
      () => { flash("+ category: Mid Cap"); return { cats: ["Flexi Cap", "Mid Cap"], cons: 70, dd: 25, strict: false }; },
      () => { flash("strict style match only"); return { cats: ["Flexi Cap", "Mid Cap"], cons: 70, dd: 25, strict: true }; },
      () => { flash("reset & restart"); return { cats: ["Flexi Cap"], cons: 60, dd: 35, strict: false }; },
    ];

    let i = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const next = seq[i]();
      setAnimState(next);
      i = (i + 1) % seq.length;
      timer = setTimeout(tick, i === 0 ? 2800 : 2400);
    };

    timer = setTimeout(tick, 1400);
    return () => clearTimeout(timer);
  }, []);

  const visibleFunds = filtered(animState);
  const consLeft = animState.cons > 0 ? (animState.cons / 100 * 100 - 10) : 0;
  const consRight = Math.max(0, 100 - animState.cons);
  const ddRight = Math.max(0, 100 - animState.dd * 2);

  return (
    <div className="frame">
      <div className="frame-head">
        <span className="d" />
        <span className="d" />
        <span className="d" />
        <span className="frame-url">
          beausancy.in/?cat=<span className="hl">{encodeURIComponent(animState.cats.join(",") || "all")}</span>
          &amp;cons=<span className="hl">{animState.cons}</span>
          &amp;dd=<span className="hl">{animState.dd}</span>
        </span>
        <span className="mono" style={{fontSize:"11.5px",color:"var(--muted, #5f5f66)"}}>
          {visibleFunds.length} of {FUNDS.length} funds
        </span>
      </div>

      <div className="frame-body">
        {/* Rail */}
        <div className="rail">
          <div>
            <h5>Category</h5>
            <div className="chips">
              {["Flexi Cap", "Large", "Mid Cap", "Small Cap", "ELSS"].map(c => {
                const catKey = c === "Large" ? "Large Cap" : c;
                return (
                  <span key={c} className={`chip ${animState.cats.includes(catKey) ? 'on' : ''}`}>{c}</span>
                );
              })}
            </div>
          </div>
          <div className="slider-wrap">
            <div className="slider-lbl">
              <span>Rolling consistency</span>
              <span className="v">≥ {animState.cons}%</span>
            </div>
            <div className="slider">
              <div className="slider-range" style={{
                left: `${consLeft}%`,
                right: `${consRight}%`,
              }} />
            </div>
          </div>
          <div className="slider-wrap">
            <div className="slider-lbl">
              <span>Max drawdown</span>
              <span className="v">≤ −{animState.dd}%</span>
            </div>
            <div className="slider">
              <div className="slider-range" style={{ left: "0%", right: `${ddRight}%` }} />
            </div>
          </div>
          <div className="toggle-row">
            <span>Strict style match</span>
            <span className={`t-switch ${animState.strict ? 'on' : ''}`}>
              <span className="k" />
            </span>
          </div>
        </div>

        {/* Table area */}
        <div className="table-area">
          <div className="table-area-head">
            <div>Fund</div>
            <div className="num">Cons</div>
            <div className="num">Max DD</div>
            <div className="num">5Y CAGR</div>
            <div className="num">Rank</div>
          </div>
          <div className="rows" style={{position:"relative"}}>
            {FUNDS.map(f => {
              const show = visibleFunds.includes(f);
              return (
                <div key={f.nm} className={`mrow${show ? '' : ' hide'}`}>
                  <div>
                    <div className="nm">{f.nm}</div>
                    <div className="sub-nm">{f.sub}</div>
                  </div>
                  <div className="num">{f.cons}%</div>
                  <div className="num neg">−{f.dd.toFixed(1)}%</div>
                  <div className="num pos">+{f.r5y.toFixed(1)}%</div>
                  <div className="rk">{f.rk}</div>
                </div>
              );
            })}
            {ghostMsg && (
              <div className="filter-ghost show">{ghostMsg}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
