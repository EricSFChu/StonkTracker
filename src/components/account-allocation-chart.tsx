"use client";

import { useEffect, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from "recharts";

import { formatCurrency } from "@/lib/format";
import { ACCOUNT_TYPE_LABELS } from "@/lib/types";

type AllocationDatum = {
  accountType: string;
  value: number;
};

type AssetAllocationDatum = {
  label: string;
  value: number;
};

type AccountAllocationChartProps = {
  accountData: AllocationDatum[];
  assetData: AssetAllocationDatum[];
};

const palette = ["#ff8c42", "#24c98b", "#2f7df6", "#f7b801", "#ff4d6d", "#7a5cff"];

type AllocationView = "accounts" | "assets";

type NormalizedAllocationDatum = {
  key: string;
  label: string;
  value: number;
};

function summarizeAllocation(data: NormalizedAllocationDatum[], maxItems: number) {
  if (data.length <= maxItems) {
    return data;
  }

  const visible = data.slice(0, maxItems - 1);
  const otherValue = data.slice(maxItems - 1).reduce((sum, entry) => sum + entry.value, 0);

  return [
    ...visible,
    {
      key: "other",
      label: "Other",
      value: otherValue
    }
  ];
}

export function AccountAllocationChart({ accountData, assetData }: AccountAllocationChartProps) {
  const [view, setView] = useState<AllocationView>("accounts");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const normalizedAccountData = accountData.map((entry) => ({
    key: entry.accountType,
    label: ACCOUNT_TYPE_LABELS[entry.accountType as keyof typeof ACCOUNT_TYPE_LABELS] ?? entry.accountType,
    value: entry.value
  }));

  const normalizedAssetData = assetData.map((entry) => ({
    key: entry.label,
    label: entry.label,
    value: entry.value
  }));

  const fullData = view === "accounts" ? normalizedAccountData : normalizedAssetData;
  const panelData = summarizeAllocation(fullData, view === "accounts" ? 8 : 6);
  const modalData = summarizeAllocation(fullData, view === "accounts" ? 8 : 12);

  function renderChart(data: NormalizedAllocationDatum[], large = false) {
    return (
      <ResponsiveContainer width="100%" height={large ? 420 : 280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={large ? 92 : 72}
            outerRadius={large ? 150 : 112}
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell key={entry.key} fill={palette[index % palette.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            labelFormatter={(label: string) => label}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  function renderLegend(data: NormalizedAllocationDatum[]) {
    return (
      <div className="legend-list">
        {data.map((entry, index) => (
          <div key={entry.key} className="legend-item">
            <span
              className="legend-swatch"
              style={{ backgroundColor: palette[index % palette.length] }}
            />
            <span>{entry.label}</span>
            <strong>{formatCurrency(entry.value)}</strong>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <section className="panel chart-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Allocation</p>
            <h2>{view === "accounts" ? "By account" : "By asset"}</h2>
          </div>
          <div className="segment-control" onClick={(event) => event.stopPropagation()}>
            <button
              className={`segment-button${view === "accounts" ? " active" : ""}`}
              type="button"
              onClick={() => setView("accounts")}
            >
              Accounts
            </button>
            <button
              className={`segment-button${view === "assets" ? " active" : ""}`}
              type="button"
              onClick={() => setView("assets")}
            >
              Assets
            </button>
          </div>
        </div>
        {fullData.length ? (
          <div
            className="allocation-panel-surface"
            role="button"
            tabIndex={0}
            onClick={() => setIsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setIsOpen(true);
              }
            }}
          >
            <div className="chart-shell">{renderChart(panelData)}</div>
            {renderLegend(panelData)}
          </div>
        ) : (
          <div className="empty-state compact">
            <h3>No allocation data yet</h3>
            <p>Add holdings and refresh prices to populate this chart.</p>
          </div>
        )}
      </section>

      {isOpen && fullData.length ? (
        <div className="modal-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="modal-panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Allocation details"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Allocation</p>
                <h2>{view === "accounts" ? "By account" : "By asset"}</h2>
              </div>
              <div className="modal-actions">
                <div className="segment-control">
                  <button
                    className={`segment-button${view === "accounts" ? " active" : ""}`}
                    type="button"
                    onClick={() => setView("accounts")}
                  >
                    Accounts
                  </button>
                  <button
                    className={`segment-button${view === "assets" ? " active" : ""}`}
                    type="button"
                    onClick={() => setView("assets")}
                  >
                    Assets
                  </button>
                </div>
                <button className="icon-button" type="button" onClick={() => setIsOpen(false)}>
                  Close
                </button>
              </div>
            </div>
            <div className="modal-body">
              <div className="modal-chart">{renderChart(modalData, true)}</div>
              <div className="modal-legend">{renderLegend(modalData)}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
