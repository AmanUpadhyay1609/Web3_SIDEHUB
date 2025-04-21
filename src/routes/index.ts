import express, { Request,Response } from "express";
import { createWallet, swapTokens, transferTokens } from "../controller";
import { verifyAccessToken } from "../middleware/auth.middleware";
import { getPrivateKey } from "../helper/getPrivateKey";

const router = express.Router();

// Test route (no authentication)
router.get("/", (req:Request, res:Response) => {
  res.status(200).json({ 
    success: true,
    message: "Test route is working without authentication" 
  });
});
router.use(verifyAccessToken);

router.post("/create-wallet",createWallet);
router.post("/transfer",transferTokens);
router.post("/swap",swapTokens);
router.get("/privatekey",getPrivateKey)

export default router;
