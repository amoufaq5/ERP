// ─── Predictive Analytics ───────────────────────────────────────────────────
// Pure algorithmic/statistical implementations. No AI API calls.
// All functions query real data from Prisma and return computed results.

import prisma from '@/lib/prisma';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ForecastPoint {
  period: string;
  predicted: number;
  lower: number;
  upper: number;
}

export interface DemandForecast {
  productId: string;
  productName: string;
  historicalPeriods: { period: string; quantity: number }[];
  forecast: ForecastPoint[];
  smoothingFactor: number;
  meanAbsoluteError: number;
}

export interface CashFlowProjection {
  tenantId: string;
  projectionDays: number;
  startingPosition: number;
  dailyProjections: { date: string; inflow: number; outflow: number; balance: number }[];
  totalExpectedInflows: number;
  totalExpectedOutflows: number;
  endingPosition: number;
  lowestPoint: number;
  lowestPointDate: string;
}

export interface ChurnRiskScore {
  customerId: string;
  customerName: string;
  score: number; // 0-100, higher = more likely to churn
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: { name: string; value: number; weight: number; contribution: number }[];
  daysSinceLastOrder: number;
  orderFrequencyTrend: 'increasing' | 'stable' | 'decreasing';
  recommendations: string[];
}

export interface AnomalyResult {
  index: number;
  value: number;
  zScore: number;
  isAnomaly: boolean;
  direction: 'high' | 'low';
}

export interface AnomalyDetectionResult {
  dataPoints: number[];
  threshold: number;
  mean: number;
  standardDeviation: number;
  anomalies: AnomalyResult[];
  anomalyRate: number;
}

export interface ReorderPointResult {
  productId: string;
  productName: string;
  averageDailyDemand: number;
  leadTimeDays: number;
  safetyStock: number;
  reorderPoint: number;
  currentStock: number;
  needsReorder: boolean;
  daysUntilStockout: number;
  economicOrderQuantity: number;
}

export interface AttritionRiskResult {
  employeeId: string;
  employeeName: string;
  score: number; // 0-100, higher = more likely to leave
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: { name: string; value: number; weight: number; contribution: number }[];
  recommendations: string[];
}

// ─── 1. Demand Forecasting (Simple Exponential Smoothing) ──────────────────

export async function forecastDemand(
  productId: string,
  periods: number = 6,
): Promise<DemandForecast> {
  // Fetch product
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true },
  });
  if (!product) throw new Error(`Product not found: ${productId}`);

  // Fetch historical sales data from SalesOrderItems grouped by month
  const salesItems = await prisma.salesOrderItem.findMany({
    where: {
      productId,
      salesOrder: { status: { not: 'CANCELLED' } },
    },
    include: {
      salesOrder: { select: { date: true } },
    },
    orderBy: { salesOrder: { date: 'asc' } },
  });

  // Aggregate by month
  const monthlyData: Record<string, number> = {};
  for (const item of salesItems) {
    const d = new Date((item as unknown as { salesOrder: { date: Date } }).salesOrder.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] = (monthlyData[key] || 0) + (item as unknown as { quantity: number }).quantity;
  }

  const sortedPeriods = Object.keys(monthlyData).sort();
  const historicalValues = sortedPeriods.map(p => monthlyData[p]);

  // If insufficient data, return a flat forecast based on average
  if (historicalValues.length < 2) {
    const avg = historicalValues.length === 1 ? historicalValues[0] : 0;
    const forecastPts = generateForecastPeriods(sortedPeriods, periods).map(p => ({
      period: p,
      predicted: Math.round(avg),
      lower: Math.round(avg * 0.7),
      upper: Math.round(avg * 1.3),
    }));
    return {
      productId: product.id,
      productName: product.name,
      historicalPeriods: sortedPeriods.map((p, i) => ({ period: p, quantity: historicalValues[i] })),
      forecast: forecastPts,
      smoothingFactor: 0.3,
      meanAbsoluteError: 0,
    };
  }

  // Optimize alpha using minimum MAE
  const bestAlpha = optimizeAlpha(historicalValues);

  // Run SES with best alpha
  const smoothed = simpleExponentialSmoothing(historicalValues, bestAlpha);

  // Calculate MAE
  const errors = historicalValues.slice(1).map((actual, i) => Math.abs(actual - smoothed[i]));
  const mae = errors.reduce((s, e) => s + e, 0) / errors.length;

  // Standard deviation of errors for confidence intervals
  const errorStdDev = standardDeviation(errors);

  // Generate forecast
  const lastSmoothed = smoothed[smoothed.length - 1];
  const futurePeriods = generateForecastPeriods(sortedPeriods, periods);
  const forecast: ForecastPoint[] = futurePeriods.map((period, i) => {
    // Prediction intervals widen with horizon
    const intervalWidth = errorStdDev * 1.96 * Math.sqrt(1 + i);
    return {
      period,
      predicted: Math.round(Math.max(0, lastSmoothed)),
      lower: Math.round(Math.max(0, lastSmoothed - intervalWidth)),
      upper: Math.round(lastSmoothed + intervalWidth),
    };
  });

  return {
    productId: product.id,
    productName: product.name,
    historicalPeriods: sortedPeriods.map((p, i) => ({ period: p, quantity: historicalValues[i] })),
    forecast,
    smoothingFactor: bestAlpha,
    meanAbsoluteError: Math.round(mae * 100) / 100,
  };
}

