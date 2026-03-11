import { HoldingsWorkspace } from "@/components/holdings-workspace";
import { PageIntro } from "@/components/page-intro";
import { RefreshPricesButton } from "@/components/refresh-prices-button";
import { listHoldings } from "@/lib/holdings";
import { getQuoteProviderLabel } from "@/lib/market-data";
import { getPortfolioSnapshot, getRefreshQueueSymbols } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

export default function HoldingsPage() {
  const holdings = listHoldings();
  const snapshot = getPortfolioSnapshot(holdings);
  const refreshQueue = getRefreshQueueSymbols(holdings);
  const quoteProvider = getQuoteProviderLabel();

  return (
    <div className="page-content">
      <PageIntro
        eyebrow="Holdings"
        title="Holdings"
        actions={
          <RefreshPricesButton
            compact
            disabled={!holdings.length}
            lastRefreshAt={snapshot.lastRefreshedAt}
            providerLabel={quoteProvider}
            symbols={refreshQueue}
          />
        }
      />

      <HoldingsWorkspace holdings={holdings} />
    </div>
  );
}
