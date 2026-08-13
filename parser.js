"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUserInput = parseUserInput;
function tokenize(s) {
    const out = [];
    let i = 0;
    while (i < s.length) {
        const c = s[i];
        if (c === ' ' || c === '\t' || c === '\n') {
            i++;
            continue;
        }
        if ('+-*/'.includes(c)) {
            out.push({ type: 'op', value: c });
            i++;
            continue;
        }
        if (c === '(' || c === ')') {
            out.push({ type: 'paren', value: c });
            i++;
            continue;
        }
        // number (integer, decimal, optional exponent)
        if (/[0-9.]/.test(c)) {
            const rest = s.slice(i);
            const m = rest.match(/^[0-9]+(\.[0-9]*)?|^\.[0-9]+/);
            if (!m)
                throw new Error('Invalid number at ' + i);
            const num = m[0];
            // check for exponent part
            let j = i + num.length;
            if (s[j] === 'e' || s[j] === 'E') {
                let k = j + 1;
                if (s[k] === '+' || s[k] === '-')
                    k++;
                while (k < s.length && /[0-9]/.test(s[k]))
                    k++;
                const expPart = s.slice(j, k);
                out.push({ type: 'num', value: num + expPart });
                i = k;
            }
            else {
                out.push({ type: 'num', value: num });
                i = j;
            }
            continue;
        }
        throw new Error('Unexpected character: ' + c);
    }
    return out;
}
function parseExpression(tokens) {
    let i = 0;
    function parsePrimary() {
        const t = tokens[i++];
        if (!t)
            throw new Error('Unexpected end');
        // unary + or -
        if (t.type === 'op' && (t.value === '+' || t.value === '-')) {
            const next = parsePrimary();
            if (t.value === '+')
                return next;
            // convert unary -x into (0 - x)
            return { type: 'binary', op: '-', left: { type: 'literal', raw: '0', value: { numerator: BigInt(0), denominator: BigInt(1) }, source: 'user' }, right: next };
        }
        if (t.type === 'num') {
            return { type: 'literal', raw: t.value, value: { numerator: BigInt(0), denominator: BigInt(1) }, source: 'user' };
        }
        if (t.type === 'paren' && t.value === '(') {
            const expr = parseAddSub();
            const next = tokens[i++];
            if (!next || next.type !== 'paren' || next.value !== ')')
                throw new Error('Missing )');
            return expr;
        }
        throw new Error('Unexpected token in primary');
    }
    function parseMulDiv() {
        let node = parsePrimary();
        while (i < tokens.length && tokens[i].type === 'op' && (tokens[i].value === '*' || tokens[i].value === '/')) {
            const op = tokens[i++].value;
            const right = parsePrimary();
            node = { type: 'binary', op, left: node, right };
        }
        return node;
    }
    function parseAddSub() {
        let node = parseMulDiv();
        while (i < tokens.length && tokens[i].type === 'op' && (tokens[i].value === '+' || tokens[i].value === '-')) {
            const op = tokens[i++].value;
            const right = parseMulDiv();
            node = { type: 'binary', op, left: node, right };
        }
        return node;
    }
    const result = parseAddSub();
    if (i < tokens.length)
        throw new Error('Unexpected tokens after expression');
    return result;
}
const MAX_EXPRESSION_LENGTH = 2000; // defensive
const MAX_TOKEN_COUNT = 1000;
const MAX_NUMBER_LENGTH = 500; // digits
function parseUserInput(s) {
    if (typeof s !== 'string')
        throw new Error('Input must be a string');
    if (s.length > MAX_EXPRESSION_LENGTH)
        throw new Error('Expression too long');
    const tokens = tokenize(s);
    if (tokens.length > MAX_TOKEN_COUNT)
        throw new Error('Expression too complex');
    // validate numeric token sizes
    for (const t of tokens) {
        if (t.type === 'num') {
            // strip optional exponent part
            const m = t.value.match(/^([0-9]*)(?:\.(.*))?(?:[eE]([+-]?\d+))?$/);
            if (m) {
                const intPart = m[1] || '';
                const fracPart = m[2] || '';
                const expPart = m[3] || '';
                if (intPart.length + fracPart.length > MAX_NUMBER_LENGTH)
                    throw new Error('Numeric literal too long');
                if (expPart && Math.abs(Number(expPart)) > 1000)
                    throw new Error('Exponent too large');
            }
            else {
                throw new Error('Invalid numeric literal');
            }
        }
    }
    return parseExpression(tokens);
}