function simpleExponentialSmoothing(data: number[], alpha: number): number[] {
  const smoothed: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
  }
  return smoothed;
}

function optimizeAlpha(data: number[]): number {
  let bestAlpha = 0.3;
  let bestMae = Infinity;

  for (let alpha = 0.05; alpha <= 0.95; alpha += 0.05) {
    const smoothed = simpleExponentialSmoothing(data, alpha);
    const mae = data.slice(1).reduce((sum, actual, i) => sum + Math.abs(actual - smoothed[i]), 0) / (data.length - 1);
    if (mae < bestMae) {
      bestMae = mae;
      bestAlpha = alpha;
    }
  }

  return Math.round(bestAlpha * 100) / 100;
}

function generateForecastPeriods(existingPeriods: string[], count: number): string[] {
  const last = existingPeriods[existingPeriods.length - 1] || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [year, month] = last.split('-').map(Number);
  const periods: string[] = [];
  for (let i = 1; i <= count; i++) {
    const m = ((month - 1 + i) % 12) + 1;
    const y = year + Math.floor((month - 1 + i) / 12);
    periods.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return periods;
}

// ─── 2. Cash Flow Prediction ───────────────────────────────────────────────

export async function predictCashFlow(
  tenantId: string,
  days: number = 30,
): Promise<CashFlowProjection> {
  const now = new Date();

  // Current cash position: sum of all incoming payments minus outgoing
  const incomingTotal = await prisma.payment.aggregate({
    where: { tenantId, type: 'INCOMING' },
    _sum: { amount: true },
  });
  const outgoingTotal = await prisma.payment.aggregate({
    where: { tenantId, type: 'OUTGOING' },
    _sum: { amount: true },
  });
  const startingPosition = (incomingTotal._sum.amount || 0) - (outgoingTotal._sum.amount || 0);

  // AR aging schedule: outstanding invoices by due date
  const outstandingInvoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      status: { in: ['SENT', 'OVERDUE'] },
    },
    select: { total: true, dueDate: true },
    orderBy: { dueDate: 'asc' },
  });

  // AP aging schedule: outstanding bills by due date
  const outstandingBills = await prisma.bill.findMany({
    where: {
      tenantId,
      status: { in: ['RECEIVED', 'OVERDUE'] },
    },
    select: { total: true, dueDate: true },
    orderBy: { dueDate: 'asc' },
  });

  // Historical payment patterns: average collection delay
  const recentPayments = await prisma.payment.findMany({
    where: {
      tenantId,
      type: 'INCOMING',
      date: { gte: new Date(now.getTime() - 90 * 86_400_000) },
    },
    select: { amount: true, date: true },
  });

  // Calculate average daily inflows from history
  const historicalDailyInflow = recentPayments.length > 0
    ? recentPayments.reduce((s, p) => s + (p as { amount: number }).amount, 0) / 90
    : 0;

  const recentOutPayments = await prisma.payment.findMany({
    where: {
      tenantId,
      type: 'OUTGOING',
      date: { gte: new Date(now.getTime() - 90 * 86_400_000) },
    },
    select: { amount: true },
  });
  const historicalDailyOutflow = recentOutPayments.length > 0
    ? recentOutPayments.reduce((s, p) => s + (p as { amount: number }).amount, 0) / 90
    : 0;

  // Build daily projections
  const dailyProjections: { date: string; inflow: number; outflow: number; balance: number }[] = [];
  let runningBalance = startingPosition;
  let totalInflows = 0;
  let totalOutflows = 0;
  let lowestPoint = startingPosition;
  let lowestPointDate = now.toISOString().slice(0, 10);

  for (let d = 1; d <= days; d++) {
    const date = new Date(now.getTime() + d * 86_400_000);
    const dateStr = date.toISOString().slice(0, 10);

    // Expected inflows: invoices due on this date (with collection probability decay)
    let dayInflow = 0;
    for (const inv of outstandingInvoices) {
      const due = new Date((inv as { dueDate: Date }).dueDate);
      const daysFromDue = Math.floor((date.getTime() - due.getTime()) / 86_400_000);
      // Probability of payment: highest on due date, decays over time
      if (daysFromDue >= 0 && daysFromDue <= 7) {
        // Spread expected collection over the week around due date
        const probability = daysFromDue === 0 ? 0.4 : 0.6 / 7;
        dayInflow += (inv as { total: number }).total * probability;
      }
    }
    // Add baseline daily inflow from historical patterns
    dayInflow += historicalDailyInflow * 0.3; // 30% of historical as organic

    // Expected outflows: bills due on this date
    let dayOutflow = 0;
    for (const bill of outstandingBills) {
      const due = new Date((bill as { dueDate: Date }).dueDate);
      const daysFromDue = Math.floor((date.getTime() - due.getTime()) / 86_400_000);
      if (daysFromDue >= 0 && daysFromDue <= 3) {
        const probability = daysFromDue === 0 ? 0.6 : 0.4 / 3;
        dayOutflow += (bill as { total: number }).total * probability;
      }
    }
    // Add baseline daily outflow
    dayOutflow += historicalDailyOutflow * 0.3;

    dayInflow = Math.round(dayInflow * 100) / 100;
    dayOutflow = Math.round(dayOutflow * 100) / 100;
    runningBalance = Math.round((runningBalance + dayInflow - dayOutflow) * 100) / 100;
    totalInflows += dayInflow;
    totalOutflows += dayOutflow;

    if (runningBalance < lowestPoint) {
      lowestPoint = runningBalance;
      lowestPointDate = dateStr;
    }

    dailyProjections.push({ date: dateStr, inflow: dayInflow, outflow: dayOutflow, balance: runningBalance });
  }

  return {
    tenantId,
    projectionDays: days,
    startingPosition: Math.round(startingPosition * 100) / 100,
    dailyProjections,
    totalExpectedInflows: Math.round(totalInflows * 100) / 100,
    totalExpectedOutflows: Math.round(totalOutflows * 100) / 100,
    endingPosition: Math.round(runningBalance * 100) / 100,
    lowestPoint: Math.round(lowestPoint * 100) / 100,
    lowestPointDate,
  };
}

