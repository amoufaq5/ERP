// ─── Demand Forecasting Engine ──────────────────────────────────────────────
// Pure TypeScript implementation — no external libraries required.

export interface ForecastResult {
  productId: string;
  productName: string;
  historicalData: { month: string; actual: number }[];
  predictions: { month: string; predicted: number; lower: number; upper: number }[];
  method: "moving_average" | "exponential_smoothing" | "linear_regression" | "seasonal";
  accuracy: number; // MAPE %
  trend: "increasing" | "decreasing" | "stable";
  seasonality: boolean;
  reorderPoint: number;
  safetyStock: number;
  economicOrderQty: number;
}

export interface DemandAlert {
  id: string;
  productId: string;
  productName: string;
  type: "stockout_risk" | "overstock" | "demand_spike" | "demand_drop" | "seasonal_peak";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  suggestedAction: string;
  daysUntilImpact: number;
}

// ─── Helper utilities ───────────────────────────────────────────────────────

function mean(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((s, v) => s + v, 0) / data.length;
}

function stdDev(data: number[]): number {
  if (data.length < 2) return 0;
  const avg = mean(data);
  const variance = data.reduce((s, v) => s + (v - avg) ** 2, 0) / (data.length - 1);
  return Math.sqrt(variance);
}

/** Z-score for a given service level (approximation using Abramowitz & Stegun) */
function zScore(serviceLevel: number): number {
  const lookup: Record<number, number> = {
    0.90: 1.282,
    0.95: 1.645,
    0.975: 1.960,
    0.99: 2.326,
    0.999: 3.090,
  };
  // Find nearest match or default to 1.645 (95%)
  const closest = Object.keys(lookup)
    .map(Number)
    .reduce((prev, curr) =>
      Math.abs(curr - serviceLevel) < Math.abs(prev - serviceLevel) ? curr : prev
    );
  return lookup[closest] ?? 1.645;
}

// ─── Simple Moving Average ──────────────────────────────────────────────────

export function movingAverage(data: number[], window: number): number[] {
  if (data.length === 0 || window <= 0) return [];
  const result: number[] = [];
  const w = Math.min(window, data.length);
  for (let i = 0; i < data.length; i++) {
    if (i < w - 1) {
      // Not enough data yet; use available data
      result.push(mean(data.slice(0, i + 1)));
    } else {
      result.push(mean(data.slice(i - w + 1, i + 1)));
    }
  }
  return result;
}

/** Forecast the next `periods` values using moving average */
export function movingAverageForecast(data: number[], window: number, periods: number): number[] {
  const w = Math.min(window, data.length);
  const extended = [...data];
  for (let i = 0; i < periods; i++) {
    const slice = extended.slice(extended.length - w);
    extended.push(mean(slice));
  }
  return extended.slice(data.length);
}

// ─── Single Exponential Smoothing ───────────────────────────────────────────

export function exponentialSmoothing(data: number[], alpha: number): number[] {
  if (data.length === 0) return [];
  const a = Math.max(0, Math.min(1, alpha));
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(a * data[i] + (1 - a) * result[i - 1]);
  }
  return result;
}

/** Forecast the next `periods` values using exponential smoothing */
export function exponentialSmoothingForecast(
  data: number[],
  alpha: number,
  periods: number
): number[] {
  const smoothed = exponentialSmoothing(data, alpha);
  const lastSmoothed = smoothed[smoothed.length - 1] ?? 0;
  // Single exponential smoothing produces a flat forecast
  return Array(periods).fill(lastSmoothed);
}

// ─── Linear Regression (Least Squares) ──────────────────────────────────────

export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  fitted: number[];
}

export function linearRegression(data: number[]): RegressionResult {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0, rSquared: 0, fitted: [] };
  if (n === 1) return { slope: 0, intercept: data[0], rSquared: 1, fitted: [data[0]] };

  // x = 0, 1, 2, ...
  const xMean = (n - 1) / 2;
  const yMean = mean(data);

  let ssXY = 0;
  let ssXX = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    ssXY += (i - xMean) * (data[i] - yMean);
    ssXX += (i - xMean) ** 2;
    ssTot += (data[i] - yMean) ** 2;
  }

  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const intercept = yMean - slope * xMean;

  const fitted = data.map((_, i) => intercept + slope * i);
  const ssRes = data.reduce((s, v, i) => s + (v - fitted[i]) ** 2, 0);
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, rSquared, fitted };
}

