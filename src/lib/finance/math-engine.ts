// =============================================================================
// Financial Mathematics & Algorithms Library
// Pure TypeScript, zero external dependencies
// =============================================================================

// -----------------------------------------------------------------------------
// Time Value of Money
// -----------------------------------------------------------------------------

/** Present value of a future sum discounted at a periodic rate. */
export function presentValue(fv: number, rate: number, periods: number): number {
  return fv / Math.pow(1 + rate, periods);
}

/** Future value of a present sum compounded at a periodic rate. */
export function futureValue(pv: number, rate: number, periods: number): number {
  return pv * Math.pow(1 + rate, periods);
}

/**
 * Net present value of a series of cash flows.
 * cashflows[0] is at time 0, cashflows[1] at time 1, etc.
 */
export function netPresentValue(rate: number, cashflows: number[]): number {
  return cashflows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + rate, t), 0);
}

/**
 * Internal rate of return using Newton's method.
 * cashflows[0] is typically a negative initial investment.
 * @param maxIterations - iteration cap (default 1000)
 * @param tolerance - convergence threshold (default 1e-10)
 */
export function internalRateOfReturn(
  cashflows: number[],
  maxIterations = 1000,
  tolerance = 1e-10,
): number {
  let rate = 0.1; // initial guess
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv += cashflows[t] / denom;
      dnpv -= (t * cashflows[t]) / (denom * (1 + rate));
    }
    if (Math.abs(npv) < tolerance) return rate;
    if (dnpv === 0) break;
    rate -= npv / dnpv;
  }
  return rate;
}

/**
 * Modified internal rate of return.
 * Uses financeRate for negative cash flows and reinvestRate for positive ones.
 */
export function modifiedIRR(
  cashflows: number[],
  financeRate: number,
  reinvestRate: number,
): number {
  const n = cashflows.length - 1;
  let pvNeg = 0;
  let fvPos = 0;
  for (let t = 0; t < cashflows.length; t++) {
    if (cashflows[t] < 0) {
      pvNeg += cashflows[t] / Math.pow(1 + financeRate, t);
    } else {
      fvPos += cashflows[t] * Math.pow(1 + reinvestRate, n - t);
    }
  }
  if (pvNeg === 0) return NaN;
  return Math.pow(-fvPos / pvNeg, 1 / n) - 1;
}

/** Payment amount (PMT) for an ordinary annuity. */
export function paymentAmount(pv: number, rate: number, periods: number): number {
  if (rate === 0) return pv / periods;
  return (pv * rate * Math.pow(1 + rate, periods)) / (Math.pow(1 + rate, periods) - 1);
}

/** Number of periods required to grow pv to fv given periodic rate and payment. */
export function numberOfPeriods(
  pv: number,
  fv: number,
  rate: number,
  pmt: number,
): number {
  if (rate === 0) return (fv - pv) / pmt;
  return Math.log((pmt - rate * fv) / (pmt + rate * pv)) / Math.log(1 + rate);
}

/** Effective annual rate given a nominal rate and number of compounding periods per year. */
export function effectiveAnnualRate(
  nominalRate: number,
  compoundingPeriods: number,
): number {
  return Math.pow(1 + nominalRate / compoundingPeriods, compoundingPeriods) - 1;
}

/** Continuous compounding: FV = PV * e^(rate * time). */
export function continuousCompounding(
  pv: number,
  rate: number,
  time: number,
): number {
  return pv * Math.exp(rate * time);
}

// -----------------------------------------------------------------------------
// Depreciation
// -----------------------------------------------------------------------------

/** Straight-line depreciation per period. */
export function straightLine(cost: number, salvage: number, life: number): number {
  return (cost - salvage) / life;
}

/**
 * Declining balance depreciation for a specific period.
 * @param factor - multiplier for the straight-line rate (default 1.5 for 150% DB)
 */
