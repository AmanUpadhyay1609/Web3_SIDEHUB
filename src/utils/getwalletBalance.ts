import { ethers } from "ethers";
import { chainRpcMapping } from "../helper/config";

export const getWalletBalance = async (walletAddress: string,chain:any) => {
  try {
    const provider = new ethers.JsonRpcProvider(chainRpcMapping['linea']);
    const nativeBalance = await provider.getBalance(walletAddress);
    const nativeBalanceInNumber = parseFloat(
      ethers.formatEther(nativeBalance)
    );
    console.log("in getWalletBalance nativeBalanceInNumber", nativeBalanceInNumber);
    return nativeBalanceInNumber;
  } catch (error) {
    return 0;
  }
};