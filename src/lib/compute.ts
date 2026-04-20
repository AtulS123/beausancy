// Compute CAGR from NAV series
export function computeCAGR(navData: Array<{date: string; nav: string}>, years: number): number | null {
  const sorted = [...navData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (sorted.length < 2) return null;
  const endNav = parseFloat(sorted[0].nav);
  const targetDate = new Date(sorted[0].date);
  targetDate.setFullYear(targetDate.getFullYear() - years);
  const startEntry = sorted.find(d => new Date(d.date) <= targetDate);
  if (!startEntry) return null;
  const startNav = parseFloat(startEntry.nav);
  const actualYears = (new Date(sorted[0].date).getTime() - new Date(startEntry.date).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (actualYears < years * 0.8) return null;
  return (Math.pow(endNav / startNav, 1 / actualYears) - 1) * 100;
}

// Compute rolling consistency: % of rolling N-year windows fund beat benchmark (8% annualized)
export function computeRollingConsistency(navData: Array<{date: string; nav: string}>, windowYears: number = 3): number | null {
  const sorted = [...navData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (sorted.length < 12 * windowYears) return null;
  let wins = 0, total = 0;
  const windowMonths = windowYears * 12;
  for (let i = windowMonths; i < sorted.length; i++) {
    const startNav = parseFloat(sorted[i - windowMonths].nav);
    const endNav = parseFloat(sorted[i].nav);
    const ret = (endNav - startNav) / startNav;
    const annualized = Math.pow(1 + ret, 1 / windowYears) - 1;
    if (annualized > 0.08) wins++;
    total++;
  }
  return total > 0 ? Math.round((wins / total) * 100) : null;
}

// Compute max drawdown over last N years
export function computeMaxDrawdown(navData: Array<{date: string; nav: string}>, years: number = 5): number {
  const sorted = [...navData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  const recent = sorted.filter(d => new Date(d.date) >= cutoff);
  if (recent.length < 2) return 0;
  let maxNav = 0, maxDD = 0;
  for (const d of recent) {
    const nav = parseFloat(d.nav);
    if (nav > maxNav) maxNav = nav;
    const dd = (nav - maxNav) / maxNav * 100;
    if (dd < maxDD) maxDD = dd;
  }
  return maxDD;
}

// Estimate recovery months after max drawdown
export function computeRecoveryMonths(navData: Array<{date: string; nav: string}>): number {
  const sorted = [...navData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 5);
  const recent = sorted.filter(d => new Date(d.date) >= cutoff);
  if (recent.length < 2) return 0;

  let maxNav = parseFloat(recent[0].nav);
  let maxNavIdx = 0;
  let troughNav = maxNav;
  let troughIdx = 0;

  // Find peak and trough
  for (let i = 1; i < recent.length; i++) {
    const nav = parseFloat(recent[i].nav);
    if (nav > maxNav) { maxNav = nav; maxNavIdx = i; troughIdx = i; troughNav = nav; }
    else if (nav < troughNav) { troughNav = nav; troughIdx = i; }
  }

  if (troughIdx <= maxNavIdx) return 0;

  // Find when it recovered back to peak
  for (let i = troughIdx + 1; i < recent.length; i++) {
    if (parseFloat(recent[i].nav) >= maxNav) {
      const peakDate = new Date(recent[maxNavIdx].date);
      const recovDate = new Date(recent[i].date);
      const months = (recovDate.getTime() - peakDate.getTime()) / (30.44 * 24 * 3600 * 1000);
      return Math.round(months);
    }
  }

  // Still underwater — return months since trough
  const troughDate = new Date(recent[troughIdx].date);
  const now = new Date();
  return Math.round((now.getTime() - troughDate.getTime()) / (30.44 * 24 * 3600 * 1000));
}

// Get last 36 monthly NAV points for sparkline
export function get3YNavHistory(navData: Array<{date: string; nav: string}>): number[] {
  const sorted = [...navData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const monthly: number[] = [];
  const seen = new Set<string>();
  for (const d of sorted) {
    const key = d.date.substring(0, 7); // YYYY-MM
    if (!seen.has(key)) {
      seen.add(key);
      monthly.push(parseFloat(d.nav));
      if (monthly.length >= 36) break;
    }
  }
  return monthly.reverse();
}

// Compute fund age in years
export function computeFundAge(inceptionDate: string): number {
  const inception = new Date(inceptionDate);
  const now = new Date();
  return (now.getTime() - inception.getTime()) / (365.25 * 24 * 3600 * 1000);
}