export function decliningBalance(
  cost: number,
  salvage: number,
  life: number,
  period: number,
  factor = 1.5,
): number {
  const rate = factor / life;
  let bookValue = cost;
  for (let p = 1; p < period; p++) {
    const dep = bookValue * rate;
    bookValue -= dep;
    if (bookValue < salvage) {
      bookValue += dep; // undo
      break;
    }
  }
  const dep = bookValue * rate;
  return Math.max(0, Math.min(dep, bookValue - salvage));
}

/** Double-declining balance depreciation for a specific period. */
export function doubleDecliningBalance(
  cost: number,
  salvage: number,
  life: number,
  period: number,
): number {
  return decliningBalance(cost, salvage, life, period, 2);
}

/** Sum-of-years-digits depreciation for a specific period. */
export function sumOfYearsDigits(
  cost: number,
  salvage: number,
  life: number,
  period: number,
): number {
  const syd = (life * (life + 1)) / 2;
  const remainingLife = life - period + 1;
  return ((cost - salvage) * remainingLife) / syd;
}

/** Units-of-production depreciation for the current period. */
export function unitsOfProduction(
  cost: number,
  salvage: number,
  totalUnits: number,
  unitsThisPeriod: number,
): number {
  return ((cost - salvage) / totalUnits) * unitsThisPeriod;
}

/**
 * MACRS depreciation for a given year using standard GDS tables.
 * @param propertyClass - one of 3, 5, 7, 10, 15, 20 (years)
 * @param year - 1-indexed year of service
 */
export function macrs(cost: number, propertyClass: number, year: number): number {
  const tables: Record<number, number[]> = {
    3: [0.3333, 0.4445, 0.1481, 0.0741],
    5: [0.2, 0.32, 0.192, 0.1152, 0.1152, 0.0576],
    7: [0.1429, 0.2449, 0.1749, 0.1249, 0.0893, 0.0892, 0.0893, 0.0446],
    10: [0.1, 0.18, 0.144, 0.1152, 0.0922, 0.0737, 0.0655, 0.0655, 0.0656, 0.0655, 0.0328],
    15: [
      0.05, 0.095, 0.0855, 0.077, 0.0693, 0.0623, 0.059, 0.059, 0.0591, 0.059,
      0.0591, 0.059, 0.0591, 0.059, 0.0591, 0.0295,
    ],
    20: [
      0.0375, 0.07219, 0.06677, 0.06177, 0.05713, 0.05285, 0.04888, 0.04522,
      0.04462, 0.04461, 0.04462, 0.04461, 0.04462, 0.04461, 0.04462, 0.04461,
      0.04462, 0.04461, 0.04462, 0.04461, 0.02231,
    ],
  };
  const table = tables[propertyClass];
  if (!table) return NaN;
  if (year < 1 || year > table.length) return 0;
  return cost * table[year - 1];
}

// -----------------------------------------------------------------------------
// Loan & Amortization
// -----------------------------------------------------------------------------

export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

/**
 * Generate a full amortization schedule.
 * @param principal - loan amount
 * @param annualRate - annual interest rate (e.g. 0.06 for 6%)
 * @param termMonths - total number of monthly payments
 */
export function amortizationSchedule(
  principal: number,
  annualRate: number,
  termMonths: number,
): AmortizationRow[] {
  const monthlyRate = annualRate / 12;
  const pmt = paymentAmount(principal, monthlyRate, termMonths);
  const schedule: AmortizationRow[] = [];
  let balance = principal;

  for (let m = 1; m <= termMonths; m++) {
    const interest = balance * monthlyRate;
    const princ = pmt - interest;
    balance -= princ;
    schedule.push({
      month: m,
      payment: roundToDecimal(pmt, 2),
      principal: roundToDecimal(princ, 2),
      interest: roundToDecimal(interest, 2),
      balance: roundToDecimal(Math.max(balance, 0), 2),
    });
  }
  return schedule;
}

/** Effective interest rate from a nominal rate given compounding frequency. */
export function effectiveInterestRate(
  nominalRate: number,
  frequency: number,
): number {
  return Math.pow(1 + nominalRate / frequency, frequency) - 1;
}

