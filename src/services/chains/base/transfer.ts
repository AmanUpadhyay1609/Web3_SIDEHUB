import { getTransactionFees } from "../../../helper/getTransactionfee";
import { getTransferCallData } from "../../../helper/transferCallData";
import { getWalletBalance } from "../../../utils/getwalletBalance";
import { generatePrivateKey } from "../../../wallet/createWallet";
import { baseProvider } from "../../..";

export default async function transfer(
  walletAddress: string,
  value: number | string,
  toAddress: string,
  tokenInfo: any,
  isNative: boolean,
  chatId: number,
  chain: string
) {
  try {
    console.log(
      "inside sendTransaction....",
      walletAddress,
      value,
      toAddress,
      tokenInfo,
      isNative,
      chatId,
      chain
    );
    let tx: any = await getTransferCallData(
      Number(value),
      toAddress,
      tokenInfo,
      isNative,
      "base"
    );

    if (isNative) {
      const transactionFees = await getTransactionFees(
        Number(value),
        toAddress,
        tokenInfo,
        isNative,
        chatId,
        "base"
      );
      const nativeBalance = await getWalletBalance(walletAddress, chain);
      if (Number(nativeBalance) - Number(value) < transactionFees) {
        tx = await getTransferCallData(
          Number(value) - transactionFees,
          toAddress,
          tokenInfo,
          isNative,
          "base"
        );
      }
    }

    // console.log("tx...erc20 transfer.....", tx);
    // const userOpResponse = await smartAccount.sendTransaction(
    //   tx
    //   //   {
    //   //   paymasterServiceData: { mode: PaymasterMode.SPONSORED },
    //   // }
    // );
    let nonce = await baseProvider.eth.getTransactionCount(
      walletAddress,
      "latest"
    );
    console.log("step 1", nonce);
    let transaction = {
      ...tx,
      gas: 2500000,
      maxPriorityFeePerGas: "10000000",
      maxFeePerGas: "110000000",
      gasLimit: 1000000,
      nonce: nonce,
    };
    const privateKey = generatePrivateKey(chatId.toString());
    const signedTx = await baseProvider.eth.accounts.signTransaction(
      transaction,
      privateKey
    );
    const response = await baseProvider.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );
    console.log("response...", response);
    if (signedTx?.transactionHash) {
      return {
        response: {
          status: true,
          message: signedTx?.transactionHash,
        },
      };
    }
    return { response: { status: false, message: "Transaction failed" } };
  } catch (err: any) {
    if (err?.message.includes("Be aware that it might still be mined!")) {
      return {
        response: {
          status: false,
          message: "Transaction failed! This is pretty strenge ",
        },
      };
    }
    console.log("transfer execution failed....", err);
    return { response: { status: false, message: "Transaction failed" } };
  }
}
