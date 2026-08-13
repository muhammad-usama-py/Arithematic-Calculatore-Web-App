import { describe, it, expect } from 'vitest';
import { calculate } from '../src/api';
describe('API calculate', () => {
    it('10/3 then previous * 3 yields exact 10', async () => {
        const res1 = await calculate({ expression: '10 / 3' });
        expect(res1.display_value).toBe('3.33');
        const id = res1.calculation_id;
        const res2 = await calculate({ expression: 'previous * 3', previous_calculation_id: id });
        expect(res2.display_value).toBe('10');
        expect(res2.is_exact).toBe(true);
    });
    it('user-entered 3.33 * 3 yields 9.99', async () => {
        const res = await calculate({ expression: '3.33 * 3' });
        expect(res.display_value).toBe('9.99');
        expect(res.is_exact).toBe(false);
    });
    it('invalid expression returns error', async () => {
        await expect(calculate({ expression: 'foo + 1' })).rejects.toMatchObject({ status: 400 });
    });
});
