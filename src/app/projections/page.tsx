import { ProjectionChart } from "@/components/projection-chart";
import { TopAssetsChart } from "@/components/top-assets-chart";
import { PageIntro } from "@/components/page-intro";
import { formatCurrency } from "@/lib/format";
import { listHoldings } from "@/lib/holdings";
import { getPortfolioSnapshot } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

export default function ProjectionsPage() {
  const holdings = listHoldings();
  const snapshot = getPortfolioSnapshot(holdings);
  const baseTenYearProjection = snapshot.totalValue * Math.pow(1.08, 10);

  return (
    <div className="page-content">
      <PageIntro eyebrow="Projections" title="Projections" />

      <section className="mini-stat-grid wide">
        <article className="callout">
          <span>Starting value</span>
          <strong>{formatCurrency(snapshot.totalValue)}</strong>
          <small>Uses latest stored quotes or cost basis fallback.</small>
        </article>
        <article className="callout">
          <span>10-year at 8%</span>
          <strong>{formatCurrency(baseTenYearProjection)}</strong>
          <small>Reference scenario before you change the sliders.</small>
        </article>
        <article className="callout">
          <span>Quoted positions</span>
          <strong>{snapshot.pricedPositions}</strong>
          <small>{snapshot.unpricedPositions} positions still rely on fallback values.</small>
        </article>
      </section>

      <ProjectionChart startingValue={snapshot.totalValue} />

      <TopAssetsChart data={snapshot.topAssets} />
    </div>
  );
}
