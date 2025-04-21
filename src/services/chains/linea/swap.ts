import { ITokenInfo } from "../../../interface";
import {
  approvedToken,
  getCallDataFromOKX,
} from "../../../dex/okx/getCalldata";
import { generatePrivateKey } from "../../../wallet/createWallet";
import { ethers } from "ethers";
import { lineaProvider } from "../../..";
import { getSwapQuoteByKyber } from "../../../dex/kyber/getQuoteByKyber";
import { getWalletCredentials, handleTokenApproval } from "../../../controller";
import BigNumber from "bignumber.js";

// Linea chain configuration
// const LINEA_CHAIN_ID = 59144;

// export default async function swap(
//   walletAddress: string,
//   chatId: number,
//   fromTokenInfo: ITokenInfo,
//   toTokenInfo: ITokenInfo,
//   amount: any,
//   isSelling: boolean
// ) {
//   try {
//     // Convert amount to blockchain units
//     amount = ethers.parseUnits(Number(amount).toFixed(Number(fromTokenInfo.decimal)), Number(fromTokenInfo.decimal));
//     console.log("inside the linea swap","formattedAmount",amount,"fromTokenInfo",fromTokenInfo,"toTokenInfo",toTokenInfo,"amount",amount,"isSelling",isSelling);

//     // Handle token approval
//     if (isSelling) {
//       const approvedTx = await approvedToken(
//         fromTokenInfo.address,
//         amount,
//         LINEA_CHAIN_ID // Pass Linea chain ID
//       );

//       const approveTxn = approvedTx?.data[0];
//       let nonce = await lineaProvider.eth.getTransactionCount(walletAddress);

//       const txObject = {
//         nonce: nonce,
//         to: fromTokenInfo.address,
//         gasLimit: Number(BigInt(approveTxn?.gasLimit) * BigInt(2)),
//         gasPrice: (
//           (BigInt(approveTxn?.gasPrice) * BigInt(3)) /
//           BigInt(2)
//         ).toString(),
//         data: approveTxn?.data,
//         value: "0",
//       };

//       const privateKey = generatePrivateKey(chatId.toString());
//       const signedApproveTx = await lineaProvider.eth.accounts.signTransaction(
//         txObject,
//         privateKey
//       );
//       await lineaProvider.eth.sendSignedTransaction(signedApproveTx.rawTransaction);
//     }

//     // Get Linea-specific swap data from OKX API
//     const callData = await getCallDataFromOKX(
//       amount,
//       fromTokenInfo.address.toLowerCase(),
//       toTokenInfo.address.toLowerCase(),
//       walletAddress,
//       LINEA_CHAIN_ID // Specify Linea chain ID
//     );

//     if (!callData?.data?.[0]?.tx) {
//       throw new Error("Insufficient liquidity in the Pool");
//     }

//     // Prepare transaction for Linea
//     const tx = callData.data[0].tx;
//     console.log("tx--->",tx);
//     const txData = {
//       data: tx.data,
//       from: tx.from,
//       to: tx.to,
//       gas: tx.gas + 50,
//       value: tx.value,
//       maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
//       maxFeePerGas: "110000000",
//       gasLimit: 1000000,
//     };

//     // Sign and send transaction
//     const privateKey = generatePrivateKey(chatId.toString());
//     const signedTx = await lineaProvider.eth.accounts.signTransaction(
//       txData,
//       privateKey
//     );

//     const response = await lineaProvider.eth.sendSignedTransaction(
//       signedTx.rawTransaction
//     );

//     console.log("Linea swap successfull");
//     return {
//       txHash: signedTx.transactionHash,
//       fromToken: fromTokenInfo.symbol.toUpperCase(),
//       toToken: toTokenInfo.symbol.toUpperCase(),
//       fromAmount: Number(callData.data[0].routerResult.fromTokenAmount) / 10 ** fromTokenInfo.decimal,
//       toAmount: Number(callData.data[0].routerResult.toTokenAmount) / 10 ** toTokenInfo.decimal,
//     };
//   } catch (error:any) {
//     console.error("Linea swap error:", error);
//     throw new Error(error.message.includes("insufficient funds")
//       ? "Insufficient funds for gas"
//       : "Linea swap failed");
//   }
// }

