import { createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'

export const chain = sepolia

export const wagmiConfig = createConfig({
  chains: [chain],
  transports: {
    [chain.id]: http(),
  },
})