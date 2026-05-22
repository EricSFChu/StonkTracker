import type { Holding } from "@/lib/types";

export type ProjectedAsset = {
  symbol: string;
  label: string;
  name: string | null;
  quantity: number;
  currentPrice: number;
  currentValue: number;
  currency: string;
  lastPriceUpdatedAt: string | null;
};

export type CombinedHolding = {
  symbol: string;
  name: string | null;
  quantity: number;
  costBasis: number | null;
  currentPrice: number | null;
  plOpen: number | null;
  marketValue: number;
  weight: number;
};

export function getHoldingUnitPrice(holding: Holding) {
  if (holding.lastPrice !== null) {
    return holding.lastPrice;
  }

  if (holding.costBasis !== null) {
    return holding.costBasis;
  }

  return null;
}

export function getHoldingMarketValue(holding: Holding) {
  const unitPrice = getHoldingUnitPrice(holding);
  return unitPrice !== null ? unitPrice * holding.quantity : null;
}

export function getHoldingMarketValueOrZero(holding: Holding) {
  return getHoldingMarketValue(holding) ?? 0;
}

export function getHoldingCostValue(holding: Holding) {
  if (holding.costBasis === null) {
    return null;
  }

  return holding.costBasis * holding.quantity;
}

function formatAssetLabel(symbol: string) {
  if (symbol.endsWith("-USD")) {
    return symbol.slice(0, -4);
  }

  return symbol;
}

export function getProjectedAssets(holdings: Holding[]): ProjectedAsset[] {
  const assetMap = new Map<
    string,
    {
      symbol: string;
      label: string;
      name: string | null;
      quantity: number;
      currentValue: number;
      currency: string;
      lastPriceUpdatedAt: string | null;
    }
  >();

  for (const holding of holdings) {
    const existing = assetMap.get(holding.symbol);
    const currentValue = getHoldingMarketValueOrZero(holding);
    const currency = holding.currency ?? "USD";

    if (!existing) {
      assetMap.set(holding.symbol, {
        symbol: holding.symbol,
        label: formatAssetLabel(holding.symbol),
        name: holding.name,
        quantity: holding.quantity,
        currentValue,
        currency,
        lastPriceUpdatedAt: holding.lastPriceUpdatedAt
      });
      continue;
    }

    existing.quantity += holding.quantity;
    existing.currentValue += currentValue;
    existing.name = existing.name ?? holding.name;
    existing.lastPriceUpdatedAt =
      existing.lastPriceUpdatedAt && holding.lastPriceUpdatedAt
        ? new Date(existing.lastPriceUpdatedAt) > new Date(holding.lastPriceUpdatedAt)
          ? existing.lastPriceUpdatedAt
          : holding.lastPriceUpdatedAt
        : existing.lastPriceUpdatedAt ?? holding.lastPriceUpdatedAt;
  }

  return Array.from(assetMap.values())
    .map((asset) => ({
      ...asset,
      currentPrice: asset.quantity > 0 ? asset.currentValue / asset.quantity : 0
    }))
    .sort((left, right) => right.currentValue - left.currentValue);
}

export function getRefreshQueueSymbols(holdings: Holding[]) {
  const symbolStaleness = new Map<string, number | null>();

  for (const holding of holdings) {
    const current = symbolStaleness.get(holding.symbol);
    const timestamp = holding.lastPriceUpdatedAt
      ? new Date(holding.lastPriceUpdatedAt).getTime()
      : null;

    if (current === undefined || timestamp === null) {
      symbolStaleness.set(holding.symbol, timestamp);
      continue;
    }

    if (current !== null && timestamp < current) {
      symbolStaleness.set(holding.symbol, timestamp);
    }
  }

  return Array.from(symbolStaleness.entries())
    .sort(([leftSymbol, leftTimestamp], [rightSymbol, rightTimestamp]) => {
      if (leftTimestamp === null && rightTimestamp !== null) {
        return -1;
      }

      if (leftTimestamp !== null && rightTimestamp === null) {
        return 1;
      }

      if (leftTimestamp === null && rightTimestamp === null) {
        return leftSymbol.localeCompare(rightSymbol);
      }

      if (leftTimestamp !== rightTimestamp) {
        return (leftTimestamp ?? 0) - (rightTimestamp ?? 0);
      }

      return leftSymbol.localeCompare(rightSymbol);
    })
    .map(([symbol]) => symbol);
}

export type PortfolioAssetBreakdown = {
  symbol: string;
  label: string;
  value: number;
  quantity: number;
};

