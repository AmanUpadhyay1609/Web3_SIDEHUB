import { ITokenInfo } from "../../../interface";
import { SwapToken } from "./virtualswap";
import {
  approvedToken,
  getCallDataFromOKX,
} from "../../../dex/okx/getCalldata";
import { baseProvider } from "../../..";
import { generatePrivateKey } from "../../../wallet/createWallet";
import { ethers } from "ethers";
import { getApproval } from "../../../helper/getApprovalMultichain";
import { getWalletCredentials, handleTokenApproval } from "../../../controller";
import { getSwapQuoteByKyber } from "../../../dex/kyber/getQuoteByKyber";
import BigNumber from "bignumber.js";

// export default async function swapToken(
//   walletAddress: any,
//   chatId: number,
//   fromTokenInfo: ITokenInfo,
//   toTokenInfo: ITokenInfo,
//   amount: any,
//   isSelling: any,
//   chain: string
// ) {
//   try {
//     amount = ethers.parseUnits(Number(amount).toFixed(Number(fromTokenInfo.decimal)), Number(fromTokenInfo.decimal));
//     console.log("amount-->", amount);
//     // return
//     let unBounded: boolean = false;

//     if (unBounded) {
//       const txHash = await SwapToken(
//         String(chatId),
//         walletAddress,
//         isSelling ? fromTokenInfo?.address : toTokenInfo?.address,
//         amount,
//         isSelling ? "sell" : "buy",
//         true
//       );
//       if (txHash) {
//         return txHash;
//       } else {
//         throw Error("Transaction Failed");
//       }
//     }
//     if (isSelling) {
//       const approvedTx = await approvedToken(fromTokenInfo?.address, amount, 8453);
//       console.log("approvedTx", approvedTx);

//       const approveTxn = approvedTx?.data[0];
//       let nonce = await baseProvider.eth.getTransactionCount(walletAddress);
//       const txObject = {
//         nonce: nonce,
//         to: fromTokenInfo?.address, // approve token address
//         gasLimit: Number(BigInt(approveTxn?.gasLimit) * BigInt(2)), // avoid GasLimit too low
//         gasPrice: (
//           (BigInt(approveTxn?.gasPrice) * BigInt(3)) /
//           BigInt(2)
//         ).toString(), // avoid GasPrice too low
//         data: approveTxn?.data, // approve callData
//         value: "0", // approve value fix 0 since user is not sending any ETH or token
//       };
//       try {
//         let privateKey = generatePrivateKey(chatId.toString());
//         const apptoveSignedTx = await baseProvider.eth.accounts.signTransaction(
//           txObject,
//           privateKey
//         );

//         const approveResponse = await baseProvider.eth.sendSignedTransaction(
//           apptoveSignedTx.rawTransaction
//         );
//       } catch (error) {
//         throw error;
//       }
//     }

//     const callData = await getCallDataFromOKX(
//       amount.toString(),
//       fromTokenInfo?.address.toLowerCase(),
//       toTokenInfo?.address.toLowerCase(),
//       walletAddress,
//       8453
//     );
//     console.log("callData in swap token : ", callData.data[0]);
//     const fromAmount =
//       Number(callData?.data[0]?.routerResult?.fromTokenAmount) /
//       10 ** Number(fromTokenInfo.decimal);
//     const toAmount =
//       Number(callData?.data[0]?.routerResult?.toTokenAmount) /
//       10 ** Number(toTokenInfo.decimal);
//     console.log("fromAmount, toAmount", fromAmount, toAmount);

//     if (!callData || !callData?.data[0]?.tx) {
//       throw Error("Insufficient liquidity in the Pool");
//     }

//     // await ctx.api.sendMessage(chatId, quote1.response.message);

//     const tx = callData?.data[0]?.tx;
//     // let nonce = await web3.eth.getTransactionCount(walletAddress);
//     const txData = {
//       data: tx?.data,
//       from: tx?.from,
//       to: tx?.to,
//       gas: tx?.gas + 50,
//       value: tx?.value,
//       maxPriorityFeePerGas: tx?.maxPriorityFeePerGas,
//       maxFeePerGas: "110000000",
//       gasLimit: 1000000,
//       // nonce: nonce,
//     };
//     // console.log("Transaction===>",txData)
//     // console.log("txCall Data : ", tx,txData,callData?.data[0]);
//     let privateKey = generatePrivateKey(chatId.toString());
//     const signedTx = await baseProvider.eth.accounts.signTransaction(
//       txData,
//       privateKey
//     );

//     const response = await baseProvider.eth.sendSignedTransaction(
//       signedTx.rawTransaction
//     );
//     // console.log("response in swap token : ", response);
//     if (signedTx?.transactionHash) {
//       const txHash = signedTx?.transactionHash;
//       console.log("the transaction hash", txHash);
//       return {
//         txHash: txHash,
//         fromToken: fromTokenInfo.symbol.toUpperCase(),
//         toToken: toTokenInfo.symbol.toUpperCase(),
//         fromAmount: fromAmount,
//         toAmount: toAmount,
//       };
//     } else {
//       throw Error("Unable To find the transaction hash");
//     }
//   } catch (error: any) {
//     console.log("Error in swapping tokens", error);
//     if (
//       error?.message?.includes("insufficient funds for gas * price + value")
//     ) {
//       throw Error("Insufficient funds for gas.");
//     }
//     throw Error("Error in swapping tokens");
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

    if (unBounded) {
      const txHash = await SwapToken(
        String(chatId),
        walletAddress,
        isSelling ? fromTokenInfo?.address : toTokenInfo?.address,
        amount,
        isSelling ? "sell" : "buy",
        true
      );
      if (txHash) {
        return txHash;
      } else {
        throw Error("Transaction Failed");
      }
    }

    const QuoteByKyber: any = await getSwapQuoteByKyber(
      amount.toString(),
      fromTokenInfo,
      toTokenInfo,
      walletAddress,
      "base"
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
        "base",
        amount,
        wallet
      );
    }

    const txData = {
      from: QuoteByKyber.response.message.from, // Sender's address
      to: QuoteByKyber.response.message.to, // Router address
      value: QuoteByKyber.response.message.value,
      data: QuoteByKyber.response.message.data, // Encoded function call data
      gasLimit: 1000000,
      maxFeePerGas: "110000000",
      maxPriorityFeePerGas: "110000", // Adjust priority fee
    };
    console.log("the tx that I am sending for sign", txData);
    // Sign and send the swap transaction
    const signedTx = await baseProvider.eth.accounts.signTransaction(
      txData,
      credential.privateKey
    );

    const response = await baseProvider.eth.sendSignedTransaction(
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
