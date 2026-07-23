// Hand-laid-out SVG diagrams (not a charting lib — this app has no other diagram
// need, so a dependency would be overkill). Every connector is a straight
// horizontal/vertical line between grid-aligned boxes; coordinates are computed
// by hand once here rather than auto-laid-out, so keep new nodes on the same grid.

type Node = { x: number; y: number; w: number; h: number; label: string; sub?: string }

const NODE_H = 52

function NodeBox({ n }: { n: Node }) {
  return (
    <g>
      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={10} className="fill-ink-900 stroke-ink-600" strokeWidth={1} />
      <rect x={n.x} y={n.y} width={n.w} height={2} className="fill-amber-500/60" />
      <text x={n.x + n.w / 2} y={n.y + (n.sub ? 22 : 30)} textAnchor="middle" className="fill-ink-50 font-display text-[13px]">
        {n.label}
      </text>
      {n.sub && (
        <text x={n.x + n.w / 2} y={n.y + 38} textAnchor="middle" className="fill-ink-500 font-sans text-[10px]">
          {n.sub}
        </text>
      )}
    </g>
  )
}

function Arrows() {
  return (
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" className="fill-amber-500/80" />
      </marker>
    </defs>
  )
}

function Label({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" className="fill-ink-400 font-sans text-[10px]">
      {text}
    </text>
  )
}

export function UserFlowDiagram() {
  const chain: Node[] = [
    { x: 16, y: 24, w: 170, h: NODE_H, label: 'Connect' },
    { x: 246, y: 24, w: 170, h: NODE_H, label: 'Choose plan' },
    { x: 476, y: 24, w: 170, h: NODE_H, label: 'Deposit', sub: 'mints certificate' },
    { x: 706, y: 24, w: 170, h: NODE_H, label: 'Active deposit' },
  ]
  const branches: Node[] = [
    { x: 16, y: 170, w: 170, h: NODE_H, label: 'Withdraw', sub: 'at maturity' },
    { x: 246, y: 170, w: 170, h: NODE_H, label: 'Early exit', sub: 'penalty' },
    { x: 476, y: 170, w: 170, h: NODE_H, label: 'Renew', sub: 'manual' },
    { x: 706, y: 170, w: 170, h: NODE_H, label: 'Auto-renew', sub: 'by keeper' },
  ]
  const cy = 24 + NODE_H / 2 // 50
  const busY = 130

  return (
    <svg viewBox="0 0 900 240" className="w-full h-auto">
      <Arrows />
      {/* main chain */}
      <line x1={186} y1={cy} x2={246} y2={cy} className="stroke-amber-500/70" strokeWidth={1.5} markerEnd="url(#arrow)" />
      <line x1={416} y1={cy} x2={476} y2={cy} className="stroke-amber-500/70" strokeWidth={1.5} markerEnd="url(#arrow)" />
      <line x1={646} y1={cy} x2={706} y2={cy} className="stroke-amber-500/70" strokeWidth={1.5} markerEnd="url(#arrow)" />
      {/* drop to bus, then fan out to the 4 branches */}
      <line x1={791} y1={76} x2={791} y2={busY} className="stroke-amber-500/70" strokeWidth={1.5} />
      <line x1={101} y1={busY} x2={791} y2={busY} className="stroke-amber-500/70" strokeWidth={1.5} />
      {[101, 331, 561, 791].map((x) => (
        <line key={x} x1={x} y1={busY} x2={x} y2={170} className="stroke-amber-500/70" strokeWidth={1.5} markerEnd="url(#arrow)" />
      ))}
      {chain.map((n) => <NodeBox key={n.label} n={n} />)}
      {branches.map((n) => <NodeBox key={n.label} n={n} />)}
    </svg>
  )
}

export function SystemFlowDiagram() {
  const row1: Node[] = [
    { x: 20, y: 24, w: 220, h: NODE_H, label: 'User wallet' },
    { x: 340, y: 24, w: 220, h: NODE_H, label: 'SavingCore', sub: 'custody + ERC-721' },
    { x: 660, y: 24, w: 220, h: NODE_H, label: 'VaultManager', sub: 'interest pool' },
  ]
  const row2: Node[] = [
    { x: 20, y: 170, w: 220, h: NODE_H, label: 'MockUSDC', sub: 'ERC-20' },
    { x: 340, y: 170, w: 220, h: NODE_H, label: 'Keeper', sub: 'permissionless' },
    { x: 660, y: 170, w: 220, h: NODE_H, label: 'Admin', sub: 'contract owner' },
  ]
  const cy1 = 24 + NODE_H / 2 // 50

  return (
    <svg viewBox="0 0 920 250" className="w-full h-auto">
      <Arrows />
      {/* row 1 relationships */}
      <line x1={240} y1={cy1} x2={340} y2={cy1} className="stroke-amber-500/70" strokeWidth={1.5} markerEnd="url(#arrow)" markerStart="url(#arrow)" />
      <Label x={290} y={cy1 - 8} text="deposit / withdraw" />
      <line x1={560} y1={cy1} x2={660} y2={cy1} className="stroke-amber-500/70" strokeWidth={1.5} markerEnd="url(#arrow)" markerStart="url(#arrow)" />
      <Label x={610} y={cy1 - 8} text="interest" />

      {/* vertical: user <-> usdc */}
      <line x1={130} y1={76} x2={130} y2={170} className="stroke-emerald-500/60" strokeWidth={1.5} markerEnd="url(#arrow)" markerStart="url(#arrow)" />
      <Label x={178} y={128} text="approve / balance" />

      {/* vertical: keeper -> savingcore */}
      <line x1={450} y1={170} x2={450} y2={76} className="stroke-emerald-500/60" strokeWidth={1.5} markerEnd="url(#arrow)" />
      <Label x={512} y={128} text="auto-renew" />

      {/* vertical: admin -> vaultmanager */}
      <line x1={770} y1={170} x2={770} y2={76} className="stroke-emerald-500/60" strokeWidth={1.5} markerEnd="url(#arrow)" />
      <Label x={830} y={128} text="fund / timelock" />

      {row1.map((n) => <NodeBox key={n.label} n={n} />)}
      {row2.map((n) => <NodeBox key={n.label} n={n} />)}
    </svg>
  )
}
