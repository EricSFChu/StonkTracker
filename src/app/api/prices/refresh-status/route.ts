import { NextResponse } from "next/server";

import { normalizeSymbol } from "@/lib/holdings";
import {
  getCurrentPriceRefreshJob,
  getDefaultRefreshSymbols,
  startPriceRefreshJob
} from "@/lib/price-refresh";

export const runtime = "nodejs";

function parseRequestedSymbols(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as { symbols?: unknown };

  if (!Array.isArray(record.symbols)) {
    return null;
  }

  return record.symbols
    .filter((value): value is string => typeof value === "string")
    .map(normalizeSymbol);
}

export async function GET() {
  return NextResponse.json({
    job: getCurrentPriceRefreshJob()
  });
}

export async function POST(request: Request) {
  let requestedSymbols: string[] | null = null;

  try {
    requestedSymbols = parseRequestedSymbols((await request.json()) as unknown);
  } catch {
    requestedSymbols = null;
  }

  const symbols = requestedSymbols ?? getDefaultRefreshSymbols();

  if (!symbols.length) {
    return NextResponse.json(
      { message: "Add at least one holding before refreshing prices." },
      { status: 400 }
    );
  }

  try {
    const result = startPriceRefreshJob(symbols);

    return NextResponse.json(result, {
      status: result.started ? 202 : 200
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Price refresh failed for an unknown reason."
      },
      { status: 500 }
    );
  }
}
