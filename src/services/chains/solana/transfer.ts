import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import { generatePrivateKey } from "../../../wallet/createWallet";
import { conpetativeTokens } from "./constants";
import { amountDistribution } from "../../../helper/amountDistribution";
import BigNumber from "bignumber.js";
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { solanaProvider } from "../../..";



function isValidSolanaAddress(address: any) {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

export default async function transfer(
  walletAddress:string,
  amount: number | string,
  receiverAddress: string,
  tokenInfo: any,
  isNative:boolean,
  chatId: number,
  chain:string
) {
  try {
   console.log("inside the solana transaction transfer","amount",amount,"receiverAddress",receiverAddress,"tokenInfo",tokenInfo,"isNative",isNative,"chatId",chatId,"chain",chain)
    if (isValidSolanaAddress(receiverAddress)) {
      let isSelling =
        tokenInfo.address === "So11111111111111111111111111111111111111112"
          ? true
          : false;

      const percentage = isSelling
        ? conpetativeTokens.includes(receiverAddress)
          ? 0.05
          : 0.02
        : 0.01;
      const seed: any = generatePrivateKey(chatId.toString());
      const solanaPrivateKeyBuffer = Buffer.from(seed.slice(2), "hex");
      const payer = Keypair.fromSeed(solanaPrivateKeyBuffer);
      const amountInNonDecimal = Number(amount) * 10 ** tokenInfo.decimal;
      const amountData: any = amountDistribution(
        amountInNonDecimal,
        percentage,
        false,
        ""
      );
      console.log("the amount distribution output",amountData)

      const swapAmount = BigNumber(amountData.swapAmount)
        .integerValue(BigNumber.ROUND_DOWN)
        .toFixed(0);
      const porfoAmount = BigNumber(amountData.porfoAmount)
        .integerValue(BigNumber.ROUND_DOWN)
        .toFixed(0);
      const referralAmount = BigNumber(amountData.referralAmount)
        .integerValue(BigNumber.ROUND_DOWN)
        .toFixed(0);

      let transactionInfo = ``;
      // const isNative =
      //   tokenInfo.address === "So11111111111111111111111111111111111111112"
      //     ? true
      //     : false;

      // const porfoAmountAddress = kolReferralAddress[0];
      let txHash = "";
      if (isNative) {
        txHash = await transferAmount(
          receiverAddress,
          swapAmount,
          payer
        );
      } else {
        // console.log("inside the transfer of the non native transfer")
        txHash = await transferNonNativeToken(
          tokenInfo.address,
          receiverAddress,
          swapAmount,
          payer
        );
      }
      if (txHash) {
        return {
          response: {
            status: true,
            message: txHash,
          },
        };
      } else {
        throw Error('Transaction Hash Not Found..')
      }

      // await transferNonNativeToken(chatId.toString(),tokenInfo.address,porfoAmountAddress,porfoAmount);
    }
  } catch (error: any) {
    if (error.message.includes(' Transaction results in an account (0) with insufficient funds for rent')) {
      return Error('No Enough balance to transfer 100%')
    }
    console.log("Error in transfering ..............", error);

    return { response: { status: false, message: "Transaction failed" } };
  }
};

export async function transferAmount(
  receiverAddress: string,
  amount: string,
  payer: any) {
  try {
    // console.log("Transfer amount ",amount);
    // sol transaction
    const toPublicKey = new PublicKey(receiverAddress);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: toPublicKey,
        lamports: Number(amount),
      })
    );
    const latestBlockHash = await solanaProvider.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = latestBlockHash.blockhash;
    transaction.feePayer=payer.publicKey;
    transaction.sign(payer)

    const signature =  await solanaProvider.sendRawTransaction(transaction.serialize())
    console.log("the signature",signature)
    return signature;
  } catch (error: any) {
    console.log(error);
    throw new Error(error);
  }
}

export async function transferNonNativeToken(
  toTokenAddress: string,
  receiverAddress: string,
  amount: string,
  payer: any
) {
  try {
    const DESTINATION_WALLET = new PublicKey(receiverAddress);
    const toToken = new PublicKey(toTokenAddress);

    const payerTokenAccount = await getOrCreateAssociatedTokenAccount(
      solanaProvider,
      payer,
      toToken,
      payer.publicKey
    );
    // console.log(`source Address : ${payerTokenAccount.address.toString()}`);
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      solanaProvider,
      payer,
      toToken,
      DESTINATION_WALLET
    );

    const tx = new Transaction();
    tx.add(
      createTransferInstruction(
        payerTokenAccount.address,
        recipientTokenAccount.address,
        payer.publicKey,
        Number(amount) // Assuming JUP has 6 decimals
      )
    );

    const latestBlockHash = await solanaProvider.getLatestBlockhash("confirmed");
    tx.recentBlockhash = latestBlockHash.blockhash;
    tx.feePayer=payer.publicKey;
    tx.sign(payer)
    const signature = await solanaProvider.sendRawTransaction(tx.serialize())
    console.log("Transaction confirmed with signature:", signature);
    return signature;
  } catch (error: any) {
    console.log("Error while transferring non native token transaction");
    throw new Error(error);
  }
}
