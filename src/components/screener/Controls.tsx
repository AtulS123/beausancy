import React from 'react';

// ─── Formatting utilities ──────────────────────────────────────────────────
export function fmt(n: number | null | undefined, suffix = ""): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n + suffix;
}

export function fmtAUM(cr: number): string {
  if (cr >= 10000) return (cr / 1000).toFixed(1) + "K";
  if (cr >= 1000) return cr.toLocaleString('en-IN');
  return cr.toLocaleString('en-IN');
}

export function fmtAUMFull(cr: number): string {
  return "₹" + cr.toLocaleString('en-IN') + " Cr";
}

export function fmtMoney(cr: number): string {
  if (cr >= 10000) return "₹" + (cr / 1000).toFixed(1) + "K Cr";
  return "₹" + cr.toLocaleString('en-IN') + " Cr";
}

// ─── Log scale helpers for AUM slider ──────────────────────────────────────
export const logScale = {
  toSlider: (v: number, min: number, max: number): number => {
    const lmin = Math.log(min), lmax = Math.log(max);
    return ((Math.log(v) - lmin) / (lmax - lmin)) * 1000;
  },
  fromSlider: (s: number, min: number, max: number): number => {
    const lmin = Math.log(min), lmax = Math.log(max);
    return Math.exp(lmin + (s / 1000) * (lmax - lmin));
  }
};

// ─── DualSlider ────────────────────────────────────────────────────────────
interface DualSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  format?: (v: number) => string;
  log?: boolean;
}

export function DualSlider({ min, max, step = 1, value, onChange, log = false }: DualSliderProps) {
  const [lo, hi] = value;
  const toPct = (v: number) => log
    ? (logScale.toSlider(Math.max(v, min), min, max) / 1000) * 100
    : ((v - min) / (max - min)) * 100;

  const onLo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = log ? logScale.fromSlider(+e.target.value, min, max) : +e.target.value;
    onChange([Math.min(v, hi - step), hi]);
  };
  const onHi = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = log ? logScale.fromSlider(+e.target.value, min, max) : +e.target.value;
    onChange([lo, Math.max(v, lo + step)]);
  };

  const sMin = log ? 0 : min;
  const sMax = log ? 1000 : max;
  const sLo = log ? logScale.toSlider(lo, min, max) : lo;
  const sHi = log ? logScale.toSlider(hi, min, max) : hi;

  return (
    <div className="slider-wrap">
      <div className="slider-track-wrap">
        <div className="slider-range" style={{ left: `${toPct(lo)}%`, right: `${100 - toPct(hi)}%` }} />
        <input type="range" min={sMin} max={sMax} step={log ? 1 : step} value={sLo} onChange={onLo} />
        <input type="range" min={sMin} max={sMax} step={log ? 1 : step} value={sHi} onChange={onHi} />
      </div>
    </div>
  );
}

// ─── SingleSlider ──────────────────────────────────────────────────────────
interface SingleSliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}

export function SingleSlider({ min, max, step = 1, value, onChange }: SingleSliderProps) {
  return (
    <div className="slider-wrap">
      <div className="slider-track-wrap">
        <div className="slider-range" style={{ left: 0, right: `${100 - ((value - min) / (max - min)) * 100}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          style={{ pointerEvents: 'auto' }}
        />
      </div>
    </div>
  );
}

// ─── Chip ──────────────────────────────────────────────────────────────────
interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button className={`chip ${active ? 'active' : ''}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

// ─── Toggle ────────────────────────────────────────────────────────────────
interface ToggleProps {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

export function Toggle({ on, onChange, label }: ToggleProps) {
  return (
    <div className="toggle-row" onClick={() => onChange(!on)}>
      <div className="lbl">{label}</div>
      <div className={`toggle ${on ? 'on' : ''}`} />
    </div>
  );
}

// ─── Seg ───────────────────────────────────────────────────────────────────
interface SegOption {
  value: string;
  label: string;
}

interface SegProps {
  options: SegOption[];
  value: string;
  onChange: (v: string) => void;
}

export function Seg({ options, value, onChange }: SegProps) {
  return (
    <div className="seg">
      {options.map(o => (
        <button
          key={o.value}
          className={`seg-opt ${o.value === value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Select ────────────────────────────────────────────────────────────────
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (v: string) => void;
}

export function Select({ options, value, onChange }: SelectProps) {
  return (
    <select className="select" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
