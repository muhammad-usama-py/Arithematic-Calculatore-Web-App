import { describe, it, expect } from 'vitest';
import { calculate } from '../src/api';

describe('ExactCalc comprehensive tests', () => {
  it('1) 10 / 3 -> display 3.33 approximate', async () => {
    const res = await calculate({ expression: '10 / 3' });
    expect(res.display_value).toBe('3.33');
    expect(res.is_exact).toBe(false);
    expect(res.exact_value).toBe('10/3');
    expect(res.explanation.toLowerCase()).toContain('rounded');
  });

  it('2) 10 / 3 then previous * 3 => 10 (exact)', async () => {
    const r1 = await calculate({ expression: '10 / 3' });
    const r2 = await calculate({ expression: 'previous * 3', previous_calculation_id: r1.calculation_id });
    expect(r2.display_value).toBe('10');
    expect(r2.is_exact).toBe(true);
    expect(r2.exact_value).toBe('10/1');
    expect(r2.explanation.toLowerCase()).toContain('originated');
  });

  it('3) 3.33 * 3 => 9.99 (user-entered)', async () => {
    const res = await calculate({ expression: '3.33 * 3' });
    expect(res.display_value).toBe('9.99');
    expect(res.exact_value).toBe('999/100');
    expect(res.explanation.toLowerCase()).toContain('user');
    expect(res.explanation.toLowerCase()).not.toContain('originated from');
  });

  it('4) 1/3 -> previous * 3 => 1', async () => {
    const a = await calculate({ expression: '1 / 3' });
    const b = await calculate({ expression: 'previous * 3', previous_calculation_id: a.calculation_id });
    expect(b.display_value).toBe('1');
    expect(b.exact_value).toBe('1/1');
  });

  it('5) 2/3 -> previous * 3 => 2', async () => {
    const a = await calculate({ expression: '2 / 3' });
    const b = await calculate({ expression: 'previous * 3', previous_calculation_id: a.calculation_id });
    expect(b.display_value).toBe('2');
    expect(b.exact_value).toBe('2/1');
  });

  it('6) 10/6 -> previous * 6 => 10', async () => {
    const a = await calculate({ expression: '10 / 6' });
    const b = await calculate({ expression: 'previous * 6', previous_calculation_id: a.calculation_id });
    expect(b.display_value).toBe('10');
    expect(b.exact_value).toBe('10/1');
  });

  it('7) 0.1 + 0.2 -> 3/10 exact', async () => {
    const r = await calculate({ expression: '0.1 + 0.2' });
    expect(r.exact_value).toBe('3/10');
    // display may be rounded; ensure exact math preserved
    expect(r.explanation.toLowerCase()).toContain('internally');
  });

  it('8) 1.25 * 8 => 10', async () => {
    const r = await calculate({ expression: '1.25 * 8' });
    expect(r.display_value).toBe('10');
    expect(r.exact_value).toBe('10/1');
  });

  it('9) 10 / 4 => 5/2 (2.5)', async () => {
    const r = await calculate({ expression: '10 / 4' });
    expect(r.exact_value).toBe('5/2');
    // display may be 2.50
    expect(r.display_value.startsWith('2.5') || r.display_value === '2.50').toBe(true);
  });

  it('10) 2.5 * 4 => 10', async () => {
    const r = await calculate({ expression: '2.5 * 4' });
    expect(r.exact_value).toBe('10/1');
  });

  it('11) user enters 3.333333333333333 * 3 should NOT produce 10 without provenance', async () => {
    const r = await calculate({ expression: '3.333333333333333 * 3' });
    // ensure not exact 10
    expect(r.exact_value).not.toBe('10/1');
    expect(r.explanation.toLowerCase()).toContain('user');
  });

  it('12) user enters 3.33 * 3 => 9.99', async () => {
    const r = await calculate({ expression: '3.33 * 3' });
    expect(r.display_value).toBe('9.99');
    expect(r.exact_value).toBe('999/100');
  });

  it('13) division by zero should return clear error', async () => {
    await expect(calculate({ expression: '1 / 0' } as any)).rejects.toMatchObject({ status: 400 });
  });

  it('14) very large integers', async () => {
    const r = await calculate({ expression: '123456789012345678901234567890 * 2' });
    expect(r.exact_value).toBe('246913578024691357802469135780/1');
  });

  it('15) negative numbers', async () => {
    const r = await calculate({ expression: '-5 * 3' });
    expect(r.exact_value).toBe('-15/1');
  });

  it('16) nested expressions', async () => {
    const r = await calculate({ expression: '((2+3)*(4+1))' });
    expect(r.exact_value).toBe('25/1');
  });

  it('17) operator precedence 2 + 3 * 4 = 14', async () => {
    const r = await calculate({ expression: '2 + 3 * 4' });
    expect(r.exact_value).toBe('14/1');
  });

  it('18) parentheses override precedence', async () => {
    const r = await calculate({ expression: '(2 + 3) * 4' });
    expect(r.exact_value).toBe('20/1');
  });

  it('19) repeated calculations using previous results', async () => {
    const a = await calculate({ expression: '10 / 3' });
    const b = await calculate({ expression: 'previous * 3', previous_calculation_id: a.calculation_id });
    expect(b.exact_value).toBe('10/1');
    const c = await calculate({ expression: 'previous * 2', previous_calculation_id: b.calculation_id });
    expect(c.exact_value).toBe('20/1');
  });
});