// ─── 3. Churn Risk Scoring ─────────────────────────────────────────────────

export async function calculateChurnRisk(
  customerId: string,
): Promise<ChurnRiskScore> {
  const account = await prisma.account.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, createdAt: true },
  });
  if (!account) throw new Error(`Customer not found: ${customerId}`);

  // Get all orders for the customer
  const orders = await prisma.salesOrder.findMany({
    where: { customerId, status: { not: 'CANCELLED' } },
    select: { date: true, total: true },
    orderBy: { date: 'asc' },
  });

  // Get tickets/complaints
  const tickets = await prisma.ticket.findMany({
    where: { accountId: customerId },
    select: { createdAt: true, priority: true, status: true, satisfaction: true },
  });

  const now = new Date();

  // Factor 1: Days since last order (0-100, higher = more risk)
  const daysSinceLastOrder = orders.length > 0
    ? Math.floor((now.getTime() - new Date(orders[orders.length - 1].date).getTime()) / 86_400_000)
    : 365;
  const recencyScore = Math.min(100, Math.max(0, (daysSinceLastOrder / 180) * 100));

  // Factor 2: Order frequency decay (0-100)
  let frequencyDecayScore = 50;
  let frequencyTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  if (orders.length >= 4) {
    const mid = Math.floor(orders.length / 2);
    const firstHalf = orders.slice(0, mid);
    const secondHalf = orders.slice(mid);

    const firstHalfDays = (new Date(firstHalf[firstHalf.length - 1].date).getTime() - new Date(firstHalf[0].date).getTime()) / 86_400_000;
    const secondHalfDays = (new Date(secondHalf[secondHalf.length - 1].date).getTime() - new Date(secondHalf[0].date).getTime()) / 86_400_000;

    const firstFreq = firstHalf.length > 1 ? firstHalfDays / (firstHalf.length - 1) : 90;
    const secondFreq = secondHalf.length > 1 ? secondHalfDays / (secondHalf.length - 1) : 90;

    if (secondFreq > firstFreq * 1.3) {
      frequencyDecayScore = Math.min(100, (secondFreq / firstFreq - 1) * 100);
      frequencyTrend = 'decreasing';
    } else if (secondFreq < firstFreq * 0.7) {
      frequencyDecayScore = 0;
      frequencyTrend = 'increasing';
    } else {
      frequencyDecayScore = 30;
      frequencyTrend = 'stable';
    }
  }

  // Factor 3: Order value decline (0-100)
  let valueTrendScore = 50;
  if (orders.length >= 4) {
    const mid = Math.floor(orders.length / 2);
    const firstAvg = orders.slice(0, mid).reduce((s, o) => s + o.total, 0) / mid;
    const secondAvg = orders.slice(mid).reduce((s, o) => s + o.total, 0) / (orders.length - mid);

    if (firstAvg > 0) {
      const changeRatio = secondAvg / firstAvg;
      if (changeRatio < 0.7) valueTrendScore = Math.min(100, (1 - changeRatio) * 100);
      else if (changeRatio > 1.2) valueTrendScore = 0;
      else valueTrendScore = 30;
    }
  }

  // Factor 4: Complaint count and severity (0-100)
  const recentTickets = tickets.filter(t =>
    (now.getTime() - new Date(t.createdAt).getTime()) / 86_400_000 <= 90
  );
  const highPriorityTickets = recentTickets.filter(t => t.priority === 'HIGH' || t.priority === 'CRITICAL');
  const unresolvedTickets = recentTickets.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED');
  const complaintScore = Math.min(100,
    recentTickets.length * 15 +
    highPriorityTickets.length * 25 +
    unresolvedTickets.length * 20
  );

  // Factor 5: Customer satisfaction trend (0-100)
  const satisfactionScores = tickets
    .map(t => t.satisfaction)
    .filter((s): s is number => s !== null);
  let satisfactionRisk = 30;
  if (satisfactionScores.length > 0) {
    const avgSatisfaction = satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length;
    // Scale from 1-5 to risk 0-100 (lower satisfaction = higher risk)
    satisfactionRisk = Math.max(0, Math.min(100, (5 - avgSatisfaction) / 4 * 100));
  }

  // Weighted score
  const factors = [
    { name: 'Recency (days since last order)', value: recencyScore, weight: 0.30, contribution: recencyScore * 0.30 },
    { name: 'Order frequency decay', value: frequencyDecayScore, weight: 0.25, contribution: frequencyDecayScore * 0.25 },
    { name: 'Order value decline', value: valueTrendScore, weight: 0.15, contribution: valueTrendScore * 0.15 },
    { name: 'Complaint volume', value: complaintScore, weight: 0.20, contribution: complaintScore * 0.20 },
    { name: 'Customer satisfaction', value: satisfactionRisk, weight: 0.10, contribution: satisfactionRisk * 0.10 },
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const score = Math.round(factors.reduce((s, f) => s + f.contribution, 0) / totalWeight);
  const clampedScore = Math.max(0, Math.min(100, score));

  const riskLevel = clampedScore >= 75 ? 'CRITICAL' : clampedScore >= 50 ? 'HIGH' : clampedScore >= 25 ? 'MEDIUM' : 'LOW';

  // Generate recommendations based on risk factors
  const recommendations: string[] = [];
  if (recencyScore > 60) recommendations.push('Reach out to the customer with a personalized re-engagement offer.');
  if (frequencyDecayScore > 50) recommendations.push('Order frequency is declining. Schedule a customer success check-in.');
  if (valueTrendScore > 50) recommendations.push('Average order value is dropping. Review pricing and product fit.');
  if (complaintScore > 40) recommendations.push('Address unresolved complaints promptly to prevent further dissatisfaction.');
  if (satisfactionRisk > 60) recommendations.push('Customer satisfaction is low. Conduct a detailed feedback session.');
  if (recommendations.length === 0) recommendations.push('Customer is in good standing. Maintain regular engagement cadence.');

  return {
    customerId: account.id,
    customerName: account.name,
    score: clampedScore,
    riskLevel,
    factors,
    daysSinceLastOrder,
    orderFrequencyTrend: frequencyTrend,
    recommendations,
  };
}

