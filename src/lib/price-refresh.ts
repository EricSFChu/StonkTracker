import { applyQuoteUpdates, getDistinctSymbols, normalizeSymbol } from "@/lib/holdings";
import { QuoteProviderError, fetchBatchQuotes, getQuoteProviderLabel } from "@/lib/market-data";

export const TWELVE_DATA_BATCH_SIZE = 8;
export const TWELVE_DATA_DELAY_MS = 65_000;

const COMPLETED_JOB_TTL_MS = 10 * 60_000;

type RefreshBatchResult = {
  success: boolean;
  provider: string;
  message: string;
  updatedSymbols: number;
  missingSymbols: string[];
  statusCode: number;
};

export type PriceRefreshJob = {
  id: string;
  status: "running" | "completed" | "failed";
  phase: "refreshing" | "waiting" | "completed" | "failed";
  provider: string;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
  waitUntil: string | null;
  currentBatch: number;
  totalBatches: number;
  symbolsTotal: number;
  updatedSymbols: number;
  missingSymbols: string[];
  usesTwelveData: boolean;
  message: string | null;
  error: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __stonkTrackerPriceRefreshJob: PriceRefreshJob | undefined;
}

function chunkSymbols(symbols: string[], size: number) {
  const chunks: string[][] = [];

  for (let index = 0; index < symbols.length; index += size) {
    chunks.push(symbols.slice(index, index + size));
  }

  return chunks;
}

