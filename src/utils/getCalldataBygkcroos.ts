import axios from "axios";

export const VIRTUAL_TOKEN_CONTRACT_ADDRESS = "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b"

export async function getCallData(sellAmount: any,sellToken:string,buyToken:string) {
  try {
    const callData = await axios.post(
      "https://api.zkcross.network/api/v1/bridge/swap",
      {
        sellToken: sellToken,
        buyToken: buyToken,
        sellAmount: sellAmount, //"100000000000000",
        chainId: "base",
      }
    );
    const cData = callData?.data?.calldata;
    return cData;
  } catch (error) {
    console.log(error)
    return false;
  }
}