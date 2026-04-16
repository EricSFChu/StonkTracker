import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { PortfolioReportData, ReportHoldingRow } from "@/lib/report-data";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const TABLE_CELL_PADDING = 8;

type PdfColor = [number, number, number];
type PdfFont = "F1" | "F2" | "F3";

type TextOptions = {
  font?: PdfFont;
  size?: number;
  color?: PdfColor;
};

type RectOptions = {
  fillColor?: PdfColor;
  strokeColor?: PdfColor;
  lineWidth?: number;
};

type TableColumn<Row> = {
  label: string;
  width: number;
  value: (row: Row) => string;
  align?: "left" | "right";
  headerAlign?: "left" | "center" | "right";
  font?: PdfFont;
};

type PortfolioReportPdfOptions = {
  reportTitle?: string;
};

type CombinedHoldingRow = {
  symbol: string;
  name: string | null;
  quantity: number;
  currentPrice: number | null;
  marketValue: number;
};

const COLORS = {
  text: [0, 0, 0] as PdfColor,
  muted: [72, 72, 72] as PdfColor,
  border: [190, 190, 190] as PdfColor,
  white: [255, 255, 255] as PdfColor,
  tableHeader: [244, 244, 244] as PdfColor,
  tableStripe: [249, 249, 249] as PdfColor
};

class PdfPage {
  private commands: string[] = [];

  drawText(text: string, x: number, y: number, options: TextOptions = {}) {
    const font = options.font ?? "F1";
    const size = options.size ?? 12;
    const color = options.color ?? COLORS.text;
    const safeText = escapePdfText(text);
    const pdfY = PAGE_HEIGHT - y;

    this.commands.push(
      "BT",
      `${toPdfColor(color)} rg`,
      `/${font} ${size} Tf`,
      `1 0 0 1 ${x.toFixed(2)} ${pdfY.toFixed(2)} Tm`,
      `(${safeText}) Tj`,
      "ET"
    );
  }

  drawRect(x: number, y: number, width: number, height: number, options: RectOptions = {}) {
    const pdfY = PAGE_HEIGHT - y - height;
    const parts = ["q"];

    if (options.fillColor) {
      parts.push(`${toPdfColor(options.fillColor)} rg`);
    }

    if (options.strokeColor) {
      parts.push(`${toPdfColor(options.strokeColor)} RG`);
      parts.push(`${(options.lineWidth ?? 0.9).toFixed(2)} w`);
    }

    parts.push(
      `${x.toFixed(2)} ${pdfY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re`
    );

    if (options.fillColor && options.strokeColor) {
      parts.push("B");
    } else if (options.fillColor) {
      parts.push("f");
    } else {
      parts.push("S");
    }

    parts.push("Q");
    this.commands.push(parts.join("\n"));
  }

  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: PdfColor = COLORS.border,
    lineWidth = 0.8
  ) {
    const pdfY1 = PAGE_HEIGHT - y1;
    const pdfY2 = PAGE_HEIGHT - y2;

    this.commands.push(
      "q",
      `${toPdfColor(color)} RG`,
      `${lineWidth.toFixed(2)} w`,
      `${x1.toFixed(2)} ${pdfY1.toFixed(2)} m`,
      `${x2.toFixed(2)} ${pdfY2.toFixed(2)} l`,
      "S",
      "Q"
    );
  }

  build() {
    return this.commands.join("\n");
  }
}

