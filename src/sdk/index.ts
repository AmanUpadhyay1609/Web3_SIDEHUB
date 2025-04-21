import { generatePrivateKey, generateWallets } from "../wallet/createWallet";
import { loadService } from "../helper/loadService";
import { supportedTokenOnChain } from "../dex/debridge/getSupportedtoken";
import { chainIdByName } from "../controller/config";
import { getCallData } from "../dex/debridge/getCallData";
import { signAndSendTransaction } from "../helper/signAndSendTransaction";
import { nativeTokenInfo } from "../helper/config";
import { getApproval } from "../helper/getApprovalMultichain";
import { ethers } from "ethers";
import { Keypair } from "@solana/web3.js";
import Web3 from "web3";
import { config as appConfig } from "../config";

export interface Wallet {
  // Define wallet structure accordingly
  [key: string]: any;
}

export interface CreateWalletResult {
  message: string;
  wallet: Wallet;
}

export interface TransferTokensParams {
  chain: string;
  walletAddress: string;
  value: string | number;
  toAddress: string;
  tokenInfo: any; // refine as needed
  isNative: boolean;
  chatId: number;
}

export interface TokenInfo {
  address: string;
  chain: string;
  symbol: string;
  decimal: number;
  // Add additional properties if needed
}

export interface SwapTokensParams {
  chain: string;
  walletAddress: string;
  chatId: number;
  fromTokenInfo: TokenInfo;
  toTokenInfo: TokenInfo;
  isSelling?: boolean;
  amount: string | number;
}

export interface ApproveTokenParams {
  tokenAddress: string;
  spender: string;
  chain: string;
  amount: number;
  chatId: string;
}

export interface WalletCredentials {
  evmWalletAddress: string;
  solanaWalletAddress: string;
  privateKey: string;
  secretKey: Uint8Array;
}

export interface EnvConfig {
  nodeEnv?: string;
  serverPort?: number;
  baseRPC: string;
  solanaRPC: string;
  lineaRPC: string;
  okxSign: string;
  okxProjectId: string;
  okxAccessKey: string;
  okxPassphrase: string;
  secretKey: string;
  jwtAuth?: string;
}

export class Sidehub {
  private envConfig: EnvConfig;

  constructor(envConfig: EnvConfig) {
    this.envConfig = {
      nodeEnv: envConfig.nodeEnv || 'development',
      serverPort: envConfig.serverPort || 6000,
      baseRPC: envConfig.baseRPC,
      solanaRPC: envConfig.solanaRPC,
      lineaRPC: envConfig.lineaRPC,
      okxSign: envConfig.okxSign,
      okxProjectId: envConfig.okxProjectId,
      okxAccessKey: envConfig.okxAccessKey,
      okxPassphrase: envConfig.okxPassphrase,
      secretKey: envConfig.secretKey,
      jwtAuth: envConfig.jwtAuth
    };
    // You can perform further initialization using this.envConfig if needed
  }