export function getCombinedHoldings(holdings: Holding[]): CombinedHolding[] {
  const totalValue = holdings.reduce((sum, holding) => sum + getHoldingMarketValueOrZero(holding), 0);
  const assetMap = new Map<
    string,
    {
      symbol: string;
      name: string | null;
      quantity: number;
      costBasisTotal: number;
      costBasisQuantity: number;
      hasIncompleteCostBasis: boolean;
      currentPrice: number | null;
      marketValue: number;
      weight: number;
    }
  >();

  for (const holding of holdings) {
    const currentPrice = getHoldingUnitPrice(holding);
    const currentValue = getHoldingMarketValueOrZero(holding);
    const existing = assetMap.get(holding.symbol);
    const costBasisValue = getHoldingCostValue(holding);
    const costBasisTotal = costBasisValue ?? 0;
    const costBasisQuantity = costBasisValue !== null ? holding.quantity : 0;

    if (!existing) {
      assetMap.set(holding.symbol, {
        symbol: holding.symbol,
        name: holding.name,
        quantity: holding.quantity,
        costBasisTotal,
        costBasisQuantity,
        hasIncompleteCostBasis: holding.costBasis === null,
        currentPrice,
        marketValue: currentValue,
        weight: 0
      });
      continue;
    }

    existing.quantity += holding.quantity;
    existing.costBasisTotal += costBasisTotal;
    existing.costBasisQuantity += costBasisQuantity;
    existing.hasIncompleteCostBasis = existing.hasIncompleteCostBasis || holding.costBasis === null;
    existing.marketValue += currentValue;
    existing.name = existing.name ?? holding.name;
  }

  return Array.from(assetMap.values()).map((row) => ({
    symbol: row.symbol,
    name: row.name,
    quantity: row.quantity,
    costBasis:
      !row.hasIncompleteCostBasis && row.costBasisQuantity > 0
        ? row.costBasisTotal / row.costBasisQuantity
        : null,
    currentPrice: row.quantity > 0 ? row.marketValue / row.quantity : row.currentPrice,
    plOpen:
      !row.hasIncompleteCostBasis && row.costBasisTotal > 0
        ? ((row.marketValue - row.costBasisTotal) / row.costBasisTotal) * 100
        : null,
    marketValue: row.marketValue,
    weight: totalValue > 0 ? (row.marketValue / totalValue) * 100 : 0
  }));
}

export function getPortfolioSnapshot(holdings: Holding[]) {
  const totalValue = holdings.reduce((sum, holding) => sum + getHoldingMarketValueOrZero(holding), 0);
  const totalCost = holdings.reduce((sum, holding) => sum + (getHoldingCostValue(holding) ?? 0), 0);
  const pricedPositions = holdings.filter((holding) => holding.lastPrice !== null).length;

  const lastRefreshedAt = holdings.reduce<string | null>((latest, holding) => {
    if (!holding.lastPriceUpdatedAt) {
      return latest;
    }

    if (!latest || new Date(holding.lastPriceUpdatedAt) > new Date(latest)) {
      return holding.lastPriceUpdatedAt;
    }

    return latest;
  }, null);

  const allocationMap = new Map<string, number>();
  const assetMap = new Map<string, PortfolioAssetBreakdown>();

  for (const holding of holdings) {
    const value = getHoldingMarketValueOrZero(holding);
    allocationMap.set(holding.accountType, (allocationMap.get(holding.accountType) ?? 0) + value);

    const assetKey = holding.symbol;
    const current = assetMap.get(assetKey);
    assetMap.set(assetKey, {
      symbol: assetKey,
      label: formatAssetLabel(holding.symbol),
      value: (current?.value ?? 0) + value,
      quantity: (current?.quantity ?? 0) + holding.quantity
    });
  }

  const accountAllocation = Array.from(allocationMap.entries())
    .map(([accountType, value]) => ({
      accountType,
      value
    }))
    .filter((entry) => entry.value > 0)
    .sort((left, right) => right.value - left.value);

  const topAssets = Array.from(assetMap.values())
    .filter((entry) => entry.value > 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);

  const assetAllocation = Array.from(assetMap.values())
    .filter((entry) => entry.value > 0)
    .sort((left, right) => right.value - left.value);

  return {
    totalValue,
    totalCost,
    unrealizedGain: totalValue - totalCost,
    pricedPositions,
    unpricedPositions: holdings.length - pricedPositions,
    lastRefreshedAt,
    accountAllocation,
    assetAllocation,
    topAssets
  };
}
