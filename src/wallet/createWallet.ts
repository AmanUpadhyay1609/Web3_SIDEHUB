import { Keypair } from "@solana/web3.js";
import { createHash } from "crypto";
import { Hex } from "viem";
import Web3 from "web3";
import { config } from "../config";

export const generatePrivateKey = (chatId: string): Hex => {
  const source = chatId + config.SECRET_KEY;
  const hash = createHash("sha256").update(source).digest("hex");
  const privateKey: Hex = `0x${hash.slice(-64).padStart(64, "0")}`;
  return privateKey;
};

// Create Solana wallet
export const createSolanaWallet = (privateKey: Buffer) => {
  const keypair = Keypair.fromSeed(privateKey.slice(0, 32));
  return keypair.publicKey.toBase58();
};

// Create Ethereum-based wallet (Base & Linea)
export const createEvmWallet = (privateKey: Hex, rpcUrl: string) => {
  const web3 = new Web3(rpcUrl);
  const wallet = web3.eth.accounts.privateKeyToAccount(privateKey);
  return wallet.address;
};

// Generate wallets for Solana, Base, and Linea
export const generateWallets = (chatId: string) => {
  const privateKey = generatePrivateKey(chatId);
  const solanaPrivateKeyBuffer = Buffer.from(privateKey.slice(2), "hex");

  const solanaAddress = createSolanaWallet(solanaPrivateKeyBuffer);
  const baseAddress = createEvmWallet(privateKey,config.baseRPC);
  const lineaAddress = createEvmWallet(privateKey, config.lineaRPC);

  return {
    solana: solanaAddress,
    base: baseAddress,
    linea: lineaAddress,
  };
};