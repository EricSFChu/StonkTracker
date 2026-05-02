import { HoldingsWorkspace } from "@/components/holdings-workspace";
import { PageIntro } from "@/components/page-intro";
import { listHoldings } from "@/lib/holdings";

export const dynamic = "force-dynamic";

export default function HoldingsPage() {
  const holdings = listHoldings();

  return (
    <div className="page-content">
      <PageIntro eyebrow="Holdings" title="Holdings" />

      <HoldingsWorkspace holdings={holdings} />
    </div>
  );
}
