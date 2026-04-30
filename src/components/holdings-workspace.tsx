"use client";

import { useState } from "react";

import { CombinedHoldingTable } from "@/components/combined-holding-table";
import { HoldingTable } from "@/components/holding-table";
import type { Holding } from "@/lib/types";

type HoldingsWorkspaceProps = {
  holdings: Holding[];
};

export function HoldingsWorkspace({ holdings }: HoldingsWorkspaceProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<"positions" | "assets">("positions");

  const isAssetView = viewMode === "assets";
  const combinedAssetCount = new Set(holdings.map((holding) => holding.symbol)).size;

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h2>{isAssetView ? "Combined assets" : isEditing ? "Editing" : "Holdings"}</h2>
        </div>
        <div className="holdings-panel-actions">
          <div className="workspace-actions holdings-view-actions">
            {!isEditing ? (
              <>
                <button
                  className={`button ghost${!isAssetView ? " active" : ""}`}
                  type="button"
                  onClick={() => setViewMode("positions")}
                >
                  By position
                </button>
                <button
                  className={`button ghost${isAssetView ? " active" : ""}`}
                  type="button"
                  onClick={() => {
                    setViewMode("assets");
                    setIsAdding(false);
                  }}
                >
                  By asset
                </button>
              </>
            ) : null}
            <button
              className={`button ghost${isEditing ? " active" : ""}`}
              type="button"
              onClick={() => {
                if (isAssetView) {
                  setViewMode("positions");
                  setIsEditing(true);
                  return;
                }

                setIsEditing((editing) => {
                  if (editing) {
                    setIsAdding(false);
                  }

                  return !editing;
                });
              }}
            >
              {isEditing ? "Done" : "Edit mode"}
            </button>
            {isEditing && !isAssetView ? (
              <button
                className={`button ghost${isAdding ? " active" : ""}`}
                type="button"
                onClick={() => setIsAdding((adding) => !adding)}
              >
                {isAdding ? "Cancel add" : "Add holding"}
              </button>
            ) : null}
          </div>

          <div className="mini-meta">
            <span>{isAssetView ? `${combinedAssetCount} assets` : `${holdings.length} positions`}</span>
            {isAssetView ? <span>Combined asset view</span> : null}
            {isEditing ? <span>Edit mode on</span> : null}
          </div>
        </div>
      </div>

      {isAssetView ? (
        <CombinedHoldingTable holdings={holdings} />
      ) : (
        <HoldingTable
          holdings={holdings}
          editing={isEditing}
          adding={isAdding}
          onCancelAdd={() => setIsAdding(false)}
        />
      )}
    </section>
  );
}
