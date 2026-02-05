'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { ConnectKitProvider } from 'connectkit'
import { wagmiConfig } from '@/src/config'
import { ZKProverProvider } from "@/src/context/zk-prover";
import { TooltipProvider } from '../components/ui/tooltip'

const queryClient = new QueryClient()

export function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <ZKProverProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </ZKProverProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}