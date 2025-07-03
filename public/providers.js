"use client";

import { createConfig, http } from "https://unpkg.com/wagmi@2.12.17/dist/index.js";
import { createPublicClient } from "https://unpkg.com/viem@2.21.31/dist/index.js";

// Define IRYS Testnet chain configuration
const irysTestnet = {
  id: 1270,
  name: "IRYS Testnet",
  nativeCurrency: { name: "Test IRYS", symbol: "tIRYS", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.irys.xyz/v1/execution-rpc"] },
    public: { http: ["https://testnet-rpc.irys.xyz/v1/execution-rpc"] },
  },
  blockExplorers: {
    default: { name: "IRYS Explorer", url: "https://explorer.irys.xyz" },
  },
  testnet: true,
};

// Configure Wagmi with IRYS Testnet
const config = createConfig({
  autoConnect: true,
  publicClient: createPublicClient({
    chain: irysTestnet,
    transport: http(),
  }),
});

// Expose config globally
window.wagmiConfig = config;

export { config };