  public async createWallet(chatId: string): Promise<CreateWalletResult> {
    try {
      const wallet = generateWallets(chatId);
      return { message: "Wallets created successfully", wallet };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  public async transferTokens(params: TransferTokensParams): Promise<any> {
    try {
      const transferService = await loadService(params.chain.toLowerCase(), "transfer");
      const result = await transferService(
        params.walletAddress,
        params.value,
        params.toAddress,
        params.tokenInfo,
        params.isNative,
        params.chatId,
        params.chain
      );
      if (result.response.status === true) {
        return { message: "Tokens transferred successfully", result };
      } else {
        throw new Error(result.response.message);
      }
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  private normalizeAmount(tokenInfo: { amount: string; decimals: number }): number {
    return parseFloat(tokenInfo.amount) / Math.pow(10, tokenInfo.decimals);
  }

  public async swapTokens(params: SwapTokensParams): Promise<any> {
    const { chain, walletAddress, chatId, fromTokenInfo, toTokenInfo, isSelling = false, amount } = params;
    if (!walletAddress || !fromTokenInfo || !toTokenInfo || !amount) {
      throw new Error("Missing required fields in arguments");
    }

    // Same-chain swap
    if (fromTokenInfo.chain === toTokenInfo.chain) {
      const swapService = await loadService(chain.toLowerCase(), "swap");
      const result = await swapService(walletAddress, chatId, fromTokenInfo, toTokenInfo, amount, isSelling, chain);
      if (!result?.txHash) throw new Error("Swap transaction failed");
      return {
        message: "Transaction Completed Successfully",
        result: result.txHash,
        fromToken: result.fromToken,
        toToken: result.toToken,
        fromAmount: result.fromAmount,
        toAmount: result.toAmount,
      };
    }

    // Cross-chain swap scenarios
    const isFromTokenAvailable = await supportedTokenOnChain(
      chainIdByName[fromTokenInfo.chain],
      fromTokenInfo.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
        ? "0x0000000000000000000000000000000000000000"
        : fromTokenInfo.address
    );
    const isToTokenAvailable = await supportedTokenOnChain(
      chainIdByName[toTokenInfo.chain],
      toTokenInfo.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
        ? "0x0000000000000000000000000000000000000000"
        : toTokenInfo.address
    );

    if (isFromTokenAvailable && isToTokenAvailable) {
      // Direct cross-chain swap
      const tx = await getCallData(fromTokenInfo, toTokenInfo, chatId, amount);
      if (!this.isNativeToken(fromTokenInfo.address)) {
        const amountinBN = ethers.parseUnits(
          Number(amount).toFixed(Number(fromTokenInfo.decimal)),
          Number(fromTokenInfo.decimal)
        );
        await this.approveToken({
          tokenAddress: fromTokenInfo.address,
          spender: tx.tx.to,
          chain: fromTokenInfo.chain,
          amount: Number(amountinBN) * 2,
          chatId: chatId.toString()
        });
      }
      const result = await signAndSendTransaction(fromTokenInfo.chain, tx, chatId);
      return {
        message: "Transaction Completed Successfully",
        result: result,
        fromToken: fromTokenInfo.symbol.toUpperCase(),
        toToken: toTokenInfo.symbol.toUpperCase(),
        fromAmount: this.normalizeAmount(tx.estimation.srcChainTokenIn),
        toAmount: this.normalizeAmount(tx.estimation.dstChainTokenOut),
      };
    } else if (isFromTokenAvailable && !isToTokenAvailable) {
      // Two-step cross-chain swap (Scenario: available from token, unavailable to token)
      let msg = `This is a two-step cross-chain swap.`;
      const steps: any = {
        step1: { success: false, txHash: "", error: "", amountOut: null },
        step2: { success: false, txHash: "", error: "", amountOut: null }
      };
      try {
        const intermediateToken = nativeTokenInfo[toTokenInfo.chain as keyof typeof nativeTokenInfo];
        msg += `\n\nStep 1: Bridging to ${intermediateToken.symbol} on ${toTokenInfo.chain}...`;
        const bridgeTx = await getCallData(fromTokenInfo, intermediateToken, chatId, amount);
        if (!this.isNativeToken(fromTokenInfo.address)) {
          const amountinBN = ethers.parseUnits(
            Number(amount).toFixed(Number(fromTokenInfo.decimal)),
            Number(fromTokenInfo.decimal)
          );
          await this.approveToken({
            tokenAddress: fromTokenInfo.address,
            spender: bridgeTx.tx.to,
            chain: fromTokenInfo.chain,
            amount: Number(amountinBN) * 10,
            chatId: chatId.toString()
          });
        }
        const bridgeResult = await signAndSendTransaction(fromTokenInfo.chain, bridgeTx, chatId);
        steps.step1 = {
          success: true,
          txHash: bridgeResult,
          amountOut: bridgeTx.estimation.dstChainTokenOut,
          error: ""
        };
        msg += `\n✅ Step 1 Completed.`;
        const bridgeAmountOut = this.normalizeAmount(bridgeTx.estimation.dstChainTokenOut);
        msg += `\n\nStep 2: Swapping to ${toTokenInfo.symbol}...`;
        const swapService = await loadService(toTokenInfo.chain.toLowerCase(), "swap");
        const swapResult = await swapService(walletAddress, chatId, intermediateToken, toTokenInfo, bridgeAmountOut, false, toTokenInfo.chain);
        steps.step2 = {
          success: !!swapResult?.txHash,
          txHash: swapResult?.txHash,
          amountOut: swapResult?.toAmount,
          error: !swapResult?.txHash ? 'Swap transaction failed' : ""
        };
        if (!steps.step2.success) throw new Error(steps.step2.error);
        msg += `\n✅ Step 2 Completed.`;
        return {
          message: msg + "\n\nTransaction Completed Successfully",
          steps,
          result: steps.step1.txHash,
          fromToken: fromTokenInfo.symbol.toUpperCase(),
          toToken: toTokenInfo.symbol.toUpperCase(),
          fromAmount: amount,
          toAmount: steps.step2.amountOut
        };
      } catch (error: any) {
        throw new Error(error.message);
      }
    } else if (!isFromTokenAvailable && isToTokenAvailable) {
      // Two-step cross-chain swap (Scenario: unavailable from token, available to token)
      let msg = `This is a two-step cross-chain swap.`;
      const steps: any = {
        step1: { success: false, txHash: "", error: "", amountOut: null },
        step2: { success: false, txHash: "", error: "", amountOut: null }
      };
      try {
        const intermediateToken = nativeTokenInfo[fromTokenInfo.chain as keyof typeof nativeTokenInfo];
        msg += `\n\nStep 1: Swapping to ${intermediateToken.symbol}...`;
        const swapService = await loadService(fromTokenInfo.chain.toLowerCase(), "swap");
        const swapResult = await swapService(walletAddress, chatId, fromTokenInfo, intermediateToken, amount, true, fromTokenInfo.chain);
        steps.step1 = {
          success: !!swapResult?.txHash,
          txHash: swapResult?.txHash,
          amountOut: swapResult?.toAmount,
          error: !swapResult?.txHash ? 'Initial swap failed' : ""
        };
        if (!steps.step1.success) throw new Error(steps.step1.error);
        msg += `\n✅ Step 1 Completed.`;
        msg += `\n\nStep 2: Bridging to ${toTokenInfo.symbol}...`;
        const bridgeTx = await getCallData(intermediateToken, toTokenInfo, chatId, steps.step1.amountOut);
        const bridgeResult = await signAndSendTransaction(fromTokenInfo.chain, bridgeTx, chatId);
        steps.step2 = {
          success: !!bridgeResult,
          txHash: bridgeResult,
          amountOut: bridgeTx.estimation.dstChainTokenOut,
          error: !bridgeResult ? 'Bridging failed' : ""
        };
        if (!steps.step2.success) throw new Error(steps.step2.error);
        msg += `\n✅ Step 2 Completed.`;
        return {
          message: msg + "\n\nTransaction Completed Successfully",
          steps,
          result: steps.step2.txHash,
          fromToken: fromTokenInfo.symbol.toUpperCase(),
          toToken: toTokenInfo.symbol.toUpperCase(),
          fromAmount: amount,
          toAmount: steps.step2.amountOut
        };
      } catch (error: any) {
        throw new Error(error.message);
      }
    } else {
      // Complex three-step cross-chain swap
      let msg = `This is a three step cross chain swap.`;
      const steps: any = {
        step1: { success: false, txHash: "", error: "", amountOut: null },
        step2: { success: false, txHash: "", error: "", amountOut: null },
        step3: { success: false, txHash: "", error: "", amountOut: null }
      };
      try {
        const sourceNative = nativeTokenInfo[fromTokenInfo.chain as keyof typeof nativeTokenInfo];
        msg += `\n\nStep 1: Swapping to ${sourceNative.symbol}...`;
        const swapService1 = await loadService(fromTokenInfo.chain.toLowerCase(), "swap");
        const swapResult1 = await swapService1(walletAddress, chatId, fromTokenInfo, sourceNative, amount, true, fromTokenInfo.chain);
        steps.step1 = {
          success: !!swapResult1?.txHash,
          txHash: swapResult1?.txHash,
          amountOut: swapResult1?.toAmount,
          error: !swapResult1?.txHash ? 'Initial swap failed' : ""
        };
        if (!steps.step1.success) throw new Error(steps.step1.error);
        msg += `\n✅ Step 1 Completed.`;
        let bridgeAmountOut = null;
        msg += `\n\nStep 2: Bridging to destination chain...`;
        const destNative = nativeTokenInfo[toTokenInfo.chain as keyof typeof nativeTokenInfo];
        const bridgeTx = await getCallData(sourceNative, destNative, chatId, steps.step1.amountOut);
        const bridgeResult = await signAndSendTransaction(fromTokenInfo.chain, bridgeTx, chatId);
        steps.step2 = {
          success: !!bridgeResult,
          txHash: bridgeResult,
          amountOut: bridgeTx.estimation.dstChainTokenOut,
          error: !bridgeResult ? 'Bridging failed' : ""
        };
        bridgeAmountOut = this.normalizeAmount(bridgeTx.estimation.dstChainTokenOut);
        if (!steps.step2.success) throw new Error(steps.step2.error);
        msg += `\n✅ Step 2 Completed.`;
        msg += `\n\nStep 3: Swapping to ${toTokenInfo.symbol}...`;
        const swapService2 = await loadService(toTokenInfo.chain.toLowerCase(), "swap");
        const swapResult2 = await swapService2(walletAddress, chatId, nativeTokenInfo[toTokenInfo.chain as keyof typeof nativeTokenInfo], toTokenInfo, bridgeAmountOut, false, toTokenInfo.chain);
        steps.step3 = {
          success: !!swapResult2?.txHash,
          txHash: swapResult2?.txHash,
          amountOut: swapResult2?.toAmount,
          error: !swapResult2?.txHash ? 'Final swap failed' : ""
        };
        if (!steps.step3.success) throw new Error(steps.step3.error);
        msg += `\n✅ Step 3 Completed.`;
        return {
          message: msg + "\n\nTransaction Completed Successfully",
          steps,
          result: steps.step2.txHash,
          fromToken: fromTokenInfo.symbol.toUpperCase(),
          toToken: toTokenInfo.symbol.toUpperCase(),
          fromAmount: amount,
          toAmount: steps.step3.amountOut || steps.step2.amountOut || steps.step1.amountOut || 0
        };
      } catch (error: any) {
        throw new Error(error.message);
      }
    }
  }

  public isNativeToken(address: string): boolean {
    return [
      "0x0000000000000000000000000000000000000000",
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      "11111111111111111111111111111111"
    ].includes(address.toLowerCase());
  }

  public getWalletCredentials(chatId: string): WalletCredentials {
    const privateKey = generatePrivateKey(chatId);
    const web3 = new Web3(this.envConfig.lineaRPC);
    const evmWallet = web3.eth.accounts.privateKeyToAccount(privateKey);
    const solanaPrivateKeyBuffer = Buffer.from(privateKey.slice(2), "hex");
    const keypair = Keypair.fromSeed(solanaPrivateKeyBuffer.slice(0, 32));
    return {
      evmWalletAddress: evmWallet.address,
      solanaWalletAddress: keypair.publicKey.toBase58(),
      privateKey: evmWallet.privateKey,
      secretKey: keypair.secretKey
    };
  }

  public async approveToken(params: ApproveTokenParams): Promise<any> {
    try {
      const wallet = this.getWalletCredentials(params.chatId);
      const txHash = await getApproval(
        params.tokenAddress,
        params.spender,
        params.chain as "base" | "linea" | "solana",
        params.amount,
        wallet
      );
      return txHash;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
}

export default Sidehub; 