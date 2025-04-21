import express from "express";
import "dotenv/config";
import cors from "cors";
import { config } from "./config";
import routes from "./routes";
import Web3 from "web3";
import { Connection } from "@solana/web3.js";

export const app = express();
const port = config.HTTP_SERVER_PORT;
console.log("the port", port);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", routes);

app.listen(port || 6000, () => {
  console.log(`Server up and running on port ${port}`);
});
console.log("base provider url", config.baseRPC);
export const baseProvider: any = new Web3(config.baseRPC.toString());
export const lineaProvider: any = new Web3(config.lineaRPC.toString());
export const solanaProvider = new Connection(config.solanaRPC, "confirmed");
