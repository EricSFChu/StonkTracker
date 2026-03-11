import { PageIntro } from "@/components/page-intro";
import { ProjectionScenarioWorkspace } from "@/components/projection-scenario-workspace";
import { listHoldings } from "@/lib/holdings";
import { getProjectedAssets } from "@/lib/portfolio";
import { listProjectionTargets } from "@/lib/projection-targets";

export const dynamic = "force-dynamic";

export default function ProjectionsPage() {
  const holdings = listHoldings();
  const projectedAssets = getProjectedAssets(holdings);
  const projectionTargets = listProjectionTargets(projectedAssets.map((asset) => asset.symbol));

  return (
    <div className="page-content">
      <PageIntro
        eyebrow="Projections"
        title="Projections"
        description="Enter target prices by asset and see how the whole portfolio moves."
      />

      <ProjectionScenarioWorkspace assets={projectedAssets} initialTargets={projectionTargets} />
    </div>
  );
}
