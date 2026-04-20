import type { Fund } from './types';

function navSeries(startNav: number, annualCagr: number, volatility: number, months = 36, drawdownAt: number | null = null): number[] {
  const points = [startNav];
  let nav = startNav;
  const monthlyDrift = Math.pow(1 + annualCagr / 100, 1 / 12) - 1;
  for (let i = 1; i < months; i++) {
    const seed = Math.sin(i * 12.9898 + startNav * 78.233) * 43758.5453;
    const noise = (seed - Math.floor(seed) - 0.5) * 2 * volatility;
    let monthlyReturn = monthlyDrift + noise;
    if (drawdownAt && i >= drawdownAt && i <= drawdownAt + 3) monthlyReturn -= 0.06;
    nav = nav * (1 + monthlyReturn);
    points.push(+nav.toFixed(2));
  }
  return points;
}

export const MOCK_FUNDS: Fund[] = [
  {
    id: "120503", name: "Parag Parikh Flexi Cap Fund", amc: "PPFAS", category: "Flexi Cap",
    aum_cr: 78420, expense_ratio: 0.63, inception_date: "2013-05-24", nav: 78.34,
    returns: { "1y": 14.2, "3y": 18.7, "5y": 22.1 },
    category_avg_returns: { "1y": 11.0, "3y": 15.3, "5y": 17.8 },
    rolling_consistency_3y_pct: 84, max_drawdown_5y_pct: -22.5, recovery_months: 7,
    manager: { name: "Rajeev Thakkar", tenure_years: 11.5, funds_managed: 4, changed_last_12mo: false },
    style: { declared: "Flexi Cap", actual: "Quality-Value", r_squared: 0.78, match: "moderate", basis: "Quality" },
    concentration: { top_10_pct: 48.2, num_stocks: 31, top_sector_pct: 28.4 },
    nav_history_3y: navSeries(40, 22, 0.04, 36, 18)
  },
  {
    id: "100330", name: "HDFC Flexi Cap Fund", amc: "HDFC", category: "Flexi Cap",
    aum_cr: 64210, expense_ratio: 0.78, inception_date: "1995-01-01", nav: 1842.11,
    returns: { "1y": 16.8, "3y": 22.4, "5y": 19.3 },
    category_avg_returns: { "1y": 11.0, "3y": 15.3, "5y": 17.8 },
    rolling_consistency_3y_pct: 71, max_drawdown_5y_pct: -28.1, recovery_months: 11,
    manager: { name: "Roshi Jain", tenure_years: 3.2, funds_managed: 2, changed_last_12mo: false },
    style: { declared: "Flexi Cap", actual: "Value", r_squared: 0.88, match: "strict", basis: "Value" },
    concentration: { top_10_pct: 52.4, num_stocks: 48, top_sector_pct: 32.1 },
    nav_history_3y: navSeries(1100, 19, 0.05, 36, 14)
  },
  {
    id: "118834", name: "Mirae Asset Large Cap Fund", amc: "Mirae Asset", category: "Large Cap",
    aum_cr: 38950, expense_ratio: 0.54, inception_date: "2008-04-04", nav: 102.88,
    returns: { "1y": 12.3, "3y": 13.8, "5y": 16.2 },
    category_avg_returns: { "1y": 10.8, "3y": 13.1, "5y": 14.9 },
    rolling_consistency_3y_pct: 68, max_drawdown_5y_pct: -24.3, recovery_months: 9,
    manager: { name: "Gaurav Khandelwal", tenure_years: 2.1, funds_managed: 3, changed_last_12mo: false },
    style: { declared: "Large Cap", actual: "Blend", r_squared: 0.91, match: "strict", basis: "Blend" },
    concentration: { top_10_pct: 54.1, num_stocks: 62, top_sector_pct: 29.8 },
    nav_history_3y: navSeries(68, 16, 0.04, 36, 16)
  },
  {
    id: "119551", name: "Axis Bluechip Fund", amc: "Axis", category: "Large Cap",
    aum_cr: 31240, expense_ratio: 0.59, inception_date: "2010-01-05", nav: 58.92,
    returns: { "1y": 8.4, "3y": 10.2, "5y": 12.8 },
    category_avg_returns: { "1y": 10.8, "3y": 13.1, "5y": 14.9 },
    rolling_consistency_3y_pct: 42, max_drawdown_5y_pct: -26.7, recovery_months: 14,
    manager: { name: "Shreyash Devalkar", tenure_years: 5.4, funds_managed: 4, changed_last_12mo: false },
    style: { declared: "Large Cap", actual: "Growth", r_squared: 0.81, match: "moderate", basis: "Growth" },
    concentration: { top_10_pct: 61.3, num_stocks: 38, top_sector_pct: 34.2 },
    nav_history_3y: navSeries(42, 11, 0.045, 36, 10)
  },
  {
    id: "120834", name: "Nippon India Small Cap Fund", amc: "Nippon India", category: "Small Cap",
    aum_cr: 52180, expense_ratio: 0.73, inception_date: "2010-09-16", nav: 172.44,
    returns: { "1y": 24.6, "3y": 28.9, "5y": 32.4 },
    category_avg_returns: { "1y": 19.4, "3y": 22.8, "5y": 25.1 },
    rolling_consistency_3y_pct: 78, max_drawdown_5y_pct: -38.2, recovery_months: 13,
    manager: { name: "Samir Rachh", tenure_years: 8.7, funds_managed: 2, changed_last_12mo: false },
    style: { declared: "Small Cap", actual: "Growth", r_squared: 0.87, match: "strict", basis: "Growth" },
    concentration: { top_10_pct: 22.4, num_stocks: 142, top_sector_pct: 19.6 },
    nav_history_3y: navSeries(90, 30, 0.07, 36, 12)
  },
  {
    id: "125494", name: "Quant Small Cap Fund", amc: "Quant", category: "Small Cap",
    aum_cr: 21430, expense_ratio: 0.68, inception_date: "1996-10-29", nav: 264.88,
    returns: { "1y": 31.2, "3y": 36.8, "5y": 42.1 },
    category_avg_returns: { "1y": 19.4, "3y": 22.8, "5y": 25.1 },
    rolling_consistency_3y_pct: 81, max_drawdown_5y_pct: -42.8, recovery_months: 15,
    manager: { name: "Ankit Pande", tenure_years: 4.3, funds_managed: 6, changed_last_12mo: false },
    style: { declared: "Small Cap", actual: "Momentum", r_squared: 0.58, match: "drifted", basis: "Momentum" },
    concentration: { top_10_pct: 38.7, num_stocks: 78, top_sector_pct: 24.3 },
    nav_history_3y: navSeries(130, 38, 0.08, 36, 11)
  },
  {
    id: "118560", name: "SBI Small Cap Fund", amc: "SBI", category: "Small Cap",
    aum_cr: 28740, expense_ratio: 0.71, inception_date: "2009-09-09", nav: 148.22,
    returns: { "1y": 21.4, "3y": 24.8, "5y": 29.7 },
    category_avg_returns: { "1y": 19.4, "3y": 22.8, "5y": 25.1 },
    rolling_consistency_3y_pct: 74, max_drawdown_5y_pct: -34.1, recovery_months: 10,
    manager: { name: "R. Srinivasan", tenure_years: 9.2, funds_managed: 3, changed_last_12mo: false },
    style: { declared: "Small Cap", actual: "Quality", r_squared: 0.79, match: "moderate", basis: "Quality" },
    concentration: { top_10_pct: 34.2, num_stocks: 56, top_sector_pct: 22.7 },
    nav_history_3y: navSeries(82, 27, 0.065, 36, 13)
  },
  {
    id: "120716", name: "Kotak Emerging Equity Fund", amc: "Kotak", category: "Mid Cap",
    aum_cr: 42180, expense_ratio: 0.67, inception_date: "2007-03-30", nav: 112.34,
    returns: { "1y": 18.9, "3y": 22.1, "5y": 24.8 },
    category_avg_returns: { "1y": 16.2, "3y": 19.4, "5y": 22.1 },
    rolling_consistency_3y_pct: 72, max_drawdown_5y_pct: -30.4, recovery_months: 9,
    manager: { name: "Pankaj Tibrewal", tenure_years: 0.8, funds_managed: 2, changed_last_12mo: true },
    style: { declared: "Mid Cap", actual: "Growth", r_squared: 0.86, match: "strict", basis: "Growth" },
    concentration: { top_10_pct: 29.8, num_stocks: 68, top_sector_pct: 21.4 },
    nav_history_3y: navSeries(62, 24, 0.06, 36, 14)
  },
  {
    id: "118989", name: "Motilal Oswal Midcap Fund", amc: "Motilal Oswal", category: "Mid Cap",
    aum_cr: 18960, expense_ratio: 0.72, inception_date: "2014-02-24", nav: 94.12,
    returns: { "1y": 22.7, "3y": 26.4, "5y": 28.1 },
    category_avg_returns: { "1y": 16.2, "3y": 19.4, "5y": 22.1 },
    rolling_consistency_3y_pct: 76, max_drawdown_5y_pct: -32.8, recovery_months: 11,
    manager: { name: "Niket Shah", tenure_years: 3.8, funds_managed: 3, changed_last_12mo: false },
    style: { declared: "Mid Cap", actual: "Quality-Growth", r_squared: 0.83, match: "moderate", basis: "Quality" },
    concentration: { top_10_pct: 58.4, num_stocks: 26, top_sector_pct: 31.2 },
    nav_history_3y: navSeries(50, 28, 0.065, 36, 15)
  },
  {
    id: "122639", name: "Axis ELSS Tax Saver Fund", amc: "Axis", category: "ELSS",
    aum_cr: 34120, expense_ratio: 0.78, inception_date: "2009-12-29", nav: 78.44,
    returns: { "1y": 9.6, "3y": 11.4, "5y": 14.8 },
    category_avg_returns: { "1y": 13.2, "3y": 16.1, "5y": 18.4 },
    rolling_consistency_3y_pct: 38, max_drawdown_5y_pct: -28.4, recovery_months: 16,
    manager: { name: "Shreyash Devalkar", tenure_years: 2.6, funds_managed: 4, changed_last_12mo: false },
    style: { declared: "ELSS", actual: "Growth", r_squared: 0.72, match: "moderate", basis: "Growth" },
    concentration: { top_10_pct: 56.7, num_stocks: 42, top_sector_pct: 33.1 },
    nav_history_3y: navSeries(58, 13, 0.05, 36, 12)
  },
  {
    id: "118668", name: "Mirae Asset ELSS Tax Saver", amc: "Mirae Asset", category: "ELSS",
    aum_cr: 24680, expense_ratio: 0.58, inception_date: "2015-12-28", nav: 42.88,
    returns: { "1y": 15.2, "3y": 17.8, "5y": 20.4 },
    category_avg_returns: { "1y": 13.2, "3y": 16.1, "5y": 18.4 },
    rolling_consistency_3y_pct: 74, max_drawdown_5y_pct: -25.2, recovery_months: 8,
    manager: { name: "Neelesh Surana", tenure_years: 10.3, funds_managed: 5, changed_last_12mo: false },
    style: { declared: "ELSS", actual: "Blend", r_squared: 0.89, match: "strict", basis: "Blend" },
    concentration: { top_10_pct: 41.2, num_stocks: 72, top_sector_pct: 26.4 },
    nav_history_3y: navSeries(28, 19, 0.045, 36, 17)
  },
  {
    id: "130503", name: "UTI Nifty 50 Index Fund", amc: "UTI", category: "Index",
    aum_cr: 19840, expense_ratio: 0.20, inception_date: "2000-03-06", nav: 164.22,
    returns: { "1y": 11.2, "3y": 13.4, "5y": 15.1 },
    category_avg_returns: { "1y": 11.0, "3y": 13.2, "5y": 14.8 },
    rolling_consistency_3y_pct: 88, max_drawdown_5y_pct: -23.8, recovery_months: 8,
    manager: { name: "Sharwan Kumar Goyal", tenure_years: 6.4, funds_managed: 8, changed_last_12mo: false },
    style: { declared: "Index", actual: "Index", r_squared: 0.99, match: "strict", basis: "Blend" },
    concentration: { top_10_pct: 58.2, num_stocks: 50, top_sector_pct: 35.4 },
    nav_history_3y: navSeries(102, 13, 0.04, 36, 15)
  },
  {
    id: "147625", name: "Navi Nifty 50 Index Fund", amc: "Navi", category: "Index",
    aum_cr: 1840, expense_ratio: 0.06, inception_date: "2021-07-03", nav: 17.88,
    returns: { "1y": 11.1, "3y": 13.3, "5y": null },
    category_avg_returns: { "1y": 11.0, "3y": 13.2, "5y": 14.8 },
    rolling_consistency_3y_pct: 62, max_drawdown_5y_pct: -14.2, recovery_months: 5,
    manager: { name: "Aditya Mulki", tenure_years: 2.8, funds_managed: 4, changed_last_12mo: false },
    style: { declared: "Index", actual: "Index", r_squared: 0.99, match: "strict", basis: "Blend" },
    concentration: { top_10_pct: 58.1, num_stocks: 50, top_sector_pct: 35.3 },
    nav_history_3y: navSeries(13, 13, 0.04, 36, null)
  },
  {
    id: "135781", name: "ICICI Prudential Balanced Advantage", amc: "ICICI Prudential", category: "Hybrid",
    aum_cr: 58420, expense_ratio: 0.88, inception_date: "2006-12-30", nav: 64.22,
    returns: { "1y": 10.4, "3y": 12.8, "5y": 13.9 },
    category_avg_returns: { "1y": 9.8, "3y": 11.4, "5y": 12.6 },
    rolling_consistency_3y_pct: 82, max_drawdown_5y_pct: -13.4, recovery_months: 6,
    manager: { name: "Sankaran Naren", tenure_years: 7.8, funds_managed: 6, changed_last_12mo: false },
    style: { declared: "Hybrid", actual: "Dynamic Asset", r_squared: 0.84, match: "moderate", basis: "Blend" },
    concentration: { top_10_pct: 38.4, num_stocks: 84, top_sector_pct: 24.1 },
    nav_history_3y: navSeries(42, 12, 0.025, 36, 16)
  },
  {
    id: "120843", name: "HDFC Hybrid Equity Fund", amc: "HDFC", category: "Hybrid",
    aum_cr: 22340, expense_ratio: 0.94, inception_date: "2000-04-11", nav: 108.44,
    returns: { "1y": 12.1, "3y": 14.2, "5y": 13.2 },
    category_avg_returns: { "1y": 9.8, "3y": 11.4, "5y": 12.6 },
    rolling_consistency_3y_pct: 66, max_drawdown_5y_pct: -19.8, recovery_months: 10,
    manager: { name: "Chirag Setalvad", tenure_years: 12.4, funds_managed: 3, changed_last_12mo: false },
    style: { declared: "Hybrid", actual: "Value", r_squared: 0.76, match: "moderate", basis: "Value" },
    concentration: { top_10_pct: 42.8, num_stocks: 56, top_sector_pct: 27.6 },
    nav_history_3y: navSeries(72, 13, 0.035, 36, 14)
  },
  {
    id: "140228", name: "DSP Value Fund", amc: "DSP", category: "Flexi Cap",
    aum_cr: 1240, expense_ratio: 0.89, inception_date: "2020-12-10", nav: 18.22,
    returns: { "1y": 19.4, "3y": 21.8, "5y": null },
    category_avg_returns: { "1y": 11.0, "3y": 15.3, "5y": 17.8 },
    rolling_consistency_3y_pct: 68, max_drawdown_5y_pct: -8.4, recovery_months: 3,
    manager: { name: "Aparna Karnik", tenure_years: 3.1, funds_managed: 2, changed_last_12mo: false },
    style: { declared: "Flexi Cap", actual: "Value", r_squared: 0.91, match: "strict", basis: "Value" },
    concentration: { top_10_pct: 46.2, num_stocks: 38, top_sector_pct: 28.9 },
    nav_history_3y: navSeries(12, 22, 0.05, 36, null)
  },
  {
    id: "119212", name: "Canara Robeco Bluechip Equity", amc: "Canara Robeco", category: "Large Cap",
    aum_cr: 13840, expense_ratio: 0.48, inception_date: "2010-08-20", nav: 52.44,
    returns: { "1y": 10.8, "3y": 12.4, "5y": 15.7 },
    category_avg_returns: { "1y": 10.8, "3y": 13.1, "5y": 14.9 },
    rolling_consistency_3y_pct: 64, max_drawdown_5y_pct: -22.1, recovery_months: 8,
    manager: { name: "Shridatta Bhandwaldar", tenure_years: 6.8, funds_managed: 4, changed_last_12mo: false },
    style: { declared: "Large Cap", actual: "Quality", r_squared: 0.87, match: "strict", basis: "Quality" },
    concentration: { top_10_pct: 52.6, num_stocks: 44, top_sector_pct: 31.2 },
    nav_history_3y: navSeries(36, 15, 0.04, 36, 15)
  },
  {
    id: "118533", name: "Edelweiss Large & Mid Cap", amc: "Edelweiss", category: "Large Cap",
    aum_cr: 3420, expense_ratio: 0.42, inception_date: "2007-06-14", nav: 78.22,
    returns: { "1y": 13.8, "3y": 16.4, "5y": 18.1 },
    category_avg_returns: { "1y": 10.8, "3y": 13.1, "5y": 14.9 },
    rolling_consistency_3y_pct: 58, max_drawdown_5y_pct: -26.4, recovery_months: 11,
    manager: { name: "Trideep Bhattacharya", tenure_years: 3.4, funds_managed: 5, changed_last_12mo: false },
    style: { declared: "Large Cap", actual: "Blend", r_squared: 0.68, match: "moderate", basis: "Blend" },
    concentration: { top_10_pct: 44.8, num_stocks: 58, top_sector_pct: 28.3 },
    nav_history_3y: navSeries(52, 17, 0.05, 36, 12)
  },
  {
    id: "125354", name: "Tata Digital India Fund", amc: "Tata", category: "Others",
    aum_cr: 11240, expense_ratio: 0.34, inception_date: "2015-12-28", nav: 44.88,
    returns: { "1y": 18.4, "3y": 13.2, "5y": 26.4 },
    category_avg_returns: { "1y": 14.2, "3y": 10.8, "5y": 21.2 },
    rolling_consistency_3y_pct: 58, max_drawdown_5y_pct: -36.2, recovery_months: 14,
    manager: { name: "Meeta Shetty", tenure_years: 4.2, funds_managed: 3, changed_last_12mo: false },
    style: { declared: "Sectoral", actual: "Growth", r_squared: 0.54, match: "drifted", basis: "Growth" },
    concentration: { top_10_pct: 72.4, num_stocks: 28, top_sector_pct: 78.4 },
    nav_history_3y: navSeries(28, 14, 0.08, 36, 12)
  },
  {
    id: "133386", name: "Quant Active Fund", amc: "Quant", category: "Flexi Cap",
    aum_cr: 9840, expense_ratio: 0.58, inception_date: "2001-03-20", nav: 712.22,
    returns: { "1y": 22.8, "3y": 24.1, "5y": 31.4 },
    category_avg_returns: { "1y": 11.0, "3y": 15.3, "5y": 17.8 },
    rolling_consistency_3y_pct: 69, max_drawdown_5y_pct: -32.4, recovery_months: 13,
    manager: { name: "Sandeep Tandon", tenure_years: 5.7, funds_managed: 8, changed_last_12mo: false },
    style: { declared: "Flexi Cap", actual: "Momentum", r_squared: 0.42, match: "drifted", basis: "Momentum" },
    concentration: { top_10_pct: 38.4, num_stocks: 48, top_sector_pct: 26.8 },
    nav_history_3y: navSeries(380, 28, 0.075, 36, 11)
  },
  {
    id: "102845", name: "Franklin India Bluechip", amc: "Franklin Templeton", category: "Large Cap",
    aum_cr: 7240, expense_ratio: 1.04, inception_date: "1993-12-01", nav: 984.22,
    returns: { "1y": 9.8, "3y": 11.2, "5y": 13.4 },
    category_avg_returns: { "1y": 10.8, "3y": 13.1, "5y": 14.9 },
    rolling_consistency_3y_pct: 44, max_drawdown_5y_pct: -27.8, recovery_months: 15,
    manager: { name: "Venkatesh Sanjeevi", tenure_years: 1.8, funds_managed: 3, changed_last_12mo: false },
    style: { declared: "Large Cap", actual: "Value", r_squared: 0.74, match: "moderate", basis: "Value" },
    concentration: { top_10_pct: 58.2, num_stocks: 42, top_sector_pct: 32.8 },
    nav_history_3y: navSeries(720, 11, 0.045, 36, 13)
  },
  {
    id: "112277", name: "L&T Emerging Businesses", amc: "L&T", category: "Small Cap",
    aum_cr: 14820, expense_ratio: 0.74, inception_date: "2014-05-12", nav: 68.44,
    returns: { "1y": 19.2, "3y": 22.4, "5y": 26.8 },
    category_avg_returns: { "1y": 19.4, "3y": 22.8, "5y": 25.1 },
    rolling_consistency_3y_pct: 54, max_drawdown_5y_pct: -41.2, recovery_months: 17,
    manager: { name: "Venugopal Manghat", tenure_years: 7.2, funds_managed: 2, changed_last_12mo: false },
    style: { declared: "Small Cap", actual: "Blend", r_squared: 0.82, match: "moderate", basis: "Blend" },
    concentration: { top_10_pct: 28.4, num_stocks: 112, top_sector_pct: 22.4 },
    nav_history_3y: navSeries(38, 26, 0.07, 36, 10)
  },
  {
    id: "140567", name: "WhiteOak Capital Flexi Cap", amc: "WhiteOak", category: "Flexi Cap",
    aum_cr: 2840, expense_ratio: 0.62, inception_date: "2022-07-12", nav: 14.22,
    returns: { "1y": 17.8, "3y": null, "5y": null },
    category_avg_returns: { "1y": 11.0, "3y": 15.3, "5y": 17.8 },
    rolling_consistency_3y_pct: null, max_drawdown_5y_pct: -6.2, recovery_months: 2,
    manager: { name: "Ramesh Mantri", tenure_years: 1.7, funds_managed: 3, changed_last_12mo: false },
    style: { declared: "Flexi Cap", actual: "Quality", r_squared: 0.82, match: "moderate", basis: "Quality" },
    concentration: { top_10_pct: 36.8, num_stocks: 62, top_sector_pct: 24.2 },
    nav_history_3y: navSeries(10, 18, 0.05, 20, null)
  },
  {
    id: "118999", name: "Invesco India Contra Fund", amc: "Invesco", category: "Flexi Cap",
    aum_cr: 13420, expense_ratio: 0.64, inception_date: "2007-04-11", nav: 98.44,
    returns: { "1y": 20.4, "3y": 21.8, "5y": 22.4 },
    category_avg_returns: { "1y": 11.0, "3y": 15.3, "5y": 17.8 },
    rolling_consistency_3y_pct: 77, max_drawdown_5y_pct: -24.8, recovery_months: 9,
    manager: { name: "Taher Badshah", tenure_years: 6.8, funds_managed: 2, changed_last_12mo: false },
    style: { declared: "Contra", actual: "Value", r_squared: 0.85, match: "strict", basis: "Value" },
    concentration: { top_10_pct: 42.4, num_stocks: 54, top_sector_pct: 26.8 },
    nav_history_3y: navSeries(60, 22, 0.05, 36, 14)
  },
  {
    id: "120184", name: "Sundaram Mid Cap Fund", amc: "Sundaram", category: "Mid Cap",
    aum_cr: 9240, expense_ratio: 0.91, inception_date: "2002-07-30", nav: 1124.22,
    returns: { "1y": 14.2, "3y": 16.8, "5y": 19.4 },
    category_avg_returns: { "1y": 16.2, "3y": 19.4, "5y": 22.1 },
    rolling_consistency_3y_pct: 48, max_drawdown_5y_pct: -31.4, recovery_months: 12,
    manager: { name: "S. Bharath", tenure_years: 0.6, funds_managed: 4, changed_last_12mo: true },
    style: { declared: "Mid Cap", actual: "Growth", r_squared: 0.78, match: "moderate", basis: "Growth" },
    concentration: { top_10_pct: 34.8, num_stocks: 72, top_sector_pct: 24.6 },
    nav_history_3y: navSeries(780, 18, 0.055, 36, 13)
  }
];
