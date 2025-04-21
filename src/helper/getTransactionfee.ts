import Web3 from "web3";
import { createEvmWallet, generatePrivateKey } from "../wallet/createWallet";
import { getTransferCallData } from "./transferCallData";
import { baseProvider } from "..";
import { config } from "../config";
import { chainRpcMapping } from "./config";

export const getTransactionFees = async (
  amount: number,
  receiverAddress: string,
  tokenInfo: any,
  isNative: boolean,
  chatId: number,
  chain: string
) => {
  try {
    const RPC_PROVIDER: any = new Web3(chainRpcMapping[chain]);
    let tx: any = await getTransferCallData(
      amount,
      receiverAddress,
      tokenInfo,
      isNative,
      chain
    );
    console.log("tx........inside transactionfee....", tx);
    const gasEstimationData = await RPC_PROVIDER.eth.estimateGas(tx);
    console.log(
      "the gasestimation in the getting transaction fee",
      gasEstimationData
    );
    const transactionFees = Number(gasEstimationData) / 10 ** 18;
    console.log("transaction fee..", transactionFees);
    return transactionFees;
  } catch (error) {
    console.log("Error in getting transaction fees..............", error);
    return 0.001;
  }
};
