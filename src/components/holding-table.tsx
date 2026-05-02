"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { createHoldingAction, deleteHoldingAction, updateHoldingAction } from "@/app/actions";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, type Holding } from "@/lib/types";

type HoldingTableProps = {
  holdings: Holding[];
  adding?: boolean;
  editing?: boolean;
  onCancelAdd?: () => void;
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

export function HoldingTable({
  holdings,
  adding = false,
  editing = false,
  onCancelAdd
}: HoldingTableProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);
  const [sortState, setSortState] = useState<SortState>({
    key: "value",
    direction: "desc"
  });

  useEffect(() => {
    setModalRoot(document.body);
  }, []);

  useEffect(() => {
    if (confirmDeleteId === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setConfirmDeleteId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmDeleteId]);

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

  if (!holdings.length && !editing) {
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
    const createFormId = "holding-create";
    const deleteCandidate = confirmDeleteId
      ? holdings.find((holding) => holding.id === confirmDeleteId) ?? null
      : null;

    return (
      <>
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

            {adding ? (
              <div className="holdings-editor-row holdings-editor-row-new">
                <form
                  id={createFormId}
                  action={async (formData) => {
                    await createHoldingAction(formData);
                    onCancelAdd?.();
                  }}
                  className="holdings-editor-update"
                >
                  <label className="field compact editor-cell">
                    <span className="sr-only">Symbol</span>
                    <input
                      type="text"
                      name="symbol"
                      required
                      placeholder="AAPL"
                      autoComplete="off"
                      autoFocus
                    />
                  </label>

                  <label className="field compact editor-cell">
                    <span className="sr-only">Name</span>
                    <input type="text" name="name" placeholder="Apple Inc." autoComplete="off" />
                  </label>

                  <label className="field compact editor-cell">
                    <span className="sr-only">Account type</span>
                    <select name="accountType" defaultValue="individual">
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
                      required
                      placeholder="10"
                    />
                  </label>

                  <label className="field compact editor-cell">
                    <span className="sr-only">Cost basis</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="costBasis"
                      placeholder="Optional"
                    />
                  </label>

                  <div className="readonly-cell muted editor-cell">New</div>
                  <div className="readonly-cell muted editor-cell">Pending</div>
                </form>

                <div className="row-actions editor-cell">
                  <button className="button" type="submit" form={createFormId}>
                    Add
                  </button>
                  <button className="button ghost" type="button" onClick={onCancelAdd}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {!sortedHoldings.length && !adding ? (
              <div className="empty-state compact">
                <h3>No holdings yet</h3>
              </div>
            ) : null}

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
                    <button
                      className="button danger"
                      type="button"
                      onClick={() => setConfirmDeleteId(holding.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {deleteCandidate && modalRoot
          ? createPortal(
              <div className="modal-backdrop" onClick={() => setConfirmDeleteId(null)}>
                <div
                  className="modal-panel modal-panel-confirm"
                  onClick={(event) => event.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="delete-holding-title"
                >
                  <div className="modal-header">
                    <div>
                      <p className="eyebrow">Delete holding</p>
                      <h2 id="delete-holding-title">Are you sure?</h2>
                    </div>
                  </div>
                  <p className="modal-copy">
                    Delete {deleteCandidate.symbol}
                    {deleteCandidate.name ? ` (${deleteCandidate.name})` : ""} from your portfolio?
                  </p>
                  <form
                    action={async (formData) => {
                      await deleteHoldingAction(formData);
                      setConfirmDeleteId(null);
                    }}
                    className="modal-actions modal-actions-confirm"
                  >
                    <input type="hidden" name="id" value={deleteCandidate.id} />
                    <button className="button danger" type="submit">
                      Delete holding
                    </button>
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              </div>,
              modalRoot
            )
          : null}
      </>
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
