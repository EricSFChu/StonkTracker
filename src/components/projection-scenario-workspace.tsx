"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatCurrency, formatNumber } from "@/lib/format";
import type { ProjectedAsset } from "@/lib/portfolio";

type ProjectionScenarioWorkspaceProps = {
  assets: ProjectedAsset[];
  initialTargets: Record<string, number>;
};

function formatPriceInput(value: number) {
  if (!Number.isFinite(value)) {
    return "";
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

function parseProjectedPrice(rawValue: string | undefined, currentPrice: number) {
  if (!rawValue || rawValue.trim() === "") {
    return currentPrice;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return currentPrice;
  }

  return parsed;
}

function buildInitialPriceInputs(
  assets: ProjectedAsset[],
  initialTargets: Record<string, number>
) {
  return Object.fromEntries(
    assets.map((asset) => [
      asset.symbol,
      formatPriceInput(initialTargets[asset.symbol] ?? asset.currentPrice)
    ])
  );
}

function buildProjectionPayload(
  assets: ProjectedAsset[],
  priceInputs: Record<string, string>
) {
  const targets = assets
    .map((asset) => {
      const targetPrice = parseProjectedPrice(priceInputs[asset.symbol], asset.currentPrice);

      return {
        symbol: asset.symbol,
        targetPrice
      };
    })
    .filter((target) => {
      const asset = assets.find((item) => item.symbol === target.symbol);
      return asset ? Math.abs(target.targetPrice - asset.currentPrice) > 0.000001 : false;
    });

  return {
    symbols: assets.map((asset) => asset.symbol),
    targets,
    signature: JSON.stringify(
      targets.map((target) => ({
        symbol: target.symbol,
        targetPrice: Number(target.targetPrice.toFixed(6))
      }))
    )
  };
}

export function ProjectionScenarioWorkspace({
  assets,
  initialTargets
}: ProjectionScenarioWorkspaceProps) {
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>(() =>
    buildInitialPriceInputs(assets, initialTargets)
  );
  const [persistedSignature, setPersistedSignature] = useState(() =>
    buildProjectionPayload(assets, buildInitialPriceInputs(assets, initialTargets)).signature
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const saveRequestId = useRef(0);

  useEffect(() => {
    const nextInputs = buildInitialPriceInputs(assets, initialTargets);
    setPriceInputs(nextInputs);
    setPersistedSignature(buildProjectionPayload(assets, nextInputs).signature);
    setSaveState("idle");
    setSaveMessage(null);
  }, [assets, initialTargets]);

  async function persistTargets(nextPriceInputs: Record<string, string>) {
    const payload = buildProjectionPayload(assets, nextPriceInputs);

    if (payload.signature === persistedSignature) {
      setSaveState("saved");
      setSaveMessage("Saved");
      return;
    }

    setSaveState("saving");
    setSaveMessage("Saving scenario...");

    const requestId = saveRequestId.current + 1;
    saveRequestId.current = requestId;

    try {
      const response = await fetch("/api/projections/targets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          symbols: payload.symbols,
          targets: payload.targets
        })
      });

      if (requestId !== saveRequestId.current) {
        return;
      }

      if (!response.ok) {
        setSaveState("error");
        setSaveMessage("Save failed");
        return;
      }

      setPersistedSignature(payload.signature);
      setSaveState("saved");
      setSaveMessage("Saved");
    } catch {
      if (requestId !== saveRequestId.current) {
        return;
      }

      setSaveState("error");
      setSaveMessage("Save failed");
    }
  }

  useEffect(() => {
    if (!assets.length) {
      return;
    }

    const payload = buildProjectionPayload(assets, priceInputs);
    if (payload.signature === persistedSignature) {
      return;
    }

    const timer = window.setTimeout(() => {
      void persistTargets(priceInputs);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [assets, persistedSignature, priceInputs]);

  const scenarioAssets = useMemo(
    () =>
      assets.map((asset) => {
        const projectedPrice = parseProjectedPrice(priceInputs[asset.symbol], asset.currentPrice);
        const projectedValue = projectedPrice * asset.quantity;
        const deltaValue = projectedValue - asset.currentValue;

        return {
          ...asset,
          projectedPrice,
          projectedValue,
          deltaValue
        };
      }),
    [assets, priceInputs]
  );

  const scenarioSummary = useMemo(() => {
    const currentTotal = scenarioAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
    const projectedTotal = scenarioAssets.reduce((sum, asset) => sum + asset.projectedValue, 0);
    const deltaValue = projectedTotal - currentTotal;
    const topMover = scenarioAssets.reduce<(typeof scenarioAssets)[number] | null>((largest, asset) => {
      if (!largest || Math.abs(asset.deltaValue) > Math.abs(largest.deltaValue)) {
        return asset;
      }

      return largest;
    }, null);

    return {
      currentTotal,
      projectedTotal,
      deltaValue,
      topMover
    };
  }, [scenarioAssets]);

  const comparisonData = scenarioAssets.slice(0, 8).map((asset) => ({
    label: asset.label,
    currentValue: asset.currentValue,
    projectedValue: asset.projectedValue
  }));

  const impactData = scenarioAssets
    .filter((asset) => Math.abs(asset.deltaValue) > 0.005)
    .sort((left, right) => Math.abs(right.deltaValue) - Math.abs(left.deltaValue))
    .slice(0, 8)
    .map((asset) => ({
      label: asset.label,
      deltaValue: asset.deltaValue
    }));

  function handlePriceChange(symbol: string, nextValue: string) {
    setPriceInputs((current) => ({
      ...current,
      [symbol]: nextValue
    }));
  }

  function resetScenario() {
    const resetInputs = buildInitialPriceInputs(assets, {});
    setPriceInputs(resetInputs);
    void persistTargets(resetInputs);
  }

  if (!assets.length) {
    return (
      <section className="panel">
        <div className="empty-state">
          <h3>No assets to project</h3>
          <p>Add holdings first, then use projections to test target prices.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="mini-stat-grid wide">
        <article className="callout">
          <span>Current value</span>
          <strong>{formatCurrency(scenarioSummary.currentTotal)}</strong>
          <small>All matching holdings are aggregated by symbol.</small>
        </article>
        <article className="callout">
          <span>Scenario value</span>
          <strong>{formatCurrency(scenarioSummary.projectedTotal)}</strong>
          <small>Based on the target prices below.</small>
        </article>
        <article className="callout">
          <span>Net change</span>
          <strong>{formatCurrency(scenarioSummary.deltaValue)}</strong>
          <small>
            {scenarioSummary.topMover
              ? `${scenarioSummary.topMover.label} moves the portfolio the most.`
              : "No asset changes yet."}
          </small>
        </article>
      </section>

      <section className="chart-two-up">
        <section className="panel chart-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Scenario mix</p>
              <h2>Current vs projected</h2>
            </div>
          </div>
          <div className="chart-shell scenario-chart-shell">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                layout="vertical"
                margin={{ top: 8, right: 18, bottom: 8, left: 8 }}
                barGap={8}
              >
                <CartesianGrid horizontal={false} stroke="rgba(146, 170, 198, 0.12)" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => formatCurrency(value)}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="currentValue" name="Current" fill="#2f7df6" radius={[0, 10, 10, 0]} />
                <Bar
                  dataKey="projectedValue"
                  name="Projected"
                  fill="#ff8c42"
                  radius={[0, 10, 10, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel chart-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Impact</p>
              <h2>Upside and downside</h2>
            </div>
          </div>
          <div className="chart-shell scenario-chart-shell">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={impactData}
                layout="vertical"
                margin={{ top: 8, right: 18, bottom: 8, left: 8 }}
              >
                <CartesianGrid horizontal={false} stroke="rgba(146, 170, 198, 0.12)" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => formatCurrency(value)}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="deltaValue" radius={[0, 10, 10, 0]}>
                  {impactData.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={entry.deltaValue >= 0 ? "rgba(36, 201, 139, 0.85)" : "rgba(255, 77, 109, 0.85)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </section>

      <section className="panel scenario-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">What-if inputs</p>
            <h2>Asset price targets</h2>
          </div>
          <button className="button ghost" type="button" onClick={resetScenario}>
            Reset prices
          </button>
        </div>

        <div className="scenario-meta">
          <span>One row per asset symbol</span>
          <span>Duplicates are aggregated automatically</span>
          {saveMessage ? (
            <span className={`save-status ${saveState}`}>{saveMessage}</span>
          ) : null}
        </div>

        <div className="table-shell">
          <table className="data-table scenario-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Shares</th>
                <th>Current price</th>
                <th>Projected price</th>
                <th>Current value</th>
                <th>Projected value</th>
                <th>Impact</th>
              </tr>
            </thead>
            <tbody>
              {scenarioAssets.map((asset) => (
                <tr key={asset.symbol}>
                  <td>
                    <strong>{asset.label}</strong>
                    <span>{asset.name ?? asset.symbol}</span>
                  </td>
                  <td>{formatNumber(asset.quantity)}</td>
                  <td>{formatCurrency(asset.currentPrice, asset.currency)}</td>
                  <td>
                    <input
                      className="scenario-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceInputs[asset.symbol] ?? ""}
                      onChange={(event) => handlePriceChange(asset.symbol, event.target.value)}
                      onBlur={(event) => {
                        const nextInputs = {
                          ...priceInputs,
                          [asset.symbol]: event.target.value
                        };
                        void persistTargets(nextInputs);
                      }}
                    />
                  </td>
                  <td>{formatCurrency(asset.currentValue, asset.currency)}</td>
                  <td>{formatCurrency(asset.projectedValue, asset.currency)}</td>
                  <td>
                    <span className={`scenario-impact${asset.deltaValue >= 0 ? " positive" : " negative"}`}>
                      {formatCurrency(asset.deltaValue, asset.currency)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
