"use client";

import { useEffect, useState } from "react";

const JOB_POLL_INTERVAL_MS = 2_000;
const LABEL_ALTERNATE_INTERVAL_MS = 3_000;
const PRICE_REFRESH_STARTED_EVENT = "stonktracker:price-refresh-started";

type RefreshPricesButtonProps = {
  disabled?: boolean;
  symbols?: string[];
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

export function RefreshPricesButton({
  disabled = false,
  symbols
}: RefreshPricesButtonProps) {
  const [job, setJob] = useState<RefreshJob | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [alternateLabel, setAlternateLabel] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const isRefreshing = job?.status === "running";
  const waitUntil = job?.waitUntil ? new Date(job.waitUntil).getTime() : null;
  const remainingSeconds = waitUntil ? Math.max(0, Math.ceil((waitUntil - now) / 1000)) : 0;

  useEffect(() => {
    setIsMounted(true);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (!isRefreshing && !waitUntil) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRefreshing, waitUntil]);

  useEffect(() => {
    if (!isRefreshing || !job || job.totalBatches <= 1) {
      setAlternateLabel(false);
      return;
    }

    const timer = window.setInterval(() => {
      setAlternateLabel((current) => !current);
    }, LABEL_ALTERNATE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isRefreshing, job?.id, job?.totalBatches]);

  async function syncJobStatus() {
    const response = await fetch("/api/prices/refresh-status", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Refresh status is unavailable.");
    }

    const payload = (await response.json()) as RefreshJobResponse;
    const nextJob = payload.job;

    setJob(nextJob);

    if (nextJob) {
      setStatus(null);
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
    if (isRefreshing) {
      return;
    }

    try {
      setStatus(null);

      const requestInit: RequestInit = {
        method: "POST"
      };

      if (symbols) {
        requestInit.headers = {
          "Content-Type": "application/json"
        };
        requestInit.body = JSON.stringify({
          symbols
        });
      }

      const response = await fetch("/api/prices/refresh-status", {
        ...requestInit
      });

      const payload = (await response.json()) as RefreshJobResponse;

      if (!response.ok) {
        setStatus(response.status === 400 ? "No holdings" : "Refresh failed");
        return;
      }

      setNow(Date.now());
      setJob(payload.job);
      setStatus(null);
      window.dispatchEvent(new Event(PRICE_REFRESH_STARTED_EVENT));
    } catch {
      setStatus("Refresh failed");
    }
  }

  const buttonLabel = (() => {
    if (status) {
      return status;
    }

    if (!isRefreshing || !job) {
      return "Refresh prices";
    }

    if (job.totalBatches > 1 && job.currentBatch > 0 && (!isMounted || alternateLabel)) {
      return `Batch ${job.currentBatch}/${job.totalBatches}`;
    }

    if (isMounted && remainingSeconds > 0) {
      return `${remainingSeconds}s left`;
    }

    return job.totalBatches > 1 && job.currentBatch > 0
      ? `Batch ${job.currentBatch}/${job.totalBatches}`
      : "Refreshing...";
  })();

  return (
    <div className="refresh-box compact nav-refresh">
      <button
        className="button nav-refresh-button"
        type="button"
        disabled={disabled || isRefreshing}
        onClick={() => {
          void refreshPrices();
        }}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
