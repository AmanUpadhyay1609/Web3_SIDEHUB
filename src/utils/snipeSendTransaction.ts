// import Web3 from "web3";
// import { botInfo } from "../constant/botInfo";
// import { CHAIN_NAME } from "../config/config";

import Web3 from "web3";

// const web3 = new Web3(botInfo[CHAIN_NAME]?.RPC_URL);

export async function signAndSendTransaction(callData:any,privateKey:string){
    try {
        const web3 = new Web3('https://site2.moralis-nodes.com/base/5687578c17804cd99a646d10f2b38b9f')
        const signedTx = await web3.eth.accounts.signTransaction(callData,privateKey)
        console.log("TxHash : ",signedTx?.transactionHash);
        await web3.eth.sendSignedTransaction(signedTx?.rawTransaction)
        return signedTx.transactionHash;
    } catch (error) {
        console.log("Error inside send and sign Transaction",error);
        return false
    }
}