/** Outstanding loan balance after periodsPaid payments. */
export function loanBalance(
  principal: number,
  rate: number,
  totalPeriods: number,
  periodsPaid: number,
): number {
  if (rate === 0) return principal * (1 - periodsPaid / totalPeriods);
  const factor = Math.pow(1 + rate, totalPeriods);
  const factorPaid = Math.pow(1 + rate, periodsPaid);
  return principal * (factor - factorPaid) / (factor - 1);
}

/** Total interest paid over the life of a loan. */
export function totalInterestPaid(
  principal: number,
  rate: number,
  periods: number,
): number {
  const pmt = paymentAmount(principal, rate, periods);
  return pmt * periods - principal;
}

// -----------------------------------------------------------------------------
// Investment Analysis
// -----------------------------------------------------------------------------

/** Return on investment. */
export function roi(gain: number, cost: number): number {
  return (gain - cost) / cost;
}

/** Return on invested capital. */
export function roic(nopat: number, investedCapital: number): number {
  return nopat / investedCapital;
}

/**
 * Simple payback period (non-discounted).
 * Returns the number of periods (possibly fractional) to recoup the initial investment.
 */
export function paybackPeriod(
  initialInvestment: number,
  cashflows: number[],
): number {
  let cumulative = 0;
  for (let i = 0; i < cashflows.length; i++) {
    cumulative += cashflows[i];
    if (cumulative >= initialInvestment) {
      const overshoot = cumulative - initialInvestment;
      return i + 1 - overshoot / cashflows[i];
    }
  }
  return NaN; // never recovered
}

/** Discounted payback period. */
export function discountedPaybackPeriod(
  initialInvestment: number,
  cashflows: number[],
  rate: number,
): number {
  let cumulative = 0;
  for (let i = 0; i < cashflows.length; i++) {
    const dcf = cashflows[i] / Math.pow(1 + rate, i + 1);
    cumulative += dcf;
    if (cumulative >= initialInvestment) {
      const overshoot = cumulative - initialInvestment;
      return i + 1 - overshoot / dcf;
    }
  }
  return NaN;
}

/** Profitability index: PV of future cash flows / initial investment. */
export function profitabilityIndex(
  initialInvestment: number,
  cashflows: number[],
  rate: number,
): number {
  const pvCashflows = cashflows.reduce(
    (sum, cf, t) => sum + cf / Math.pow(1 + rate, t + 1),
    0,
  );
  return pvCashflows / initialInvestment;
}

/** Bond price given face value, coupon rate, market yield, and number of periods. */
export function bondPrice(
  faceValue: number,
  couponRate: number,
  marketRate: number,
  periods: number,
): number {
  const coupon = faceValue * couponRate;
  let price = 0;
  for (let t = 1; t <= periods; t++) {
    price += coupon / Math.pow(1 + marketRate, t);
  }
  price += faceValue / Math.pow(1 + marketRate, periods);
  return price;
}

/**
 * Bond yield to maturity using Newton's method.
 * Iteratively solves for the discount rate that equates the bond price to the PV of its cash flows.
 */
export function bondYieldToMaturity(
  faceValue: number,
  couponRate: number,
  price: number,
  periods: number,
  maxIterations = 1000,
  tolerance = 1e-10,
): number {
  const coupon = faceValue * couponRate;
  let ytm = couponRate; // initial guess
  for (let i = 0; i < maxIterations; i++) {
    let f = -price;
    let df = 0;
    for (let t = 1; t <= periods; t++) {
      const disc = Math.pow(1 + ytm, t);
      f += coupon / disc;
      df -= (t * coupon) / (disc * (1 + ytm));
    }
    const disc = Math.pow(1 + ytm, periods);
    f += faceValue / disc;
    df -= (periods * faceValue) / (disc * (1 + ytm));

    if (Math.abs(f) < tolerance) return ytm;
    if (df === 0) break;
    ytm -= f / df;
  }
  return ytm;
}

