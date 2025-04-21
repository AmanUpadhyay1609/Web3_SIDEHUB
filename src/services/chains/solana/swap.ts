import { solanaProvider } from "../../..";
import { ITokenInfo, SwapCompute } from "../../../interface";
import {
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  API_URLS,
  parseTokenAccountResp,
  TxVersion,
} from "@raydium-io/raydium-sdk-v2";
import { getWalletBalance } from "../../../utils/getwalletBalance";
import { generatePrivateKey } from "../../../wallet/createWallet";
import { ComputeBudgetProgram, Keypair, sendAndConfirmTransaction, Transaction, VersionedTransaction } from "@solana/web3.js";
import { conpetativeTokens, kolReferralAddress } from "./constants";
import { amountDistribution } from "../../../helper/amountDistribution";
import BigNumber from "bignumber.js";
import axios from "axios";
import { transferAmount, transferNonNativeToken } from "./transfer";
import { ethers } from "ethers";

 
export const txVersion = TxVersion.V0; // or TxVersion.LEGACY

export const fetchTokenAccountData = async (owner: any) => {
  const solAccountResp = await solanaProvider.getAccountInfo(owner.publicKey);
  const tokenAccountResp = await solanaProvider.getTokenAccountsByOwner(
    owner.publicKey,
    { programId: TOKEN_PROGRAM_ID }
  );
  const token2022Req = await solanaProvider.getTokenAccountsByOwner(
    owner.publicKey,
    { programId: TOKEN_2022_PROGRAM_ID }
  );
  const tokenAccountData = parseTokenAccountResp({
    owner: owner.publicKey,
    solAccountResp,
    tokenAccountResp: {
      context: tokenAccountResp.context,
      value: [...tokenAccountResp.value, ...token2022Req.value],
    },
  });
  return tokenAccountData;
};