// ─── 4. Anomaly Detection (Z-Score) ────────────────────────────────────────

export function detectAnomalies(
  dataPoints: number[],
  threshold: number = 2.0,
): AnomalyDetectionResult {
  if (dataPoints.length < 3) {
    return {
      dataPoints,
      threshold,
      mean: dataPoints.length > 0 ? dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length : 0,
      standardDeviation: 0,
      anomalies: [],
      anomalyRate: 0,
    };
  }

  const avg = dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length;
  const stdDev = standardDeviation(dataPoints);

  const anomalies: AnomalyResult[] = [];

  if (stdDev === 0) {
    return {
      dataPoints,
      threshold,
      mean: avg,
      standardDeviation: 0,
      anomalies: [],
      anomalyRate: 0,
    };
  }

  for (let i = 0; i < dataPoints.length; i++) {
    const zScore = (dataPoints[i] - avg) / stdDev;
    const isAnomaly = Math.abs(zScore) > threshold;

    if (isAnomaly) {
      anomalies.push({
        index: i,
        value: dataPoints[i],
        zScore: Math.round(zScore * 100) / 100,
        isAnomaly: true,
        direction: zScore > 0 ? 'high' : 'low',
      });
    }
  }

  return {
    dataPoints,
    threshold,
    mean: Math.round(avg * 100) / 100,
    standardDeviation: Math.round(stdDev * 100) / 100,
    anomalies,
    anomalyRate: Math.round((anomalies.length / dataPoints.length) * 10000) / 100,
  };
}

