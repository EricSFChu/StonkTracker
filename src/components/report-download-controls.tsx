"use client";

import { useEffect, useRef, useState } from "react";

type ReportDownloadControlsProps = {
  initialName: string;
};

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
  const [savedReportName, setSavedReportName] = useState(initialName);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const hasRendered = useRef(false);
  const saveRequestId = useRef(0);

  useEffect(() => {
    setReportName(initialName);
    setSavedReportName(initialName);
    setSaveState("idle");
  }, [initialName]);

  useEffect(() => {
    if (!hasRendered.current) {
      hasRendered.current = true;
      return;
    }

    if (reportName === savedReportName) {
      return;
    }

    const requestId = saveRequestId.current + 1;
    saveRequestId.current = requestId;
    const submittedReportName = reportName;
    setSaveState("saving");

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/reports/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            reportName
          })
        });

        if (requestId !== saveRequestId.current) {
          return;
        }

        if (!response.ok) {
          setSaveState("error");
          return;
        }

        setSavedReportName(submittedReportName);
        setSaveState("saved");
      } catch {
        if (requestId === saveRequestId.current) {
          setSaveState("error");
        }
      }
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [reportName, savedReportName]);

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
        <span>
          {saveState === "saving"
            ? "Saving report name..."
            : saveState === "error"
              ? "Report name save failed"
              : "Report name saves to the database"}
        </span>
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
