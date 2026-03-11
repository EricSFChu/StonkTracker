"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { formatDateTime } from "@/lib/format";

const TWELVE_DATA_BATCH_SIZE = 8;
const TWELVE_DATA_DELAY_MS = 65_000;

type RefreshPricesButtonProps = {
  disabled: boolean;
  lastRefreshAt: string | null;
  compact?: boolean;
  providerLabel: string;
  symbols: string[];
};

type RefreshResponse = {
  success?: boolean;
  provider?: string;
  message?: string;
  updatedSymbols?: number;
  missingSymbols?: string[];
};

function chunkSymbols(symbols: string[], size: number) {
  const chunks: string[][] = [];

  for (let index = 0; index < symbols.length; index += size) {
    chunks.push(symbols.slice(index, index + size));
  }

  return chunks;
}

function sleep(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

export function RefreshPricesButton({
  disabled,
  lastRefreshAt,
  compact = false,
  providerLabel,
  symbols
}: RefreshPricesButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const usesTwelveData = providerLabel === "Twelve Data";
  const batchSize = usesTwelveData ? TWELVE_DATA_BATCH_SIZE : Math.max(symbols.length, 1);
  const delayMs = usesTwelveData ? TWELVE_DATA_DELAY_MS : 0;
  const remainingSeconds = waitUntil ? Math.max(0, Math.ceil((waitUntil - now) / 1000)) : 0;

  useEffect(() => {
    if (!waitUntil) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [waitUntil]);

  async function refreshBatch(batchSymbols: string[]) {
    const response = await fetch("/api/prices/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        symbols: batchSymbols
      })
    });

    const payload = (await response.json()) as RefreshResponse;

    return {
      ok: response.ok && payload.success !== false,
      payload
    };
  }

  async function refreshPrices() {
    if (!symbols.length || isRefreshing) {
      return;
    }

    const batches = chunkSymbols(symbols, batchSize);
    const missingSymbols = new Set<string>();
    let updatedSymbols = 0;
    let activeProvider = providerLabel;

    setIsRefreshing(true);
    setStatus(null);
    setCurrentBatch(0);
    setTotalBatches(batches.length);
    setWaitUntil(null);
    setNow(Date.now());

    try {
      for (const [index, batch] of batches.entries()) {
        const batchNumber = index + 1;
        const completedBeforeBatch = index * batchSize;

        setCurrentBatch(batchNumber);
        setStatus(
          batches.length > 1
            ? `Refreshing batch ${batchNumber}/${batches.length}. ${completedBeforeBatch}/${symbols.length} symbols done.`
            : `Refreshing ${symbols.length} symbols.`
        );

        const { ok, payload } = await refreshBatch(batch);
        activeProvider = payload.provider ?? activeProvider;

        if (!ok) {
          const progressNote =
            updatedSymbols > 0 ? ` Updated ${updatedSymbols} symbols before stopping.` : "";
          setStatus(`${payload.message ?? "Price refresh failed."}${progressNote}`);

          if (updatedSymbols > 0) {
            router.refresh();
          }

          return;
        }

        updatedSymbols += payload.updatedSymbols ?? 0;

        for (const symbol of payload.missingSymbols ?? []) {
          missingSymbols.add(symbol);
        }

        if (index < batches.length - 1 && delayMs > 0) {
          const nextWaitUntil = Date.now() + delayMs;
          setWaitUntil(nextWaitUntil);
          setNow(Date.now());
          setStatus(
            `Batch ${batchNumber}/${batches.length} complete. Waiting ${Math.ceil(delayMs / 1000)}s for the free tier before the next batch.`
          );
          await sleep(delayMs);
          setWaitUntil(null);
        }
      }

      const missingNote = missingSymbols.size
        ? ` Missing: ${Array.from(missingSymbols).join(", ")}.`
        : "";
      const batchNote = batches.length > 1 ? ` across ${batches.length} batches` : "";
      const providerNote = activeProvider ? ` via ${activeProvider}` : "";

      setStatus(`Updated ${updatedSymbols} symbols${batchNote}${providerNote}.${missingNote}`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Price refresh failed.";
      const progressNote = updatedSymbols > 0 ? ` Updated ${updatedSymbols} symbols first.` : "";
      setStatus(`${message}${progressNote}`);

      if (updatedSymbols > 0) {
        router.refresh();
      }
    } finally {
      setIsRefreshing(false);
      setCurrentBatch(0);
      setTotalBatches(0);
      setWaitUntil(null);
    }
  }

  const buttonLabel = isRefreshing
    ? remainingSeconds > 0
      ? `Waiting ${remainingSeconds}s`
      : totalBatches > 1 && currentBatch > 0
        ? `Refreshing ${currentBatch}/${totalBatches}`
        : "Refreshing..."
    : "Refresh market prices";

  const batchingNote =
    usesTwelveData && symbols.length > TWELVE_DATA_BATCH_SIZE
      ? `Free tier limit: ${TWELVE_DATA_BATCH_SIZE} symbols every 65s. Stalest quotes refresh first.`
      : null;
  const activeNote = isRefreshing
    ? remainingSeconds > 0
      ? `Next batch starts in ${remainingSeconds}s.`
      : totalBatches > 1 && currentBatch > 0
        ? `Running batch ${currentBatch} of ${totalBatches}.`
        : `Refreshing ${symbols.length} symbols.`
    : null;

  return (
    <div className={`refresh-box${compact ? " compact" : ""}`}>
      <button
        className="button"
        type="button"
        disabled={disabled || isRefreshing}
        onClick={() => {
          void refreshPrices();
        }}
      >
        {buttonLabel}
      </button>

      <p className="refresh-meta">
        {compact
          ? `Last refresh: ${formatDateTime(lastRefreshAt)}`
          : `Stored quote timestamp: ${formatDateTime(lastRefreshAt)}`}
      </p>

      {batchingNote ? <p className="refresh-meta warning">{batchingNote}</p> : null}
      {activeNote ? <p className="refresh-meta">{activeNote}</p> : null}
      {status ? <p className="refresh-status">{status}</p> : null}
    </div>
  );
}
