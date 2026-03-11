"use client";

import { useMemo, useState } from "react";

import { deleteHoldingAction, updateHoldingAction } from "@/app/actions";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, type Holding } from "@/lib/types";

type HoldingTableProps = {
  holdings: Holding[];
  editing?: boolean;
};

type SortKey =
  | "symbol"
  | "name"
  | "accountType"
  | "quantity"
  | "costBasis"
  | "lastPrice"
  | "value"
  | "updated";

type SortState = {
  key: SortKey | null;
  direction: "asc" | "desc";
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

function compareSortValues(
  left: string | number | null,
  right: string | number | null
) {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function getSortValue(holding: Holding, key: SortKey) {
  switch (key) {
    case "symbol":
      return holding.symbol;
    case "name":
      return holding.name;
    case "accountType":
      return ACCOUNT_TYPE_LABELS[holding.accountType];
    case "quantity":
      return holding.quantity;
    case "costBasis":
      return holding.costBasis;
    case "lastPrice":
      return holding.lastPrice;
    case "value":
      return marketValue(holding);
    case "updated":
      return holding.lastPriceUpdatedAt ? new Date(holding.lastPriceUpdatedAt).getTime() : null;
    default:
      return null;
  }
}

export function HoldingTable({ holdings, editing = false }: HoldingTableProps) {
  const [sortState, setSortState] = useState<SortState>({
    key: null,
    direction: "asc"
  });

  const sortedHoldings = useMemo(() => {
    const activeSortKey = sortState.key;

    if (!activeSortKey) {
      return holdings;
    }

    return holdings
      .map((holding, index) => ({
        holding,
        index
      }))
      .sort((left, right) => {
        const comparison = compareSortValues(
          getSortValue(left.holding, activeSortKey),
          getSortValue(right.holding, activeSortKey)
        );

        if (comparison !== 0) {
          return sortState.direction === "asc" ? comparison : -comparison;
        }

        return left.index - right.index;
      })
      .map((entry) => entry.holding);
  }, [holdings, sortState]);

  if (!holdings.length) {
    return (
      <div className="empty-state">
        <h3>No holdings yet</h3>
      </div>
    );
  }

  function toggleSort(key: SortKey) {
    setSortState((current) => {
      if (current.key !== key) {
        return {
          key,
          direction: "asc"
        };
      }

      if (current.direction === "asc") {
        return {
          key,
          direction: "desc"
        };
      }

      return {
        key: null,
        direction: "asc"
      };
    });
  }

  function sortLabel(label: string, key: SortKey, className?: string) {
    const isActive = sortState.key === key;

    return (
      <button
        className={`sort-button${isActive ? " active" : ""}${className ? ` ${className}` : ""}`}
        type="button"
        onClick={() => toggleSort(key)}
      >
        <span className="sort-indicator" aria-hidden="true">
          <span
            className={`sort-chevron up${isActive && sortState.direction === "asc" ? " active" : ""}`}
          />
          <span
            className={`sort-chevron down${isActive && sortState.direction === "desc" ? " active" : ""}`}
          />
        </span>
        <span>{label}</span>
      </button>
    );
  }

  if (editing) {
    return (
      <div className="edit-shell">
        <div className="holdings-editor">
          <div className="holdings-editor-header">
            <div className="editor-header-cell">{sortLabel("Symbol", "symbol")}</div>
            <div className="editor-header-cell">{sortLabel("Name", "name")}</div>
            <div className="editor-header-cell">{sortLabel("Account", "accountType")}</div>
            <div className="editor-header-cell">{sortLabel("Quantity", "quantity")}</div>
            <div className="editor-header-cell">{sortLabel("Cost basis", "costBasis")}</div>
            <div className="editor-header-cell">{sortLabel("Last price", "lastPrice")}</div>
            <div className="editor-header-cell">{sortLabel("Value", "value")}</div>
            <div className="editor-header-cell editor-header-actions">Actions</div>
          </div>

          {sortedHoldings.map((holding) => {
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
                    <select
                      name="accountType"
                      defaultValue={holding.accountType}
                      onChange={(event) => event.currentTarget.form?.requestSubmit()}
                    >
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
            <th aria-sort={sortState.key === "symbol" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("Symbol", "symbol")}
            </th>
            <th aria-sort={sortState.key === "name" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("Name", "name")}
            </th>
            <th aria-sort={sortState.key === "accountType" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("Account", "accountType")}
            </th>
            <th aria-sort={sortState.key === "quantity" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("Quantity", "quantity")}
            </th>
            <th aria-sort={sortState.key === "costBasis" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("Cost basis", "costBasis")}
            </th>
            <th aria-sort={sortState.key === "lastPrice" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("Last price", "lastPrice")}
            </th>
            <th aria-sort={sortState.key === "value" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("Value", "value")}
            </th>
            <th aria-sort={sortState.key === "updated" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("Updated", "updated")}
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {sortedHoldings.map((holding) => {
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
