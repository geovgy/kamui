import { createConfig, http } from 'wagmi'
import { getDefaultConfig } from 'connectkit'
import { sepolia } from 'wagmi/chains'
import { CHAIN_RPC_URL, WALLETCONNECT_PROJECT_ID } from './env'

export const chain = sepolia

export const chainRpcUrl = CHAIN_RPC_URL

export const wagmiConfig = createConfig(
  getDefaultConfig({
    // Your dApps chains
    chains: [chain],
    transports: {
      // RPC URL for each chain
      [chain.id]: http(chainRpcUrl),
    },

    // Required API Keys
    walletConnectProjectId: WALLETCONNECT_PROJECT_ID,

    // Required App Info
    appName: "Kamui App (Demo)",

    // Optional App Info
    appDescription: "A demonstration of Kamui for onchain privacy via zkWormholes",
    // appUrl: "https://family.co", // your app's url
    // appIcon: "https://family.co/logo.png", // your app's icon, no bigger than 1024x1024px (max. 1MB)
  })
)