/** Current yield of a bond. */
export function currentYield(
  faceValue: number,
  couponRate: number,
  price: number,
): number {
  return (faceValue * couponRate) / price;
}

/**
 * Macaulay duration: weighted average time to receive the bond's cash flows.
 * cashflows[0] is at time 1, cashflows[1] at time 2, etc.
 */
export function duration(cashflows: number[], rate: number): number {
  let pv = 0;
  let weightedPv = 0;
  for (let t = 0; t < cashflows.length; t++) {
    const disc = cashflows[t] / Math.pow(1 + rate, t + 1);
    pv += disc;
    weightedPv += (t + 1) * disc;
  }
  return weightedPv / pv;
}

/** Modified duration = Macaulay duration / (1 + rate/periods). */
export function modifiedDuration(
  cashflows: number[],
  rate: number,
  periods: number,
): number {
  return duration(cashflows, rate) / (1 + rate / periods);
}

/**
 * Convexity of a series of cash flows.
 * Measures the curvature in the price-yield relationship.
 */
export function convexity(cashflows: number[], rate: number): number {
  let pv = 0;
  let conv = 0;
  for (let t = 0; t < cashflows.length; t++) {
    const period = t + 1;
    const disc = cashflows[t] / Math.pow(1 + rate, period);
    pv += disc;
    conv += period * (period + 1) * disc;
  }
  return conv / (pv * Math.pow(1 + rate, 2));
}

// -----------------------------------------------------------------------------
// Ratio Analysis
// -----------------------------------------------------------------------------

export function currentRatio(
  currentAssets: number,
  currentLiabilities: number,
): number {
  return currentAssets / currentLiabilities;
}

export function quickRatio(
  currentAssets: number,
  inventory: number,
  currentLiabilities: number,
): number {
  return (currentAssets - inventory) / currentLiabilities;
}

export function debtToEquity(totalDebt: number, totalEquity: number): number {
  return totalDebt / totalEquity;
}

export function debtToAssets(totalDebt: number, totalAssets: number): number {
  return totalDebt / totalAssets;
}

export function grossProfitMargin(revenue: number, cogs: number): number {
  return (revenue - cogs) / revenue;
}

export function netProfitMargin(netIncome: number, revenue: number): number {
  return netIncome / revenue;
}

export function operatingMargin(
  operatingIncome: number,
  revenue: number,
): number {
  return operatingIncome / revenue;
}

export function ebitdaMargin(ebitda: number, revenue: number): number {
  return ebitda / revenue;
}

export function returnOnAssets(netIncome: number, totalAssets: number): number {
  return netIncome / totalAssets;
}

export function returnOnEquity(
  netIncome: number,
  shareholderEquity: number,
): number {
  return netIncome / shareholderEquity;
}

export function assetTurnover(revenue: number, totalAssets: number): number {
  return revenue / totalAssets;
}

export function inventoryTurnover(cogs: number, avgInventory: number): number {
  return cogs / avgInventory;
}

/** Days sales outstanding (assumes 365-day year). */
export function daysSalesOutstanding(
  accountsReceivable: number,
  revenue: number,
): number {
  return (accountsReceivable / revenue) * 365;
}

/** Days payable outstanding (assumes 365-day year). */
export function daysPayableOutstanding(
  accountsPayable: number,
  cogs: number,
): number {
  return (accountsPayable / cogs) * 365;
}

/** Cash conversion cycle = DSO + DIO - DPO. */
export function cashConversionCycle(
  dso: number,
  dpo: number,
  dio: number,
): number {
  return dso + dio - dpo;
}

export function earningsPerShare(
  netIncome: number,
  sharesOutstanding: number,
): number {
  return netIncome / sharesOutstanding;
}

export function priceToEarnings(sharePrice: number, eps: number): number {
  return sharePrice / eps;
}

export function priceToBook(
  sharePrice: number,
  bookValuePerShare: number,
): number {
  return sharePrice / bookValuePerShare;
}

