"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatCurrency, formatPercent } from "@/lib/format";

type ProjectionChartProps = {
  startingValue: number;
};

export function ProjectionChart({
  startingValue
}: ProjectionChartProps) {
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(10);

  const projectionData = Array.from({ length: years + 1 }, (_, year) => ({
    year,
    projectedValue: startingValue * Math.pow(1 + rate / 100, year)
  }));

  return (
    <section className="panel chart-panel projection-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Projection</p>
          <h2>Forward value model</h2>
        </div>
      </div>

      <div className="projection-controls">
        <label className="field compact">
          <span>Annual return</span>
          <input
            type="range"
            min="0"
            max="120"
            step="0.5"
            value={rate}
            onChange={(event) => setRate(Number(event.target.value))}
          />
          <strong>{formatPercent(rate)}</strong>
        </label>

        <label className="field compact">
          <span>Years</span>
          <input
            type="range"
            min="1"
            max="60"
            step="1"
            value={years}
            onChange={(event) => setYears(Number(event.target.value))}
          />
          <strong>{years}</strong>
        </label>
      </div>

      <div className="projection-highlight">
        <div>
          <span>Starting value</span>
          <strong>{formatCurrency(startingValue)}</strong>
        </div>
        <div>
          <span>Projected value</span>
          <strong>
            {formatCurrency(projectionData[projectionData.length - 1]?.projectedValue ?? 0)}
          </strong>
        </div>
      </div>

      <div className="chart-shell projection-chart-shell">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={projectionData}
            margin={{
              top: 8,
              right: 8,
              bottom: 12,
              left: 8
            }}
          >
            <defs>
              <linearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff8c42" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#ff8c42" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(146, 170, 198, 0.12)" />
            <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={10} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCurrency(value)}
            />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Area
              type="monotone"
              dataKey="projectedValue"
              stroke="#ff8c42"
              strokeWidth={3}
              fill="url(#projectionFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
