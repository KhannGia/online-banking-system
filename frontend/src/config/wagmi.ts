import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { hardhat, sepolia } from 'wagmi/chains'
import { http } from 'viem'

export const config = getDefaultConfig({
  appName: 'SavingCore Bank',
  projectId: import.meta.env.VITE_WC_PROJECT_ID || 'demo-project-id',
  chains: [hardhat, sepolia],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC || undefined),
  },
  ssr: false,
})
