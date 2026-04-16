import { NextResponse } from "next/server";

import { getPortfolioReportData } from "@/lib/report-data";
import { buildPortfolioReportPdf } from "@/lib/report-pdf";

export const runtime = "nodejs";

function sanitizeReportName(value: string | null) {
  const fallback = "Portfolio Report";

  if (!value) {
    return fallback;
  }

  const normalized = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, 80);
}

function slugifyReportName(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "portfolio-report";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const disposition = url.searchParams.get("disposition") === "inline" ? "inline" : "attachment";
  const reportName = sanitizeReportName(url.searchParams.get("name"));
  const report = getPortfolioReportData();
  const pdf = buildPortfolioReportPdf(report, {
    reportTitle: reportName
  });
  const reportDate = report.generatedAt.slice(0, 10);
  const filename = `${slugifyReportName(reportName)}-${reportDate}.pdf`;

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "no-store"
    }
  });
}
