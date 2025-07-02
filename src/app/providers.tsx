"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import type { Chain } from "viem";          

const irysTestnet: Chain = {
  id: 1270,
  name: "IRYS Testnet",
  nativeCurrency: { name: "Test IRYS", symbol: "tIRYS", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.irys.xyz/v1/execution-rpc"] },
    public:  { http: ["https://testnet-rpc.irys.xyz/v1/execution-rpc"] },
  },
  blockExplorers: {
    default: { name: "IRYS Explorer", url: "https://explorer.irys.xyz" },
  },
  testnet: true,
};

const wagmiConfig = createConfig({
  chains: [irysTestnet],
  transports: {
    [irysTestnet.id]: http(irysTestnet.rpcUrls.default.http[0]),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
