import "dotenv/config"; // Load environment variables
import { parseEnv, port } from "znv";
import z from "zod";

const createConfigFromEnvironment = (environment: NodeJS.ProcessEnv) => {
  const config = parseEnv(environment, {
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    LOG_LEVEL: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
      .default("info"),

    // HTTP Server
    HTTP_SERVER_PORT: z.string(),

    // 
    baseRPC:z.string(),
    lineaRPC:z.string(),
    solanaRPC:z.string(),

    // Secret for wallet generation
    SECRET_KEY:z.string(),

    //okx
    OKX_PROJECT_ID : z.string(),
    OKX_ACCESS_KEY : z.string(),
    OKX_PASSPHRASE : z.string(),
    OKX_SIGN : z.string(),
  });

  return {
    ...config,
    isDev: config.NODE_ENV === "development",
    isProd: config.NODE_ENV === "production",
  };
};

export type Config = ReturnType<typeof createConfigFromEnvironment>;
export const config = createConfigFromEnvironment(process.env);
