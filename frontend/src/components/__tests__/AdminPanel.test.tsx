import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mock the wagmi surface AdminPanel (and the TxButton it renders) touch.
// Kept minimal: enough to mount the panel and read/write a few fields, not a
// full chain simulation.
// ---------------------------------------------------------------------------
const OWNER = '0x1111111111111111111111111111111111111111' as const

const mockUseAccount = vi.fn()
const mockUseReadContract = vi.fn()
const mockUseReadContracts = vi.fn()
const mockUseBlock = vi.fn()
const mockUseWriteContract = vi.fn()
const mockUseWaitForTransactionReceipt = vi.fn()

vi.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: () => mockUseReadContract(),
  // Forward the call's `contracts` array so the mock can tell AdminPanel's own
  // timelock query (always 2 fixed contracts) apart from usePlans()'s query
  // (0 contracts while planCount is mocked to 0) — both hit this same mock.
  useReadContracts: (args: { contracts?: unknown[] }) => mockUseReadContracts(args),
  useBlock: () => mockUseBlock(),
  useWriteContract: () => mockUseWriteContract(),
  useWaitForTransactionReceipt: () => mockUseWaitForTransactionReceipt(),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const baseSystemState = {
  owner: OWNER as `0x${string}` | undefined,
  corePaused: false,
  gracePeriod: 259_200n,
  keeperRewardBps: 50n,
  feeReceiver: undefined as `0x${string}` | undefined,
  vaultBalance: 0n,
  vaultPaused: false,
}

const mockUseSystemState = vi.fn(() => baseSystemState)
vi.mock('../../hooks/useSystemState', () => ({
  useSystemState: () => mockUseSystemState(),
}))

// App.tsx also renders Header (which renders RainbowKit's ConnectButton),
// PlansView and MyDeposits. Stub those out: the churn-reproduction test below
// only cares about App's tab/owner gating around AdminPanel, not those
// screens' own data-fetching.
vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => null,
}))
vi.mock('../PlansView', () => ({ PlansView: () => <div data-testid="plans-view" /> }))
vi.mock('../MyDeposits', () => ({ MyDeposits: () => <div data-testid="my-deposits" /> }))

// Imported *after* the mocks above so the mocked modules are wired up first.
import { AdminPanel } from '../AdminPanel'
import App from '../../App'

function setStableMocks() {
  mockUseAccount.mockReturnValue({ address: OWNER, chainId: 11155111, isConnected: true })
  mockUseReadContract.mockReturnValue({ data: 0n, refetch: vi.fn() })
  // usePlans()'s query has 0 contracts while planCount is mocked to 0n; AdminPanel's
  // own timelock query always has 2. Keep each query's mocked data shaped for its
  // own call instead of one blanket value for both.
  mockUseReadContracts.mockImplementation((args?: { contracts?: unknown[] }) =>
    args?.contracts && args.contracts.length > 0 ? { data: undefined } : { data: [] },
  )
  mockUseBlock.mockReturnValue({ data: { timestamp: 1_800_000_000n } })
  mockUseWriteContract.mockReturnValue({ writeContract: vi.fn(), data: undefined, isPending: false, reset: vi.fn() })
  mockUseWaitForTransactionReceipt.mockReturnValue({ isLoading: false, isSuccess: false })
  mockUseSystemState.mockReturnValue(baseSystemState)
}

