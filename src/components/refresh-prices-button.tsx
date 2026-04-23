"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { formatDateTime } from "@/lib/format";

const TWELVE_DATA_BATCH_SIZE = 8;
const TWELVE_DATA_DELAY_MS = 65_000;
const JOB_POLL_INTERVAL_MS = 2_000;

type RefreshPricesButtonProps = {
  disabled: boolean;
  lastRefreshAt: string | null;
  compact?: boolean;
  providerLabel: string;
  symbols: string[];
};

type RefreshJob = {
  id: string;
  status: "running" | "completed" | "failed";
  phase: "refreshing" | "waiting" | "completed" | "failed";
  provider: string;
  waitUntil: string | null;
  currentBatch: number;
  totalBatches: number;
  symbolsTotal: number;
  message?: string;
  updatedSymbols: number;
  missingSymbols?: string[];
  usesTwelveData: boolean;
  error?: string | null;
};

type RefreshJobResponse = {
  started?: boolean;
  job: RefreshJob | null;
  message?: string;
};

function formatCompletionMessage(job: RefreshJob) {
  const providerNote = job.provider ? ` via ${job.provider}` : "";
  const missingNote =
    job.missingSymbols && job.missingSymbols.length
      ? ` Missing: ${job.missingSymbols.join(", ")}.`
      : "";

  return `Updated ${job.updatedSymbols} symbols${providerNote}.${missingNote}`;
}

function getJobProgressNote(job: RefreshJob | null) {
  if (!job || job.status !== "running" || job.totalBatches <= 1 || job.currentBatch <= 0) {
    return null;
  }

  return `Batch ${job.currentBatch} of ${job.totalBatches}`;
}

function getJobStatusMessage(job: RefreshJob | null, fallback: string | null) {
  if (!job) {
    return fallback;
  }

  if (job.status === "failed") {
    const progressNote = job.updatedSymbols > 0 ? ` Updated ${job.updatedSymbols} first.` : "";
    return `${job.error ?? job.message ?? "Price refresh failed."}${progressNote}`;
  }

  if (job.status === "completed") {
    return formatCompletionMessage(job);
  }

  return null;
}

export function RefreshPricesButton({
  disabled,
  lastRefreshAt,
  compact = false,
  providerLabel,
  symbols
}: RefreshPricesButtonProps) {
  const router = useRouter();
  const [job, setJob] = useState<RefreshJob | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const jobRef = useRef<RefreshJob | null>(null);

  const usesTwelveData = providerLabel === "Twelve Data";
  const isRefreshing = job?.status === "running";
  const waitUntil = job?.waitUntil ? new Date(job.waitUntil).getTime() : null;
  const remainingSeconds = waitUntil ? Math.max(0, Math.ceil((waitUntil - now) / 1000)) : 0;

  useEffect(() => {
    jobRef.current = job;
  }, [job]);

  useEffect(() => {
    if (!isRefreshing && !waitUntil) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRefreshing, waitUntil]);

  async function syncJobStatus() {
    const response = await fetch("/api/prices/refresh-status", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Refresh status is unavailable.");
    }

    const payload = (await response.json()) as RefreshJobResponse;
    const currentJob = jobRef.current;
    const nextJob = payload.job;
    const finishedActiveJob =
      currentJob?.status === "running" &&
      nextJob?.id === currentJob.id &&
      nextJob.status !== "running";

    setJob(nextJob);

    if (nextJob) {
      setStatus(null);
    }

    if (finishedActiveJob) {
      router.refresh();
    }

    return payload;
  }

  useEffect(() => {
    void syncJobStatus().catch(() => {
      // Ignore initial load failures and keep the button usable.
    });
  }, []);

  useEffect(() => {
    if (!isRefreshing) {
      return;
    }

    const poller = window.setInterval(() => {
      void syncJobStatus().catch(() => {
        // Keep the last known progress state if polling fails briefly.
      });
    }, JOB_POLL_INTERVAL_MS);

    return () => window.clearInterval(poller);
  }, [isRefreshing]);

  async function refreshPrices() {
    if (!symbols.length || isRefreshing) {
      return;
    }

    try {
      const response = await fetch("/api/prices/refresh-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          symbols
        })
      });

      const payload = (await response.json()) as RefreshJobResponse;

      if (!response.ok) {
        setStatus(payload.message ?? "Price refresh failed.");
        return;
      }

      setNow(Date.now());
      setJob(payload.job);
      setStatus(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Price refresh failed.");
    }
  }

  const buttonLabel = isRefreshing && job
    ? remainingSeconds > 0
      ? `Waiting ${remainingSeconds}s`
      : "Refreshing..."
    : "Refresh market prices";

  const batchingNote =
    (job?.usesTwelveData && (job.totalBatches ?? 0) > 1) ||
    (!job && usesTwelveData && symbols.length > TWELVE_DATA_BATCH_SIZE)
      ? `Free tier: ${TWELVE_DATA_BATCH_SIZE} symbols every ${TWELVE_DATA_DELAY_MS / 1000}s.`
      : null;
  const jobProgressNote = getJobProgressNote(job);
  const jobStatusMessage = getJobStatusMessage(job, status);

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
      {jobProgressNote ? <p className="refresh-meta">{jobProgressNote}</p> : null}
      {jobStatusMessage ? <p className="refresh-status">{jobStatusMessage}</p> : null}
    </div>
  );
}
