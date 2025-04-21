import { Request, Response } from "express";
import { generatePrivateKey, generateWallets } from "../wallet/createWallet";
import { loadService } from "../helper/loadService";
import { supportedTokenOnChain } from "../dex/debridge/getSupportedtoken";
import { chainIdByName } from "./config";
import { getCallData } from "../dex/debridge/getCallData";
import { signAndSendTransaction } from "../helper/signAndSendTransaction";
import { nativeTokenInfo } from "../helper/config";
import { getApproval } from "../helper/getApprovalMultichain";
import { ethers } from "ethers";
import { Keypair } from "@solana/web3.js";
import Web3 from "web3";
import { config } from "../config";

export const createWallet = async (req: Request, res: Response) => {
  try {
    const wallet = generateWallets(req.body.chatId.toString());
    res.status(201).json({ message: "Wallets created successfully", wallet });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const transferTokens = async (req: Request, res: Response) => {
  try {
    const { chain, ...data } = req.body;
    console.log("chain id", chain, "data trnsfer", data);
    if (!chain) {
      return res.status(400).json({ message: "Chain is required" });
    }

    const transferService = await loadService(chain.toLowerCase(), "transfer");
    let walletAddress: string = req.body.walletAddress;
    let value: string | number = req.body.value;
    let toAddress: string = req.body.toAddress;
    let tokenInfo: any = req.body.tokenInfo;
    let isNative: boolean = req.body.isNative;
    let chatId: number = Number(req.body.chatId);
    const result = await transferService(
      walletAddress,
      value,
      toAddress,
      tokenInfo,
      isNative,
      chatId,
      chain
    );
    console.log("the transaction result", result);
    if (result.response.status === true) {
      res
        .status(200)
        .json({ message: "Tokens transferred successfully", result });
    } else {
      throw new Error(result.response.message);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const swapTokens = async (req: Request, res: Response) => {
  try {
    // Extract parameters from request body
    const { chain, ...data } = req.body;
    const {
      walletAddress,
      chatId,
      fromTokenInfo,
      toTokenInfo,
      isSelling,
      amount,
    } = data;

    // Validate required parameters
    if (!walletAddress || !fromTokenInfo || !toTokenInfo || !amount) {
      return res
        .status(400)
        .json({ message: "Missing required fields in request body" });
    }

    // Prepare swap data object for logging/debugging
    const swapData = {
      walletAddress,
      chatId,
      fromTokenInfo,
      toTokenInfo,
      amount,
      isSelling,
      chain,
    };
    console.log("Swap data:", swapData);

    // Handle same-chain swap
    if (fromTokenInfo.chain === toTokenInfo?.chain) {
      console.log("Processing same-chain swap...");

      const swapService = await loadService(chain.toLowerCase(), "swap");
      const result = await swapService(
        walletAddress,
        chatId,
        fromTokenInfo,
        toTokenInfo,
        amount,
        isSelling,
        chain
      );

      if (!result?.txHash) throw new Error("Swap transaction failed");

      return res.status(200).json({
        message: "Transaction Completed Successfully",
        result: result.txHash,
        fromToken: result.fromToken,
        toToken: result.toToken,
        fromAmount: result.fromAmount,
        toAmount: result.toAmount,
      });
    }

    // Handle cross-chain swap
    console.log("Processing cross-chain swap...");

    // Check token support on both chains
    const [isFromTokenAvailable, isToTokenAvailable] = await Promise.all([
      supportedTokenOnChain(
        chainIdByName[fromTokenInfo.chain],
        fromTokenInfo?.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
          ? "0x0000000000000000000000000000000000000000"
          : fromTokenInfo?.address
      ),
      supportedTokenOnChain(
        chainIdByName[toTokenInfo.chain],
        toTokenInfo?.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
          ? "0x0000000000000000000000000000000000000000"
          : toTokenInfo?.address
      ),
    ]);

    console.log("Token availability:", {
      isFromTokenAvailable,
      isToTokenAvailable,
    });

    // Cross-chain swap scenarios
    if (isFromTokenAvailable && isToTokenAvailable) {
      console.log("Processing direct cross-chain swap...");
      // Direct cross-chain swap
      const tx = await getCallData(fromTokenInfo, toTokenInfo, chatId, amount);

      if (!isNativeToken(fromTokenInfo.address)) {
        console.log("Processing token approval...");
        let amountinBN = ethers.parseUnits(
          Number(amount).toFixed(Number(fromTokenInfo.decimal)),
          Number(fromTokenInfo.decimal)
        );
        await handleTokenApproval(
          fromTokenInfo.address,
          tx.tx.to,
          fromTokenInfo.chain,
          Number(amountinBN) * 2, // Higher buffer for multi-step
          getWalletCredentials(chatId)
        );
      }

      const result = await signAndSendTransaction(
        fromTokenInfo.chain,
        tx,
        chatId
      );

      return res.status(200).json({
        message: `Transaction Completed Successfully`,
        result,
        fromToken: fromTokenInfo.symbol.toUpperCase(),
        toToken: toTokenInfo.symbol.toUpperCase(),
        fromAmount: normalizeAmount(tx.estimation.srcChainTokenIn),
        toAmount: normalizeAmount(tx.estimation.dstChainTokenOut),
      });
    } else if (isFromTokenAvailable && !isToTokenAvailable) {
      console.log("Processing two-step cross-chain swap...isFromTokenAvailable && !isToTokenAvailable");
      let msg = `This is a two-step cross-chain swap.`;
      const steps = {
        step1: { success: false, txHash: "", error: "", amountOut: null },
        step2: { success: false, txHash: "", error: "", amountOut: null }
      };
    
      try {
        const intermediateToken = nativeTokenInfo[toTokenInfo.chain as keyof typeof nativeTokenInfo];
        
        // Step 1: Bridge
        let bridgeAmountOut = null;
        try {
          msg += `\n\nStep 1: Bridging to ${intermediateToken.symbol} on ${toTokenInfo.chain}...`;
          const bridgeTx = await getCallData(fromTokenInfo, intermediateToken, chatId, amount);
    
          if (!isNativeToken(fromTokenInfo.address)) {
            console.log("Processing token approval...");
            const amountinBN = ethers.parseUnits(
              Number(amount).toFixed(Number(fromTokenInfo.decimal)),
              Number(fromTokenInfo.decimal)
            );
            await handleTokenApproval(
              fromTokenInfo.address,
              bridgeTx.tx.to,
              fromTokenInfo.chain,
              Number(amountinBN) * 10,
              getWalletCredentials(chatId)
            );
          }
    
          const bridgeResult = await signAndSendTransaction(fromTokenInfo.chain, bridgeTx, chatId);
          steps.step1 = { 
            success: true, 
            txHash: bridgeResult,
            amountOut: bridgeTx.estimation.dstChainTokenOut,
            error: ""
          };
          msg += `\n✅ Step 1 Completed: <a href="${nativeTokenInfo[fromTokenInfo.chain as keyof typeof nativeTokenInfo].explorerUrl}/tx/${bridgeResult}">Explorer Url 🔗</a>`;
          bridgeAmountOut = normalizeAmount(bridgeTx.estimation.dstChainTokenOut);
        } catch (step1Error) {
          steps.step1.error = (step1Error as Error).message;
          msg += `\n❌ Step 1 failed: ${steps.step1.error}`;
          throw new Error('Swap failed at bridging step');
        }
    
        // Step 2: Swap
        try {
          if (!steps.step1.success) throw new Error('Skipping swap due to failed bridge');
          
          msg += `\n\nStep 2: Swapping to ${toTokenInfo.symbol}...`;
          const swapService = await loadService(toTokenInfo.chain.toLowerCase(), "swap");
          const swapResult = await swapService(
            walletAddress,
            chatId,
            intermediateToken,
            toTokenInfo,
            bridgeAmountOut,
            false,
            toTokenInfo.chain
          );
    
          steps.step2 = {
            success: !!swapResult?.txHash,
            txHash: swapResult?.txHash,
            amountOut: swapResult?.toAmount,
            error: !swapResult?.txHash ? 'Swap transaction failed' : ""
          };
          
          if (steps.step2.success) {
            msg += `\n✅ Step 2 Completed: <a href="${nativeTokenInfo[toTokenInfo.chain as keyof typeof nativeTokenInfo].explorerUrl}/tx/${swapResult.txHash}">Explorer Url 🔗</a>`;
          } else {
            msg += `\n❌ Step 2 failed: ${steps.step2.error}`;
            throw new Error(steps.step2.error);
          }
        } catch (step2Error) {
          steps.step2.error = (step2Error as Error).message;
          msg += `\n❌ Step 2 failed: ${steps.step2.error}`;
          throw new Error('Swap failed at final conversion');
        }
    
        return res.status(200).json({
          success: steps.step1.success && steps.step2.success,
          message: msg + `\n\nTransaction Completed Successfully`,
          steps,
          result: steps?.step1?.txHash,
          fromToken: fromTokenInfo.symbol.toUpperCase(),
          toToken: toTokenInfo.symbol.toUpperCase(),
          fromAmount: amount,
          toAmount: steps?.step2?.amountOut 
        });
    
      } catch (finalError) {
        return res.status(200).json({
          success: false,
          message: msg + `\n\n⚠️ Process completed with errors`,
          steps,
          error: (finalError as Error).message,
          fromToken: fromTokenInfo.symbol.toUpperCase(),
          toToken: toTokenInfo.symbol.toUpperCase(),
          fromAmount: amount,
          toAmount: steps.step2.amountOut || steps.step1.amountOut || 0
        });
      }
    } 
    else if (!isFromTokenAvailable && isToTokenAvailable) {
      console.log("Processing two-step cross-chain swap...!isFromTokenAvailable && isToTokenAvailable");
      let msg = `This is a two-step cross-chain swap.`;
      const steps = {
        step1:  { success: false, txHash: "", error: "", amountOut: null },
        step2:  { success: false, txHash: "", error: "", amountOut: null }
      };
    
      try {
        const intermediateToken = nativeTokenInfo[fromTokenInfo.chain as keyof typeof nativeTokenInfo];
        
        // Step 1: Swap to native
        try {
          msg += `\n\nStep 1: Swapping to ${intermediateToken.symbol}...`;
          const swapService = await loadService(fromTokenInfo.chain.toLowerCase(), "swap");
          const swapResult = await swapService(
            walletAddress,
            chatId,
            fromTokenInfo,
            intermediateToken,
            amount,
            true,
            fromTokenInfo.chain
          );
    
          steps.step1 = {
            success: !!swapResult?.txHash,
            txHash: swapResult?.txHash,
            amountOut: swapResult?.toAmount,
            error: !swapResult?.txHash ? 'Initial swap failed' : ""
          };
    
          if (!steps.step1.success) throw new Error(steps.step1.error);
          msg += `\n✅ Step 1 Completed: <a href="${nativeTokenInfo[fromTokenInfo.chain as keyof typeof nativeTokenInfo].explorerUrl}/tx/${swapResult.txHash}">Explorer Url 🔗</a>`;
        } catch (step1Error) {
          steps.step1.error = (step1Error as Error).message;
          msg += `\n❌ Step 1 failed: ${steps.step1.error}`;
          throw new Error('Swap failed at initial conversion');
        }
    
        // Step 2: Bridge
        try {
          msg += `\n\nStep 2: Bridging to ${toTokenInfo.symbol}...`;
          const bridgeTx = await getCallData(
            intermediateToken,
            toTokenInfo,
            chatId,
            steps.step1.amountOut
          );
          
          const bridgeResult = await signAndSendTransaction(fromTokenInfo.chain, bridgeTx, chatId);
          steps.step2 = {
            success: !!bridgeResult,
            txHash: bridgeResult,
            amountOut: bridgeTx.estimation.dstChainTokenOut,
            error: !bridgeResult ? 'Bridging failed' : ""
          };
    
          if (!steps.step2.success) throw new Error(steps.step2.error);
          msg += `\n✅ Step 2 Completed: <a href="${nativeTokenInfo[fromTokenInfo.chain as keyof typeof nativeTokenInfo].explorerUrl}/tx/${bridgeResult}">Explorer Url 🔗</a>`;
        } catch (step2Error) {
          steps.step2.error = (step2Error as Error).message;
          msg += `\n❌ Step 2 failed: ${steps.step2.error}`;
          throw new Error('Swap failed at bridging step');
        }
    
        return res.status(200).json({
          success: steps.step1.success && steps.step2.success,
          message: msg + `\n\nTransaction Completed Successfully`,
          steps,
          result: steps?.step2?.txHash ,
          fromToken: fromTokenInfo.symbol.toUpperCase(),
          toToken: toTokenInfo.symbol.toUpperCase(),
          fromAmount: amount,
          toAmount: steps?.step2?.amountOut 
        });
    
      } catch (finalError) {
        return res.status(200).json({
          success: false,
          message: msg + `\n\n⚠️ Process completed with errors`,
          steps,
          error: (finalError as Error).message,
          fromToken: fromTokenInfo.symbol.toUpperCase(),
          toToken: toTokenInfo.symbol.toUpperCase(),
          fromAmount: amount,
          toAmount: steps.step2.amountOut || steps.step1.amountOut || 0
        });
      }
    }
    else {
      console.log("Processing complex cross-chain swap...");
      let msg = `This is a three step cross chain swap.`;
      const steps = {
        step1:  { success: false, txHash: "", error: "", amountOut: null },
        step2:  { success: false, txHash: "", error: "", amountOut: null },
        step3:  { success: false, txHash: "", error: "", amountOut: null }
      };
    
      try {
        // Step 1: Swap to source native
        const sourceNative = nativeTokenInfo[fromTokenInfo.chain as keyof typeof nativeTokenInfo];
        try {
          msg += `\n\nStep 1: Swapping to ${sourceNative.symbol}...`;
          const swapService1 = await loadService(fromTokenInfo.chain.toLowerCase(), "swap");
          const swapResult1 = await swapService1(
            walletAddress,
            chatId,
            fromTokenInfo,
            sourceNative,
            amount,
            true,
            fromTokenInfo.chain
          );
    
          steps.step1 = {
            success: !!swapResult1?.txHash,
            txHash: swapResult1?.txHash,
            amountOut: swapResult1?.toAmount,
            error: !swapResult1?.txHash ? 'Initial swap failed' : ""
          };
    
          if (!steps.step1.success) throw new Error(steps.step1.error);
          msg += `\n✅ Step 1 Completed: <a href="${nativeTokenInfo[fromTokenInfo.chain as keyof typeof nativeTokenInfo].explorerUrl}/tx/${swapResult1.txHash}">Explorer Url 🔗</a>`;
        } catch (step1Error) {
          steps.step1.error = (step1Error as Error).message;
          msg += `\n❌ Step 1 failed: ${steps.step1.error}`;
          throw new Error('Swap failed at first conversion');
        }
    
        // Step 2: Bridge
        let bridgeAmountOut = null;
        try {
          msg += `\n\nStep 2: Bridging to destination chain...`;
          const destNative = nativeTokenInfo[toTokenInfo.chain as keyof typeof nativeTokenInfo];
          const bridgeTx = await getCallData(
            sourceNative,
            destNative,
            chatId,
            steps.step1.amountOut
          );
          
          const bridgeResult = await signAndSendTransaction(fromTokenInfo.chain, bridgeTx, chatId);
          steps.step2 = {
            success: !!bridgeResult,
            txHash: bridgeResult,
            amountOut: bridgeTx.estimation.dstChainTokenOut,
            error: !bridgeResult ? 'Bridging failed' : ""
          };
          bridgeAmountOut = normalizeAmount(steps.step2.amountOut as any);
    
          if (!steps.step2.success) throw new Error(steps.step2.error);
          msg += `\n✅ Step 2 Completed: <a href="${nativeTokenInfo[fromTokenInfo.chain as keyof typeof nativeTokenInfo].explorerUrl}/tx/${bridgeResult}">Explorer Url 🔗</a>`;
        } catch (step2Error) {
          steps.step2.error = (step2Error as Error).message;
          msg += `\n❌ Step 2 failed: ${steps.step2.error}`;
          throw new Error('Swap failed at bridging');
        }
    
        // Step 3: Final swap
        try {
          msg += `\n\nStep 3: Swapping to ${toTokenInfo.symbol}...`;
          const swapService2 = await loadService(toTokenInfo.chain.toLowerCase(), "swap");
          const swapResult2 = await swapService2(
            walletAddress,
            chatId,
            nativeTokenInfo[toTokenInfo.chain as keyof typeof nativeTokenInfo],
            toTokenInfo,
            bridgeAmountOut,
            false,
            toTokenInfo.chain
          );
    
          steps.step3 = {
            success: !!swapResult2?.txHash,
            txHash: swapResult2?.txHash,
            amountOut: swapResult2?.toAmount,
            error: !swapResult2?.txHash ? 'Final swap failed' : ""
          };
    
          if (!steps.step3.success) throw new Error(steps.step3.error);
          msg += `\n✅ Step 3 Completed: <a href="${nativeTokenInfo[toTokenInfo.chain as keyof typeof nativeTokenInfo].explorerUrl}/tx/${swapResult2.txHash}">Explorer Url 🔗</a>`;
        } catch (step3Error) {
          steps.step3.error = (step3Error as Error).message;
          msg += `\n❌ Step 3 failed: ${steps.step3.error}`;
          throw new Error('Swap failed at final conversion');
        }
    
        return res.status(200).json({
          success: steps.step1.success && steps.step2.success && steps.step3.success,
          message: msg + `\n\nTransaction Completed Successfully`,
          steps,
          result: steps.step2.txHash ,
          fromToken: fromTokenInfo.symbol.toUpperCase(),
          toToken: toTokenInfo.symbol.toUpperCase(),
          fromAmount: amount,
          toAmount: steps.step3.amountOut || steps.step2.amountOut || steps.step1.amountOut || 0
        });
    
      } catch (finalError) {
        return res.status(200).json({
          success: false,
          message: msg + `\n\n⚠️ Process completed with errors`,
          steps,
          error: (finalError as Error).message,
          fromToken: fromTokenInfo.symbol.toUpperCase(),
          toToken: toTokenInfo.symbol.toUpperCase(),
          fromAmount: amount,
          toAmount: steps.step3.amountOut || steps.step2.amountOut || steps.step1.amountOut || 0
        });
      }
    }
  } catch (error: any) {
    console.error("Swap error:", error);
    res.status(500).json({
      message: error.message || "Internal swap error",
      errorDetails: error.details || null,
    });
  }
};

// Helper functions
export const isNativeToken = (address: string): boolean =>
  [
    "0x0000000000000000000000000000000000000000",
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "11111111111111111111111111111111",
  ].includes(address.toLowerCase());
const normalizeAmount = (tokenInfo: {
  amount: string;
  decimals: number;
}): number => parseFloat(tokenInfo.amount) / Math.pow(10, tokenInfo.decimals);

export const getWalletCredentials = (chatId: string) => {
  const privateKey = generatePrivateKey(chatId);
  const web3 = new Web3(config.lineaRPC);
  const evmWallet = web3.eth.accounts.privateKeyToAccount(privateKey);

  const solanaPrivateKeyBuffer = Buffer.from(privateKey.slice(2), "hex");
  const keypair = Keypair.fromSeed(solanaPrivateKeyBuffer.slice(0, 32));
  const solanaSecretKey: Uint8Array = keypair.secretKey;
  return {
    evmWalletAddress: evmWallet.address,
    solanaWalletAddress: keypair.publicKey.toBase58(),
    privateKey: evmWallet.privateKey,
    secretKey: solanaSecretKey,
  };
};

export const handleTokenApproval = async (
  tokenAddress: string,
  spender: string,
  chain: any,
  amount: any,
  wallet: { privateKey: string; secretKey: Uint8Array }
) => {
  console.log("Processing token approval...", { tokenAddress, spender, chain, amount });
  const txHash = await getApproval(
    tokenAddress,
    spender,
    chain,
    amount,
    wallet
  );
  console.log(`Approval successful. TX hash: ${txHash}`);
  return txHash;
};