export function enterpriseValue(
  marketCap: number,
  debt: number,
  cash: number,
): number {
  return marketCap + debt - cash;
}

export function evToEbitda(ev: number, ebitda: number): number {
  return ev / ebitda;
}

export function workingCapital(
  currentAssets: number,
  currentLiabilities: number,
): number {
  return currentAssets - currentLiabilities;
}

export function freeCashFlow(
  operatingCashFlow: number,
  capex: number,
): number {
  return operatingCashFlow - capex;
}

// -----------------------------------------------------------------------------
// Statistics for Finance
// -----------------------------------------------------------------------------

/** Arithmetic mean. */
export function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Median (middle value of sorted array). */
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Mode (most frequent value). Returns the first mode found if there are ties. */
export function mode(values: number[]): number {
  const counts = new Map<number, number>();
  let maxCount = 0;
  let modeVal = values[0];
  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    if (c > maxCount) {
      maxCount = c;
      modeVal = v;
    }
  }
  return modeVal;
}

/** Population standard deviation. */
export function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

/** Population variance. */
export function variance(values: number[]): number {
  const avg = mean(values);
  return values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
}

/** Population covariance between two arrays. */
export function covariance(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  const mx = mean(x);
  const my = mean(y);
  let cov = 0;
  for (let i = 0; i < n; i++) {
    cov += (x[i] - mx) * (y[i] - my);
  }
  return cov / n;
}

/** Pearson correlation coefficient. */
export function correlation(x: number[], y: number[]): number {
  const cov = covariance(x, y);
  const sx = standardDeviation(x);
  const sy = standardDeviation(y);
  return cov / (sx * sy);
}

/** Beta of a stock relative to the market. */
export function beta(stockReturns: number[], marketReturns: number[]): number {
  return covariance(stockReturns, marketReturns) / variance(marketReturns);
}

/**
 * Sharpe ratio: (mean return - risk-free rate) / std dev of returns.
 * @param returns - array of periodic returns
 * @param riskFreeRate - risk-free rate for the same period
 */
export function sharpeRatio(returns: number[], riskFreeRate: number): number {
  const excessMean = mean(returns) - riskFreeRate;
  return excessMean / standardDeviation(returns);
}

/**
 * Sortino ratio: uses downside deviation instead of total standard deviation.
 * Only penalises returns below the risk-free rate.
 */
export function sortinoRatio(returns: number[], riskFreeRate: number): number {
  const excessMean = mean(returns) - riskFreeRate;
  const downsideSquares = returns
    .map((r) => Math.min(r - riskFreeRate, 0) ** 2);
  const downsideDev = Math.sqrt(
    downsideSquares.reduce((s, v) => s + v, 0) / returns.length,
  );
  return excessMean / downsideDev;
}

/** Treynor ratio: excess return per unit of systematic risk (beta). */
export function treynorRatio(
  returns: number[],
  riskFreeRate: number,
  betaValue: number,
): number {
  return (mean(returns) - riskFreeRate) / betaValue;
}

/**
 * Historical value at risk using the percentile method.
 * @param confidenceLevel - e.g. 0.95 for 95% VaR
 * @returns the loss threshold (a negative number indicates a loss)
 */
export function valueAtRisk(
  returns: number[],
  confidenceLevel: number,
): number {
  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidenceLevel) * sorted.length);
  return sorted[index];
}

/** Expected portfolio return given weights and expected returns per asset. */
export function expectedReturn(
  weights: number[],
  returns: number[],
): number {
  return weights.reduce((s, w, i) => s + w * returns[i], 0);
}

/**
 * Portfolio variance using weights and a covariance matrix.
 * variance = w^T * Sigma * w
 */
export function portfolioVariance(
  weights: number[],
  covMatrix: number[][],
): number {
  let result = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      result += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  return result;
}

/** Capital Asset Pricing Model: E(R) = Rf + beta * (Rm - Rf). */
export function capm(
  riskFreeRate: number,
  betaValue: number,
  marketReturn: number,
): number {
  return riskFreeRate + betaValue * (marketReturn - riskFreeRate);
}

