import { NextResponse } from "next/server";

import { getDistinctSymbols, normalizeSymbol } from "@/lib/holdings";
import { refreshQuoteBatch } from "@/lib/price-refresh";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let requestedSymbols: string[] | null = null;

  try {
    const payload = (await request.json()) as unknown;

    if (payload && typeof payload === "object") {
      const record = payload as { symbols?: unknown };

      if (Array.isArray(record.symbols)) {
        requestedSymbols = record.symbols
        .filter((value): value is string => typeof value === "string")
        .map(normalizeSymbol);
      }
    }
  } catch {
    requestedSymbols = null;
  }

  const symbols = Array.from(new Set((requestedSymbols ?? getDistinctSymbols()).filter(Boolean)));
  const result = await refreshQuoteBatch(symbols);

  return NextResponse.json(result, { status: result.statusCode });
}
