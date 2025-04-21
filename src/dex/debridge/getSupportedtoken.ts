import axios from "axios";
import { BASE_URL, HEADERS } from "../../controller/config";

export const supportedTokenOnChain = async (chainId: number,address:string) => {
  try {
   console.log("the parameter for getting the supposted token",chainId,address)
    const response : any = await axios.get(`${BASE_URL}/token-list?chainId=${chainId}`, {
      headers: HEADERS
    });

    const supportedtokens = response.data.tokens;
    // console.log("the supported token on chain id ",chainId,supportedtokens)
    return  supportedtokens.hasOwnProperty(address);
    //  if(supportedtokens.includes(address)){
    //   console.log("token address included")
    //   return true
    //  }
    //  else{
    //   console.log("token address  not included")
    //   return false
    //  }
    // console.log("Response of supported token on chain --> :",+chainId + " " + supportedtokens);
    // return supportedtokens;
  } catch (error : any) {
    console.error("Error fetching supported tokens:", error.message);
    return false
  }
};
