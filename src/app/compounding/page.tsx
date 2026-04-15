import { ProjectionChart } from "@/components/projection-chart";
import { PageIntro } from "@/components/page-intro";
import { getCompoundingSettings } from "@/lib/compounding-settings";
import { formatCurrency } from "@/lib/format";
import { listHoldings } from "@/lib/holdings";
import { getPortfolioSnapshot } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

export default function CompoundingPage() {
  const holdings = listHoldings();
  const snapshot = getPortfolioSnapshot(holdings);
  const compoundingSettings = getCompoundingSettings();
  const baseTenYearProjection = snapshot.totalValue * Math.pow(1.08, 10);

  return (
    <div className="page-content">
      <PageIntro
        eyebrow="Compounding"
        title="Compounding"
        description="Project compound growth across your current portfolio value with yearly capital adds."
      />

      <section className="mini-stat-grid wide">
        <article className="callout">
          <span>Starting value</span>
          <strong>{formatCurrency(snapshot.totalValue)}</strong>
          <small>Uses latest stored quotes or cost basis fallback.</small>
        </article>
        <article className="callout">
          <span>10-year at 8%</span>
          <strong>{formatCurrency(baseTenYearProjection)}</strong>
          <small>Reference scenario before you change the controls.</small>
        </article>
        <article className="callout">
          <span>Quoted positions</span>
          <strong>{snapshot.pricedPositions}</strong>
          <small>{snapshot.unpricedPositions} positions still rely on fallback values.</small>
        </article>
      </section>

      <ProjectionChart
        startingValue={snapshot.totalValue}
        initialSettings={compoundingSettings}
      />
    </div>
  );
}
