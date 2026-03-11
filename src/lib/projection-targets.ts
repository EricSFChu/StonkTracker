import { getDb } from "@/lib/db";
import { normalizeSymbol } from "@/lib/holdings";

type ProjectionTargetRow = {
  symbol: string;
  target_price: number;
};

export type ProjectionTargetInput = {
  symbol: string;
  targetPrice: number;
};

export function listProjectionTargets(symbols: string[]) {
  const normalizedSymbols = Array.from(new Set(symbols.map(normalizeSymbol))).filter(Boolean);

  if (!normalizedSymbols.length) {
    return {} as Record<string, number>;
  }

  const placeholders = normalizedSymbols.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `
        SELECT symbol, target_price
        FROM projection_targets
        WHERE symbol IN (${placeholders})
      `
    )
    .all(...normalizedSymbols) as ProjectionTargetRow[];

  return Object.fromEntries(rows.map((row) => [row.symbol, row.target_price]));
}

export function replaceProjectionTargets(
  symbols: string[],
  targets: ProjectionTargetInput[]
) {
  const normalizedSymbols = Array.from(new Set(symbols.map(normalizeSymbol))).filter(Boolean);
  const allowedSymbols = new Set(normalizedSymbols);
  const normalizedTargets = targets
    .map((target) => ({
      symbol: normalizeSymbol(target.symbol),
      targetPrice: target.targetPrice
    }))
    .filter(
      (target, index, items) =>
        allowedSymbols.has(target.symbol) &&
        Number.isFinite(target.targetPrice) &&
        target.targetPrice >= 0 &&
        items.findIndex((item) => item.symbol === target.symbol) === index
    );

  const db = getDb();
  const deleteStatement = db.prepare("DELETE FROM projection_targets WHERE symbol = ?");
  const upsertStatement = db.prepare(`
    INSERT INTO projection_targets (symbol, target_price, updated_at)
    VALUES (@symbol, @targetPrice, CURRENT_TIMESTAMP)
    ON CONFLICT(symbol) DO UPDATE SET
      target_price = excluded.target_price,
      updated_at = CURRENT_TIMESTAMP
  `);

  const transaction = db.transaction(() => {
    for (const symbol of normalizedSymbols) {
      deleteStatement.run(symbol);
    }

    for (const target of normalizedTargets) {
      upsertStatement.run(target);
    }
  });

  transaction();
}