// ─── 5. Reorder Point Calculation ──────────────────────────────────────────

export async function calculateReorderPoint(
  productId: string,
  leadTimeDays: number = 7,
  safetyStockFactor: number = 1.65, // z-score for ~95% service level
): Promise<ReorderPointResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, quantity: true, reorderLevel: true, costPrice: true },
  });
  if (!product) throw new Error(`Product not found: ${productId}`);

  // Get daily outbound stock movements (sales) over the last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);
  const outboundMovements = await prisma.stockMovement.findMany({
    where: {
      productId,
      type: 'OUT',
      date: { gte: ninetyDaysAgo },
    },
    select: { quantity: true, date: true },
    orderBy: { date: 'asc' },
  });

  // Also get sales order items for demand data
  const salesItems = await prisma.salesOrderItem.findMany({
    where: {
      productId,
      salesOrder: {
        status: { not: 'CANCELLED' },
        date: { gte: ninetyDaysAgo },
      },
    },
    select: { quantity: true },
  });

  // Calculate average daily demand
  const totalOutbound = outboundMovements.reduce((s, m) => s + Math.abs(m.quantity), 0);
  const totalSalesQty = salesItems.reduce((s, i) => s + i.quantity, 0);
  const totalDemand = Math.max(totalOutbound, totalSalesQty);
  const daysOfData = Math.max(1, Math.min(90,
    outboundMovements.length > 0
      ? Math.ceil((Date.now() - new Date(outboundMovements[0].date).getTime()) / 86_400_000)
      : 90
  ));
  const averageDailyDemand = totalDemand / daysOfData;

  // Calculate daily demand standard deviation
  const dailyDemands: Record<string, number> = {};
  for (const m of outboundMovements) {
    const dateKey = new Date(m.date).toISOString().slice(0, 10);
    dailyDemands[dateKey] = (dailyDemands[dateKey] || 0) + Math.abs(m.quantity);
  }
  const dailyValues = Object.values(dailyDemands);
  const demandStdDev = dailyValues.length >= 2 ? standardDeviation(dailyValues) : averageDailyDemand * 0.3;

  // Safety stock = z * stdDev * sqrt(leadTime)
  const safetyStock = Math.ceil(safetyStockFactor * demandStdDev * Math.sqrt(leadTimeDays));

  // Reorder point = (average daily demand * lead time) + safety stock
  const reorderPoint = Math.ceil(averageDailyDemand * leadTimeDays + safetyStock);

  // Days until stockout
  const daysUntilStockout = averageDailyDemand > 0
    ? Math.floor(product.quantity / averageDailyDemand)
    : product.quantity > 0 ? 999 : 0;

  // EOQ (Economic Order Quantity) using Wilson formula
  // Assuming ordering cost = 50 (fixed), holding cost = 20% of cost price per year
  const annualDemand = averageDailyDemand * 365;
  const orderingCost = 50;
  const holdingCostPerUnit = product.costPrice * 0.2;
  const eoq = holdingCostPerUnit > 0
    ? Math.ceil(Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit))
    : Math.ceil(averageDailyDemand * 30);

  return {
    productId: product.id,
    productName: product.name,
    averageDailyDemand: Math.round(averageDailyDemand * 100) / 100,
    leadTimeDays,
    safetyStock,
    reorderPoint,
    currentStock: product.quantity,
    needsReorder: product.quantity <= reorderPoint,
    daysUntilStockout,
    economicOrderQuantity: eoq,
  };
}

