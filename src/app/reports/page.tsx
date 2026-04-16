import { PageIntro } from "@/components/page-intro";
import { ReportDownloadControls } from "@/components/report-download-controls";
import { formatCurrency, formatDateTime, formatPercent } from "@/lib/format";
import { getPortfolioReportData } from "@/lib/report-data";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  const report = getPortfolioReportData();
  const growthPercent =
    report.compoundingSummary.startingValue > 0
      ? ((report.compoundingSummary.projectedValue - report.compoundingSummary.startingValue) /
          report.compoundingSummary.startingValue) *
        100
      : 0;

  return (
    <div className="page-content">
      <PageIntro
        eyebrow="Reports"
        title="Reports"
        description="Download a printable PDF snapshot of current holdings and the saved compounding scenario."
        actions={
          <ReportDownloadControls initialName="Portfolio Report" />
        }
      />

      <section className="mini-stat-grid wide">
        <article className="callout">
          <span>Holding rows</span>
          <strong>{report.holdings.length}</strong>
          <small>Includes account, shares, price, and market value for each saved row.</small>
        </article>
        <article className="callout">
          <span>Portfolio value</span>
          <strong>{formatCurrency(report.snapshot.totalValue)}</strong>
          <small>Uses stored quotes with cost-basis fallback where needed.</small>
        </article>
        <article className="callout">
          <span>Projected outcome</span>
          <strong>{formatCurrency(report.compoundingSummary.projectedValue)}</strong>
          <small>
            {formatPercent(growthPercent)} over {report.compoundingSummary.years} years at the saved
            assumptions.
          </small>
        </article>
      </section>

      <section className="two-column-layout">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Included</p>
              <h2>What the PDF contains</h2>
            </div>
          </div>

          <ol className="report-outline-list report-panel-body">
            <li className="report-outline-item">
              <span className="report-outline-step">1</span>
              <div className="report-outline-copy">
                <strong>Summary</strong>
                <p>Total value, cost basis, unrealized gain, and quote coverage.</p>
              </div>
            </li>
            <li className="report-outline-item">
              <span className="report-outline-step">2</span>
              <div className="report-outline-copy">
                <strong>Holdings</strong>
                <p>
                  A printable multi-page table sorted from highest current market value to lowest.
                </p>
              </div>
            </li>
            <li className="report-outline-item">
              <span className="report-outline-step">3</span>
              <div className="report-outline-copy">
                <strong>Compounding</strong>
                <p>
                  Saved annual return, yearly capital adds, ending value, and milestone checkpoints.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Saved inputs</p>
              <h2>Current report assumptions</h2>
            </div>
          </div>

          <div className="account-list report-panel-body">
            <div className="account-list-row">
              <div className="position-breakdown">
                <strong>Generated</strong>
                <span>Local report timestamp</span>
              </div>
              <strong>{formatDateTime(report.generatedAt)}</strong>
            </div>
            <div className="account-list-row">
              <div className="position-breakdown">
                <strong>Annual return</strong>
                <span>Saved from the Compounding tab</span>
              </div>
              <strong>{formatPercent(report.compoundingSummary.annualRate)}</strong>
            </div>
            <div className="account-list-row">
              <div className="position-breakdown">
                <strong>Projection horizon</strong>
                <span>Saved from the Compounding tab</span>
              </div>
              <strong>{report.compoundingSummary.years} years</strong>
            </div>
            <div className="account-list-row">
              <div className="position-breakdown">
                <strong>Yearly capital add</strong>
                <span>Applied to the compounding summary in the PDF</span>
              </div>
              <strong>{formatCurrency(report.compoundingSummary.annualContribution)}</strong>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
