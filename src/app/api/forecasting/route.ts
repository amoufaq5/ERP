import { NextRequest, NextResponse } from "next/server";
import {
  runForecast,
  generateAlerts,
  generateHistoricalData,
  type ForecastResult,
} from "@/lib/forecasting/forecast-engine";

// Demo product list (mirrors the data-store seed products)
const DEMO_PRODUCTS = [
  { id: "p-cardio-1", name: "Cardioprex", stockQty: 12000, reorderLevel: 3000, pricePerUnit: 48 },
  { id: "p-cardio-2", name: "Atorvastat", stockQty: 8500, reorderLevel: 2000, pricePerUnit: 62 },
  { id: "p-cardio-3", name: "Metoprolax", stockQty: 15000, reorderLevel: 4000, pricePerUnit: 35 },
  { id: "p-diab-1", name: "Diabetex XR", stockQty: 6000, reorderLevel: 1500, pricePerUnit: 95 },
  { id: "p-diab-2", name: "Glargin-Long", stockQty: 2000, reorderLevel: 500, pricePerUnit: 420 },
  { id: "p-prim-1", name: "Antibio-Z", stockQty: 20000, reorderLevel: 5000, pricePerUnit: 28 },
  { id: "p-prim-2", name: "Paraflu Junior", stockQty: 10000, reorderLevel: 2500, pricePerUnit: 22 },
  { id: "p-prim-3", name: "Nervocalm", stockQty: 18000, reorderLevel: 4000, pricePerUnit: 18 },
];

/** GET /api/forecasting — Get forecasts for all products */
export async function GET() {
  const forecasts: ForecastResult[] = [];

  for (const product of DEMO_PRODUCTS) {
    const historicalValues = generateHistoricalData(product.id, 12);
    const forecast = runForecast(
      product.id,
      product.name,
      historicalValues,
      "moving_average",
      6,
      product.stockQty,
      product.reorderLevel
    );
    forecasts.push(forecast);
  }

  const alerts = generateAlerts(DEMO_PRODUCTS, forecasts);

  return NextResponse.json({ forecasts, alerts });
}

/** POST /api/forecasting — Run forecast for specific product(s) with selected method */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productIds,
      method = "moving_average",
      forecastPeriods = 6,
    } = body as {
      productIds?: string[];
      method?: ForecastResult["method"];
      forecastPeriods?: number;
    };

    const targetProducts = productIds
      ? DEMO_PRODUCTS.filter((p) => productIds.includes(p.id))
      : DEMO_PRODUCTS;

    if (targetProducts.length === 0) {
      return NextResponse.json(
        { error: "No matching products found" },
        { status: 404 }
      );
    }

    const forecasts: ForecastResult[] = [];

    for (const product of targetProducts) {
      const historicalValues = generateHistoricalData(product.id, 12);
      const forecast = runForecast(
        product.id,
        product.name,
        historicalValues,
        method,
        forecastPeriods,
        product.stockQty,
        product.reorderLevel
      );
      forecasts.push(forecast);
    }

    const alerts = generateAlerts(targetProducts, forecasts);

    return NextResponse.json({ forecasts, alerts });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
