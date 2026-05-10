import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  corsOptions,
} from "@/lib/api/api-helpers";

let prisma: any = null;
try {
  prisma = require("@/lib/prisma").default;
} catch {
  /* Prisma unavailable */
}

// In-memory settings store
let inMemorySettings: Record<string, unknown> | null = null;

const DEFAULT_SETTINGS = {
  clientId: "",
  clientSecret: "",
  environment: "sandbox",
  taxId: "",
  companyName: "",
  branchId: "0",
  activityCode: "",
};

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(_req: NextRequest) {
  if (prisma) {
    try {
      const settings = await prisma.etaSettings.findFirst();
      if (settings) return apiResponse(settings);
    } catch {
      /* fall through */
    }
  }

  return apiResponse(inMemorySettings ?? DEFAULT_SETTINGS);
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    if (prisma) {
      try {
        // Upsert settings
        const settings = await prisma.etaSettings.upsert({
          where: { id: "default" },
          update: body,
          create: { id: "default", ...body },
        });
        return apiResponse(settings);
      } catch {
        /* fall through */
      }
    }

    inMemorySettings = { ...DEFAULT_SETTINGS, ...body };
    return apiResponse(inMemorySettings);
  } catch (err: unknown) {
    return apiError((err as Error).message || "Failed to save settings", 500);
  }
}
