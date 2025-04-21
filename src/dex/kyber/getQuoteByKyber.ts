import axios from "axios";
import { getSwapCallData } from "./getSwapCallData";

export const getSwapQuoteByKyber = async (
    amount: string,                                     
    fromTokenInfo: any,
    toTokenInfo: any,
    walletAddress: string,
    chain : string
  ) => {
    try {
      
      console.log("inside getSwapQuoteByKyber......amount....",amount);
      const url = `https://aggregator-api.kyberswap.com/${chain}/api/v1/routes?tokenIn=${fromTokenInfo.address}&tokenOut=${toTokenInfo.address}&amountIn=${amount}&gasInclude=true`;
      console.log("calldata url..............", url);
  
      const res = await axios.get(url);
  
      const callDataObject = await getSwapCallData(
        res.data.data.routeSummary,
        walletAddress,
        fromTokenInfo,
        amount,
        res.data.data.routerAddress,chain,
      );
      return {
        response: {
          status: true,
          message: callDataObject,
          routerAddress: res.data.data.routerAddress,
        },
      };
    } catch (error) {
      console.log("Error in getting quote..............", error);
      return {
        response: {
          status: false,
          message: "Error getting Quotation from swap partner. Please try again",
          routerAddress: "",
        },
      };
    }
  };