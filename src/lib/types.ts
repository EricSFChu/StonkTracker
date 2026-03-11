export const ACCOUNT_TYPES = [
  "individual",
  "crypto",
  "traditional_ira",
  "roth_ira",
  "401k"
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type Holding = {
  id: number;
  symbol: string;
  name: string | null;
  accountType: AccountType;
  quantity: number;
  costBasis: number | null;
  lastPrice: number | null;
  currency: string | null;
  lastPriceUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuoteUpdate = {
  symbol: string;
  name: string | null;
  price: number;
  currency: string | null;
  refreshedAt: string;
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  individual: "Individual",
  crypto: "Crypto",
  traditional_ira: "Trad IRA",
  roth_ira: "Roth IRA",
  "401k": "401(k)"
};
