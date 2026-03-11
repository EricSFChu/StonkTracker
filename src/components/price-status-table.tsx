import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { ACCOUNT_TYPE_LABELS, type Holding } from "@/lib/types";

type PriceStatusTableProps = {
  holdings: Holding[];
};

function currentValue(holding: Holding) {
  if (holding.lastPrice !== null) {
    return holding.lastPrice * holding.quantity;
  }

  if (holding.costBasis !== null) {
    return holding.costBasis * holding.quantity;
  }

  return null;
}

export function PriceStatusTable({
  holdings
}: PriceStatusTableProps) {
  if (!holdings.length) {
    return (
      <div className="empty-state">
        <h3>No holdings saved</h3>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Account</th>
            <th>Quantity</th>
            <th>Last price</th>
            <th>Value</th>
            <th>Updated</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => {
            const value = currentValue(holding);
            const currency = holding.currency ?? "USD";

            return (
              <tr key={holding.id}>
                <td>
                  <strong>{holding.symbol}</strong>
                  {holding.name ? <span>{holding.name}</span> : null}
                </td>
                <td>{ACCOUNT_TYPE_LABELS[holding.accountType]}</td>
                <td>{formatNumber(holding.quantity)}</td>
                <td>
                  {holding.lastPrice !== null
                    ? formatCurrency(holding.lastPrice, currency)
                    : "No quote"}
                </td>
                <td>{value !== null ? formatCurrency(value, currency) : "N/A"}</td>
                <td>{formatDateTime(holding.lastPriceUpdatedAt)}</td>
                <td>
                  <span
                    className={`status-chip${holding.lastPrice !== null ? " live" : " stale"}`}
                  >
                    {holding.lastPrice !== null ? "Quoted" : "Missing"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
