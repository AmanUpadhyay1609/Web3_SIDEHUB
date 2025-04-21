import dotenv from 'dotenv';

dotenv.config();

import Sidehub, { EnvConfig } from './src/sdk/index';

const config: EnvConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  serverPort: process.env.HTTP_SERVER_PORT ? Number(process.env.HTTP_SERVER_PORT) : 6000,
  baseRPC: process.env.baseRPC as string,
  solanaRPC: process.env.solanaRPC as string,
  lineaRPC: process.env.lineaRPC as string,
  okxSign: process.env.OKX_SIGN as string,
  okxProjectId: process.env.OKX_PROJECT_ID as string,
  okxAccessKey: process.env.OKX_ACCESS_KEY as string,
  okxPassphrase: process.env.OKX_PASSPHRASE as string,
  secretKey: process.env.SECRET_KEY as string,
  jwtAuth: process.env.JWT_AUTH
};

// Initialize the Sidehub instance with the config
const sidehub = new Sidehub(config);

(async () => {
  try {
    const result = await sidehub.createWallet(`123`) ;
    console.log('Wallet creation result:', result);
  } catch (error) {
    console.error('Error during wallet creation:', error);
  }
})(); 