function sleep(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function uniqueSymbols(symbols: string[]) {
  return Array.from(new Set(symbols.map(normalizeSymbol))).filter(Boolean);
}

function cloneJob(job: PriceRefreshJob) {
  return {
    ...job,
    missingSymbols: [...job.missingSymbols]
  };
}

function pruneExpiredJob() {
  const job = global.__stonkTrackerPriceRefreshJob;

  if (!job || job.status === "running" || !job.finishedAt) {
    return;
  }

  if (Date.now() - new Date(job.finishedAt).getTime() > COMPLETED_JOB_TTL_MS) {
    global.__stonkTrackerPriceRefreshJob = undefined;
  }
}

function updateJob(jobId: string, mutate: (job: PriceRefreshJob) => void) {
  const job = global.__stonkTrackerPriceRefreshJob;

  if (!job || job.id !== jobId) {
    return null;
  }

  mutate(job);
  job.updatedAt = new Date().toISOString();

  return cloneJob(job);
}

function getBatchConfig(symbolCount: number) {
  const usesTwelveData = getQuoteProviderLabel() === "Twelve Data";

  return {
    usesTwelveData,
    batchSize: usesTwelveData ? TWELVE_DATA_BATCH_SIZE : Math.max(symbolCount, 1),
    delayMs: usesTwelveData ? TWELVE_DATA_DELAY_MS : 0
  };
}

export function getDefaultRefreshSymbols() {
  return uniqueSymbols(getDistinctSymbols());
}

export function getCurrentPriceRefreshJob() {
  pruneExpiredJob();

  const job = global.__stonkTrackerPriceRefreshJob;
  return job ? cloneJob(job) : null;
}

export async function refreshQuoteBatch(symbols: string[]): Promise<RefreshBatchResult> {
  const requestedSymbols = uniqueSymbols(symbols);

  if (!requestedSymbols.length) {
    return {
      success: false,
      provider: getQuoteProviderLabel(),
      message: "Add at least one holding before refreshing prices.",
      updatedSymbols: 0,
      missingSymbols: [],
      statusCode: 400
    };
  }

  try {
    const result = await fetchBatchQuotes(requestedSymbols);
    const quotes = result.quotes;

    if (!quotes.length) {
      return {
        success: false,
        provider: result.provider,
        message:
          "The quote provider returned no usable prices for the saved symbols. Check your ticker formats and provider configuration.",
        updatedSymbols: 0,
        missingSymbols: [],
        statusCode: 200
      };
    }

    applyQuoteUpdates(quotes);

    const returnedSymbols = new Set(quotes.map((quote) => quote.symbol));
    const missingSymbols = requestedSymbols.filter((symbol) => !returnedSymbols.has(symbol));

    return {
      success: true,
      provider: result.provider,
      message: "Prices refreshed.",
      updatedSymbols: quotes.length,
      missingSymbols,
      statusCode: 200
    };
  } catch (error) {
    if (error instanceof QuoteProviderError) {
      return {
        success: false,
        provider: error.provider,
        message: error.message,
        updatedSymbols: 0,
        missingSymbols: [],
        statusCode: 200
      };
    }

    return {
      success: false,
      provider: getQuoteProviderLabel(),
      message:
        error instanceof Error ? error.message : "Price refresh failed for an unknown reason.",
      updatedSymbols: 0,
      missingSymbols: [],
      statusCode: 500
    };
  }
}

async function runPriceRefreshJob(
  jobId: string,
  symbols: string[],
  batchSize: number,
  delayMs: number
) {
  const batches = chunkSymbols(symbols, batchSize);
  const missingSymbols = new Set<string>();
  let activeProvider = getQuoteProviderLabel();
  let updatedSymbols = 0;

  try {
    for (const [index, batch] of batches.entries()) {
      const batchNumber = index + 1;

      updateJob(jobId, (job) => {
        job.phase = "refreshing";
        job.currentBatch = batchNumber;
        job.waitUntil = null;
        job.message =
          job.totalBatches > 1 ? `Batch ${batchNumber} of ${job.totalBatches}` : "Refreshing";
        job.error = null;
      });

      const result = await refreshQuoteBatch(batch);
      activeProvider = result.provider || activeProvider;

      if (!result.success) {
        updateJob(jobId, (job) => {
          job.status = "failed";
          job.phase = "failed";
          job.provider = activeProvider;
          job.updatedSymbols = updatedSymbols;
          job.waitUntil = null;
          job.message = result.message;
          job.error = result.message;
          job.finishedAt = new Date().toISOString();
        });
        return;
      }

      updatedSymbols += result.updatedSymbols;

      for (const symbol of result.missingSymbols) {
        missingSymbols.add(symbol);
      }

      updateJob(jobId, (job) => {
        job.provider = activeProvider;
        job.updatedSymbols = updatedSymbols;
        job.missingSymbols = Array.from(missingSymbols).sort();
        job.message =
          job.totalBatches > 1 ? `Batch ${batchNumber} of ${job.totalBatches}` : "Refreshing";
      });

      if (index < batches.length - 1 && delayMs > 0) {
        const waitUntil = new Date(Date.now() + delayMs).toISOString();

        updateJob(jobId, (job) => {
          job.phase = "waiting";
          job.waitUntil = waitUntil;
        });

        await sleep(delayMs);
      }
    }

    updateJob(jobId, (job) => {
      job.status = "completed";
      job.phase = "completed";
      job.provider = activeProvider;
      job.updatedSymbols = updatedSymbols;
      job.missingSymbols = Array.from(missingSymbols).sort();
      job.waitUntil = null;
      job.message = `Updated ${updatedSymbols} symbols`;
      job.error = null;
      job.finishedAt = new Date().toISOString();
    });
  } catch (error) {
    updateJob(jobId, (job) => {
      job.status = "failed";
      job.phase = "failed";
      job.provider = activeProvider;
      job.updatedSymbols = updatedSymbols;
      job.waitUntil = null;
      job.message = error instanceof Error ? error.message : "Price refresh failed.";
      job.error = job.message;
      job.finishedAt = new Date().toISOString();
    });
  }
}

export function startPriceRefreshJob(symbols: string[]) {
  pruneExpiredJob();

  const activeJob = global.__stonkTrackerPriceRefreshJob;

  if (activeJob?.status === "running") {
    return {
      started: false,
      job: cloneJob(activeJob)
    };
  }

  const requestedSymbols = uniqueSymbols(symbols);

  if (!requestedSymbols.length) {
    throw new Error("Add at least one holding before refreshing prices.");
  }

  const { usesTwelveData, batchSize, delayMs } = getBatchConfig(requestedSymbols.length);
  const batches = chunkSymbols(requestedSymbols, batchSize);
  const timestamp = new Date().toISOString();

  const job: PriceRefreshJob = {
    id: crypto.randomUUID(),
    status: "running",
    phase: "refreshing",
    provider: getQuoteProviderLabel(),
    startedAt: timestamp,
    updatedAt: timestamp,
    finishedAt: null,
    waitUntil: null,
    currentBatch: 0,
    totalBatches: batches.length,
    symbolsTotal: requestedSymbols.length,
    updatedSymbols: 0,
    missingSymbols: [],
    usesTwelveData,
    message: batches.length > 1 ? `Batch 1 of ${batches.length}` : "Refreshing",
    error: null
  };

  global.__stonkTrackerPriceRefreshJob = job;
  void runPriceRefreshJob(job.id, requestedSymbols, batchSize, delayMs);

  return {
    started: true,
    job: cloneJob(job)
  };
}
