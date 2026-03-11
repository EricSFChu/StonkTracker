"use client";

import { deleteHoldingAction, updateHoldingAction } from "@/app/actions";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, type Holding } from "@/lib/types";

type HoldingTableProps = {
  holdings: Holding[];
  editing?: boolean;
};

function marketValue(holding: Holding) {
  if (holding.lastPrice !== null) {
    return holding.lastPrice * holding.quantity;
  }

  if (holding.costBasis !== null) {
    return holding.costBasis * holding.quantity;
  }

  return null;
}

export function HoldingTable({ holdings, editing = false }: HoldingTableProps) {
  if (!holdings.length) {
    return (
      <div className="empty-state">
        <h3>No holdings yet</h3>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="edit-shell">
        <div className="holdings-editor">
          <div className="holdings-editor-header">
            <div className="editor-header-cell">Symbol</div>
            <div className="editor-header-cell">Name</div>
            <div className="editor-header-cell">Account</div>
            <div className="editor-header-cell">Quantity</div>
            <div className="editor-header-cell">Cost basis</div>
            <div className="editor-header-cell">Last price</div>
            <div className="editor-header-cell">Value</div>
            <div className="editor-header-cell editor-header-actions">Actions</div>
          </div>

          {holdings.map((holding) => {
            const value = marketValue(holding);
            const currency = holding.currency ?? "USD";
            const updateFormId = `holding-update-${holding.id}`;
            const rowKey = [
              holding.id,
              holding.symbol,
              holding.name ?? "",
              holding.accountType,
              holding.quantity,
              holding.costBasis ?? "",
              holding.updatedAt
            ].join(":");

            return (
              <div key={rowKey} className="holdings-editor-row">
                <form
                  id={updateFormId}
                  action={updateHoldingAction}
                  className="holdings-editor-update"
                >
                  <input type="hidden" name="id" value={holding.id} />
                  <button className="editor-submit-proxy" type="submit" tabIndex={-1} aria-hidden="true">
                    Save
                  </button>

                  <label className="field compact editor-cell">
                    <span className="sr-only">Symbol</span>
                    <input type="text" name="symbol" defaultValue={holding.symbol} required />
                  </label>

                  <label className="field compact editor-cell">
                    <span className="sr-only">Name</span>
                    <input type="text" name="name" defaultValue={holding.name ?? ""} />
                  </label>

                  <label className="field compact editor-cell">
                    <span className="sr-only">Account type</span>
                    <select name="accountType" defaultValue={holding.accountType}>
                      {ACCOUNT_TYPES.map((accountType) => (
                        <option key={accountType} value={accountType}>
                          {ACCOUNT_TYPE_LABELS[accountType]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field compact editor-cell">
                    <span className="sr-only">Quantity</span>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      name="quantity"
                      defaultValue={holding.quantity}
                      required
                    />
                  </label>

                  <label className="field compact editor-cell">
                    <span className="sr-only">Cost basis</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="costBasis"
                      defaultValue={holding.costBasis ?? ""}
                    />
                  </label>

                  <div className="readonly-cell editor-cell">
                    {holding.lastPrice !== null
                      ? formatCurrency(holding.lastPrice, currency)
                      : "No quote"}
                  </div>

                  <div className="readonly-cell editor-cell">
                    {value !== null
                      ? formatCurrency(value, currency)
                      : formatNumber(holding.quantity)}
                  </div>
                </form>

                <div className="row-actions editor-cell">
                  <button className="button ghost" type="submit" form={updateFormId}>
                    Save
                  </button>
                  <form action={deleteHoldingAction}>
                    <input type="hidden" name="id" value={holding.id} />
                    <button className="button danger" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <table className="holdings-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Name</th>
            <th>Account</th>
            <th>Quantity</th>
            <th>Cost basis</th>
            <th>Last price</th>
            <th>Value</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => {
            const value = marketValue(holding);
            const currency = holding.currency ?? "USD";

            return (
              <tr key={holding.id}>
                <td>
                  <strong>{holding.symbol}</strong>
                </td>
                <td>{holding.name ?? "—"}</td>
                <td>{ACCOUNT_TYPE_LABELS[holding.accountType]}</td>
                <td>{formatNumber(holding.quantity)}</td>
                <td>
                  {holding.costBasis !== null ? formatCurrency(holding.costBasis, currency) : "—"}
                </td>
                <td>
                  {holding.lastPrice !== null
                    ? formatCurrency(holding.lastPrice, currency)
                    : "No quote"}
                </td>
                <td>{value !== null ? formatCurrency(value, currency) : "—"}</td>
                <td>{formatDateTime(holding.lastPriceUpdatedAt)}</td>
                <td />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
