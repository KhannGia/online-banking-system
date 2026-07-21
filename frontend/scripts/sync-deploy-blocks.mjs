// Writes src/config/deployBlocks.json = { "<chainId>": <deployment block> }
// Source of truth: SavingCore's deployment receipt per network.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const NETS = { 31337: 'localhost', 11155111: 'sepolia' }
const out = {}

for (const [chainId, net] of Object.entries(NETS)) {
  const path = `../contract/deployments/${net}/SavingCore.json`
  if (!existsSync(path)) continue
  const dep = JSON.parse(readFileSync(path, 'utf8'))
  const block = dep.receipt?.blockNumber
  if (block === undefined) throw new Error(`no receipt.blockNumber in ${path}`)
  out[chainId] = Number(block)
}

mkdirSync('src/config', { recursive: true })
writeFileSync('src/config/deployBlocks.json', JSON.stringify(out, null, 2) + '\n')
console.log('deployBlocks:', out)
