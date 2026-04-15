import { NextResponse } from "next/server";

import { normalizeCompoundingSettings } from "@/lib/compounding";
import { replaceCompoundingSettings } from "@/lib/compounding-settings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid compounding payload." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "Invalid compounding payload." }, { status: 400 });
  }

  const record = payload as {
    annualRate?: unknown;
    years?: unknown;
    annualContribution?: unknown;
  };

  if (
    typeof record.annualRate !== "number" ||
    typeof record.years !== "number" ||
    typeof record.annualContribution !== "number"
  ) {
    return NextResponse.json({ message: "Invalid compounding payload." }, { status: 400 });
  }

  const savedSettings = replaceCompoundingSettings(
    normalizeCompoundingSettings({
      annualRate: record.annualRate,
      years: record.years,
      annualContribution: record.annualContribution
    })
  );

  return NextResponse.json({
    success: true,
    savedSettings
  });
}
