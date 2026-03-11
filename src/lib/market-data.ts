import { normalizeSymbol } from "@/lib/holdings";
import type { QuoteUpdate } from "@/lib/types";

const COMMON_QUOTE_CODES = new Set([
  "USD",
  "USDT",
  "USDC",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "BTC",
  "ETH"
]);

type YahooQuoteResponse = {
  quoteResponse?: {
    result?: YahooQuote[];
  };
};

type YahooQuote = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  currency?: string;
};

type TwelveDataQuote = {
  symbol?: string;
  name?: string;
  currency?: string;
  close?: string | number;
  price?: string | number;
  status?: string;
  message?: string;
  code?: number | string;
};

type FetchBatchQuotesResult = {
  provider: string;
  quotes: QuoteUpdate[];
};

export class QuoteProviderError extends Error {
  provider: string;
  status: number | null;

  constructor(message: string, provider: string, status: number | null = null) {
    super(message);
    this.name = "QuoteProviderError";
    this.provider = provider;
    this.status = status;
  }
}

function getErrorMessage(value: unknown) {
  if (value instanceof Error) {
    return value.message;
  }

  return "Quote refresh failed for an unknown reason.";
}

function parseNumber(value: string | number | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toTwelveDataSymbol(symbol: string) {
  const normalized = normalizeSymbol(symbol);

  if (normalized.includes("/")) {
    return normalized;
  }

  const separatorIndex = normalized.lastIndexOf("-");
  if (separatorIndex <= 0) {
    return normalized;
  }

  const base = normalized.slice(0, separatorIndex);
  const quote = normalized.slice(separatorIndex + 1);

  if (!COMMON_QUOTE_CODES.has(quote)) {
    return normalized;
  }

  return `${base}/${quote}`;
}

function buildProviderSymbolMap(symbols: string[]) {
  return new Map(
    symbols.map((symbol) => {
      const normalized = normalizeSymbol(symbol);
      return [toTwelveDataSymbol(normalized), normalized] as const;
    })
  );
}

function getConfiguredQuoteProvider() {
  if (process.env.TWELVE_DATA_API_KEY?.trim()) {
    return "Twelve Data";
  }

  return "Yahoo Finance";
}

async function readErrorBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as Record<string, unknown>;
    const message = typeof payload.message === "string" ? payload.message : null;
    return message ?? JSON.stringify(payload);
  }

  return (await response.text()).trim() || null;
}

async function fetchYahooQuotes(symbols: string[]): Promise<FetchBatchQuotesResult> {
  const uniqueSymbols = Array.from(new Set(symbols.map(normalizeSymbol))).filter(Boolean);

  if (!uniqueSymbols.length) {
    return {
      provider: "Yahoo Finance",
      quotes: []
    };
  }

  const url = new URL("https://query1.finance.yahoo.com/v7/finance/quote");
  url.searchParams.set("symbols", uniqueSymbols.join(","));

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    const body = await readErrorBody(response);

    if (response.status === 429) {
      throw new QuoteProviderError(
        process.env.TWELVE_DATA_API_KEY?.trim()
          ? "Yahoo Finance rate limited the request. Wait a bit and try again."
          : "Yahoo Finance rate limited the request. Add a free Twelve Data API key in TWELVE_DATA_API_KEY for a more reliable refresh path.",
        "Yahoo Finance",
        429
      );
    }

    throw new QuoteProviderError(
      `Yahoo Finance returned ${response.status}${body ? `: ${body}` : "."}`,
      "Yahoo Finance",
      response.status
    );
  }

  const payload = (await response.json()) as YahooQuoteResponse;
  const refreshedAt = new Date().toISOString();

  return {
    provider: "Yahoo Finance",
    quotes: (payload.quoteResponse?.result ?? [])
      .filter(
        (
          quote
        ): quote is YahooQuote & {
          symbol: string;
          regularMarketPrice: number;
        } => typeof quote.symbol === "string" && typeof quote.regularMarketPrice === "number"
      )
      .map((quote) => ({
        symbol: normalizeSymbol(quote.symbol),
        name: quote.longName ?? quote.shortName ?? null,
        price: quote.regularMarketPrice,
        currency: quote.currency ?? "USD",
        refreshedAt
      }))
  };
}