/** Weighted average of values. */
export function weightedAverage(
  values: number[],
  weights: number[],
): number {
  let sum = 0;
  let wSum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] * weights[i];
    wSum += weights[i];
  }
  return sum / wSum;
}

/** Simple moving average with a given window size. */
export function movingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i <= values.length - window; i++) {
    let sum = 0;
    for (let j = 0; j < window; j++) {
      sum += values[i + j];
    }
    result.push(sum / window);
  }
  return result;
}

/**
 * Exponential moving average.
 * @param span - the span (number of periods) used to compute the smoothing factor alpha = 2 / (span + 1)
 */
export function exponentialMovingAverage(
  values: number[],
  span: number,
): number[] {
  const alpha = 2 / (span + 1);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  r2: number;
}

/**
 * Ordinary least squares linear regression.
 * Returns slope, intercept, and R-squared.
 */
export function linearRegression(
  x: number[],
  y: number[],
): LinearRegressionResult {
  const n = x.length;
  const mx = mean(x);
  const my = mean(y);
  let ssXY = 0;
  let ssXX = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (x[i] - mx) * (y[i] - my);
    ssXX += (x[i] - mx) ** 2;
    ssTot += (y[i] - my) ** 2;
  }
  const slope = ssXY / ssXX;
  const intercept = my - slope * mx;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (y[i] - (slope * x[i] + intercept)) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

// -----------------------------------------------------------------------------
// Tax Calculations
// -----------------------------------------------------------------------------

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

/** Simple flat tax. */
export function simpleTax(income: number, rate: number): number {
  return income * rate;
}

/** Progressive (marginal bracket) tax. */
export function progressiveTax(
  income: number,
  brackets: TaxBracket[],
): number {
  let tax = 0;
  for (const b of brackets) {
    if (income <= b.min) break;
    const taxable = Math.min(income, b.max) - b.min;
    tax += taxable * b.rate;
  }
  return tax;
}

/** Progressive tax after applying deductions. */
export function taxWithDeductions(
  income: number,
  deductions: number[],
  brackets: TaxBracket[],
): number {
  const totalDeductions = deductions.reduce((s, d) => s + d, 0);
  const taxableIncome = Math.max(0, income - totalDeductions);
  return progressiveTax(taxableIncome, brackets);
}

/** Effective tax rate = tax paid / gross income. */
export function effectiveTaxRate(
  taxPaid: number,
  grossIncome: number,
): number {
  return taxPaid / grossIncome;
}

/** Marginal tax rate: the rate on the next dollar of income. */
export function marginalTaxRate(
  income: number,
  brackets: TaxBracket[],
): number {
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (income > brackets[i].min) return brackets[i].rate;
  }
  return 0;
}

/** Sales tax — rounded to 2 decimal places for storage. */
export function salesTax(amount: number, rate: number): number {
  return roundToDecimal(amount * rate, 2);
}

/**
 * VAT calculation — amounts rounded to 2 decimal places.
 * @param inclusive - if true, amount already includes VAT
 * @returns object with net, vat, and gross
 */
export function vatCalculation(
  amount: number,
  rate: number,
  inclusive = false,
): { net: number; vat: number; gross: number } {
  if (inclusive) {
    const net = roundToDecimal(amount / (1 + rate), 2);
    const vat = roundToDecimal(amount - net, 2);
    return { net, vat, gross: amount };
  }
  const vat = roundToDecimal(amount * rate, 2);
  return { net: amount, vat, gross: roundToDecimal(amount + vat, 2) };
}

/**
 * Withholding tax calculation using brackets and exemptions.
 * @param grossPay - gross pay for the period
 * @param exemptions - number of exemptions (reduces taxable pay by exemptions * per-exemption amount in brackets)
 * @param brackets - tax brackets
 */