/** Forecast the next `periods` values using linear regression */
export function linearRegressionForecast(data: number[], periods: number): number[] {
  const { slope, intercept } = linearRegression(data);
  const n = data.length;
  return Array.from({ length: periods }, (_, i) => intercept + slope * (n + i));
}

// ─── Seasonal Decomposition ────────────────────────────────────────────────

export interface SeasonalResult {
  seasonalIndices: number[]; // 12 monthly indices (multiplicative)
  trendComponent: number[];
  seasonalComponent: number[];
  residual: number[];
  isSignificant: boolean;
}

export function seasonalDecomposition(data: number[], period: number = 12): SeasonalResult {
  const n = data.length;

  // Need at least one full period
  if (n < period) {
    return {
      seasonalIndices: Array(period).fill(1),
      trendComponent: [...data],
      seasonalComponent: Array(n).fill(1),
      residual: Array(n).fill(0),
      isSignificant: false,
    };
  }

  // Step 1: Calculate centered moving average (trend)
  const trendComponent: number[] = [];
  const halfP = Math.floor(period / 2);

  for (let i = 0; i < n; i++) {
    if (i < halfP || i >= n - halfP) {
      trendComponent.push(data[i]); // pad edges
    } else {
      const slice = data.slice(i - halfP, i + halfP + 1);
      trendComponent.push(mean(slice));
    }
  }

  // Step 2: De-trend (multiplicative model: data / trend)
  const detrended = data.map((v, i) =>
    trendComponent[i] === 0 ? 1 : v / trendComponent[i]
  );

  // Step 3: Average seasonal indices
  const seasonalSums: number[] = Array(period).fill(0);
  const seasonalCounts: number[] = Array(period).fill(0);

  for (let i = 0; i < n; i++) {
    const monthIdx = i % period;
    seasonalSums[monthIdx] += detrended[i];
    seasonalCounts[monthIdx]++;
  }

  const rawIndices = seasonalSums.map((s, i) =>
    seasonalCounts[i] === 0 ? 1 : s / seasonalCounts[i]
  );

  // Normalize so indices average to 1
  const indexMean = mean(rawIndices);
  const seasonalIndices = rawIndices.map((v) =>
    indexMean === 0 ? 1 : v / indexMean
  );

  // Step 4: Seasonal component and residual
  const seasonalComponent = data.map((_, i) => seasonalIndices[i % period]);
  const residual = data.map((v, i) => {
    const expected = trendComponent[i] * seasonalComponent[i];
    return expected === 0 ? 0 : v - expected;
  });

  // Determine if seasonality is significant (coefficient of variation of indices > 10%)
  const indexStd = stdDev(seasonalIndices);
  const isSignificant = indexStd > 0.10;

  return {
    seasonalIndices,
    trendComponent,
    seasonalComponent,
    residual,
    isSignificant,
  };
}

/** Forecast the next `periods` values using seasonal decomposition */
export function seasonalForecast(data: number[], periods: number): number[] {
  const { seasonalIndices } = seasonalDecomposition(data);
  const { slope, intercept } = linearRegression(data);
  const n = data.length;

  return Array.from({ length: periods }, (_, i) => {
    const trendValue = intercept + slope * (n + i);
    const seasonIdx = (n + i) % 12;
    return Math.max(0, trendValue * seasonalIndices[seasonIdx]);
  });
}

// ─── Safety Stock Calculation ───────────────────────────────────────────────

export function calculateSafetyStock(
  data: number[],
  serviceLevel: number = 0.95,
  leadTimeDays: number = 14
): number {
  const dailyData = data.map((v) => v / 30); // monthly to daily
  const demandStdDev = stdDev(dailyData);
  const z = zScore(serviceLevel);
  const leadTimeInMonths = leadTimeDays / 30;
  return Math.ceil(z * demandStdDev * Math.sqrt(leadTimeDays) * 30);
}

// ─── Economic Order Quantity ────────────────────────────────────────────────

export function calculateEOQ(
  annualDemand: number,
  orderCost: number,
  holdingCostPerUnit: number
): number {
  if (annualDemand <= 0 || orderCost <= 0 || holdingCostPerUnit <= 0) return 0;
  return Math.ceil(Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit));
}

// ─── Reorder Point ──────────────────────────────────────────────────────────

export function calculateReorderPoint(
  avgDailyDemand: number,
  leadTimeDays: number,
  safetyStock: number
): number {
  return Math.ceil(avgDailyDemand * leadTimeDays + safetyStock);
}

