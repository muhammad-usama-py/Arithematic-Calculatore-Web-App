"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exprToReadable = exprToReadable;
exports.isTerminatingDenominator = isTerminatingDenominator;
function exprToReadable(expr) {
    if (!expr)
        return 'n/a';
    if (expr.type === 'literal')
        return expr.raw;
    return `(${exprToReadable(expr.left)} ${expr.op} ${exprToReadable(expr.right)})`;
}
// Small helper to detect terminating decimal denominators
function isTerminatingDenominator(d) {
    let rem = d < 0n ? -d : d;
    while (rem % 2n === 0n)
        rem /= 2n;
    while (rem % 5n === 0n)
        rem /= 5n;
    return rem === 1n;
}
