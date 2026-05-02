export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 1000 ? 0 : 2
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4
  }).format(value);
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

const APP_TIME_ZONE = "America/Los_Angeles";
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

const dateTimePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true
});

function getDateTimeParts(date: Date) {
  const parts = Object.fromEntries(
    dateTimePartsFormatter
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );

  return {
    year: parts.year,
    month: Number(parts.month),
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    dayPeriod: parts.dayPeriod?.toUpperCase() ?? ""
  };
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  const parts = getDateTimeParts(date);
  const includeYear = parts.year !== getDateTimeParts(new Date()).year;
  const month = MONTH_LABELS[parts.month - 1] ?? "";
  const dateLabel = includeYear
    ? `${month} ${parts.day}, ${parts.year}`
    : `${month} ${parts.day}`;

  return `${dateLabel}, ${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
}
