import axios from "axios";
import { generateWallets } from "../../wallet/createWallet";
import { chainIdByName } from "../../controller/config";
import { ethers } from "ethers";
import BigNumber from "bignumber.js";
const DEBRIDGE_API_URL =
  "https://dln.debridge.finance/v1.0/dln/order/create-tx";
export async function getCallData(
  fromTokenInfo: any,
  toTokenInfo: any,
  chatId: any,
  amount: any
) {
  amount = ethers.parseUnits(BigNumber(amount).toFixed(Number(fromTokenInfo.decimal)), Number(fromTokenInfo.decimal));
  console.log("amount-->", amount);
  let wallets: any = await generateWallets(chatId.toString());
  console.log("the wallets ", wallets);
  console.log("the amount", amount);
  const params = {
    srcChainId: chainIdByName[fromTokenInfo?.chain], //8453, // Base chain ID
    srcChainTokenIn:
      fromTokenInfo.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
        ? "0x0000000000000000000000000000000000000000"
        : fromTokenInfo?.address, //"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDT on Base
    srcChainTokenInAmount: amount.toString(), // "4500000000000000000", // 4.5 USDT (assuming 6 decimals for USDT)
    dstChainId: chainIdByName[toTokenInfo?.chain], //7565164, // Solana chain ID
    dstChainTokenOut:
      toTokenInfo.address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
        ? "0x0000000000000000000000000000000000000000"
        : toTokenInfo?.address, //"Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT on Solana
    dstChainTokenOutAmount: "auto", // Let deBridge calculate output
    dstChainTokenOutRecipient: wallets[toTokenInfo?.chain], //"8qZvw1q7HEtreZzRoab68xW1i3TVq9vikE94P5TmL6MH", // Your Solana wallet
    srcChainOrderAuthorityAddress: wallets[fromTokenInfo?.chain], //"0x2aDAA8C9235Fe3d7d335f429f2AF66F2F0D5c5a5", // Your Base wallet
    dstChainOrderAuthorityAddress: wallets[toTokenInfo?.chain], //"8qZvw1q7HEtreZzRoab68xW1i3TVq9vikE94P5TmL6MH", // Your Solana wallet
    affiliateFeePercent: "0.1", // Optional affiliate fee
    affiliateFeeRecipient: wallets[fromTokenInfo?.chain], //"0x2aDAA8C9235Fe3d7d335f429f2AF66F2F0D5c5a5", // Your Base wallet (for affiliate fee)
  };
  try {
    // Fetch transaction data from deBridge API
    const response: any = await axios.get(DEBRIDGE_API_URL, { params });
    console.log("Transaction Data call data Received:", response.data);
    const tx = response?.data;
    return tx;
  } catch (err) {
    console.log("error in getting the cross chain call data", err);
    throw err;
  }
}
