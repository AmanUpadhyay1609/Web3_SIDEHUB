import { ethers } from "ethers";
import { config } from "../../../config";
import Web3 from "web3";
import { CONTRACT_ABI } from "../../../abi/snipe_contract_abi";
import { generatePrivateKey } from "../../../wallet/createWallet";
import { getCallData, VIRTUAL_TOKEN_CONTRACT_ADDRESS } from "../../../utils/getCalldataBygkcroos";
import { signAndSendTransaction } from "../../../utils/snipeSendTransaction";

const abi = [
  "function approve(address spender, uint256 amount) public returns (bool)"
];
export const SWAPPER_CONTRACT_ADDRESS = "0x126a46Ad49900Ac9FC1c876d2D6992242cD56511";//"0x22fc70C8B3c491940004B690925a33B45E0685fE"
const web3 = new Web3(config.baseRPC);
const provider = new ethers.JsonRpcProvider(config.baseRPC);
const Contract = new web3.eth.Contract(CONTRACT_ABI as any, SWAPPER_CONTRACT_ADDRESS)

export async function SwapToken(chatId: string, walletAddress: string, tokenAddress: string, amountInETH: string, type: string, isBigNumber: boolean = false) {
  try {
      let amount = amountInETH;
      if (!isBigNumber) {
          amount = ethers.parseEther(amountInETH).toString();
      }

      console.log("++++++>", amount, type, tokenAddress)
      let contract_callData;
      // let gasEstimate;
      const USER_PRIVATE_KEY = generatePrivateKey(chatId);
      if (type === "sell") {
          const wallet = new ethers.Wallet(USER_PRIVATE_KEY, provider);
          const tokenContract = new ethers.Contract(tokenAddress, abi, wallet);
          try {
              // Call the approve function
              const tx = await tokenContract.approve(SWAPPER_CONTRACT_ADDRESS, amount);

              // Wait for the transaction to be confirmed
              const receipt = await tx.wait();
              console.log("Transaction confirmed: ", receipt);
          } catch (error) {
              console.error("Error approving token:", error);
              throw (error);
          }
          // const result = Contract.methods.
          contract_callData = await Contract.methods.executeSell(amount, tokenAddress);
          // gasEstimate = await Contract.methods.executeSell(amount, tokenAddress).estimateGas({
          //     from: walletAddress
          // });
      } else {  
          const callData = await getCallData(amount?.toString(), "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", VIRTUAL_TOKEN_CONTRACT_ADDRESS);
          if (callData) {
              contract_callData = await Contract.methods.swap(callData, walletAddress, tokenAddress);
              // gasEstimate = await Contract.methods.swap(callData, walletAddress, tokenAddress).estimateGas({
              //     from: walletAddress,
              //     value: amount.toString()
              // });


              // console.log("the estimate fee",gasEstimate)

          } else {
              console.log("Call Data not found")
              // await bot.api.sendMessage(chatId,"Call Data Not Found..!");
          }

      }
      if (contract_callData) {
          // const gasPrice = await web3.eth.getGasPrice();
          // const nonce = await web3.eth.getTransactionCount(walletAddress)
          const txData:any = {
              from: walletAddress,
              to: SWAPPER_CONTRACT_ADDRESS,
              data: contract_callData?.encodeABI(),
              gas: "500000",
              maxPriorityFeePerGas: "100000",
              maxFeePerGas: "110000000",
              gasLimit: 1000000
              // gasPrice : gasPrice,
              // maxPriorityFeePerGas:"10",
              // maxFeePerGas:"110000000",
              // nonce : nonce
          }
          console.log("Transaction Data===>", txData);
          if (type == "buy") {
              txData["value"] = amount.toString();
          }

          const txHash = await signAndSendTransaction(txData, USER_PRIVATE_KEY);
          if (txHash) {
              console.log("Transaction is Successfull with transaction hash ", txHash);
              const message = `Congratulations! You have successfully sniped the new token launch. Here are the details:\nToken Address: ${tokenAddress}\nHappy trading! 🚀`;
              return txHash;
          } else {
              // await bot.api.sendMessage(chatId,"Error in swapping Token..!");
          }
          return txHash;
      }
  } catch (error:any) {
      console.log("Error ==> ", error);
      throw new Error(error);
      // await bot.api.sendMessage(chatId,"Error in swapping Token..!");
  }
}