function sanitizeAscii(text: string) {
  return text.replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(text: string) {
  return sanitizeAscii(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function toPdfColor(color: PdfColor) {
  return color.map((value) => (value / 255).toFixed(3)).join(" ");
}

function estimateTextWidth(text: string, fontSize: number) {
  return sanitizeAscii(text).length * fontSize * 0.52;
}

function truncateToWidth(text: string, width: number, fontSize: number) {
  const normalized = sanitizeAscii(text.trim().replace(/\s+/g, " "));
  const maxChars = Math.max(1, Math.floor(width / (fontSize * 0.52)));

  if (normalized.length <= maxChars) {
    return normalized;
  }

  if (maxChars <= 3) {
    return normalized.slice(0, maxChars);
  }

  return `${normalized.slice(0, maxChars - 3).trimEnd()}...`;
}

function drawMetricPair(
  page: PdfPage,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  color: PdfColor = COLORS.text
) {
  page.drawText(label.toUpperCase(), x, y, {
    font: "F2",
    size: 8.5,
    color: COLORS.muted
  });
  page.drawText(truncateToWidth(value, width, 13), x, y + 18, {
    font: "F2",
    size: 13,
    color
  });
}

function getTableCellTextX(
  cellX: number,
  cellWidth: number,
  text: string,
  fontSize: number,
  align: "left" | "center" | "right" = "left"
) {
  const innerWidth = cellWidth - TABLE_CELL_PADDING * 2;
  const textWidth = estimateTextWidth(text, fontSize);

  if (align === "right") {
    return cellX + cellWidth - Math.min(textWidth, innerWidth) - TABLE_CELL_PADDING;
  }

  if (align === "center") {
    const centeredOffset = Math.max((innerWidth - Math.min(textWidth, innerWidth)) / 2, 0);
    return cellX + TABLE_CELL_PADDING + centeredOffset;
  }

  return cellX + TABLE_CELL_PADDING;
}

function drawTableHeader<Row>(page: PdfPage, x: number, y: number, columns: TableColumn<Row>[], height: number) {
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  page.drawRect(x, y, totalWidth, height, {
    fillColor: COLORS.tableHeader,
    strokeColor: COLORS.border
  });

  let currentX = x;

  for (const column of columns) {
    const size = 9;
    const text = truncateToWidth(column.label, column.width - TABLE_CELL_PADDING * 2, size);

    page.drawText(
      text,
      getTableCellTextX(currentX, column.width, text, size, column.headerAlign ?? column.align ?? "left"),
      y + 16,
      {
      font: "F2",
      size,
      color: COLORS.text
      }
    );
    currentX += column.width;
  }
}

function drawTableRow<Row>(
  page: PdfPage,
  x: number,
  y: number,
  columns: TableColumn<Row>[],
  row: Row,
  rowHeight: number,
  striped: boolean
) {
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);

  page.drawRect(x, y, totalWidth, rowHeight, {
    fillColor: striped ? COLORS.tableStripe : COLORS.white
  });
  page.drawLine(x, y + rowHeight, x + totalWidth, y + rowHeight, COLORS.border, 0.7);

  let currentX = x;

  for (const column of columns) {
    const font = column.font ?? "F1";
    const size = font === "F3" ? 9 : 9.5;
    const rawValue = column.value(row);
    const text = truncateToWidth(rawValue, column.width - TABLE_CELL_PADDING * 2, size);

    page.drawText(text, getTableCellTextX(currentX, column.width, text, size, column.align ?? "left"), y + 15, {
      font,
      size,
      color: COLORS.text
    });
    currentX += column.width;
  }
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatFooterDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function formatRefreshAt(value: string | null) {
  if (!value) {
    return "No stored quote refresh";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatWeightPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function buildCombinedHoldingRows(holdings: ReportHoldingRow[]) {
  const combinedBySymbol = new Map<string, CombinedHoldingRow>();

  for (const holding of holdings) {
    const existing = combinedBySymbol.get(holding.symbol);

    if (existing) {
      existing.quantity += holding.quantity;
      existing.marketValue += holding.marketValue;

      if (!existing.name && holding.name) {
        existing.name = holding.name;
      }

      continue;
    }

    combinedBySymbol.set(holding.symbol, {
      symbol: holding.symbol,
      name: holding.name,
      quantity: holding.quantity,
      currentPrice: holding.currentPrice,
      marketValue: holding.marketValue
    });
  }

  return Array.from(combinedBySymbol.values())
    .map((holding) => ({
      ...holding,
      currentPrice: holding.quantity > 0 ? holding.marketValue / holding.quantity : null
    }))
    .sort((left, right) => right.marketValue - left.marketValue);
}

function buildCoverPage(report: PortfolioReportData, reportTitle: string) {
  const page = new PdfPage();
  const generatedLabel = formatGeneratedAt(report.generatedAt);
  const holdingsCount = report.holdings.length;
  const pricingCoverage = holdingsCount
    ? `${formatPercent((report.snapshot.pricedPositions / holdingsCount) * 100)} quoted`
    : "No holdings saved";
  const leftX = PAGE_MARGIN;
  const rightX = PAGE_MARGIN + CONTENT_WIDTH / 2 + 8;
  const metricWidth = CONTENT_WIDTH / 2 - 12;

  page.drawText(reportTitle, PAGE_MARGIN, 74, {
    font: "F2",
    size: 24,
    color: COLORS.text
  });
  page.drawText("StonkTracker current holdings and compounding summary", PAGE_MARGIN, 98, {
    size: 11,
    color: COLORS.muted
  });
  page.drawText(`Generated ${generatedLabel}`, PAGE_MARGIN, 118, {
    size: 10,
    color: COLORS.muted
  });
  page.drawLine(PAGE_MARGIN, 136, PAGE_WIDTH - PAGE_MARGIN, 136, COLORS.border, 1);

  page.drawText("Summary", PAGE_MARGIN, 170, {
    font: "F2",
    size: 16,
    color: COLORS.text
  });

  drawMetricPair(page, leftX, 196, metricWidth, "Total value", formatCurrency(report.snapshot.totalValue));
  drawMetricPair(page, leftX, 236, metricWidth, "Cost basis", formatCurrency(report.snapshot.totalCost));
  drawMetricPair(page, leftX, 276, metricWidth, "Unrealized gain", formatCurrency(report.snapshot.unrealizedGain));
  drawMetricPair(page, rightX, 196, metricWidth, "Holding rows", `${holdingsCount}`);
  drawMetricPair(page, rightX, 236, metricWidth, "Quote coverage", pricingCoverage);
  drawMetricPair(page, rightX, 276, metricWidth, "Last refresh", formatRefreshAt(report.snapshot.lastRefreshedAt));

  return page;
}

function buildCombinedHoldingsPages(report: PortfolioReportData) {
  const combinedHoldings = buildCombinedHoldingRows(report.holdings);
  const portfolioValue = report.snapshot.totalValue;

  if (!combinedHoldings.length) {
    return [];
  }

  const pages: PdfPage[] = [];
  const columns: TableColumn<CombinedHoldingRow>[] = [
    {
      label: "Symbol",
      width: 64,
      value: (row) => row.symbol,
      font: "F2"
    },
    {
      label: "Name",
      width: 152,
      value: (row) => row.name ?? "Unlabeled holding"
    },
    {
      label: "Shares",
      width: 74,
      value: (row) => formatNumber(row.quantity),
      align: "right",
      font: "F3"
    },
    {
      label: "Price",
      width: 78,
      value: (row) => (row.currentPrice !== null ? formatCurrency(row.currentPrice) : "N/A"),
      align: "right",
      font: "F3"
    },
    {
      label: "Value",
      width: 92,
      value: (row) => formatCurrency(row.marketValue),
      align: "right",
      font: "F3"
    },
    {
      label: "Weight",
      width: 56,
      value: (row) =>
        formatWeightPercent(portfolioValue > 0 ? (row.marketValue / portfolioValue) * 100 : 0),
      align: "right",
      font: "F3"
    }
  ];

  const rowHeight = 22;
  const tableTop = 124;
  const tableHeaderHeight = 24;
  const pageBottom = 718;
  let rowIndex = 0;

  while (rowIndex < combinedHoldings.length) {
    const page = new PdfPage();
    const isContinuation = pages.length > 0;

    page.drawText(isContinuation ? "Holdings by asset (continued)" : "Holdings by asset", PAGE_MARGIN, 76, {
      font: "F2",
      size: 18,
      color: COLORS.text
    });

    drawTableHeader(page, PAGE_MARGIN, tableTop, columns, tableHeaderHeight);

    let y = tableTop + tableHeaderHeight;

    while (rowIndex < combinedHoldings.length && y + rowHeight <= pageBottom) {
      drawTableRow(page, PAGE_MARGIN, y, columns, combinedHoldings[rowIndex], rowHeight, rowIndex % 2 === 0);
      y += rowHeight;
      rowIndex += 1;
    }

    pages.push(page);
  }

  return pages;
}

function buildHoldingsPages(report: PortfolioReportData) {
  if (!report.holdings.length) {
    return [];
  }

  const pages: PdfPage[] = [];
  const columns: TableColumn<ReportHoldingRow>[] = [
    {
      label: "Symbol",
      width: 58,
      value: (row) => row.symbol,
      font: "F2"
    },
    {
      label: "Name",
      width: 140,
      value: (row) => row.name ?? "Unlabeled holding"
    },
    {
      label: "Account",
      width: 76,
      value: (row) => row.accountLabel
    },
    {
      label: "Shares",
      width: 66,
      value: (row) => formatNumber(row.quantity),
      align: "right",
      font: "F3"
    },
    {
      label: "Price",
      width: 78,
      value: (row) => (row.currentPrice !== null ? formatCurrency(row.currentPrice) : "N/A"),
      align: "right",
      font: "F3"
    },
    {
      label: "Value",
      width: 98,
      value: (row) => formatCurrency(row.marketValue),
      align: "right",
      font: "F3"
    }
  ];

  const rowHeight = 22;
  const tableTop = 124;
  const tableHeaderHeight = 24;
  const pageBottom = 718;
  let rowIndex = 0;

  while (rowIndex < report.holdings.length) {
    const page = new PdfPage();
    const isContinuation = pages.length > 0;

    page.drawText(isContinuation ? "Current holdings detail (continued)" : "Current holdings detail", PAGE_MARGIN, 76, {
      font: "F2",
      size: 18,
      color: COLORS.text
    });

    drawTableHeader(page, PAGE_MARGIN, tableTop, columns, tableHeaderHeight);

    let y = tableTop + tableHeaderHeight;

    while (rowIndex < report.holdings.length && y + rowHeight <= pageBottom) {
      drawTableRow(page, PAGE_MARGIN, y, columns, report.holdings[rowIndex], rowHeight, rowIndex % 2 === 0);
      y += rowHeight;
      rowIndex += 1;
    }

    pages.push(page);
  }

  return pages;
}

function drawCompoundingSummarySection(
  page: PdfPage,
  topY: number,
  report: PortfolioReportData,
  growthPercent: number
) {
  const leftX = PAGE_MARGIN;
  const rightX = PAGE_MARGIN + CONTENT_WIDTH / 2 + 8;
  const metricWidth = CONTENT_WIDTH / 2 - 12;
  const metricsTop = topY + 28;
  const metricRowGap = 32;

  page.drawText("Summary", PAGE_MARGIN, topY, {
    font: "F2",
    size: 16,
    color: COLORS.text
  });

  drawMetricPair(
    page,
    leftX,
    metricsTop,
    metricWidth,
    "Starting value",
    formatCurrency(report.compoundingSummary.startingValue)
  );
  drawMetricPair(
    page,
    leftX,
    metricsTop + metricRowGap,
    metricWidth,
    "Annual return",
    formatPercent(report.compoundingSummary.annualRate)
  );
  drawMetricPair(
    page,
    leftX,
    metricsTop + metricRowGap * 2,
    metricWidth,
    "Years",
    `${report.compoundingSummary.years}`
  );
  drawMetricPair(
    page,
    leftX,
    metricsTop + metricRowGap * 3,
    metricWidth,
    "Yearly capital add",
    formatCurrency(report.compoundingSummary.annualContribution)
  );

  drawMetricPair(
    page,
    rightX,
    metricsTop,
    metricWidth,
    "Projected value",
    formatCurrency(report.compoundingSummary.projectedValue)
  );
  drawMetricPair(
    page,
    rightX,
    metricsTop + metricRowGap,
    metricWidth,
    "Capital added",
    formatCurrency(report.compoundingSummary.capitalAdded)
  );
  drawMetricPair(
    page,
    rightX,
    metricsTop + metricRowGap * 2,
    metricWidth,
    "Investment gain",
    formatCurrency(report.compoundingSummary.investmentGain)
  );
  drawMetricPair(
    page,
    rightX,
    metricsTop + metricRowGap * 3,
    metricWidth,
    "Growth vs start",
    formatPercent(growthPercent)
  );
}

function buildCompoundingPages(report: PortfolioReportData) {
  const growthPercent =
    report.compoundingSummary.startingValue > 0
      ? ((report.compoundingSummary.projectedValue - report.compoundingSummary.startingValue) /
          report.compoundingSummary.startingValue) *
        100
      : 0;
  const milestones = report.compoundingSummary.projectionData;
  const pages: PdfPage[] = [];
  const columns: TableColumn<(typeof milestones)[number]>[] = [
    {
      label: "Year",
      width: 62,
      value: (row) => `${row.year}`,
      align: "right",
      font: "F3"
    },
    {
      label: "Projected value",
      width: 154,
      value: (row) => formatCurrency(row.projectedValue),
      align: "right",
      font: "F3"
    },
    {
      label: "Capital added",
      width: 140,
      value: (row) => formatCurrency(row.capitalAdded),
      align: "right",
      font: "F3"
    },
    {
      label: "Investment gain",
      width: 160,
      value: (row) => formatCurrency(row.investmentGain),
      align: "right",
      font: "F3"
    }
  ];
  const rowHeight = 24;
  const tableHeaderHeight = 24;
  const pageBottom = 718;
  const summaryGap = 32;
  const summaryHeight = 142;
  let rowIndex = 0;
  let summaryDrawn = false;

  while (rowIndex < milestones.length) {
    const page = new PdfPage();
    const isContinuation = pages.length > 0;
    const tableTop = isContinuation ? 116 : 194;

    page.drawText(isContinuation ? "Compounding summary (continued)" : "Compounding summary", PAGE_MARGIN, 76, {
      font: "F2",
      size: 18,
      color: COLORS.text
    });

    if (!isContinuation) {
      page.drawLine(PAGE_MARGIN, 136, PAGE_WIDTH - PAGE_MARGIN, 136, COLORS.border, 1);
      page.drawText("Milestones", PAGE_MARGIN, 170, {
        font: "F2",
        size: 16,
        color: COLORS.text
      });
    }

    drawTableHeader(page, PAGE_MARGIN, tableTop, columns, tableHeaderHeight);

    let y = tableTop + tableHeaderHeight;
    const rowsRemaining = milestones.length - rowIndex;
    const rowCapacity = Math.floor((pageBottom - y) / rowHeight);
    const rowCapacityWithSummary = Math.max(
      0,
      Math.floor((pageBottom - (y + summaryGap + summaryHeight)) / rowHeight)
    );
    const shouldDrawSummaryOnPage = rowsRemaining <= rowCapacityWithSummary;
    const rowsToRender = shouldDrawSummaryOnPage
      ? rowsRemaining
      : Math.min(rowsRemaining, rowCapacity);
    const targetRowIndex = rowIndex + rowsToRender;

    while (rowIndex < targetRowIndex) {
      drawTableRow(page, PAGE_MARGIN, y, columns, milestones[rowIndex], rowHeight, rowIndex % 2 === 0);
      y += rowHeight;
      rowIndex += 1;
    }

    if (shouldDrawSummaryOnPage) {
      drawCompoundingSummarySection(page, y + summaryGap, report, growthPercent);
      summaryDrawn = true;
    }

    pages.push(page);
  }

  if (!summaryDrawn) {
    const fallbackPage = new PdfPage();

    fallbackPage.drawText("Compounding summary", PAGE_MARGIN, 76, {
      font: "F2",
      size: 18,
      color: COLORS.text
    });
    drawCompoundingSummarySection(fallbackPage, 170, report, growthPercent);
    pages.push(fallbackPage);
  }

  return pages;
}

function addFooter(page: PdfPage, pageNumber: number, totalPages: number, generatedAt: string) {
  const pageLabel = `Page ${pageNumber} of ${totalPages}`;
  const pageLabelX = PAGE_WIDTH - PAGE_MARGIN - estimateTextWidth(pageLabel, 9);

  page.drawLine(PAGE_MARGIN, 750, PAGE_WIDTH - PAGE_MARGIN, 750, COLORS.border, 0.8);
  page.drawText("StonkTracker", PAGE_MARGIN, 770, {
    font: "F2",
    size: 9,
    color: COLORS.muted
  });
  page.drawText(formatFooterDate(generatedAt), PAGE_WIDTH / 2 - 28, 770, {
    font: "F1",
    size: 9,
    color: COLORS.muted
  });
  page.drawText(pageLabel, pageLabelX, 770, {
    font: "F1",
    size: 9,
    color: COLORS.muted
  });
}

function buildPdfDocument(pageContents: string[]) {
  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const fontMonoId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");

  const pageObjectIds: number[] = [];

  for (const content of pageContents) {
    const contentId = addObject(
      `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`
    );
    const pageObjectId = addObject(
      `<< /Type /Page /Parent __PAGES__ /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontMonoId} 0 R >> >> >>`
    );
    pageObjectIds.push(pageObjectId);
  }

  const pagesId = addObject(
    `<< /Type /Pages /Count ${pageObjectIds.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] >>`
  );

  pageObjectIds.forEach((id) => {
    objects[id - 1] = objects[id - 1].replace("__PAGES__", `${pagesId} 0 R`);
  });

  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n%StonkTracker\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

export function buildPortfolioReportPdf(
  report: PortfolioReportData,
  options: PortfolioReportPdfOptions = {}
) {
  const reportTitle = options.reportTitle?.trim() || "Portfolio Report";
  const pages = [
    buildCoverPage(report, reportTitle),
    ...buildCombinedHoldingsPages(report),
    ...buildHoldingsPages(report),
    ...buildCompoundingPages(report)
  ];
  const totalPages = pages.length;

  pages.forEach((page, index) => {
    addFooter(page, index + 1, totalPages, report.generatedAt);
  });

  return buildPdfDocument(pages.map((page) => page.build()));
}