// ─── MAPE (Mean Absolute Percentage Error) ──────────────────────────────────

export function calculateMAPE(actual: number[], predicted: number[]): number {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (actual[i] !== 0) {
      sum += Math.abs((actual[i] - predicted[i]) / actual[i]);
      count++;
    }
  }
  return count === 0 ? 0 : (sum / count) * 100;
}

// ─── Detect Trend ───────────────────────────────────────────────────────────

export function detectTrend(data: number[]): "increasing" | "decreasing" | "stable" {
  if (data.length < 3) return "stable";
  const { slope } = linearRegression(data);
  const avg = mean(data);
  if (avg === 0) return "stable";
  const relativeSlope = slope / avg;
  if (relativeSlope > 0.02) return "increasing";
  if (relativeSlope < -0.02) return "decreasing";
  return "stable";
}

// ─── Confidence Bands ───────────────────────────────────────────────────────

export function addConfidenceBands(
  predictions: number[],
  historicalStdDev: number,
  confidenceLevel: number = 0.95
): { predicted: number; lower: number; upper: number }[] {
  const z = zScore(confidenceLevel);
  return predictions.map((p, i) => {
    // Uncertainty grows with forecast horizon
    const spreadFactor = 1 + 0.15 * i;
    const margin = z * historicalStdDev * spreadFactor;
    return {
      predicted: Math.max(0, Math.round(p)),
      lower: Math.max(0, Math.round(p - margin)),
      upper: Math.round(p + margin),
    };
  });
}

// ─── Generate Month Labels ─────────────────────────────────────────────────

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function generateMonthLabels(count: number, startYear: number, startMonth: number): string[] {
  const labels: string[] = [];
  let y = startYear;
  let m = startMonth;
  for (let i = 0; i < count; i++) {
    labels.push(`${MONTH_NAMES[m]} ${y}`);
    m++;
    if (m >= 12) {
      m = 0;
      y++;
    }
  }
  return labels;
}

// ─── Sample Historical Data Generator ───────────────────────────────────────

export function generateHistoricalData(
  productId: string,
  months: number = 12
): number[] {
  // Seeded pseudo-random based on product ID for consistency
  let seed = 0;
  for (let i = 0; i < productId.length; i++) {
    seed = ((seed << 5) - seed + productId.charCodeAt(i)) | 0;
  }

  function seededRandom(): number {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed % 10000) / 10000;
  }

  // Base demand based on product hash (500-5000 range)
  const baseDemand = 500 + (Math.abs(seed) % 4500);
  const trend = (seededRandom() - 0.4) * 30; // slight trend

  // Seasonal pattern (pharma: flu season peaks in winter, allergy in spring)
  const seasonalFactors = [
    1.15, 1.10, 1.05, 0.95, 0.90, 0.85,
    0.80, 0.85, 0.95, 1.05, 1.10, 1.20,
  ];

  const data: number[] = [];
  for (let i = 0; i < months; i++) {
    const seasonal = seasonalFactors[i % 12];
    const noise = 1 + (seededRandom() - 0.5) * 0.15;
    const value = (baseDemand + trend * i) * seasonal * noise;
    data.push(Math.max(50, Math.round(value)));
  }

  return data;
}

// ─── Full Forecast Pipeline ─────────────────────────────────────────────────

