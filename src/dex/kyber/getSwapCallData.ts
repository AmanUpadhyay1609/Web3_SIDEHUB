export const getSwapCallData = async (
    routeSummary: any,
    walletAddress: string,
    fromTokenInfo: any,
    amount: string,
    routerAddress: string,
    chain : string
  ) => {
    console.log("inside getSwapCallData......amount....",amount);
    try {
      // maximum slippage is 2000
      const slippage = 2000;
      const response = await fetch(
        `https://aggregator-api.kyberswap.com/${chain}/api/v1/route/build`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient: walletAddress,
            routeSummary: routeSummary,
            sender: walletAddress,
            // slippageTolerance: 300,
            slippageTolerance: slippage,
          }),
        }
      );
  
      const responoseData = await response.json();
      console.log("the response data of the swap quote",responoseData)
      const data = responoseData.data;
      const callData = data.data;
      const callDataObject = {
        from: walletAddress,
        to: routerAddress, //this is the only contract you can use if you decide to make transaction by our API.
        value:
          fromTokenInfo.address == "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
            ? amount
            : 0,
        data: callData,
        amountIn : data.amountIn,
        amountOut : data.amountOut,
        gas: data.gas
      };
  
      // return { response: { status: true, message: callDataObject } };
      return callDataObject;
    } catch (error) {
      console.log("Error in getting quote......during build........", error);
      return "Finding too much volatility getting Calldata.. . Please try again";
    }
  };