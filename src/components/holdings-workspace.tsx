"use client";

import { useState } from "react";

import { HoldingForm } from "@/components/holding-form";
import { HoldingTable } from "@/components/holding-table";
import type { Holding } from "@/lib/types";

type HoldingsWorkspaceProps = {
  holdings: Holding[];
};

export function HoldingsWorkspace({ holdings }: HoldingsWorkspaceProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
              disabled={!holdings.length}
              onClick={() => setIsEditing((editing) => !editing)}
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
            <h2>{isEditing ? "Editing" : "Holdings"}</h2>
          </div>
          <div className="mini-meta">
            <span>{holdings.length} positions</span>
            {isEditing ? <span>Edit mode on</span> : null}
          </div>
        </div>

        <HoldingTable holdings={holdings} editing={isEditing} />
      </section>
    </>
  );
}
