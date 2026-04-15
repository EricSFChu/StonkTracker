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

function holdingValue(holding: Holding) {
  if (holding.lastPrice !== null) {
    return holding.lastPrice * holding.quantity;
  }

  if (holding.costBasis !== null) {
    return holding.costBasis * holding.quantity;
  }

  return 0;
}

function costTotal(holding: Holding) {
  if (holding.costBasis === null) {
    return 0;
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
    const currentValue = holdingValue(holding);
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

export function getPortfolioSnapshot(holdings: Holding[]) {
  const totalValue = holdings.reduce((sum, holding) => sum + holdingValue(holding), 0);
  const totalCost = holdings.reduce((sum, holding) => sum + costTotal(holding), 0);
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
    const value = holdingValue(holding);
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