beforeEach(() => {
  setStableMocks()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function getTenorInput(): HTMLInputElement {
  return screen.getByLabelText(/Tenor \(days\)/i) as HTMLInputElement
}

describe('AdminPanel — Create plan number inputs', () => {
  it('accepts characters typed into the Tenor input', () => {
    render(<AdminPanel onChanged={() => {}} />)
    const input = getTenorInput()
    expect(input.value).toBe('180') // pre-filled default

    fireEvent.change(input, { target: { value: '18' } })
    expect(input.value).toBe('18')

    fireEvent.change(input, { target: { value: '183' } })
    expect(input.value).toBe('183')
  })

  it('accepts characters typed into APR / Min / Max / Penalty inputs', () => {
    render(<AdminPanel onChanged={() => {}} />)
    const apr = screen.getByLabelText(/APR \(bps\)/i) as HTMLInputElement
    const min = screen.getByLabelText(/Min \(USDC\)/i) as HTMLInputElement
    const max = screen.getByLabelText(/Max \(USDC\)/i) as HTMLInputElement
    const pen = screen.getByLabelText(/Penalty \(bps\)/i) as HTMLInputElement

    fireEvent.change(apr, { target: { value: '3' } })
    fireEvent.change(min, { target: { value: '5' } })
    fireEvent.change(max, { target: { value: '9' } })
    fireEvent.change(pen, { target: { value: '7' } })

    expect(apr.value).toBe('3')
    expect(min.value).toBe('5')
    expect(max.value).toBe('9')
    expect(pen.value).toBe('7')
  })

  // Control: prove it's specifically *unmounting* that loses state, not mere
  // re-rendering. AdminPanel itself re-renders on every new block (watch:true)
  // and every read-contracts poll; if that alone wiped input, the fix target
  // would be different (a render loop inside AdminPanel, not the parent gate).
  it('CONTROL: typed input survives new block / read-contracts data while mounted (no gate involved)', () => {
    const { rerender } = render(<AdminPanel onChanged={() => {}} />)
    const input = getTenorInput()

    fireEvent.change(input, { target: { value: '9' } })
    expect(input.value).toBe('9')

    // New block arrives (watch:true) and the read-contracts poll resolves —
    // AdminPanel re-renders with fresh data, but is never unmounted.
    mockUseBlock.mockReturnValue({ data: { timestamp: 1_800_000_005n } })
    mockUseReadContracts.mockImplementation((args?: { contracts?: unknown[] }) =>
      args?.contracts && args.contracts.length > 0 ? { data: [{ result: 0n }, { result: 0n }] } : { data: [] },
    )
    rerender(<AdminPanel onChanged={() => {}} />)

    expect(getTenorInput().value).toBe('9')
  })

  // The owner-only requirement still holds: while the owner read hasn't
  // resolved yet, or once it resolves to someone else, the real form/inputs
  // must not be reachable — only a notice.
  it('shows a notice instead of the form while the owner read is unresolved, and for a confirmed non-owner', () => {
    mockUseSystemState.mockReturnValue({ ...baseSystemState, owner: undefined })
    const { rerender } = render(<AdminPanel onChanged={() => {}} />)
    expect(screen.getByText(/checking admin access/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Tenor \(days\)/i)).not.toBeInTheDocument()

    const someoneElse = '0x2222222222222222222222222222222222222222' as const
    mockUseSystemState.mockReturnValue({ ...baseSystemState, owner: someoneElse })
    rerender(<AdminPanel onChanged={() => {}} />)
    expect(screen.getByText(/not authorized/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Tenor \(days\)/i)).not.toBeInTheDocument()
  })
})

describe('App — AdminPanel survives owner-gate churn (real-world reproduction)', () => {
  const client = new QueryClient()
  function renderApp() {
    return render(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    )
  }

  // This is the actual reported bug, reproduced through the real App
  // component (not a hand-copied stand-in for its gating logic): App decides
  // whether AdminPanel is *mounted at all*, driven by the same owner read
  // AdminPanel itself depends on. On Sepolia that read can momentarily report
  // "no data yet" (a background refetch / observer remount) — simulated here
  // by flipping the mocked useSystemState() owner field between renders.
  it('BUG REPRO: typed Create-plan input survives a transient owner-read blip', () => {
    const { rerender } = renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Admin' }))
    const input = getTenorInput()
    fireEvent.change(input, { target: { value: '9' } })
    expect(input.value).toBe('9')

    // The owner read blips to "no data yet" — the shape a background
    // refetch/observer remount takes in react-query — then resolves again.
    mockUseSystemState.mockReturnValue({ ...baseSystemState, owner: undefined })
    rerender(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    )

    mockUseSystemState.mockReturnValue({ ...baseSystemState, owner: OWNER })
    rerender(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    )

    expect(getTenorInput().value).toBe('9')
  })
})