export default async function swapToken(
  walletAddress: any,
  chatId: number,
  fromTokenInfo: ITokenInfo,
  toTokenInfo: ITokenInfo,
  amount: any,
  isSelling: any,
  chain: string
) {
  try {
    amount = ethers.parseUnits(
      BigNumber(amount).toFixed(Number(fromTokenInfo.decimal)),
      Number(fromTokenInfo.decimal)
    );
    console.log("amount-->", amount);
    // return
    let unBounded: boolean = false;

    // if (unBounded) {
    //   const txHash = await SwapToken(
    //     String(chatId),
    //     walletAddress,
    //     isSelling ? fromTokenInfo?.address : toTokenInfo?.address,
    //     amount,
    //     isSelling ? "sell" : "buy",
    //     true
    //   );
    //   if (txHash) {
    //     return txHash;
    //   } else {
    //     throw Error("Transaction Failed");
    //   }
    // }

    const QuoteByKyber: any = await getSwapQuoteByKyber(
      amount.toString(),
      fromTokenInfo,
      toTokenInfo,
      walletAddress,
      "linea"
    );
    const amountIn =
      Number(QuoteByKyber?.response?.message?.amountIn) /
      10 ** Number(fromTokenInfo.decimal);
    const amountOut =
      Number(QuoteByKyber?.response?.message?.amountOut) /
      10 ** Number(toTokenInfo.decimal);
    console.log(
      "the calldata is ",
      QuoteByKyber,
      "amount in --->",
      amountIn,
      "amount out--->",
      amountOut
    );

    const credential = getWalletCredentials(chatId.toString());
    if (isSelling) {
      //Take approval
      const routerAddress = QuoteByKyber?.response?.routerAddress;
      const wallet = {
        privateKey: credential.privateKey,
        secretKey: credential.secretKey,
      };
      await handleTokenApproval(
        fromTokenInfo.address,
        routerAddress,
        "linea",
        amount,
        wallet
      );
    }
           // Dynamic gas price fetching
    const [gasPrice, priorityFee, nonce] = await Promise.all([
      lineaProvider.eth.getGasPrice(),
      lineaProvider.eth.getMaxPriorityFeePerGas(),
      lineaProvider.eth.getTransactionCount(walletAddress, 'latest')
    ]);

    // Calculate maxFeePerGas (base fee + priority fee)
    const maxFeePerGas = BigInt(gasPrice) + BigInt(priorityFee);

    const txData = {
      from: walletAddress,
      to: QuoteByKyber.response.message.to,
      value: QuoteByKyber.response.message.value,
      data: QuoteByKyber.response.message.data,
      nonce: nonce,
      gasLimit: 500000, // Start with a reasonable base limit
      maxFeePerGas: maxFeePerGas.toString(),
      maxPriorityFeePerGas: priorityFee.toString(),
    };
    console.log("Transaction===>", txData);
   
    // Enhanced simulation check
    try {
      const simulation = await lineaProvider.eth.call(txData);
      console.log("Simulation successful:", simulation);
    } catch (simError : any) {
      console.error("Transaction simulation failed:", simError);
      throw new Error("Transaction simulation failed: " + simError.message);
    }

    const simulation = await lineaProvider.eth.call(txData);
    console.log("Simulation result:", simulation);
    console.log("the tx that I am sending for sign", txData);
    // Sign and send the swap transaction
    const signedTx = await lineaProvider.eth.accounts.signTransaction(
      txData,
      credential.privateKey
    );
    console.log("the signed transaction", signedTx);

    const response = await lineaProvider.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );
    // console.log("response in swap token : ", response);
    if (signedTx?.transactionHash) {
      const txHash = signedTx?.transactionHash;
      console.log("the transaction hash", txHash);
      return {
        txHash: txHash,
        fromToken: fromTokenInfo.symbol.toUpperCase(),
        toToken: toTokenInfo.symbol.toUpperCase(),
        fromAmount: amountIn,
        toAmount: amountOut,
      };
    } else {
      throw Error("Unable To find the transaction hash");
    }
  } catch (error: any) {
    console.log("Error in swapping tokens", error);
    if (
      error?.message?.includes("insufficient funds for gas * price + value")
    ) {
      throw Error("Insufficient funds for gas.");
    }
    throw Error("Error in swapping tokens");
  }
}
