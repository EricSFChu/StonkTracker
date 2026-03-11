import { NextResponse } from "next/server";

import { normalizeSymbol } from "@/lib/holdings";
import { replaceProjectionTargets, type ProjectionTargetInput } from "@/lib/projection-targets";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid projections payload." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "Invalid projections payload." }, { status: 400 });
  }

  const record = payload as {
    symbols?: unknown;
    targets?: unknown;
  };

  const symbols = Array.isArray(record.symbols)
    ? Array.from(
        new Set(
          record.symbols
            .filter((value): value is string => typeof value === "string")
            .map(normalizeSymbol)
            .filter(Boolean)
        )
      )
    : [];

  const targets = Array.isArray(record.targets)
    ? record.targets.reduce<ProjectionTargetInput[]>((items, entry) => {
        if (!entry || typeof entry !== "object") {
          return items;
        }

        const target = entry as {
          symbol?: unknown;
          targetPrice?: unknown;
        };

        if (typeof target.symbol !== "string" || typeof target.targetPrice !== "number") {
          return items;
        }

        if (!Number.isFinite(target.targetPrice) || target.targetPrice < 0) {
          return items;
        }

        items.push({
          symbol: normalizeSymbol(target.symbol),
          targetPrice: target.targetPrice
        });

        return items;
      }, [])
    : [];

  replaceProjectionTargets(symbols, targets);

  return NextResponse.json({
    success: true,
    savedTargets: targets.length
  });
}