function parseTwelveDataRecords(payload: unknown) {
  if (!isRecord(payload)) {
    return [];
  }

  if ("status" in payload && payload.status === "error") {
    const message = typeof payload.message === "string" ? payload.message : "Twelve Data returned an error.";
    const code = typeof payload.code === "number" ? payload.code : null;
    throw new QuoteProviderError(message, "Twelve Data", code);
  }

  if ("symbol" in payload || "close" in payload || "price" in payload) {
    return [
      {
        requestedSymbol: typeof payload.symbol === "string" ? payload.symbol : "",
        quote: payload as TwelveDataQuote
      }
    ];
  }

  return Object.entries(payload)
    .filter(([, value]) => isRecord(value))
    .map(([requestedSymbol, value]) => ({
      requestedSymbol,
      quote: value as TwelveDataQuote
    }));
}

async function fetchTwelveDataQuotes(
  symbols: string[],
  apiKey: string
): Promise<FetchBatchQuotesResult> {
  const providerMap = buildProviderSymbolMap(symbols);
  const providerSymbols = Array.from(providerMap.keys());

  if (!providerSymbols.length) {
    return {
      provider: "Twelve Data",
      quotes: []
    };
  }

  const url = new URL("https://api.twelvedata.com/quote");
  url.searchParams.set("symbol", providerSymbols.join(","));
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as unknown)
    : await response.text();

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.message === "string"
        ? payload.message
        : typeof payload === "string"
          ? payload
          : `Twelve Data returned ${response.status}.`;

    throw new QuoteProviderError(message, "Twelve Data", response.status);
  }

  const records = parseTwelveDataRecords(payload);
  const refreshedAt = new Date().toISOString();

  const quotes = records.reduce<QuoteUpdate[]>((accumulator, { requestedSymbol, quote }) => {
      if (quote.status === "error") {
        return accumulator;
      }

      const providerSymbol = normalizeSymbol(
        quote.symbol ?? requestedSymbol
      ).replace(/\//g, "/");
      const storedSymbol =
        providerMap.get(providerSymbol) ??
        providerMap.get(toTwelveDataSymbol(providerSymbol)) ??
        providerMap.get(requestedSymbol) ??
        providerMap.get(normalizeSymbol(requestedSymbol));

      const price = parseNumber(quote.close ?? quote.price);

      if (!storedSymbol || price === null) {
        return accumulator;
      }

      accumulator.push({
        symbol: storedSymbol,
        name: quote.name ?? null,
        price,
        currency: quote.currency ?? "USD",
        refreshedAt
      });

      return accumulator;
    }, []);

  return {
    provider: "Twelve Data",
    quotes
  };
}

export function getQuoteProviderLabel() {
  return getConfiguredQuoteProvider();
}

export async function fetchBatchQuotes(symbols: string[]): Promise<FetchBatchQuotesResult> {
  const uniqueSymbols = Array.from(new Set(symbols.map(normalizeSymbol))).filter(Boolean);

  if (!uniqueSymbols.length) {
    return {
      provider: getConfiguredQuoteProvider(),
      quotes: []
    };
  }

  const twelveDataApiKey = process.env.TWELVE_DATA_API_KEY?.trim();

  if (twelveDataApiKey) {
    try {
      return await fetchTwelveDataQuotes(uniqueSymbols, twelveDataApiKey);
    } catch (error) {
      throw new QuoteProviderError(getErrorMessage(error), "Twelve Data");
    }
  }

  try {
    return await fetchYahooQuotes(uniqueSymbols);
  } catch (error) {
    if (error instanceof QuoteProviderError) {
      throw error;
    }

    throw new QuoteProviderError(getErrorMessage(error), "Yahoo Finance");
  }
}
