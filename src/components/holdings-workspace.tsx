"use client";

import { useState } from "react";

import { CombinedHoldingTable } from "@/components/combined-holding-table";
import { HoldingForm } from "@/components/holding-form";
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
    <>
      <section className="panel workspace-panel">
        <div className="workspace-toolbar">
          <div>
            <p className="eyebrow">Manage</p>
            <h2>Holdings</h2>
          </div>

          <div className="workspace-actions">
            <button
              className="button ghost"
              type="button"
              onClick={() => setIsAdding((open) => !open)}
            >
              {isAdding ? "Close add" : "Add holding"}
            </button>
            <button
              className={`button ghost${isEditing ? " active" : ""}`}
              type="button"
              disabled={!holdings.length || isAssetView}
              onClick={() => {
                if (isAssetView) {
                  return;
                }

                setIsEditing((editing) => !editing);
              }}
            >
              {isEditing ? "Done" : "Edit mode"}
            </button>
          </div>
        </div>

        {isAdding ? (
          <div className="add-drawer">
            <HoldingForm embedded />
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h2>{isAssetView ? "Combined assets" : isEditing ? "Editing" : "Holdings"}</h2>
          </div>
          <div className="holdings-panel-actions">
            <div className="workspace-actions holdings-view-actions">
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
                  setIsEditing(false);
                }}
              >
                By asset
              </button>
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
          <HoldingTable holdings={holdings} editing={isEditing} />
        )}
      </section>
    </>
  );
}
