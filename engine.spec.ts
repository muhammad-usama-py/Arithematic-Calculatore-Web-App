import { describe, it, expect } from 'vitest';
import { parseUserInput } from '../src/engine/parser';
import { evaluateExpression, evaluateBinaryWithOperands } from '../src/engine/evaluator';
import { Rational } from '../src/engine/rational';

describe('ExactCalc engine', () => {
  it('10 / 3 preserves exact value and displays rounded', () => {
    const expr = parseUserInput('10 / 3');
    const val = evaluateExpression(expr, 2);
    expect(val.display).toBe('3.33');
    expect(val.exact.numerator).toBe(10n);
    expect(val.exact.denominator).toBe(3n);
  });

  it('10 / 3 * 3 yields exact 10 when using previous result', () => {
    const expr = parseUserInput('10 / 3');
    const val = evaluateExpression(expr, 2);
    // multiply by 3 using evaluator's binary with operands (reuses exact provenance)
    const threeLiteral = evaluateExpression(parseUserInput('3'), 0);
    const res = evaluateBinaryWithOperands('*', val, threeLiteral);
    expect(res.exact.numerator).toBe(10n);
    expect(res.exact.denominator).toBe(1n);
    expect(res.display).toBe('10');
  });

  it('3.33 * 3 yields 9.99 when 3.33 is user-entered', () => {
    const a = evaluateExpression(parseUserInput('3.33'), 2); // user-entered literal
    const b = evaluateExpression(parseUserInput('3'), 0);
    const res = evaluateBinaryWithOperands('*', a, b);
    expect(res.display).toBe('9.99');
    expect(res.exact.numerator).toBe(999n);
    expect(res.exact.denominator).toBe(100n);
  });

  it('1/3 * 3 yields 1', () => {
    const a = evaluateExpression(parseUserInput('1 / 3'), 3);
    const b = evaluateExpression(parseUserInput('3'), 0);
    const res = evaluateBinaryWithOperands('*', a, b);
    expect(res.exact.numerator).toBe(1n);
    expect(res.exact.denominator).toBe(1n);
  });

  it('2/3 * 3 yields 2', () => {
    const a = evaluateExpression(parseUserInput('2 / 3'), 3);
    const b = evaluateExpression(parseUserInput('3'), 0);
    const res = evaluateBinaryWithOperands('*', a, b);
    expect(res.exact.numerator).toBe(2n);
    expect(res.exact.denominator).toBe(1n);
  });

  it('10/6 * 6 yields 10', () => {
    const a = evaluateExpression(parseUserInput('10 / 6'), 3);
    const b = evaluateExpression(parseUserInput('6'), 0);
    const res = evaluateBinaryWithOperands('*', a, b);
    expect(res.exact.numerator).toBe(10n);
    expect(res.exact.denominator).toBe(1n);
  });

  it('0.1 + 0.2 precise rational math', () => {
    const a = evaluateExpression(parseUserInput('0.1'), 1);
    const b = evaluateExpression(parseUserInput('0.2'), 1);
    const res = evaluateBinaryWithOperands('+', a, b);
    // 0.1 + 0.2 = 3/10 = 0.3
    expect(res.exact.numerator).toBe(3n);
    expect(res.exact.denominator).toBe(10n);
    expect(res.display).toBe('0.30');
  });

  it('exact integer calculations', () => {
    const res = evaluateExpression(parseUserInput('7 * 6'), 0);
    expect(res.exact.numerator).toBe(42n);
    expect(res.exact.denominator).toBe(1n);
    expect(res.display).toBe('42');
  });

  it('negative numbers and zero', () => {
    const a = evaluateExpression(parseUserInput('-5'), 0);
    expect(a.exact.numerator).toBe(-5n);
    const b = evaluateExpression(parseUserInput('0'), 0);
    const res = evaluateBinaryWithOperands('+', a, b);
    expect(res.exact.numerator).toBe(-5n);
  });

  it('division by zero should throw', () => {
    expect(() => evaluateExpression(parseUserInput('1 / 0'), 2)).toThrow();
  });

  it('long repeating decimals represented as rationals', () => {
    const a = evaluateExpression(parseUserInput('1 / 7'), 10);
    // 1/7 numerator/denominator
    expect(a.exact.numerator).toBe(1n);
    expect(a.exact.denominator).toBe(7n);
  });

  it('explicitly rounded user input is preserved as user literal', () => {
    const a = evaluateExpression(parseUserInput('3.333'), 3);
    // User typed 3.333 -> exact 3333/1000
    expect(a.exact.numerator).toBe(3333n);
    expect(a.exact.denominator).toBe(1000n);
  });
});
