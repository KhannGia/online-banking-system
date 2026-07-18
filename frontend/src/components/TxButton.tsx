import { useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import type { Abi } from 'viem'
import { toast } from 'sonner'
import { decodeRevert } from '../lib/errors'

export function TxButton({ label, address, abi, functionName, args, value, disabled, onConfirmed, className }: {
  label: string
  address?: `0x${string}`
  abi: Abi
  functionName: string
  args?: readonly unknown[]
  value?: bigint
  disabled?: boolean
  onConfirmed?: () => void
  className?: string
}) {
  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: mining, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (isSuccess) { toast.success(`${label} confirmed`); onConfirmed?.(); reset() }
  }, [isSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button
      disabled={disabled || isPending || mining || !address}
      onClick={() =>
        // `abi`/`functionName` are dynamic here, so writeContract's per-call generics
        // can't be inferred; cast the variables object to satisfy the wrapper.
        writeContract(
          { address: address!, abi, functionName, args, value } as Parameters<typeof writeContract>[0],
          { onError: (e) => toast.error(decodeRevert(e)) },
        )
      }
      className={className ?? 'px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm'}
    >
      {isPending || mining ? 'Confirming…' : label}
    </button>
  )
}
