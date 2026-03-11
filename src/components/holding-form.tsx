"use client";

import { createHoldingAction } from "@/app/actions";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from "@/lib/types";

type HoldingFormProps = {
  embedded?: boolean;
};

export function HoldingForm({ embedded = false }: HoldingFormProps) {
  const form = (
    <form action={createHoldingAction} className="form-grid">
      <label className="field">
        <span>Symbol</span>
        <input
          type="text"
          name="symbol"
          required
          placeholder="AAPL or BTC-USD"
          autoComplete="off"
        />
      </label>

      <label className="field">
        <span>Name</span>
        <input type="text" name="name" placeholder="Apple Inc." autoComplete="off" />
      </label>

      <label className="field">
        <span>Account</span>
        <select name="accountType" defaultValue="individual">
          {ACCOUNT_TYPES.map((accountType) => (
            <option key={accountType} value={accountType}>
              {ACCOUNT_TYPE_LABELS[accountType]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Quantity</span>
        <input type="number" step="0.0001" min="0" name="quantity" required placeholder="10" />
      </label>

      <label className="field">
        <span>Cost basis</span>
        <input
          type="number"
          step="0.01"
          min="0"
          name="costBasis"
          placeholder="Optional per-share basis"
        />
      </label>

      <div className="form-actions">
        <button className="button" type="submit">
          Add holding
        </button>
      </div>
    </form>
  );

  if (embedded) {
    return form;
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Add a position</p>
          <h2>Add holding</h2>
        </div>
      </div>

      {form}
    </section>
  );
}
