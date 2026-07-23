import { card, btnPrimary } from '../lib/ui'
import { UserFlowDiagram, SystemFlowDiagram } from './FlowDiagrams'

const roles: { name: string; blurb: string; items: string[] }[] = [
  {
    name: 'Depositor',
    blurb: 'Any wallet holding MockUSDC.',
    items: [
      'Open a deposit against an enabled plan',
      'Withdraw at maturity (principal + interest)',
      'Early withdraw (penalty, zero interest)',
      'Manually renew into a different plan',
      'Claim interest the vault owed but couldn’t pay yet',
    ],
  },
  {
    name: 'Permissionless keeper',
    blurb: 'Literally anyone — no special role.',
    items: [
      'Auto-renew any deposit once it’s matured and 3 days (grace period) have passed',
      'Earns a small keeper reward (bps, owner-configurable) for doing so',
      'The renewed deposit keeps its original APR, not the current plan rate',
    ],
  },
  {
    name: 'Admin (contract owner)',
    blurb: 'The deployer address, checked on-chain.',
    items: [
      'Create, enable or disable savings plans',
      'Fund the interest vault (separate from user principal)',
      'Schedule / execute / cancel a timelocked vault withdrawal (2-day delay)',
      'Set fee receiver and keeper reward, pause either contract in an emergency',
    ],
  },
]

const decisions: { title: string; body: string }[] = [
  {
    title: 'Principal and interest never mix',
    body: 'SavingCore custodies user principal; VaultManager holds the bank’s own interest pool. Every interest payment is pulled from the vault — a depositor’s principal can never be used to pay someone else’s interest.',
  },
  {
    title: 'Terms are snapshotted at open',
    body: 'Each deposit stores its own APR, penalty and tenor the moment it’s opened. If an admin later changes a plan’s rate, every existing deposit keeps the rate it was promised.',
  },
  {
    title: 'The certificate is the claim',
    body: 'A deposit is an ERC-721 token. Authorization is just token ownership — no separate access-control list, and the position is transferable like any NFT.',
  },
  {
    title: 'Auto-renew keeps the original APR',
    body: 'Manual renewal adopts the new target plan’s current rate, but the permissionless auto-renew path deliberately reuses the deposit’s original APR — a keeper acting on your behalf can’t downgrade your terms.',
  },
  {
    title: 'Vault withdrawals are timelocked',
    body: 'The owner can’t instantly drain the interest vault — withdrawing requires a schedule step, then a 2-day delay before it can execute (or be cancelled).',
  },
  {
    title: 'Interest payouts degrade, principal never does',
    body: 'If the vault runs dry, a withdrawal still pays out full principal immediately; any interest shortfall is recorded as pending and claimable later once the vault is refunded.',
  },
]

const limitations = [
  'Etherscan verification isn’t completed on Sepolia — the deployed bytecode is correct and functional, only the "Verified" badge is missing (the installed plugin targets Etherscan’s sunset V1 API).',
  'The Sepolia interest vault starts empty — fund it from the Admin tab before demoing interest/claim flows.',
  'Deposit lookup for "My Deposits" is a client-side event-log scan chunked to stay under public RPC limits, not an indexer — fine at this scale, would move to a subgraph or ERC721Enumerable at production scale.',
]

export function AboutPage({ onEnterApp }: { onEnterApp: () => void }) {
  return (
    <div className="space-y-10 pb-8">
      <section className="text-center space-y-3 pt-4">
        <p className="text-xs uppercase tracking-widest text-amber-500/80">Blockchain Programming — Final Project</p>
        <h1 className="font-display text-4xl text-ink-50">A term deposit, run entirely on-chain.</h1>
        <p className="text-ink-400 max-w-2xl mx-auto text-sm leading-relaxed">
          SavingCore Bank locks ERC-20 tokens into a fixed-tenor savings plan, pays simple interest from a
          separate bank-owned vault, and represents each position as a transferable ERC-721 certificate —
          withdrawable, early-exitable, renewable, or auto-renewed by anyone once it’s overdue.
        </p>
        <button onClick={onEnterApp} className={`${btnPrimary} mt-2`}>Enter the app →</button>
      </section>

      <section>
        <h2 className="font-display text-xl text-ink-50 mb-4">User flow</h2>
        <div className={card}>
          <UserFlowDiagram />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl text-ink-50 mb-4">System flow</h2>
        <div className={card}>
          <SystemFlowDiagram />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl text-ink-50 mb-4">Who does what</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((r) => (
            <div key={r.name} className={card}>
              <p className="font-display text-base text-ink-50">{r.name}</p>
              <p className="text-xs text-ink-500 -mt-2">{r.blurb}</p>
              <ul className="text-sm text-ink-300 space-y-1.5 list-disc list-inside marker:text-amber-500/60">
                {r.items.map((it) => <li key={it}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl text-ink-50 mb-4">Design decisions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {decisions.map((d) => (
            <div key={d.title} className={card}>
              <p className="font-display text-base text-ink-50">{d.title}</p>
              <p className="text-sm text-ink-400 leading-relaxed">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl text-ink-50 mb-4">Known limitations</h2>
        <div className={card}>
          <ul className="text-sm text-ink-400 space-y-2 list-disc list-inside marker:text-amber-500/60">
            {limitations.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      </section>

      <p className="text-center text-xs text-ink-600">
        Full requirement-to-code traceability lives in <code className="font-mono text-ink-500">docs/REQUIREMENTS.md</code>;
        setup and contributing notes in <code className="font-mono text-ink-500">README.md</code> and{' '}
        <code className="font-mono text-ink-500">docs/CONTRIBUTING.md</code>.
      </p>
    </div>
  )
}
