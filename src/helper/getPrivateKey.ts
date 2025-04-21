import { Keypair } from "@solana/web3.js";
import { Request, Response } from "express";
import { generatePrivateKey } from "../wallet/createWallet";
import bs58 from "bs58";

export const getPrivateKey = async (req: Request, res: Response) => {
  try {
    const { chatId , chain } = req.query;
    
    // Validate input parameters
    if (!chatId || !chain) {
      return res.status(400).json({
        status: false,
        message: "Both chatId and chain parameters are required"
      });
    }

    // Generate base private key
    let privateKey: string;
    try {
      privateKey = generatePrivateKey(chatId as string);
    } catch (error) {
      console.error("Private key generation failed:", error);
      return res.status(500).json({
        status: false,
        message: "Failed to generate private key"
      });
    }

    // Handle Solana-specific key conversion
    if (chain.toString().toLowerCase() === "solana") {
      try {
        const solanaPrivateKeyBuffer = Buffer.from(privateKey.slice(2), "hex");
        const keypair = Keypair.fromSeed(solanaPrivateKeyBuffer.slice(0, 32));
        privateKey = bs58.encode(keypair.secretKey);
      } catch (error) {
        console.error("Solana key conversion failed:", error);
        return res.status(400).json({
          status: false,
          message: "Failed to convert to Solana key format",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return res.status(200).json({
      status: true,
      message: "Private key fetched successfully",
      privateKey
    });

  } catch (error) {
    console.error("Unexpected error in getPrivateKey:", error);
    return res.status(500).json({
      status: false,
      message: "An unexpected error occurred",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};