export function runForecast(
  productId: string,
  productName: string,
  historicalValues: number[],
  method: ForecastResult["method"] = "moving_average",
  forecastPeriods: number = 6,
  stockQty: number = 0,
  reorderLevel: number = 0
): ForecastResult {
  // Generate month labels for historical data (last 12 months)
  const now = new Date();
  const startMonth = (now.getMonth() - historicalValues.length + 1 + 12) % 12;
  const startYear = now.getFullYear() - (now.getMonth() < historicalValues.length - 1 ? 1 : 0);
  const histLabels = generateMonthLabels(historicalValues.length, startYear, startMonth);

  // Generate future month labels
  const futureStartMonth = (now.getMonth() + 1) % 12;
  const futureStartYear = now.getFullYear() + (now.getMonth() === 11 ? 1 : 0);
  const futureLabels = generateMonthLabels(forecastPeriods, futureStartYear, futureStartMonth);

  // Run the selected forecasting method
  let predictions: number[];
  let fittedValues: number[];

  switch (method) {
    case "moving_average": {
      const window = Math.min(3, historicalValues.length);
      fittedValues = movingAverage(historicalValues, window);
      predictions = movingAverageForecast(historicalValues, window, forecastPeriods);
      break;
    }
    case "exponential_smoothing": {
      const alpha = 0.3;
      fittedValues = exponentialSmoothing(historicalValues, alpha);
      predictions = exponentialSmoothingForecast(historicalValues, alpha, forecastPeriods);
      break;
    }
    case "linear_regression": {
      const reg = linearRegression(historicalValues);
      fittedValues = reg.fitted;
      predictions = linearRegressionForecast(historicalValues, forecastPeriods);
      break;
    }
    case "seasonal": {
      const { trendComponent } = seasonalDecomposition(historicalValues);
      fittedValues = trendComponent;
      predictions = seasonalForecast(historicalValues, forecastPeriods);
      break;
    }
  }

  // Calculate accuracy (MAPE) on fitted values
  const accuracy = 100 - calculateMAPE(historicalValues, fittedValues);

  // Confidence bands
  const histStdDev = stdDev(historicalValues);
  const withBands = addConfidenceBands(predictions, histStdDev);

  // Trend and seasonality
  const trend = detectTrend(historicalValues);
  const { isSignificant } = seasonalDecomposition(historicalValues);

  // Inventory optimization
  const avgMonthlyDemand = mean(historicalValues);
  const avgDailyDemand = avgMonthlyDemand / 30;
  const safetyStock = calculateSafetyStock(historicalValues, 0.95, 14);
  const reorderPoint = calculateReorderPoint(avgDailyDemand, 14, safetyStock);
  const annualDemand = avgMonthlyDemand * 12;
  const orderCost = 500; // default order cost in EGP
  const holdingCost = avgMonthlyDemand * 0.02 * 12; // 2% of value per month
  const eoq = calculateEOQ(annualDemand, orderCost, Math.max(1, holdingCost));

  return {
    productId,
    productName,
    historicalData: histLabels.map((month, i) => ({
      month,
      actual: historicalValues[i],
    })),
    predictions: futureLabels.map((month, i) => ({
      month,
      ...withBands[i],
    })),
    method,
    accuracy: Math.round(accuracy * 10) / 10,
    trend,
    seasonality: isSignificant,
    reorderPoint,
    safetyStock,
    economicOrderQty: eoq,
  };
}

// ─── Generate Demand Alerts ─────────────────────────────────────────────────

