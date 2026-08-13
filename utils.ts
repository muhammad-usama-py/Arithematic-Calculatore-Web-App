import { ExpressionNode } from './types';

export function exprToReadable(expr?: ExpressionNode): string {
  if (!expr) return 'n/a';
  if (expr.type === 'literal') return expr.raw;
  return `(${exprToReadable(expr.left)} ${expr.op} ${exprToReadable(expr.right)})`;
}

// Small helper to detect terminating decimal denominators
export function isTerminatingDenominator(d: bigint): boolean {
  let rem = d < 0n ? -d : d;
  while (rem % 2n === 0n) rem /= 2n;
  while (rem % 5n === 0n) rem /= 5n;
  return rem === 1n;
}
