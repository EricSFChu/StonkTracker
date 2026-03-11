import { formatCurrency, formatDateTime } from "@/lib/format";
import { getPortfolioSnapshot } from "@/lib/portfolio";

type PortfolioSummaryCardsProps = {
  snapshot: ReturnType<typeof getPortfolioSnapshot>;
};

export function PortfolioSummaryCards({
  snapshot
}: PortfolioSummaryCardsProps) {
  return (
    <section className="summary-grid">
      <article className="summary-card">
        <span>Total portfolio value</span>
        <strong>{formatCurrency(snapshot.totalValue)}</strong>
      </article>

      <article className="summary-card">
        <span>Total cost basis</span>
        <strong>{formatCurrency(snapshot.totalCost)}</strong>
      </article>

      <article className="summary-card">
        <span>Unrealized gain</span>
        <strong>{formatCurrency(snapshot.unrealizedGain)}</strong>
      </article>

      <article className="summary-card">
        <span>Last market refresh</span>
        <strong>{formatDateTime(snapshot.lastRefreshedAt)}</strong>
        <small>{snapshot.pricedPositions} priced</small>
      </article>
    </section>
  );
}
