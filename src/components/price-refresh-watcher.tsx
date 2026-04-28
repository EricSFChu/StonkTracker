"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ACTIVE_POLL_INTERVAL_MS = 2_000;
const IDLE_POLL_INTERVAL_MS = 5_000;
const PRICE_REFRESH_STARTED_EVENT = "stonktracker:price-refresh-started";

type RefreshJob = {
  id: string;
  status: "running" | "completed" | "failed";
  updatedSymbols: number;
};

type RefreshJobResponse = {
  job: RefreshJob | null;
};

export function PriceRefreshWatcher() {
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const lastSeenJobIdRef = useRef<string | null>(null);
  const lastSeenUpdatedSymbolsRef = useRef(0);

  async function syncRefreshStatus() {
    const response = await fetch("/api/prices/refresh-status", {
      cache: "no-store"
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as RefreshJobResponse;
    const job = payload.job;

    if (!job) {
      lastSeenJobIdRef.current = null;
      lastSeenUpdatedSymbolsRef.current = 0;
      setIsActive(false);
      return;
    }

    const isNewJob = lastSeenJobIdRef.current !== job.id;
    const previousUpdatedSymbols = isNewJob ? 0 : lastSeenUpdatedSymbolsRef.current;

    lastSeenJobIdRef.current = job.id;
    lastSeenUpdatedSymbolsRef.current = job.updatedSymbols;
    setIsActive(job.status === "running");

    if (job.updatedSymbols > previousUpdatedSymbols) {
      router.refresh();
    }
  }

  useEffect(() => {
    void syncRefreshStatus();
  }, []);

  useEffect(() => {
    function handleRefreshStarted() {
      void syncRefreshStatus();
    }

    window.addEventListener(PRICE_REFRESH_STARTED_EVENT, handleRefreshStarted);

    return () => window.removeEventListener(PRICE_REFRESH_STARTED_EVENT, handleRefreshStarted);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(
      () => {
        void syncRefreshStatus();
      },
      isActive ? ACTIVE_POLL_INTERVAL_MS : IDLE_POLL_INTERVAL_MS
    );

    return () => window.clearInterval(interval);
  }, [isActive]);

  return null;
}
