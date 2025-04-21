import { ethers } from "ethers";
import { ERC20TokenAbi } from "../abi/token_contract_abi";
import Web3 from "web3";
import { chainRpcMapping } from "./config";
import BigNumber from "bignumber.js";

let chain = 'base'
// const provider = new ethers.JsonRpcProvider(chainRpcMapping[chain]);
const provider: any = new Web3(chainRpcMapping[chain])

export const getTransferCallData = async (
  value: number,
  toAddress: string,
  tokenInfo: any,
  isNative: boolean,
  chain: string
) => {
  try {
    const RPC_PROVIDER : any= new Web3(chainRpcMapping[chain])
    let tx;
    // console.log(
    //   "inside getTransferCallData....",
    //   value,
    //   toAddress,
    //   tokenInfo,
    //   isNative
    // );
    console.log("type of value....", typeof value);
    if (isNative) {
      tx = {
        to: toAddress,
        data: "0x",
        value: Math.floor(Number(value) * 10 ** tokenInfo.decimal),
        gas: 2500000,
        maxPriorityFeePerGas: "10000000",
        maxFeePerGas: "110000000",
        gasLimit: 1000000
      };
    } else {
      // const erc20Interface = new ethers.Interface([
      //   "function transfer(address _to, uint256 _value)",
      // ]);
      const tokenContract = new ethers.Contract(
        tokenInfo?.address,
        ERC20TokenAbi,
        RPC_PROVIDER
      );
      // const amountInBigInt = ethers.parseUnits("" + value, tokenInfo?.decimal);
      const amount = BigNumber(value).multipliedBy(BigNumber(10).exponentiatedBy(tokenInfo?.decimal));

      // Get the floored number
      const flooredAmount = amount.integerValue(BigNumber.ROUND_FLOOR);

      // As a string
      const amountInString = flooredAmount.toFixed();

      // const amount = Math.floor( Number(value) * 10** Number(tokenInfo?.decimal) )
      // const gasPrice = BigNumber( provider.getGasPrice()*1.2 )
      //get encoded function dfata for transfer
      const nonce = await RPC_PROVIDER.eth.getTransactionCount('0x2aDAA8C9235Fe3d7d335f429f2AF66F2F0D5c5a5', 'latest'); // Use 'latest' or 'pending'
      console.log("the nonce ", nonce)
      const encodedData = tokenContract.interface.encodeFunctionData(
        "transfer",
        [toAddress, amountInString]
      );

      console.log("Transfer Receipt ...........12..", encodedData);

      // const transferReciept = await encodedData.wait()
      // console.log("Transfer Receipt .............",transferReciept)
      const contractAddress = tokenInfo.address;
      tx = {
        to: contractAddress, // destination smart contract address
        data: encodedData,
        gas: 2500000,
        value: 0,
      };
    }
    console.log("the transaction in the get trans...",tx)
    return tx;
  } catch (error: any) {
    throw new Error(`getTransferCallData${error}`)
  }
};