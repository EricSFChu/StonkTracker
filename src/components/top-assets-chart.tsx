"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  LabelList,
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

const GOLD_POSITION_THRESHOLD = 100_000;
const DEFAULT_BAR_FILL = "#2f7df6";
const GOLD_BAR_FILL = "#f7b801";

type AssetTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: PortfolioAssetBreakdown;
  }>;
};

type RankChangeLabelProps = {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  value?: number | string;
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

function RankChangeLabel({ x, y, width, value }: RankChangeLabelProps) {
  if (typeof value !== "number" || value === 0) {
    return null;
  }

  const xValue = typeof x === "number" ? x : Number(x ?? 0);
  const yValue = typeof y === "number" ? y : Number(y ?? 0);
  const widthValue = typeof width === "number" ? width : Number(width ?? 0);

  if (!Number.isFinite(xValue) || !Number.isFinite(yValue) || !Number.isFinite(widthValue)) {
    return null;
  }

  return (
    <text
      x={xValue + widthValue / 2}
      y={yValue - 8}
      textAnchor="middle"
      fill={value > 0 ? "#24c98b" : "#ff4d6d"}
      fontSize={13}
      fontWeight={800}
    >
      {value > 0 ? `+${value}` : value}
    </text>
  );
}

function buildAxisTicks(maxValue: number, step: number) {
  const ceiling = Math.max(step, Math.ceil(maxValue / step) * step);

  return Array.from({ length: Math.floor(ceiling / step) + 1 }, (_, index) => index * step);
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
    const axisTicks = buildAxisTicks(
      chartData.reduce((largest, entry) => Math.max(largest, entry.value), 0),
      25_000
    );

    return (
      <ResponsiveContainer width="100%" height={large ? 460 : 280}>
        <BarChart
          data={chartData}
          margin={
            large
              ? {
                  top: 28,
                  right: 12,
                  bottom: 24,
                  left: 20
                }
              : {
                  top: 28,
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
            textAnchor="middle"
            height={large ? 42 : 30}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={92}
            tickMargin={10}
            domain={[0, axisTicks[axisTicks.length - 1] ?? 25_000]}
            ticks={axisTicks}
            tickFormatter={(value: number) => formatCurrency(value)}
          />
          <Tooltip content={<AssetTooltip />} />
          <Bar dataKey="value" radius={[14, 14, 0, 0]} fill={DEFAULT_BAR_FILL}>
            {chartData.map((entry) => (
              <Cell
                key={entry.symbol}
                fill={entry.value > GOLD_POSITION_THRESHOLD ? GOLD_BAR_FILL : DEFAULT_BAR_FILL}
              />
            ))}
            <LabelList dataKey="rankChange" content={<RankChangeLabel />} />
          </Bar>
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
