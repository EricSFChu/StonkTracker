export type CompoundingSettings = {
  annualRate: number;
  years: number;
  annualContribution: number;
};

export type CompoundingProjectionPoint = {
  year: number;
  projectedValue: number;
  capitalAdded: number;
  investmentGain: number;
};

export type CompoundingSummary = CompoundingSettings & {
  startingValue: number;
  projectedValue: number;
  capitalAdded: number;
  investmentGain: number;
  projectionData: CompoundingProjectionPoint[];
};

export const DEFAULT_COMPOUNDING_SETTINGS: CompoundingSettings = {
  annualRate: 8,
  years: 10,
  annualContribution: 0
};

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

export function normalizeCompoundingSettings(
  settings: Partial<CompoundingSettings> | null | undefined
): CompoundingSettings {
  const annualRateInput = Number(settings?.annualRate);
  const yearsInput = Number(settings?.years);
  const annualContributionInput = Number(settings?.annualContribution);

  const annualRate = Number.isFinite(annualRateInput)
    ? Math.min(120, Math.max(0, roundToStep(annualRateInput, 0.5)))
    : DEFAULT_COMPOUNDING_SETTINGS.annualRate;
  const years = Number.isFinite(yearsInput)
    ? Math.min(60, Math.max(1, Math.round(yearsInput)))
    : DEFAULT_COMPOUNDING_SETTINGS.years;
  const annualContribution = Number.isFinite(annualContributionInput)
    ? Math.max(0, Math.round(annualContributionInput * 100) / 100)
    : DEFAULT_COMPOUNDING_SETTINGS.annualContribution;

  return {
    annualRate,
    years,
    annualContribution
  };
}

export function buildCompoundingProjectionData(
  startingValue: number,
  settings: Partial<CompoundingSettings> | null | undefined
): CompoundingProjectionPoint[] {
  const normalizedSettings = normalizeCompoundingSettings(settings);
  const normalizedContribution =
    Number.isFinite(normalizedSettings.annualContribution) && normalizedSettings.annualContribution > 0
      ? normalizedSettings.annualContribution
      : 0;
  const data: CompoundingProjectionPoint[] = [
    {
      year: 0,
      projectedValue: startingValue,
      capitalAdded: 0,
      investmentGain: 0
    }
  ];

  let projectedValue = startingValue;

  for (let year = 1; year <= normalizedSettings.years; year += 1) {
    projectedValue = projectedValue * (1 + normalizedSettings.annualRate / 100) + normalizedContribution;

    data.push({
      year,
      projectedValue,
      capitalAdded: normalizedContribution * year,
      investmentGain: projectedValue - startingValue - normalizedContribution * year
    });
  }

  return data;
}

export function getCompoundingSummary(
  startingValue: number,
  settings: Partial<CompoundingSettings> | null | undefined
): CompoundingSummary {
  const normalizedSettings = normalizeCompoundingSettings(settings);
  const projectionData = buildCompoundingProjectionData(startingValue, normalizedSettings);
  const finalProjection = projectionData[projectionData.length - 1] ?? {
    year: 0,
    projectedValue: startingValue,
    capitalAdded: 0,
    investmentGain: 0
  };

  return {
    ...normalizedSettings,
    startingValue,
    projectedValue: finalProjection.projectedValue,
    capitalAdded: finalProjection.capitalAdded,
    investmentGain: finalProjection.investmentGain,
    projectionData
  };
}
