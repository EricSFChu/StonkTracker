"use server";

import { revalidatePath } from "next/cache";

import {
  createHolding,
  deleteHolding,
  normalizeSymbol,
  updateHolding
} from "@/lib/holdings";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/types";

function parseAccountType(value: FormDataEntryValue | null): AccountType {
  if (typeof value !== "string" || !ACCOUNT_TYPES.includes(value as AccountType)) {
    throw new Error("Choose a valid account type.");
  }

  return value as AccountType;
}

function parseRequiredNumber(value: FormDataEntryValue | null, field: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} is required.`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${field} must be greater than zero.`);
  }

  return parsed;
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Cost basis must be zero or greater.");
  }

  return parsed;
}

function parseOptionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : null;
}

function parseSymbol(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Symbol is required.");
  }

  const symbol = normalizeSymbol(value);
  if (!symbol) {
    throw new Error("Symbol is required.");
  }

  return symbol;
}

function revalidatePortfolioRoutes() {
  revalidatePath("/");
  revalidatePath("/holdings");
  revalidatePath("/projections");
}

export async function createHoldingAction(formData: FormData) {
  createHolding({
    symbol: parseSymbol(formData.get("symbol")),
    name: parseOptionalText(formData.get("name")),
    accountType: parseAccountType(formData.get("accountType")),
    quantity: parseRequiredNumber(formData.get("quantity"), "Quantity"),
    costBasis: parseOptionalNumber(formData.get("costBasis"))
  });

  revalidatePortfolioRoutes();
}

export async function updateHoldingAction(formData: FormData) {
  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? Number(idValue) : NaN;

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Holding id is invalid.");
  }

  updateHolding(id, {
    symbol: parseSymbol(formData.get("symbol")),
    name: parseOptionalText(formData.get("name")),
    accountType: parseAccountType(formData.get("accountType")),
    quantity: parseRequiredNumber(formData.get("quantity"), "Quantity"),
    costBasis: parseOptionalNumber(formData.get("costBasis"))
  });

  revalidatePortfolioRoutes();
}

export async function deleteHoldingAction(formData: FormData) {
  const idValue = formData.get("id");
  const id = typeof idValue === "string" ? Number(idValue) : NaN;

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Holding id is invalid.");
  }

  deleteHolding(id);
  revalidatePortfolioRoutes();
}
