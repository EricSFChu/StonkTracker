"use client";

import { useEffect, useState } from "react";

type ReportDownloadControlsProps = {
  initialName: string;
};

const REPORT_NAME_STORAGE_KEY = "stonktracker.report-name";

function buildReportUrl(reportName: string, disposition: "attachment" | "inline") {
  const params = new URLSearchParams();
  const trimmedName = reportName.trim();

  if (disposition === "inline") {
    params.set("disposition", "inline");
  }

  if (trimmedName) {
    params.set("name", trimmedName);
  }

  const query = params.toString();

  return query ? `/api/reports/portfolio?${query}` : "/api/reports/portfolio";
}

export function ReportDownloadControls({
  initialName
}: ReportDownloadControlsProps) {
  const [reportName, setReportName] = useState(initialName);
  const [hasLoadedPersistedName, setHasLoadedPersistedName] = useState(false);

  useEffect(() => {
    const savedName = window.localStorage.getItem(REPORT_NAME_STORAGE_KEY)?.trim();

    if (savedName) {
      setReportName(savedName);
    }

    setHasLoadedPersistedName(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedPersistedName) {
      return;
    }

    const trimmedName = reportName.trim();

    if (trimmedName) {
      window.localStorage.setItem(REPORT_NAME_STORAGE_KEY, trimmedName);
      return;
    }

    window.localStorage.removeItem(REPORT_NAME_STORAGE_KEY);
  }, [hasLoadedPersistedName, reportName]);

  return (
    <div className="report-controls">
      <label className="field compact report-name-field">
        <span>Report name</span>
        <input
          type="text"
          value={reportName}
          onChange={(event) => setReportName(event.target.value)}
          placeholder="Portfolio report"
        />
      </label>

      <div className="mini-meta">
        <span>Report name auto-saves for the next visit</span>
      </div>

      <div className="report-actions">
        <a className="button" href={buildReportUrl(reportName, "attachment")}>
          Download PDF
        </a>
        <a
          className="button ghost-link"
          href={buildReportUrl(reportName, "inline")}
          target="_blank"
          rel="noreferrer"
        >
          Open PDF
        </a>
      </div>
    </div>
  );
}
