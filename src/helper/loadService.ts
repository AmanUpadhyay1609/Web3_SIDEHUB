
export const loadService = async (chain: string, operation: string) => {
  try {
    const serviceModule = await import(`../services/chains/${chain}/${operation}`);
    if (serviceModule && serviceModule.default) {
      console.log("service",serviceModule.default)
      return serviceModule.default;
    } else {
      throw new Error(`Function not found in ${chain}/${operation}`);
    }
  } catch (error:any) {
    console.log("the error errr",error)
    throw new Error(`Service loading failed: ${error}`);
  }
};


