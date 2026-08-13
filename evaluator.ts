import { ExpressionNode, Value, Provenance } from './types';
import { Rational, rationalFromString } from './rational';

let idCounter = 1;
function newId() {
  return `v${idCounter++}`;
}

import { exprToReadable } from './utils';

function exprToString(expr: ExpressionNode): string {
  // reuse readable form for small debugging strings
  return exprToReadable(expr);
}

export function evaluateExpression(expr: ExpressionNode, displayRoundedDigits = 2): Value {
  function evalNode(node: ExpressionNode): { value: Rational; provenance: Provenance } {
    if (node.type === 'literal') {
      // node.raw is user-typed literal
      const r = rationalFromString(node.raw);
      const prov: Provenance = { source: 'user', roundedDigits: null, userModified: true, timestamp: new Date().toISOString() };
      return { value: r, provenance: prov };
    }
    const left = evalNode(node.left);
    const right = evalNode(node.right);
    let result: Rational;
    let opStr = node.op;
    try {
      if (node.op === '+') result = left.value.add(right.value);
      else if (node.op === '-') result = left.value.sub(right.value);
      else if (node.op === '*') result = left.value.mul(right.value);
      else result = left.value.div(right.value);
    } catch (e) {
      throw e;
    }
    const provenance: Provenance = {
      source: 'calc',
      expr: node,
      roundedDigits: null,
      userModified: false,
      timestamp: new Date().toISOString(),
    };
    return { value: result, provenance };
  }

  const { value, provenance } = evalNode(expr);
  // default display: rounded to displayRoundedDigits, but omit fractional part when integer
  const display = value.isInteger() ? value.toDecimalString() : value.toRoundedDecimalString(displayRoundedDigits);
  // but preserve that displayed is rounded when not integer
  provenance.roundedDigits = value.isInteger() ? null : displayRoundedDigits;
  const val: Value = {
    id: newId(),
    exact: { numerator: value.numerator, denominator: value.denominator },
    display,
    provenance,
  };
  return val;
}

export function useValueAsOperand(value: Value): Rational {
  // If value provenance is calc and not userModified, use exact rational
  return new Rational(value.exact.numerator, value.exact.denominator);
}

export function evaluateBinaryWithOperands(op: '+' | '-' | '*' | '/', a: Value, b: Value): Value {
  const ra = useValueAsOperand(a);
  const rb = useValueAsOperand(b);
  let res: Rational;
  if (op === '+') res = ra.add(rb);
  else if (op === '-') res = ra.sub(rb);
  else if (op === '*') res = ra.mul(rb);
  else res = ra.div(rb);
  const expr: ExpressionNode = { type: 'binary', op, left: { type: 'literal', raw: a.display, value: a.exact, source: a.provenance.source }, right: { type: 'literal', raw: b.display, value: b.exact, source: b.provenance.source } };
  const provenance: Provenance = { source: 'calc', expr, roundedDigits: null, userModified: false, timestamp: new Date().toISOString() };
  const display = res.isInteger() ? res.toDecimalString() : res.toRoundedDecimalString(2);
  return { id: newId(), exact: { numerator: res.numerator, denominator: res.denominator }, display, provenance };
}
