"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatCurrency } from "@/lib/format";

type AssetDatum = {
  label: string;
  value: number;
};

type TopAssetsChartProps = {
  data: AssetDatum[];
};

export function TopAssetsChart({ data }: TopAssetsChartProps) {
  return (
    <section className="panel chart-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Concentration</p>
          <h2>Top positions</h2>
        </div>
      </div>

      {data.length ? (
        <div className="chart-shell">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data}
              margin={{
                top: 8,
                right: 8,
                bottom: 0,
                left: 20
              }}
            >
              <CartesianGrid vertical={false} stroke="rgba(146, 170, 198, 0.12)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={92}
                tickMargin={10}
                tickFormatter={(value: number) => formatCurrency(value)}
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="value" radius={[14, 14, 0, 0]} fill="#2f7df6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state compact">
          <h3>No position data yet</h3>
          <p>Your largest holdings will appear here once positions are saved.</p>
        </div>
      )}
    </section>
  );
}