export function withholding(
  grossPay: number,
  exemptions: number,
  brackets: TaxBracket[],
): number {
  // Each exemption reduces the taxable amount; the per-exemption value
  // is implicit in the brackets. If the caller wants exemption-based
  // reduction, they should adjust grossPay before calling. Here we
  // apply a standard model where each exemption reduces income proportionally.
  const exemptionValue = grossPay * 0.02 * exemptions; // 2% per exemption
  const taxable = Math.max(0, grossPay - exemptionValue);
  return progressiveTax(taxable, brackets);
}

// -----------------------------------------------------------------------------
// Currency & Formatting
// -----------------------------------------------------------------------------

/**
 * Format a number as a currency string.
 * Falls back to simple formatting if Intl is unavailable.
 */
export function formatCurrency(
  amount: number,
  currency = "EGP",
  locale = "en-US",
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Round a number to a given number of decimal places. */
export function roundToDecimal(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Convert an amount from one currency to another — rounded to 2 decimal places. */
export function convertCurrency(
  amount: number,
  fromRate: number,
  toRate: number,
): number {
  return roundToDecimal(amount * (toRate / fromRate), 2);
}

// -----------------------------------------------------------------------------
// Matrix Operations (for portfolio math)
// -----------------------------------------------------------------------------

/** Multiply two matrices. */
export function matrixMultiply(
  a: number[][],
  b: number[][],
): number[][] {
  const rows = a.length;
  const cols = b[0].length;
  const inner = b.length;
  const result: number[][] = Array.from({ length: rows }, () =>
    new Array(cols).fill(0),
  );
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      for (let k = 0; k < inner; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

/** Transpose a matrix. */
export function matrixTranspose(m: number[][]): number[][] {
  const rows = m.length;
  const cols = m[0].length;
  const result: number[][] = Array.from({ length: cols }, () =>
    new Array(rows).fill(0),
  );
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = m[i][j];
    }
  }
  return result;
}

/**
 * Determinant of a square matrix (recursive cofactor expansion).
 * Supports any NxN matrix.
 */
export function determinant(m: number[][]): number {
  const n = m.length;
  if (n === 1) return m[0][0];
  if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];

  let det = 0;
  for (let j = 0; j < n; j++) {
    const minor = m
      .slice(1)
      .map((row) => [...row.slice(0, j), ...row.slice(j + 1)]);
    det += (j % 2 === 0 ? 1 : -1) * m[0][j] * determinant(minor);
  }
  return det;
}

/**
 * Inverse of a square matrix (2x2 and 3x3 supported via closed-form;
 * larger matrices use Gauss-Jordan elimination).
 */
export function matrixInverse(m: number[][]): number[][] {
  const n = m.length;
  const det = determinant(m);
  if (det === 0) throw new Error("Matrix is singular and cannot be inverted");

  if (n === 2) {
    return [
      [m[1][1] / det, -m[0][1] / det],
      [-m[1][0] / det, m[0][0] / det],
    ];
  }

  if (n === 3) {
    const a = m[0][0], b = m[0][1], c = m[0][2];
    const d = m[1][0], e = m[1][1], f = m[1][2];
    const g = m[2][0], h = m[2][1], k = m[2][2];
    return [
      [(e * k - f * h) / det, (c * h - b * k) / det, (b * f - c * e) / det],
      [(f * g - d * k) / det, (a * k - c * g) / det, (c * d - a * f) / det],
      [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
    ];
  }

  // Gauss-Jordan elimination for NxN
  const augmented: number[][] = m.map((row, i) => {
    const identity = new Array(n).fill(0);
    identity[i] = 1;
    return [...row, ...identity];
  });

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
        maxRow = row;
      }
    }
    [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

    const pivot = augmented[col][col];
    for (let j = 0; j < 2 * n; j++) {
      augmented[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = augmented[row][col];
      for (let j = 0; j < 2 * n; j++) {
        augmented[row][j] -= factor * augmented[col][j];
      }
    }
  }

  return augmented.map((row) => row.slice(n));
}
