import { NextResponse } from "next/server";

import { applyQuoteUpdates, getDistinctSymbols, normalizeSymbol } from "@/lib/holdings";
import { QuoteProviderError, fetchBatchQuotes } from "@/lib/market-data";

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

  if (!symbols.length) {
    return NextResponse.json(
      { message: "Add at least one holding before refreshing prices." },
      { status: 400 }
    );
  }

  try {
    const result = await fetchBatchQuotes(symbols);
    const quotes = result.quotes;

    if (!quotes.length) {
      return NextResponse.json(
        {
          success: false,
          provider: result.provider,
          message:
            "The quote provider returned no usable prices for the saved symbols. Check your ticker formats and provider configuration."
        }
      );
    }

    applyQuoteUpdates(quotes);

    const returnedSymbols = new Set(quotes.map((quote) => quote.symbol));
    const missingSymbols = symbols.filter((symbol) => !returnedSymbols.has(symbol));

    return NextResponse.json({
      success: true,
      provider: result.provider,
      message: "Prices refreshed.",
      updatedSymbols: quotes.length,
      missingSymbols
    });
  } catch (error) {
    if (error instanceof QuoteProviderError) {
      return NextResponse.json({
        success: false,
        provider: error.provider,
        message: error.message
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Price refresh failed for an unknown reason."
      },
      { status: 500 }
    );
  }
}
