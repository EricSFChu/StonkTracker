"use client";

import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  DEFAULT_COMPOUNDING_SETTINGS,
  normalizeCompoundingSettings,
  type CompoundingSettings
} from "@/lib/compounding";
import { formatCurrency, formatPercent } from "@/lib/format";

type ProjectionChartProps = {
  startingValue: number;
  initialSettings: CompoundingSettings;
};

type ProjectionPoint = {
  year: number;
  projectedValue: number;
  capitalAdded: number;
  investmentGain: number;
};

function buildProjectionData(
  startingValue: number,
  annualRate: number,
  years: number,
  annualContribution: number
): ProjectionPoint[] {
  const normalizedContribution =
    Number.isFinite(annualContribution) && annualContribution > 0 ? annualContribution : 0;
  const data: ProjectionPoint[] = [
    {
      year: 0,
      projectedValue: startingValue,
      capitalAdded: 0,
      investmentGain: 0
    }
  ];

  let projectedValue = startingValue;

  for (let year = 1; year <= years; year += 1) {
    // Apply the annual return first, then add fresh capital for that year.
    projectedValue = projectedValue * (1 + annualRate / 100) + normalizedContribution;

    data.push({
      year,
      projectedValue,
      capitalAdded: normalizedContribution * year,
      investmentGain: projectedValue - startingValue - normalizedContribution * year
    });
  }

  return data;
}

function buildAxisTicks(maxValue: number, step: number) {
  const ceiling = Math.max(step, Math.ceil(maxValue / step) * step);

  return Array.from({ length: Math.floor(ceiling / step) + 1 }, (_, index) => index * step);
}

function buildSettingsSignature(settings: CompoundingSettings) {
  return JSON.stringify(settings);
}

export function ProjectionChart({
  startingValue,
  initialSettings
}: ProjectionChartProps) {
  const normalizedInitialSettings = normalizeCompoundingSettings(initialSettings);
  const [rate, setRate] = useState(normalizedInitialSettings.annualRate);
  const [years, setYears] = useState(normalizedInitialSettings.years);
  const [annualContribution, setAnnualContribution] = useState(
    normalizedInitialSettings.annualContribution
  );
  const [persistedSignature, setPersistedSignature] = useState(() =>
    buildSettingsSignature(normalizedInitialSettings)
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const saveRequestId = useRef(0);

  useEffect(() => {
    const nextSettings = normalizeCompoundingSettings(initialSettings);
    setRate(nextSettings.annualRate);
    setYears(nextSettings.years);
    setAnnualContribution(nextSettings.annualContribution);
    setPersistedSignature(buildSettingsSignature(nextSettings));
    setSaveState("idle");
    setSaveMessage(null);
  }, [initialSettings]);

  const currentSettings = normalizeCompoundingSettings({
    annualRate: rate,
    years,
    annualContribution
  });
  const currentSignature = buildSettingsSignature(currentSettings);

  async function persistSettings(nextSettings: CompoundingSettings) {
    const payload = normalizeCompoundingSettings(nextSettings);
    const signature = buildSettingsSignature(payload);

    if (signature === persistedSignature) {
      setSaveState("saved");
      setSaveMessage("Saved");
      return;
    }

    setSaveState("saving");
    setSaveMessage("Saving assumptions...");

    const requestId = saveRequestId.current + 1;
    saveRequestId.current = requestId;

    try {
      const response = await fetch("/api/compounding/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (requestId !== saveRequestId.current) {
        return;
      }

      if (!response.ok) {
        setSaveState("error");
        setSaveMessage("Save failed");
        return;
      }

      setPersistedSignature(signature);
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
    if (currentSignature === persistedSignature) {
      return;
    }

    const timer = window.setTimeout(() => {
      void persistSettings(currentSettings);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [
    currentSettings.annualContribution,
    currentSettings.annualRate,
    currentSettings.years,
    currentSignature,
    persistedSignature
  ]);

  const projectionData = buildProjectionData(
    startingValue,
    currentSettings.annualRate,
    currentSettings.years,
    currentSettings.annualContribution
  );
  const axisTicks = buildAxisTicks(
    projectionData.reduce((largest, entry) => Math.max(largest, entry.projectedValue), 0),
    250_000
  );
  const finalProjection = projectionData[projectionData.length - 1];

  return (
    <section className="panel chart-panel projection-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Projection</p>
          <h2>Forward value model</h2>
        </div>
        <button
          className="button ghost"
          type="button"
          onClick={() => {
            setRate(DEFAULT_COMPOUNDING_SETTINGS.annualRate);
            setYears(DEFAULT_COMPOUNDING_SETTINGS.years);
            setAnnualContribution(DEFAULT_COMPOUNDING_SETTINGS.annualContribution);
          }}
        >
          Reset assumptions
        </button>
      </div>

      <div className="projection-controls">
        <label className="field compact">
          <span>Annual return</span>
          <input
            type="range"
            min="0"
            max="120"
            step="0.5"
            value={currentSettings.annualRate}
            onChange={(event) => setRate(Number(event.target.value))}
          />
          <strong>{formatPercent(currentSettings.annualRate)}</strong>
        </label>

        <label className="field compact">
          <span>Years</span>
          <input
            type="range"
            min="1"
            max="60"
            step="1"
            value={currentSettings.years}
            onChange={(event) => setYears(Number(event.target.value))}
          />
          <strong>{currentSettings.years}</strong>
        </label>

        <label className="field compact">
          <span>Yearly capital add</span>
          <input
            type="number"
            min="0"
            step="100"
            value={currentSettings.annualContribution}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setAnnualContribution(
                Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 0
              );
            }}
          />
          <strong>{formatCurrency(currentSettings.annualContribution)}</strong>
        </label>
      </div>

      <div className="mini-meta">
        <span>Assumptions auto-save for the next visit</span>
        {saveMessage ? <span className={`save-status ${saveState}`}>{saveMessage}</span> : null}
      </div>

      <div className="projection-highlight">
        <div>
          <span>Starting value</span>
          <strong>{formatCurrency(startingValue)}</strong>
        </div>
        <div>
          <span>Total capital added</span>
          <strong>{formatCurrency(finalProjection?.capitalAdded ?? 0)}</strong>
        </div>
        <div>
          <span>Investment gain</span>
          <strong>{formatCurrency(finalProjection?.investmentGain ?? 0)}</strong>
        </div>
        <div>
          <span>Projected value</span>
          <strong>
            {formatCurrency(finalProjection?.projectedValue ?? 0)}
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
              left: 16
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
              width={112}
              tickMargin={10}
              domain={[0, axisTicks[axisTicks.length - 1] ?? 250_000]}
              ticks={axisTicks}
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
