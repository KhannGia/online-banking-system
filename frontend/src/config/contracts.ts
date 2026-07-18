import { mockUsdcAddress, vaultManagerAddress, savingCoreAddress } from '../generated'
import deployBlocks from './deployBlocks.json'

const ADDRESSES: Record<string, Record<number, `0x${string}`>> = {
  MockUSDC: mockUsdcAddress as Record<number, `0x${string}`>,
  VaultManager: vaultManagerAddress as Record<number, `0x${string}`>,
  SavingCore: savingCoreAddress as Record<number, `0x${string}`>,
}

export type ContractName = 'MockUSDC' | 'VaultManager' | 'SavingCore'
export const SUPPORTED_CHAIN_IDS = [31337, 11155111] as const

export function getAddress(name: ContractName, chainId: number): `0x${string}` | undefined {
  return ADDRESSES[name]?.[chainId]
}

/** True when all three contracts have an address on this chain. */
export function isDeployedOn(chainId: number): boolean {
  return (['MockUSDC', 'VaultManager', 'SavingCore'] as const).every((n) => !!getAddress(n, chainId))
}

/**
 * Lower bound for the DepositOpened log scan: the block the contracts were
 * deployed in, generated into deployBlocks.json by `npm run codegen`.
 * Must NOT be 0 on Sepolia — public RPCs cap getLogs ranges, so an unbounded
 * scan would time out or be rejected.
 */
export function deployFromBlock(chainId: number): bigint {
  const blocks = deployBlocks as Record<string, number>
  return BigInt(blocks[String(chainId)] ?? 0)
}
