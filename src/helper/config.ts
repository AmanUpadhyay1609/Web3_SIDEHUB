import { config } from "../config";

//Batman 
export const chainRpcMapping: any = {
  base: config.baseRPC,
  linea: config.lineaRPC,
  solana: config.solanaRPC,
};

export const SUPPORTED_CHAINS = ["base", "linea", "solana"] as const;
export type SupportedChain = (typeof SUPPORTED_CHAINS)[number]; // "base" | "linea" | "solana"

export const nativeTokenInfo = {
  base: {
    chain: "base",
    name: "ETHEREUM",
    symbol: "ETH",
    address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    explorerUrl: "https://basescan.org",
    price: -1,
    decimal: 18,
    logoURI: "https://bscscan.com/token/images/ethereum_32.png",
    coinGeckoId: "",
    isRecommended: true,
  },
  linea: {
    chain: "linea",
    name: "ETHEREUM",
    symbol: "ETH",
    address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    explorerUrl: "https://lineascan.build",
    price: -1,
    decimal: 18,
    logoURI: "https://bscscan.com/token/images/ethereum_32.png",
    coinGeckoId: "",
    isRecommended: true,
  },
  solana: {
    chain: "solana",
    name: "SOL",
    symbol: "SOL",
    address: "11111111111111111111111111111111",
    explorerUrl: "https://solscan.io",
    price: -1,
    decimal: 9,
    logoURI: "https://solana.com/favicon.ico",
    coinGeckoId: "",
    isRecommended: true,
  },
};

