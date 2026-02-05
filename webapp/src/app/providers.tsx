'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig } from '@/src/config'
import { ZKProverProvider } from "../context/prover";

const queryClient = new QueryClient()

export function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ZKProverProvider>
          {children}
        </ZKProverProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}