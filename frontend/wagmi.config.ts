import { defineConfig } from '@wagmi/cli'
import { hardhat, react } from '@wagmi/cli/plugins'
import { existsSync, readFileSync } from 'node:fs'

const NAMES = ['MockUSDC', 'VaultManager', 'SavingCore'] as const
const NETS: Record<number, string> = { 31337: 'localhost', 11155111: 'sepolia' }

function addressesFor(name: string) {
  const map: Record<number, `0x${string}`> = {}
  for (const [chainId, net] of Object.entries(NETS)) {
    const path = `../contract/deployments/${net}/${name}.json`
    if (existsSync(path)) map[Number(chainId)] = JSON.parse(readFileSync(path, 'utf8')).address
  }
  return map
}

export default defineConfig({
  out: 'src/generated.ts',
  plugins: [
    hardhat({
      project: '../contract',
      include: NAMES.map((n) => `${n}.json`),
      deployments: Object.fromEntries(NAMES.map((n) => [n, addressesFor(n)])),
    }),
    react(),
  ],
})
