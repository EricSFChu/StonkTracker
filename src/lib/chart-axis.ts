const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1
});

const scientificCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "scientific",
  maximumFractionDigits: 1
});

export function formatProjectionAxisTick(value: number) {
  return Math.abs(value) >= 1e15
    ? scientificCurrency.format(value)
    : compactCurrency.format(value);
}

export function buildProjectionAxisTicks(maxValue: number) {
  const maximum = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 0;
  const minimumStep = 250_000;
  const targetIntervals = 5;
  const rawStep = Math.max(minimumStep, maximum / targetIntervals);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalizedStep = rawStep / magnitude;
  const multiplier = [1, 2, 5, 10].find((value) => value >= normalizedStep) ?? 10;
  const step = rawStep === minimumStep ? minimumStep : multiplier * magnitude;
  const intervals = Math.max(1, Math.ceil(maximum / step));

  // Scale spacing with the projection so exponential growth cannot create an enormous array.
  return Array.from({ length: intervals + 1 }, (_, index) => index * step);
}
