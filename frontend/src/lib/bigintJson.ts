// React 19's dev-mode build unconditionally logs component render info for the
// browser's Performance panel (`ProfileMode` is set on every root, not just when
// <Profiler> or DevTools profiling is active). That logging path JSON.stringifies
// prop arrays it classifies as "primitive" — which includes BigInt, since it's a
// JS primitive type — and JSON.stringify has no native BigInt support, so it
// throws. Every TxButton in this app passes BigInt-containing arrays as `args`
// (deposit ids, plan ids, amounts), so this fires on nearly every re-render in
// dev mode and can lock up the tab. Giving BigInt a toJSON is the standard fix:
// JSON.stringify calls toJSON on any value that has one before applying its
// default (BigInt-unaware) serialization, so this resolves it globally, not just
// for React's own instrumentation.
declare global {
  interface BigInt {
    toJSON(): string
  }
}

if (!('toJSON' in BigInt.prototype)) {
  ;(BigInt.prototype as unknown as { toJSON(): string }).toJSON = function (this: bigint) {
    return this.toString()
  }
}