export function generateAlerts(
  products: { id: string; name: string; stockQty: number; reorderLevel: number }[],
  forecasts: ForecastResult[]
): DemandAlert[] {
  const alerts: DemandAlert[] = [];
  let alertId = 1;

  for (const product of products) {
    const forecast = forecasts.find((f) => f.productId === product.id);
    if (!forecast) continue;

    const avgDemand = mean(forecast.historicalData.map((d) => d.actual));
    const nextPredicted = forecast.predictions[0]?.predicted ?? avgDemand;
    const lastActual = forecast.historicalData[forecast.historicalData.length - 1]?.actual ?? 0;

    // Stockout risk: current stock < 2 months of predicted demand
    const monthsOfStock = nextPredicted > 0 ? product.stockQty / nextPredicted : 999;
    if (monthsOfStock < 2) {
      alerts.push({
        id: `alert-${alertId++}`,
        productId: product.id,
        productName: product.name,
        type: "stockout_risk",
        severity: monthsOfStock < 1 ? "critical" : "high",
        message: `Current stock covers only ${monthsOfStock.toFixed(1)} months of projected demand`,
        suggestedAction: `Place urgent order of ${Math.ceil(nextPredicted * 3 - product.stockQty)} units to cover 3 months`,
        daysUntilImpact: Math.max(1, Math.round(monthsOfStock * 30)),
      });
    }

    // Overstock: current stock > 6 months of predicted demand
    if (monthsOfStock > 6 && product.stockQty > 5000) {
      alerts.push({
        id: `alert-${alertId++}`,
        productId: product.id,
        productName: product.name,
        type: "overstock",
        severity: monthsOfStock > 12 ? "high" : "medium",
        message: `Current stock covers ${monthsOfStock.toFixed(1)} months — potential overstock situation`,
        suggestedAction: `Consider reducing next order. Excess stock: ~${Math.round(product.stockQty - nextPredicted * 4)} units`,
        daysUntilImpact: 30,
      });
    }

    // Demand spike: next month prediction > 130% of recent average
    if (nextPredicted > avgDemand * 1.3) {
      alerts.push({
        id: `alert-${alertId++}`,
        productId: product.id,
        productName: product.name,
        type: "demand_spike",
        severity: nextPredicted > avgDemand * 1.5 ? "high" : "medium",
        message: `Predicted demand of ${Math.round(nextPredicted)} is ${Math.round((nextPredicted / avgDemand - 1) * 100)}% above average`,
        suggestedAction: `Increase next order by ${Math.round(nextPredicted - avgDemand)} units to meet surge`,
        daysUntilImpact: 14,
      });
    }

    // Demand drop: next month prediction < 70% of recent average
    if (nextPredicted < avgDemand * 0.7 && avgDemand > 100) {
      alerts.push({
        id: `alert-${alertId++}`,
        productId: product.id,
        productName: product.name,
        type: "demand_drop",
        severity: nextPredicted < avgDemand * 0.5 ? "high" : "low",
        message: `Predicted demand of ${Math.round(nextPredicted)} is ${Math.round((1 - nextPredicted / avgDemand) * 100)}% below average`,
        suggestedAction: `Reduce next order or defer procurement to avoid excess inventory`,
        daysUntilImpact: 30,
      });
    }

    // Seasonal peak: check if next month is a seasonal peak
    if (forecast.seasonality) {
      const { seasonalIndices } = seasonalDecomposition(
        forecast.historicalData.map((d) => d.actual)
      );
      const nextMonthIdx = (new Date().getMonth() + 1) % 12;
      if (seasonalIndices[nextMonthIdx] > 1.15) {
        alerts.push({
          id: `alert-${alertId++}`,
          productId: product.id,
          productName: product.name,
          type: "seasonal_peak",
          severity: seasonalIndices[nextMonthIdx] > 1.3 ? "high" : "medium",
          message: `Approaching seasonal peak — demand typically ${Math.round((seasonalIndices[nextMonthIdx] - 1) * 100)}% higher than average`,
          suggestedAction: `Pre-stock ${Math.round(avgDemand * (seasonalIndices[nextMonthIdx] - 1))} additional units before peak period`,
          daysUntilImpact: 7,
        });
      }
    }

    // Below reorder level
    if (product.stockQty <= product.reorderLevel && product.stockQty > 0) {
      alerts.push({
        id: `alert-${alertId++}`,
        productId: product.id,
        productName: product.name,
        type: "stockout_risk",
        severity: product.stockQty < product.reorderLevel * 0.5 ? "critical" : "high",
        message: `Stock (${product.stockQty}) is at or below reorder level (${product.reorderLevel})`,
        suggestedAction: `Reorder immediately — recommended qty: ${forecast.economicOrderQty} units (EOQ)`,
        daysUntilImpact: Math.max(1, Math.round((product.stockQty / avgDemand) * 30)),
      });
    }
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}

// ─── ABC Analysis ───────────────────────────────────────────────────────────

export interface ABCItem {
  productId: string;
  productName: string;
  annualValue: number;
  cumulativePercent: number;
  category: "A" | "B" | "C";
}

export function abcAnalysis(
  products: { id: string; name: string; pricePerUnit: number }[],
  historicalData: Map<string, number[]>
): ABCItem[] {
  // Calculate annual value for each product
  const items: { productId: string; productName: string; annualValue: number }[] = [];

  for (const product of products) {
    const data = historicalData.get(product.id) ?? [];
    const totalDemand = data.reduce((s, v) => s + v, 0);
    const annualValue = totalDemand * product.pricePerUnit;
    items.push({
      productId: product.id,
      productName: product.name,
      annualValue,
    });
  }

  // Sort by annual value descending
  items.sort((a, b) => b.annualValue - a.annualValue);

  // Calculate cumulative percentage and assign categories
  const totalValue = items.reduce((s, item) => s + item.annualValue, 0);
  let cumulative = 0;

  return items.map((item) => {
    cumulative += item.annualValue;
    const cumulativePercent = totalValue === 0 ? 0 : (cumulative / totalValue) * 100;

    let category: "A" | "B" | "C";
    if (cumulativePercent <= 70) {
      category = "A";
    } else if (cumulativePercent <= 90) {
      category = "B";
    } else {
      category = "C";
    }

    return {
      ...item,
      cumulativePercent: Math.round(cumulativePercent * 10) / 10,
      category,
    };
  });
}
