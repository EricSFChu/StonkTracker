import { AccountAllocationChart } from "@/components/account-allocation-chart";
import { TopAssetsChart } from "@/components/top-assets-chart";
import { PageIntro } from "@/components/page-intro";
import { PortfolioSummaryCards } from "@/components/portfolio-summary-cards";
import { listHoldings } from "@/lib/holdings";
import { getPortfolioSnapshot } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const holdings = listHoldings();
  const snapshot = getPortfolioSnapshot(holdings);

  return (
    <div className="page-content">
      <PageIntro eyebrow="Overview" title="Overview" />

      <PortfolioSummaryCards snapshot={snapshot} />

      <section className="chart-two-up">
        <AccountAllocationChart
          accountData={snapshot.accountAllocation}
          assetData={snapshot.assetAllocation}
        />
        <TopAssetsChart data={snapshot.assetAllocation} />
      </section>
    </div>
  );
}