export default async function swap (
  walletAddress:string,
  chatId: number,
  fromTokenInfo: ITokenInfo,
  toTokenInfo: ITokenInfo,
  amount: any,
  isSelling:boolean,
  chain:any,
)  {
  try {
    console.log("amount",amount,"fromTokenInfo",fromTokenInfo,"toTokenInfo",toTokenInfo,"isSelling",isSelling,"chain",chain,"walletAddress",walletAddress,"chatId",chatId);
    let refferalAddress:string='';


    const seed = generatePrivateKey(chatId.toString());
    const solanaPrivateKeyBuffer = Buffer.from(seed.slice(2), "hex");

    // console.log("Private Key (Hex):", privateKeyHex);
    const owner = Keypair.fromSeed(solanaPrivateKeyBuffer);

    // fee deduction process
    
    // const percentage = isSelling
    //   ? conpetativeTokens.includes(fromTokenInfo.address)
    //     ? 0.05
    //     : 0.02
    //   : 0.01;

    const isReferralDeduction = false
    // refferalAddress !== "" && !isSelling ? true : false;
 console.log("insider solana tx-->")
    const amountInNonDecimal = ethers.parseUnits(
          BigNumber(amount).toFixed(Number(fromTokenInfo.decimal)),
          Number(fromTokenInfo.decimal)
        );;
console.log("----->",amountInNonDecimal);
    // const amountData:any = amountDistribution(
    //   Number(amountInNonDecimal),
    //   0.01,
    //   isReferralDeduction,
    //   refferalAddress
    // );

    // const swapAmount = BigNumber(amountData.swapAmount)
    //   .integerValue(BigNumber.ROUND_DOWN)
    //   .toFixed(0);
    // const porfoAmount = BigNumber(amountData.porfoAmount)
    //   .integerValue(BigNumber.ROUND_DOWN)
    //   .toFixed(0);
    // const referralAmount = BigNumber(amountData.referralAmount)
    //   .integerValue(BigNumber.ROUND_DOWN)
    //   .toFixed(0);

    // console.log("swapAmount.......", swapAmount);
    // console.log("porfoAmount.....", porfoAmount);
    // console.log("refrralAmount.....", referralAmount);
    // console.log(
    //   "Before gettign the Quote :::: ",
    //   swapAmount,
    //   fromTokenInfo,
    //   toTokenInfo,
    //   walletAddress
    // );

    // const tokenBalance = await getWalletTokenBalance(
    //   walletAddress,
    //   fromTokenInfo?.address
    // );
    // console.log("tokenBalance:............", tokenBalance);
    // if (tokenBalance?.amountWithoutDecimal === 0) return;

    // console.log("walletAddress.......", walletAddress,fromTokenInfo?.address);
    // getting swap quote
    let inputMint = fromTokenInfo?.address;
    if(chain === "solana" && fromTokenInfo?.address==="11111111111111111111111111111111"){
      inputMint = "So11111111111111111111111111111111111111112"
    }
    // const inputMint = "8zjGALN1ftAEfWuF7jwnaSUxawaDKnU9Lbth9esTpump";
    // const inputMint = fromTokenInfo?.address;
    // console.log("inputMint:............", inputMint);
    let outputMint = toTokenInfo?.address; //"8zjGALN1ftAEfWuF7jwnaSUxawaDKnU9Lbth9esTpump";
    if(chain === "solana" && toTokenInfo?.address==="11111111111111111111111111111111"){
      outputMint = "So11111111111111111111111111111111111111112"
    }
    // const amount = 0.00001 * 10 ** 9;
    const slippage = 100; // in percent, for this example, 0.5 means 0.5%
    const txVersion: string = "V0"; // or LEGACY
    const isV0Tx = txVersion === "V0";

    const [isInputSol, isOutputSol] = [
      inputMint === NATIVE_MINT.toBase58(),
      outputMint === NATIVE_MINT.toBase58(),
    ];

    const { tokenAccounts } = await fetchTokenAccountData(owner);

    const inputTokenAcc = tokenAccounts.find(
      (a) => a.mint.toBase58() === inputMint
    )?.publicKey;
    const outputTokenAcc = tokenAccounts.find(
      (a) => a.mint.toBase58() === outputMint
    )?.publicKey;

    if (!inputTokenAcc && !isInputSol) {
      console.error("do not have input token account");
      return;
    }

    const { data } = await axios.get<{
      id: string;
      success: boolean;
      data: { default: { vh: number; h: number; m: number } };
    }>(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`);

    const url = `${
      API_URLS.SWAP_HOST
    }/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInNonDecimal}&slippageBps=${
      slippage * 100
    }&txVersion=${txVersion}`;
    console.log("url:............", url);

    const { data: swapResponse } = await axios.get<SwapCompute>(url); // Use the URL xxx/swap-base-in or xxx/swap-base-out to define the swap type.

    console.log("swapResponse..........", swapResponse);
    const fromAmount = Number(swapResponse?.data?.inputAmount) / 10 ** Number(fromTokenInfo.decimal);
    const toAmount = Number(swapResponse?.data?.outputAmount) / 10 ** Number(toTokenInfo.decimal);

    if (swapResponse?.msg === "INSUFFICIENT_LIQUIDITY") {
      return Error("INSUFFICIENT_LIQUIDITY")
    }

    const { data: swapTransactions } = await axios.post<{
      id: string;
      version: string;
      success: boolean;
      data: { transaction: string }[];
    }>(`${API_URLS.SWAP_HOST}/transaction/swap-base-in`, {
      computeUnitPriceMicroLamports: String(data.data.default.m),
      swapResponse,
      txVersion,
      wallet: owner.publicKey.toBase58(),
      wrapSol: isInputSol,
      unwrapSol: isOutputSol, // true means output mint receive sol, false means output mint received wsol
      inputAccount: isInputSol ? undefined : inputTokenAcc?.toBase58(),
      outputAccount: isOutputSol ? undefined : outputTokenAcc?.toBase58(),
    });

    const allTxBuf = swapTransactions.data.map((tx: any) =>
      Buffer.from(tx.transaction, "base64")
    );
    const allTransactions = allTxBuf.map((txBuf: any) =>
      isV0Tx ? VersionedTransaction.deserialize(txBuf) : Transaction.from(txBuf)
    );

    console.log(
      `total ${allTransactions.length} transactions`,
      swapTransactions
    );

    let idx = 0;
    let txId = "";
    if (!isV0Tx) {
      for (const tx of allTransactions) {
        console.log(`${++idx} transaction sending...`);
        const transaction = tx as Transaction;

        const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100 });

        transaction.add(priorityFeeInstruction)
        transaction.sign(owner);
        txId = await sendAndConfirmTransaction(
          solanaProvider,
          transaction,
          [owner],
          { skipPreflight: false }
        );
        console.log(`${++idx} transaction confirmed, txId: ${txId}`);
      }
    } else {
      for (const tx of allTransactions) {
        idx++;
        const transaction = tx as VersionedTransaction;
        transaction.sign([owner]);
        txId = await solanaProvider.sendTransaction(tx as VersionedTransaction, {
          skipPreflight: false,
        });
        const { lastValidBlockHeight, blockhash } =
          await solanaProvider.getLatestBlockhash()
        console.log(`${idx} transaction sending..., txId: ${txId}`);
        await solanaProvider.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature: txId,
          },
          "confirmed"
        );
        console.log(`${idx} transaction confirmed`);
        // await ctx.reply(
        //   JSON.stringify(JSON.stringify(`${idx} transaction confirmed`)),
        //   {
        //     reply_markup: {
        //       parse_mode: "HTML",
        //     },
        //   }
        // );
      }
      let transactionInfo = ``;
      if (txId) {
        const txHash = txId;
        // return txHash
        // updating referal amount in db
        // if (
        //   isReferralDeduction &&
        //   refferalAddress !== "" &&
        //   Number(referralAmount.toString()) > 0
        // ) {
          
          // await transferNonNativeToken(chatId.toString(),fromTokenInfo.address,referralAddress,referralAmount);
          // await new Promise((resolve) => setTimeout(resolve, 10000));
          // try {
          //   if (isSelling) {
          //     await transferNonNativeToken(
          //       fromTokenInfo.address,
          //       refferalAddress,
          //       porfoAmount,
          //       owner
          //     );
          //   } else {
          //     await transferAmount(
          //       refferalAddress,
          //       referralAmount,
          //       owner
          //     );
          //   }
          // } catch (error) {
          //   console.log(
          //     "Error while transfer token to the refferal ...",
          //     error
          //   );
          // }

          // if (referredByUser) {
          //   referredByUser.referralEarned += referralAmount;
          //   await referredByUser.save();
          // }
        // } 
        // else {
        //   // await ctx.api.sendMessage(chatId, swapResult.response.message);
        //   await bot.api.editMessageText(
        //     chatId,
        //     ctx.session.lastMessageId,
        //     "swapTransactions.response.message",
        //     {
        //       reply_markup: {
        //         inline_keyboard: homeOrWalletButton,
        //       },
        //       parse_mode: "HTML",
        //     }
        //   );
        // }
        // const porfoAmountAddress = kolReferralAddress[0];
        // await transferAmount(
        //   porfoAmountAddress,
        //   porfoAmount,
        //   owner,
        //   connection
        // );
        // await new Promise((resolve) => setTimeout(resolve, 11000));

        // try {
        //   if (isSelling) {
        //     await transferNonNativeToken(
        //       fromTokenInfo.address,
        //       porfoAmountAddress,
        //       porfoAmount,
        //       owner
        //     );
        //   } else {
        //     await transferAmount(
        //       porfoAmountAddress,
        //       porfoAmount,
        //       owner
        //     );
        //   }
        // } catch (error) {
        //   console.log(
        //     "Error while transfer the transaction fee to porfo account...!"
        //   );
        // }
        // return txHash
        return {
          txHash: txHash,
          fromToken: fromTokenInfo.symbol.toUpperCase(),
          toToken: toTokenInfo.symbol.toUpperCase(),
          fromAmount: fromAmount,
          toAmount: toAmount,
        };
      }else{
        return Error("Transaction has not sent")
      }
    }
  } catch (error:any) {
    console.log("Error in swapping tokens", error);
    return Error(error.message)
  }
};