"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateExpression = evaluateExpression;
exports.useValueAsOperand = useValueAsOperand;
exports.evaluateBinaryWithOperands = evaluateBinaryWithOperands;
const rational_1 = require("./rational");
let idCounter = 1;
function newId() {
    return `v${idCounter++}`;
}
const utils_1 = require("./utils");
function exprToString(expr) {
    // reuse readable form for small debugging strings
    return (0, utils_1.exprToReadable)(expr);
}
function evaluateExpression(expr, displayRoundedDigits = 2) {
    function evalNode(node) {
        if (node.type === 'literal') {
            // node.raw is user-typed literal
            const r = (0, rational_1.rationalFromString)(node.raw);
            const prov = { source: 'user', roundedDigits: null, userModified: true, timestamp: new Date().toISOString() };
            return { value: r, provenance: prov };
        }
        const left = evalNode(node.left);
        const right = evalNode(node.right);
        let result;
        let opStr = node.op;
        try {
            if (node.op === '+')
                result = left.value.add(right.value);
            else if (node.op === '-')
                result = left.value.sub(right.value);
            else if (node.op === '*')
                result = left.value.mul(right.value);
            else
                result = left.value.div(right.value);
        }
        catch (e) {
            throw e;
        }
        const provenance = {
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
    const val = {
        id: newId(),
        exact: { numerator: value.numerator, denominator: value.denominator },
        display,
        provenance,
    };
    return val;
}
function useValueAsOperand(value) {
    // If value provenance is calc and not userModified, use exact rational
    return new rational_1.Rational(value.exact.numerator, value.exact.denominator);
}
function evaluateBinaryWithOperands(op, a, b) {
    const ra = useValueAsOperand(a);
    const rb = useValueAsOperand(b);
    let res;
    if (op === '+')
        res = ra.add(rb);
    else if (op === '-')
        res = ra.sub(rb);
    else if (op === '*')
        res = ra.mul(rb);
    else
        res = ra.div(rb);
    const expr = { type: 'binary', op, left: { type: 'literal', raw: a.display, value: a.exact, source: a.provenance.source }, right: { type: 'literal', raw: b.display, value: b.exact, source: b.provenance.source } };
    const provenance = { source: 'calc', expr, roundedDigits: null, userModified: false, timestamp: new Date().toISOString() };
    const display = res.isInteger() ? res.toDecimalString() : res.toRoundedDecimalString(2);
    return { id: newId(), exact: { numerator: res.numerator, denominator: res.denominator }, display, provenance };
}
