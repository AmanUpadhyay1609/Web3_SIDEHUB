import Web3 from "web3";
import { generatePrivateKey } from "../../../wallet/createWallet";
import { getWalletBalance } from "../../../utils/getwalletBalance";
import { config } from "../../../config";

// Initialize Web3 provider
const lineaProvider = new Web3(config.lineaRPC.toString());

// Helper function to generate transfer call data
const getTransferCallDataLinea = (
  value: any,
  toAddress: string,
  tokenInfo: any,
  isNative: boolean
) => {
  try {
    let tx;
    console.log("Inside getTransferCallData....", value, toAddress, tokenInfo, isNative);

    if (isNative) {
      // Native token transfer
      tx = {
        to: toAddress,
        data: "0x",
        value: lineaProvider.utils.toWei(value.toString(), "ether"), // Convert value to wei
      };
    } else {
      // ERC-20 token transfer
      const erc20Interface = new lineaProvider.eth.Contract([
        {
          constant: false,
          inputs: [
            { name: "_to", type: "address" },
            { name: "_value", type: "uint256" },
          ],
          name: "transfer",
          outputs: [{ name: "", type: "bool" }],
          type: "function",
        },
      ]);
      const amountInWei = lineaProvider.utils.toWei(value.toString(), "mwei"); // USDC uses 6 decimals
      const encodedData = erc20Interface.methods
        .transfer(toAddress, amountInWei)
        .encodeABI();
      tx = {
        to: tokenInfo.address, // Destination smart contract address
        data: encodedData,
        value: "0x0", // No value for ERC-20 transfers
      };
    }
    return tx;
  } catch (error) {
    console.error("Error in getTransferCallData:", error);
    throw error;
  }
};

// Function to calculate transaction fees
export const getTransactionFees = async (
  amount: any,
  receiverAddress: string,
  tokenInfo: any,
  isNative: boolean,
  chatId: number
) => {
  try {
    const privateKey = generatePrivateKey(chatId.toString());
    const wallet = lineaProvider.eth.accounts.privateKeyToAccount(privateKey);

    const tx = getTransferCallDataLinea(amount, receiverAddress, tokenInfo, isNative);

    console.log("Transaction object for gas estimation:", tx);

    // Estimate gas
    const gasEstimate = await lineaProvider.eth.estimateGas({
      ...tx,
      from: wallet.address,
    });

    // Get gas price
    const gasPrice = await lineaProvider.eth.getGasPrice();

    // Calculate transaction fees (gasEstimate * gasPrice)
    const transactionFees = lineaProvider.utils.fromWei(
      (BigInt(gasEstimate) * BigInt(gasPrice)).toString(),
      "ether"
    );
    return transactionFees;
  } catch (error) {
    console.error("Error in getting transaction fees:", error);
    return "0.01"; // Default fallback value
  }
};

// Function to get ERC-20 token balance
const getERC20Balance = async (walletAddress: string, tokenInfo: any) => {
  const erc20Contract = new lineaProvider.eth.Contract(
    [
      {
        constant: true,
        inputs: [{ name: "_owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        type: "function",
      },
    ],
    tokenInfo.address
  );
  const balance:any = await erc20Contract.methods.balanceOf(walletAddress).call();
  console.log("the erc balance of the token",balance)
  return lineaProvider.utils.fromWei(balance, "mwei"); // USDC uses 6 decimals
};

// Main transfer function
export default async function transfer(
  walletAddress: string,
  value: number | string,
  toAddress: string,
  tokenInfo: any,
  isNative: boolean,
  chatId: number,
  chain: string
) {
  console.log("Initiating transfer...", {
    walletAddress,
    value,
    toAddress,
    tokenInfo,
    isNative,
    chain,
  });

  try {
    const privateKey = generatePrivateKey(chatId.toString());
    const wallet = lineaProvider.eth.accounts.privateKeyToAccount(privateKey);

    // Check ERC-20 balance if not native
    if (!isNative) {
      const tokenBalance = await getERC20Balance(walletAddress, tokenInfo);
      console.log("the token balance erc", tokenBalance);
      if (Number(tokenBalance) < Number(value)) {
        throw new Error("Insufficient ERC-20 token balance");
      }
    }

    // Get transaction data
    let tx = getTransferCallDataLinea(value, toAddress, tokenInfo, isNative);

    // Adjust for native token transfers
    if (isNative) {
      const transactionFees = await getTransactionFees(
        value,
        toAddress,
        tokenInfo,
        isNative,
        chatId
      );
      const nativeBalance = await getWalletBalance(walletAddress, chain);
      if (Number(nativeBalance) - Number(value) < Number(transactionFees)) {
        console.log("Insufficient balance for native token transfer. Adjusting value...");
        tx = getTransferCallDataLinea(
          Number(value) - Number(transactionFees),
          toAddress,
          tokenInfo,
          isNative
        );
      }
    }

    console.log("Transaction object:", tx);

    // Get nonce
    const nonce = await lineaProvider.eth.getTransactionCount(walletAddress, "latest");

    // Add additional transaction fields
    const gasPrice = await lineaProvider.eth.getGasPrice();
    const gasLimit = await lineaProvider.eth.estimateGas({
      ...tx,
      from: walletAddress,
    });

    const finalTx = {
      ...tx,
      nonce,
      gasPrice,
      gas: gasLimit,
    };

    // Sign and send transaction
    const signedTx = await wallet.signTransaction(finalTx);
    const response = await lineaProvider.eth.sendSignedTransaction(signedTx.rawTransaction);

    console.log("Transaction response:", response);

    return {
      response: {
        status: true,
        message: response.transactionHash,
      },
    };
  } catch (error) {
    console.error("Transfer execution failed:", error);

    let errorMessage = "Transaction failed";
    if (error instanceof Error) {
      if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transfer and gas";
      } else if (error.message.includes("Insufficient ERC-20 token balance")) {
        errorMessage = "Insufficient ERC-20 token balance";
      } else if (error.message.includes("replacement transaction underpriced")) {
        errorMessage = "Pending transaction detected. Try again in 60 seconds.";
      }
    }

    return {
      response: {
        status: false,
        message: errorMessage,
      },
    };
  }
}