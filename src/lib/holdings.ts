import { getDb } from "@/lib/db";
import type { AccountType, Holding, QuoteUpdate } from "@/lib/types";

type HoldingRow = {
  id: number;
  symbol: string;
  name: string | null;
  account_type: AccountType;
  quantity: number;
  cost_basis: number | null;
  last_price: number | null;
  currency: string | null;
  last_price_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

type HoldingInput = {
  symbol: string;
  name: string | null;
  accountType: AccountType;
  quantity: number;
  costBasis: number | null;
};

function toHolding(row: HoldingRow): Holding {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    accountType: row.account_type,
    quantity: row.quantity,
    costBasis: row.cost_basis,
    lastPrice: row.last_price,
    currency: row.currency,
    lastPriceUpdatedAt: row.last_price_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

export function listHoldings() {
  const db = getDb();
  const rows = db
    .prepare(
      `
        SELECT
          id,
          symbol,
          name,
          account_type,
          quantity,
          cost_basis,
          last_price,
          currency,
          last_price_updated_at,
          created_at,
          updated_at
        FROM holdings
        ORDER BY account_type, symbol, id
      `
    )
    .all() as HoldingRow[];

  return rows.map(toHolding);
}

export function createHolding(input: HoldingInput) {
  const db = getDb();
  const statement = db.prepare(
    `
      INSERT INTO holdings (symbol, name, account_type, quantity, cost_basis)
      VALUES (@symbol, @name, @accountType, @quantity, @costBasis)
    `
  );

  statement.run({
    symbol: normalizeSymbol(input.symbol),
    name: input.name?.trim() || null,
    accountType: input.accountType,
    quantity: input.quantity,
    costBasis: input.costBasis
  });
}

export function updateHolding(id: number, input: HoldingInput) {
  const db = getDb();
  const statement = db.prepare(
    `
      UPDATE holdings
      SET
        symbol = @symbol,
        name = @name,
        account_type = @accountType,
        quantity = @quantity,
        cost_basis = @costBasis,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `
  );

  statement.run({
    id,
    symbol: normalizeSymbol(input.symbol),
    name: input.name?.trim() || null,
    accountType: input.accountType,
    quantity: input.quantity,
    costBasis: input.costBasis
  });
}

export function deleteHolding(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM holdings WHERE id = ?").run(id);
}

export function getDistinctSymbols() {
  const db = getDb();
  const rows = db
    .prepare(
      `
        SELECT DISTINCT symbol
        FROM holdings
        WHERE TRIM(symbol) <> ''
        ORDER BY symbol
      `
    )
    .all() as Array<{ symbol: string }>;

  return rows.map((row) => row.symbol);
}

export function applyQuoteUpdates(quotes: QuoteUpdate[]) {
  const db = getDb();
  const updateStatement = db.prepare(
    `
      UPDATE holdings
      SET
        last_price = @price,
        currency = @currency,
        last_price_updated_at = @refreshedAt,
        name = CASE
          WHEN TRIM(COALESCE(name, '')) = '' AND TRIM(COALESCE(@name, '')) <> '' THEN @name
          ELSE name
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE symbol = @symbol
    `
  );

  const transaction = db.transaction((items: QuoteUpdate[]) => {
    for (const quote of items) {
      updateStatement.run(quote);
    }
  });

  transaction(quotes);
}
