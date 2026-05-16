import { NextResponse } from "next/server";

import { replaceReportSettings } from "@/lib/report-settings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid report settings payload." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "Invalid report settings payload." }, { status: 400 });
  }

  const record = payload as {
    reportName?: unknown;
  };

  if (typeof record.reportName !== "string") {
    return NextResponse.json({ message: "Invalid report settings payload." }, { status: 400 });
  }

  const savedSettings = replaceReportSettings({
    reportName: record.reportName
  });

  return NextResponse.json({
    success: true,
    savedSettings
  });
}
