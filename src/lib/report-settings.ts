import { getDb } from "@/lib/db";

export const DEFAULT_REPORT_NAME = "Portfolio Report";

type ReportSettingsRow = {
  report_name: string;
};

export type ReportSettings = {
  reportName: string;
};

export function sanitizeReportName(value: string | null | undefined) {
  if (!value) {
    return DEFAULT_REPORT_NAME;
  }

  const normalized = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return DEFAULT_REPORT_NAME;
  }

  return normalized.slice(0, 80);
}

export function getReportSettings(): ReportSettings {
  const row = getDb()
    .prepare(
      `
        SELECT report_name
        FROM report_settings
        WHERE id = 1
      `
    )
    .get() as ReportSettingsRow | undefined;

  return {
    reportName: sanitizeReportName(row?.report_name)
  };
}

export function replaceReportSettings(settings: ReportSettings) {
  const normalizedSettings = {
    reportName: sanitizeReportName(settings.reportName)
  };

  getDb()
    .prepare(
      `
        INSERT INTO report_settings (
          id,
          report_name,
          updated_at
        )
        VALUES (1, @reportName, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          report_name = excluded.report_name,
          updated_at = CURRENT_TIMESTAMP
      `
    )
    .run(normalizedSettings);

  return normalizedSettings;
}
