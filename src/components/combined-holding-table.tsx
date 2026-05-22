"use client";

import { useMemo, useState } from "react";

import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { getCombinedHoldings, type CombinedHolding } from "@/lib/portfolio";
import type { Holding } from "@/lib/types";

type CombinedHoldingTableProps = {
  holdings: Holding[];
};

type SortKey =
  | "symbol"
  | "name"
  | "quantity"
  | "costBasis"
  | "currentPrice"
  | "plOpen"
  | "marketValue"
  | "weight";

type SortState = {
  key: SortKey | null;
  direction: "asc" | "desc";
};

function compareSortValues(left: string | number | null, right: string | number | null) {
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

function formatWeight(value: number) {
  return `${value.toFixed(2)}%`;
}

function getSortValue(row: CombinedHolding, key: SortKey) {
  switch (key) {
    case "symbol":
      return row.symbol;
    case "name":
      return row.name;
    case "quantity":
      return row.quantity;
    case "costBasis":
      return row.costBasis;
    case "currentPrice":
      return row.currentPrice;
    case "plOpen":
      return row.plOpen;
    case "marketValue":
      return row.marketValue;
    case "weight":
      return row.weight;
    default:
      return null;
  }
}

export function CombinedHoldingTable({ holdings }: CombinedHoldingTableProps) {
  const [sortState, setSortState] = useState<SortState>({
    key: "marketValue",
    direction: "desc"
  });

  const combinedHoldings = useMemo(() => {
    return getCombinedHoldings(holdings)
      .sort((left, right) => {
        if (!sortState.key) {
          return 0;
        }

        const comparison = compareSortValues(
          getSortValue(left, sortState.key),
          getSortValue(right, sortState.key)
        );

        return sortState.direction === "asc" ? comparison : -comparison;
      });
  }, [holdings, sortState]);

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
        key: "marketValue",
        direction: "desc"
      };
    });
  }

  function sortLabel(label: string, key: SortKey) {
    const isActive = sortState.key === key;

    return (
      <button
        className={`sort-button${isActive ? " active" : ""}`}
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

  return (
    <div className="table-shell">
      <table className="holdings-table holdings-summary-table">
        <thead>
          <tr>
            <th aria-sort={sortState.key === "symbol" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("Symbol", "symbol")}
            </th>
            <th aria-sort={sortState.key === "name" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("Name", "name")}
            </th>
            <th aria-sort={sortState.key === "quantity" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("Quantity", "quantity")}
            </th>
            <th aria-sort={sortState.key === "costBasis" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("Cost basis", "costBasis")}
            </th>
            <th aria-sort={sortState.key === "currentPrice" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("Price", "currentPrice")}
            </th>
            <th aria-sort={sortState.key === "plOpen" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("P/L Open", "plOpen")}
            </th>
            <th aria-sort={sortState.key === "marketValue" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("Value", "marketValue")}
            </th>
            <th aria-sort={sortState.key === "weight" ? (sortState.direction === "asc" ? "ascending" : "descending") : "none"}>
              {sortLabel("Weight", "weight")}
            </th>
          </tr>
        </thead>
        <tbody>
          {combinedHoldings.map((holding) => (
            <tr key={holding.symbol}>
              <td>
                <strong>{holding.symbol}</strong>
              </td>
              <td>{holding.name ?? "—"}</td>
              <td>{formatNumber(holding.quantity)}</td>
              <td>{holding.costBasis !== null ? formatCurrency(holding.costBasis) : "—"}</td>
              <td>
                {holding.currentPrice !== null ? formatCurrency(holding.currentPrice) : "—"}
              </td>
              <td>{holding.plOpen !== null ? formatPercent(holding.plOpen) : "—"}</td>
              <td>{formatCurrency(holding.marketValue)}</td>
              <td>{formatWeight(holding.weight)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
