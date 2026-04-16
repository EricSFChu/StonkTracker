import { getCompoundingSettings } from "@/lib/compounding-settings";
import { getCompoundingSummary } from "@/lib/compounding";
import { listHoldings } from "@/lib/holdings";
import { getPortfolioSnapshot } from "@/lib/portfolio";
import { ACCOUNT_TYPE_LABELS, type Holding } from "@/lib/types";

export type ReportHoldingRow = {
  symbol: string;
  name: string | null;
  accountLabel: string;
  quantity: number;
  currentPrice: number | null;
  marketValue: number;
  priceSource: "quote" | "cost_basis" | "unavailable";
};

export type PortfolioReportData = {
  generatedAt: string;
  holdings: ReportHoldingRow[];
  snapshot: ReturnType<typeof getPortfolioSnapshot>;
  compoundingSummary: ReturnType<typeof getCompoundingSummary>;
};

function getHoldingUnitPrice(holding: Holding) {
  if (holding.lastPrice !== null) {
    return holding.lastPrice;
  }

  if (holding.costBasis !== null) {
    return holding.costBasis;
  }

  return null;
}

function getHoldingMarketValue(holding: Holding) {
  const unitPrice = getHoldingUnitPrice(holding);
  return unitPrice !== null ? unitPrice * holding.quantity : 0;
}

function getPriceSource(holding: Holding): ReportHoldingRow["priceSource"] {
  if (holding.lastPrice !== null) {
    return "quote";
  }

  if (holding.costBasis !== null) {
    return "cost_basis";
  }

  return "unavailable";
}

export function getPortfolioReportData(): PortfolioReportData {
  const holdings = listHoldings();
  const snapshot = getPortfolioSnapshot(holdings);
  const compoundingSettings = getCompoundingSettings();

  return {
    generatedAt: new Date().toISOString(),
    holdings: holdings
      .map((holding) => ({
        symbol: holding.symbol,
        name: holding.name,
        accountLabel: ACCOUNT_TYPE_LABELS[holding.accountType],
        quantity: holding.quantity,
        currentPrice: getHoldingUnitPrice(holding),
        marketValue: getHoldingMarketValue(holding),
        priceSource: getPriceSource(holding)
      }))
      .sort((left, right) => right.marketValue - left.marketValue),
    snapshot,
    compoundingSummary: getCompoundingSummary(snapshot.totalValue, compoundingSettings)
  };
}
