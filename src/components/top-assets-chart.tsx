"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatCurrency, formatNumber } from "@/lib/format";
import type { PortfolioAssetBreakdown } from "@/lib/portfolio";

type TopAssetsChartProps = {
  data: PortfolioAssetBreakdown[];
};

type AssetTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: PortfolioAssetBreakdown;
  }>;
};

function AssetTooltip({ active, payload }: AssetTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const entry = payload[0]?.payload;

  if (!entry) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{entry.label}</p>
      <p className="chart-tooltip-value">{formatCurrency(entry.value)}</p>
      <p className="chart-tooltip-meta">{formatNumber(entry.quantity)} shares</p>
    </div>
  );
}

export function TopAssetsChart({ data }: TopAssetsChartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelData = data.slice(0, 8);
  const modalChartData = data.slice(0, 12);

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

  function renderChart(chartData: PortfolioAssetBreakdown[], large = false) {
    return (
      <ResponsiveContainer width="100%" height={large ? 460 : 280}>
        <BarChart
          data={chartData}
          margin={
            large
              ? {
                  top: 8,
                  right: 12,
                  bottom: 24,
                  left: 20
                }
              : {
                  top: 8,
                  right: 8,
                  bottom: 0,
                  left: 20
                }
          }
        >
          <CartesianGrid
            vertical={false}
            stroke="rgba(146, 170, 198, 0.12)"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={large ? -28 : 0}
            textAnchor={large ? "end" : "middle"}
            height={large ? 64 : 30}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={92}
            tickMargin={10}
            tickFormatter={(value: number) => formatCurrency(value)}
          />
          <Tooltip content={<AssetTooltip />} />
          <Bar dataKey="value" radius={[14, 14, 0, 0]} fill="#2f7df6" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <>
      <section className="panel chart-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Concentration</p>
            <h2>Top positions</h2>
          </div>
        </div>

        {panelData.length ? (
          <div
            className="chart-panel-surface"
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
          </div>
        ) : (
          <div className="empty-state compact">
            <h3>No position data yet</h3>
            <p>Your largest holdings will appear here once positions are saved.</p>
          </div>
        )}
      </section>

      {isOpen && data.length ? (
        <div className="modal-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="modal-panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Top positions details"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Concentration</p>
                <h2>Top positions</h2>
              </div>
              <div className="modal-actions">
                <button className="icon-button" type="button" onClick={() => setIsOpen(false)}>
                  Close
                </button>
              </div>
            </div>
            <div className="modal-body modal-body-chart-only">
              <div className="modal-chart modal-chart-wide">{renderChart(modalChartData, true)}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
