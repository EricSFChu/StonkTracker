import assert from "node:assert/strict";
import test from "node:test";

import {
  getCombinedHoldings,
  getHoldingCostValue,
  getHoldingMarketValue,
  getHoldingMarketValueOrZero,
  getHoldingUnitPrice,
  getPortfolioSnapshot
} from "../src/lib/portfolio.ts";
import type { AccountType, Holding } from "../src/lib/types.ts";

function holding(overrides: Partial<Holding>): Holding {
  return {
    id: overrides.id ?? 1,
    symbol: overrides.symbol ?? "AAPL",
    name: overrides.name ?? null,
    accountType: overrides.accountType ?? ("individual" as AccountType),
    quantity: overrides.quantity ?? 1,
    costBasis: overrides.costBasis ?? null,
    lastPrice: overrides.lastPrice ?? null,
    currency: overrides.currency ?? "USD",
    lastPriceUpdatedAt: overrides.lastPriceUpdatedAt ?? null,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z"
  };
}

test("holding market value prefers last quote, then cost basis, then null", () => {
  assert.equal(
    getHoldingUnitPrice(holding({ quantity: 3, lastPrice: 20, costBasis: 10 })),
    20
  );
  assert.equal(
    getHoldingMarketValue(holding({ quantity: 3, lastPrice: 20, costBasis: 10 })),
    60
  );
  assert.equal(getHoldingUnitPrice(holding({ quantity: 3, costBasis: 10 })), 10);
  assert.equal(getHoldingMarketValue(holding({ quantity: 3, costBasis: 10 })), 30);
  assert.equal(getHoldingUnitPrice(holding({ quantity: 3 })), null);
  assert.equal(getHoldingMarketValue(holding({ quantity: 3 })), null);
  assert.equal(getHoldingMarketValueOrZero(holding({ quantity: 3 })), 0);
});

test("holding cost value is quantity times cost basis when present", () => {
  assert.equal(getHoldingCostValue(holding({ quantity: 4, costBasis: 12.5 })), 50);
  assert.equal(getHoldingCostValue(holding({ quantity: 4, costBasis: null })), null);
});

test("portfolio snapshot totals use quote-or-cost-basis market values", () => {
  const snapshot = getPortfolioSnapshot([
    holding({
      id: 1,
      symbol: "AAPL",
      quantity: 2,
      costBasis: 100,
      lastPrice: 125,
      accountType: "individual",
      lastPriceUpdatedAt: "2026-01-02T00:00:00.000Z"
    }),
    holding({
      id: 2,
      symbol: "BTC-USD",
      quantity: 1.5,
      costBasis: 20_000,
      accountType: "crypto"
    }),
    holding({
      id: 3,
      symbol: "MSFT",
      quantity: 3,
      accountType: "roth_ira"
    })
  ]);

  assert.equal(snapshot.totalValue, 30_250);
  assert.equal(snapshot.totalCost, 30_200);
  assert.equal(snapshot.unrealizedGain, 50);
  assert.equal(snapshot.pricedPositions, 1);
  assert.equal(snapshot.unpricedPositions, 2);
  assert.deepEqual(snapshot.accountAllocation, [
    { accountType: "crypto", value: 30_000 },
    { accountType: "individual", value: 250 }
  ]);
  assert.deepEqual(snapshot.assetAllocation, [
    { symbol: "BTC-USD", label: "BTC", value: 30_000, quantity: 1.5 },
    { symbol: "AAPL", label: "AAPL", value: 250, quantity: 2 }
  ]);
});

test("combined holdings centralize weighted cost basis, market value, P/L, and weight", () => {
  const rows = getCombinedHoldings([
    holding({
      id: 1,
      symbol: "AAPL",
      name: "Apple",
      quantity: 2,
      costBasis: 100,
      lastPrice: 150
    }),
    holding({
      id: 2,
      symbol: "AAPL",
      quantity: 1,
      costBasis: 120,
      lastPrice: 150
    }),
    holding({
      id: 3,
      symbol: "TSLA",
      quantity: 4,
      costBasis: 25
    })
  ]);

  assert.deepEqual(rows, [
    {
      symbol: "AAPL",
      name: "Apple",
      quantity: 3,
      costBasis: 320 / 3,
      currentPrice: 150,
      plOpen: ((450 - 320) / 320) * 100,
      marketValue: 450,
      weight: (450 / 550) * 100
    },
    {
      symbol: "TSLA",
      name: null,
      quantity: 4,
      costBasis: 25,
      currentPrice: 25,
      plOpen: 0,
      marketValue: 100,
      weight: (100 / 550) * 100
    }
  ]);
});

test("combined holdings mark cost basis and P/L incomplete if any row lacks cost basis", () => {
  const rows = getCombinedHoldings([
    holding({
      id: 1,
      symbol: "AAPL",
      quantity: 2,
      costBasis: 100,
      lastPrice: 150
    }),
    holding({
      id: 2,
      symbol: "AAPL",
      quantity: 1,
      costBasis: null,
      lastPrice: 150
    })
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].costBasis, null);
  assert.equal(rows[0].plOpen, null);
  assert.equal(rows[0].marketValue, 450);
  assert.equal(rows[0].currentPrice, 150);
  assert.equal(rows[0].weight, 100);
});
