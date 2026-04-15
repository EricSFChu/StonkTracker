import {
  DEFAULT_COMPOUNDING_SETTINGS,
  normalizeCompoundingSettings,
  type CompoundingSettings
} from "@/lib/compounding";
import { getDb } from "@/lib/db";

type CompoundingSettingsRow = {
  annual_rate: number;
  years: number;
  annual_contribution: number;
};

export function getCompoundingSettings(): CompoundingSettings {
  const row = getDb()
    .prepare(
      `
        SELECT annual_rate, years, annual_contribution
        FROM compounding_settings
        WHERE id = 1
      `
    )
    .get() as CompoundingSettingsRow | undefined;

  if (!row) {
    return DEFAULT_COMPOUNDING_SETTINGS;
  }

  return normalizeCompoundingSettings({
    annualRate: row.annual_rate,
    years: row.years,
    annualContribution: row.annual_contribution
  });
}

export function replaceCompoundingSettings(settings: CompoundingSettings) {
  const normalizedSettings = normalizeCompoundingSettings(settings);

  getDb()
    .prepare(
      `
        INSERT INTO compounding_settings (
          id,
          annual_rate,
          years,
          annual_contribution,
          updated_at
        )
        VALUES (1, @annualRate, @years, @annualContribution, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          annual_rate = excluded.annual_rate,
          years = excluded.years,
          annual_contribution = excluded.annual_contribution,
          updated_at = CURRENT_TIMESTAMP
      `
    )
    .run(normalizedSettings);

  return normalizedSettings;
}
