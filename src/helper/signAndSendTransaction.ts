import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { baseProvider, solanaProvider } from "..";
import { generatePrivateKey } from "../wallet/createWallet";
import { ethers } from "ethers";
import { config } from "../config";

export async function signAndSendTransaction(chain: any, tx: any, chatId: any) {
  try {
    if (chain === "solana") {
      const solanaTxData = tx?.tx?.data;
      if (!solanaTxData) {
        throw new Error("Invalid transaction data received from API");
      }
      const txBuffer = Buffer.from(solanaTxData.slice(2), "hex");
      let transaction = VersionedTransaction.deserialize(txBuffer);
      const { blockhash } = await solanaProvider.getLatestBlockhash();
      transaction.message.recentBlockhash = blockhash;
      const seed = generatePrivateKey(chatId.toString());
      const solanaPrivateKeyBuffer = Buffer.from(seed.slice(2), "hex");
      // console.log("Private Key (Hex):", privateKeyHex);
      const owner = Keypair.fromSeed(solanaPrivateKeyBuffer);
      transaction.sign([owner]);
      const signature = await solanaProvider.sendRawTransaction(
        transaction.serialize()
      );
      console.log("the signature", signature);
      return signature;
    } else {
      let privateKey = generatePrivateKey(chatId);
      console.log("the private key", privateKey);
      const provider = new ethers.JsonRpcProvider(config.baseRPC);

      const wallet = new ethers.Wallet(privateKey.toString(), provider);
      // const wallet = baseProvider.eth.accounts.privateKeyToAccount(privateKey);

      // Construct the transaction
      const transaction = {
        to: tx?.tx?.to,
        data: tx?.tx?.data,
        value: ethers.toBigInt(tx?.tx?.value), // Native gas fee (not USDT amount)
        gasLimit: 2000000, // Set gas limit
      };

      console.log("Signing and sending transaction...");
      const txResponse = await wallet.sendTransaction(transaction);
      console.log("Transaction sent:", txResponse.hash);

      const receipt = await txResponse.wait();
      console.log("Transaction confirmed:", receipt);
      return txResponse.hash;
    }
  } catch (err) {
    console.log("error while sign and send the transaction", err);
    return "";
  }
}
