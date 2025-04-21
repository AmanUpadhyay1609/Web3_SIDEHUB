export const BASE_URL: string = "https://dln.debridge.finance/v1.0";
export const HEADERS = {
  "Content-Type": "application/json", // Setting application/json header
};

export const chainIdByName :any = {
  "base": 8453,
  "linea": 59144,
  "solana": 7565164,
};

export const SUPPORTED_CHAINS = ["base", "linea", "solana"] as const;
export type SupportedChain = (typeof SUPPORTED_CHAINS)[number]; // "base" | "linea" | "solana"