// ─── 6. Employee Attrition Risk ────────────────────────────────────────────

export async function employeeAttritionRisk(
  employeeId: string,
): Promise<AttritionRiskResult> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      department: { select: { name: true } },
      leaveRequests: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      payrolls: {
        orderBy: { createdAt: 'desc' },
        take: 6,
      },
    },
  });
  if (!employee) throw new Error(`Employee not found: ${employeeId}`);

  const now = new Date();

  // Factor 1: Tenure risk (0-100)
  // Employees with < 1 year or > 5 years have different risk profiles
  const tenureDays = Math.floor((now.getTime() - new Date(employee.hireDate).getTime()) / 86_400_000);
  const tenureYears = tenureDays / 365;
  let tenureRisk: number;
  if (tenureYears < 0.5) tenureRisk = 65; // Very new, still adjusting
  else if (tenureYears < 1) tenureRisk = 50; // Under 1 year
  else if (tenureYears < 2) tenureRisk = 40; // 1-2 years, common departure window
  else if (tenureYears < 5) tenureRisk = 25; // Settled in
  else tenureRisk = 35; // Long tenure, might seek new challenges

  // Factor 2: Compensation ratio (0-100)
  // Compare salary to department average
  let compensationRisk = 50;
  if (employee.salary && employee.departmentId) {
    const deptEmployees = await prisma.employee.findMany({
      where: { departmentId: employee.departmentId, status: 'ACTIVE' },
      select: { salary: true },
    });
    const salaries = deptEmployees.map(e => e.salary).filter((s): s is number => s !== null && s > 0);
    if (salaries.length > 1) {
      const avgSalary = salaries.reduce((a, b) => a + b, 0) / salaries.length;
      const ratio = employee.salary / avgSalary;
      if (ratio < 0.8) compensationRisk = 80; // Significantly below average
      else if (ratio < 0.9) compensationRisk = 60;
      else if (ratio < 1.1) compensationRisk = 30; // Around average
      else compensationRisk = 15; // Above average
    }
  }

  // Factor 3: Leave pattern (0-100)
  // Unusual leave patterns may indicate disengagement
  const recentLeaves = employee.leaveRequests.filter(
    lr => (now.getTime() - new Date(lr.createdAt).getTime()) / 86_400_000 <= 180
  );
  const sickLeaves = recentLeaves.filter(lr => lr.type === 'SICK');
  const totalLeaveDays = recentLeaves.reduce((s, lr) => s + lr.days, 0);
  let leaveRisk = 20;
  if (sickLeaves.length >= 4) leaveRisk = 70; // Frequent sick leave
  else if (totalLeaveDays > 15) leaveRisk = 55; // Excessive leave
  else if (sickLeaves.length >= 2) leaveRisk = 40;

  // Factor 4: Overtime and workload indicators (0-100)
  // Check payroll for overtime patterns
  let workloadRisk = 30;
  const payrolls = employee.payrolls as { overtime: number; bonuses: number }[];
  if (payrolls.length > 0) {
    const avgOvertime = payrolls.reduce((s, p) => s + p.overtime, 0) / payrolls.length;
    const avgBonuses = payrolls.reduce((s, p) => s + p.bonuses, 0) / payrolls.length;
    if (avgOvertime > 0 && avgBonuses === 0) workloadRisk = 65; // Working overtime without recognition
    else if (avgOvertime > (employee.salary || 0) * 0.15) workloadRisk = 55; // High overtime
    else if (avgBonuses > 0) workloadRisk = 15; // Getting bonuses
  }

  // Factor 5: Status-based risk (0-100)
  let statusRisk = 20;
  if (employee.status === 'ON_LEAVE') statusRisk = 50;
  if (employee.status === 'TERMINATED') statusRisk = 100;

  // Weighted score
  const factors = [
    { name: 'Tenure risk', value: tenureRisk, weight: 0.20, contribution: tenureRisk * 0.20 },
    { name: 'Compensation gap', value: compensationRisk, weight: 0.30, contribution: compensationRisk * 0.30 },
    { name: 'Leave pattern', value: leaveRisk, weight: 0.20, contribution: leaveRisk * 0.20 },
    { name: 'Workload/recognition', value: workloadRisk, weight: 0.20, contribution: workloadRisk * 0.20 },
    { name: 'Employment status', value: statusRisk, weight: 0.10, contribution: statusRisk * 0.10 },
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const score = Math.round(factors.reduce((s, f) => s + f.contribution, 0) / totalWeight);
  const clampedScore = Math.max(0, Math.min(100, score));

  const riskLevel = clampedScore >= 75 ? 'CRITICAL' : clampedScore >= 50 ? 'HIGH' : clampedScore >= 25 ? 'MEDIUM' : 'LOW';

  // Recommendations
  const recommendations: string[] = [];
  if (compensationRisk > 50) recommendations.push('Review compensation against market rates and department averages.');
  if (tenureRisk > 40 && tenureYears < 2) recommendations.push('Strengthen onboarding support and career development plan.');
  if (leaveRisk > 40) recommendations.push('Check in with employee about well-being and work-life balance.');
  if (workloadRisk > 50) recommendations.push('Review workload distribution and recognition programs.');
  if (recommendations.length === 0) recommendations.push('Employee appears stable. Continue regular check-ins and development opportunities.');

  return {
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    score: clampedScore,
    riskLevel,
    factors,
    recommendations,
  };
}

// ─── Statistical Helpers ───────────────────────────────────────────────────

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}
