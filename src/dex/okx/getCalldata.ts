import axios from "axios";
import { ethers } from "ethers";
import CryptoJS from "crypto-js";
import { config } from "../../config";

export const getSwapQuote = async (
  amount: number,
  fromTokenInfo: any,
  toTokenInfo: any,
  walletAddress: string
) => {
  try {
    let params = {
      chain: "base",
      inTokenAddress: fromTokenInfo.address,
      outTokenAddress: toTokenInfo.address,
      amount: amount,
      gasPrice: 5,
      slippage: 5,
      account: walletAddress,
    };

    console.log(
      "getSwapQuote params..............",
      amount,
      fromTokenInfo,
      toTokenInfo,
      walletAddress
    );

    const res = await axios.get(
      "https://open-api.openocean.finance/v3/base/swap_quote",
      { params }
    );
    console.log("inside getSwapQuote..............", res);
    if (res) {
      const { estimatedGas, data, gasPrice } = res.data.data;
      const swapParams = {
        from: walletAddress,
        to: "0x6352a56caadc4f1e25cd6c75970fa768a3304e64", //this is the only contract you can use if you decide to make transaction by our API.
        gas: estimatedGas,
        gasPrice: gasPrice,
        value:
          fromTokenInfo.address == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
            ? ethers.parseEther("" + amount)
            : 0,
        data,
      };
      // return res.data;
      return { response: { status: true, message: swapParams } };
    } else {
      return {
        response: {
          status: false,
          message: "Finding too much volatility . Please try again",
        },
      };
    }
  } catch (error) {
    console.log("Error in getting quote..............", error);
    throw new Error("Error in getting quote..............");
    // return {
    //   response: {
    //     status: false,
    //     message: "Finding too much volatility . Please try again",
    //   },
    // };
  }
};

export function getHeaderParams(apiEndPoints: string, method: string) {
  try {
    const timestamp = new Date().toISOString();
    const sign = CryptoJS.enc.Base64.stringify(
      CryptoJS.HmacSHA256(
        timestamp + method + apiEndPoints,
        config.OKX_SIGN //process.env.SIGN || "",
      )
    );

    const header = {
      "OK-ACCESS-PROJECT": config.OKX_PROJECT_ID, //process.env.PROJECT_ID || "",
      "OK-ACCESS-KEY": config.OKX_ACCESS_KEY, // || "",
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-SIGN": sign,
      "OK-ACCESS-PASSPHRASE": config.OKX_PASSPHRASE, //process.env.PASSPHRASE || "",
      "Content-Type": "application/json",
    };
    return header;
  } catch (error) {
    console.log("Error while getting the header params : ", error);
    throw new Error("Error while getting the header params :");
  }
}

export const baseUrl = "https://www.okx.ac";

export async function getCallDataFromOKX(
  amountInBigNumber: string,
  fromTokenAddress: string,
  toTokenAddress: string,
  userWalletAddress: string,
  chainId: number
) {
  try {
    console.log(
      "the paramerter in getting call data",
      amountInBigNumber,
      fromTokenAddress,
      toTokenAddress,
      userWalletAddress
    );
     const fromTokenReferrerWalletAddress =
      "0x4f250068dfD4BDc8B15d414BD6C1dE0e48B6deBa";
    const apiEndPoints = `/api/v5/dex/aggregator/swap?chainId=${chainId}&amount=${amountInBigNumber}&fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&slippage=0.05&userWalletAddress=${userWalletAddress}&fromTokenReferrerWalletAddress=${fromTokenReferrerWalletAddress}&feePercent=${0.1}`;
    console.log("the api end point", apiEndPoints);
    const header = getHeaderParams(apiEndPoints, "GET");
    // const response = await getResponseMessage(baseUrl+apiEndPoints,"GET",header);
    const r1 = await fetch(baseUrl + apiEndPoints, {
      headers: header,
      method: "GET",
    });
    const result = await r1.json();
    console.log("result===>", result);
    return result;
  } catch (error) {
    console.log("Error while getting the call data from OKX.", error);
    return false;
  }
}
export async function approvedToken(
  tokenContractAddress: string,
  approveAmount: string,
  chainId: number
) {
  try {
    const apiEndPoints = `/api/v5/dex/aggregator/approve-transaction?chainId=${chainId}&tokenContractAddress=${tokenContractAddress}&approveAmount=${approveAmount}`;
    const headers = getHeaderParams(apiEndPoints, "GET");
    const r1 = await fetch(baseUrl + apiEndPoints, {
      headers: headers,
      method: "GET",
    });
    const result = await r1.json();
    return result;
  } catch (error) {
    console.log("Error while approving token..", error);
    throw new Error("Error while approving token..");
  }
}
