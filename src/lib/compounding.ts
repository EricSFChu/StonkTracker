export type CompoundingSettings = {
  annualRate: number;
  years: number;
  annualContribution: number;
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
