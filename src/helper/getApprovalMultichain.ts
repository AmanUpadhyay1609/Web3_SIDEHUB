import { ethers } from "ethers";
import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import {
  createApproveInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { chainRpcMapping, SUPPORTED_CHAINS, SupportedChain } from "./config";

export async function getApproval(
  tokenAddress: string,
  allowedToAddress: string,
  chain: SupportedChain,
  amount: any,
  wallet: any
) {
  try {
    console.log("Approval params-->", { tokenAddress, allowedToAddress, chain, amount });

    if (!SUPPORTED_CHAINS.includes(chain)) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    if (chain === "solana") {
      return await approveOnSolana(
        tokenAddress,
        allowedToAddress,
        amount.toString(),
        wallet
      );
    }
    
    return await approveOnEVM(
      tokenAddress,
      allowedToAddress,
      chain as Exclude<SupportedChain, "solana">,
      amount.toString(),
      wallet
    );
  } catch (error) {
    console.error(`Approval failed for ${chain.toUpperCase()}:`, error);
    throw new Error(`Approval process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function approveOnEVM(
  tokenAddress: string,
  allowedToAddress: string,
  chain: Exclude<SupportedChain, "solana">,
  amount: ethers.BigNumberish,
  wallet: { privateKey: string }
) {
  try {
    console.log("Starting EVM approval process");
    
    const provider = new ethers.JsonRpcProvider(chainRpcMapping[chain]);
    const signer = new ethers.Wallet(wallet.privateKey, provider);

    const tokenAbi = [
      "function approve(address spender, uint256 amount) returns (bool)",
    ];
    const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);

    console.log("Sending approval transaction...");
    const tx = await tokenContract.approve(allowedToAddress, amount);
    const receipt = await tx.wait();
    
    if (!receipt.status) {
      throw new Error("Transaction failed on-chain");
    }

    console.log(`Approval successful on ${chain.toUpperCase()}, TX hash: ${tx.hash}`);
    return tx.hash;
  } catch (error) {
    console.error(`EVM approval failed for token ${tokenAddress}:`, error);
    throw new Error(`EVM approval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function approveOnSolana(
  tokenAddress: string,
  allowedToAddress: string,
  amount: ethers.BigNumberish,
  wallet: { secretKey: Uint8Array }
) {
  try {
    console.log("Starting Solana approval process");
    
    const connection = new Connection(chainRpcMapping.solana, "confirmed");
    const ownerKeypair = Keypair.fromSecretKey(wallet.secretKey);

    const tokenMintAddress = new PublicKey(tokenAddress);
    const spenderAddress = new PublicKey(allowedToAddress);

    const ownerTokenAccount = await getAssociatedTokenAddress(
      tokenMintAddress,
      ownerKeypair.publicKey
    );

    const approveInstruction = createApproveInstruction(
      ownerTokenAccount,
      spenderAddress,
      ownerKeypair.publicKey,
      BigInt(amount.toString()) // Ensure proper BigInt conversion
    );

    const transaction = new Transaction().add(approveInstruction);
    transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
    transaction.feePayer = ownerKeypair.publicKey;

    console.log("Signing and sending Solana transaction...");
    const signature = await connection.sendTransaction(transaction, [ownerKeypair]);
    
    // Confirm transaction
    const confirmation = await connection.confirmTransaction(signature);
    if (confirmation.value.err) {
      throw new Error("Transaction failed on-chain: " + JSON.stringify(confirmation.value.err));
    }

    console.log(`Solana approval successful, TX signature: ${signature}`);
    return signature;
  } catch (error) {
    console.error(`Solana approval failed for token ${tokenAddress}:`, error);
    throw new Error(`Solana approval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}