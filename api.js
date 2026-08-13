"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
exports.calculate = calculate;
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const parser_1 = require("./engine/parser");
const evaluator_1 = require("./engine/evaluator");
const explainer_1 = require("./engine/explainer");
const utils_1 = require("./engine/utils");
function computePrecisionFromRational(numer, denom, roundedDigits) {
    if (roundedDigits != null)
        return `${roundedDigits} digits (rounded for display)`;
    // if denom is power of 10, return number of decimal digits
    let d = denom < 0n ? -denom : denom;
    let digits = 0;
    while (d % 10n === 0n && d > 1n) {
        d /= 10n;
        digits++;
    }
    if (d === 1n)
        return `${digits} decimal digits (exact)`;
    return 'non-terminating / repeating decimal (infinite precision)';
}
const store = new Map();
exports.store = store;
function opName(sym) {
    if (!sym)
        return undefined;
    if (sym === '+')
        return 'addition';
    if (sym === '-')
        return 'subtraction';
    if (sym === '*')
        return 'multiplication';
    if (sym === '/')
        return 'division';
    return undefined;
}
async function calculate(req) {
    const { expression, previous_calculation_id } = req;
    if (!expression || typeof expression !== 'string')
        throw { status: 400, message: 'expression is required' };
    // quick safety: prevent extremely large inputs
    if (expression.length > 2000)
        throw { status: 413, message: 'expression too long' };
    try {
        const hasPreviousToken = /\bprevious\b/i.test(expression);
        if (hasPreviousToken) {
            if (!previous_calculation_id)
                throw { status: 400, message: 'previous_calculation_id required when using previous' };
            const prev = store.get(previous_calculation_id);
            if (!prev)
                throw { status: 404, message: 'previous calculation not found' };
            // support simple forms: "previous <op> <number>" or "<number> <op> previous"
            const m1 = expression.match(/\bprevious\b\s*([+\-*/])\s*([0-9.]+)/i);
            const m2 = expression.match(/([0-9.]+)\s*([+\-*/])\s*\bprevious\b/i);
            if (m1) {
                const op = m1[1];
                const num = m1[2];
                const other = (0, evaluator_1.evaluateExpression)((0, parser_1.parseUserInput)(num), 0);
                const res = (0, evaluator_1.evaluateBinaryWithOperands)(op, prev, other);
                // store result
                store.set(res.id, res);
                const expl = (0, explainer_1.generateExplanationForOperation)(res, prev, other, op);
                const parsed = res.provenance && res.provenance.expr ? (0, utils_1.exprToReadable)(res.provenance.expr) : `(previous ${op} ${m1 ? m1[2] : '?'})`;
                return {
                    expression,
                    parsed_expression: parsed,
                    display_value: res.display,
                    exact_value: `${res.exact.numerator}/${res.exact.denominator}`,
                    math_representation: `${res.exact.numerator}/${res.exact.denominator}`,
                    precision: computePrecisionFromRational(res.exact.numerator, res.exact.denominator, res.provenance.roundedDigits),
                    is_exact: res.exact.denominator === 1n,
                    operation: opName(op),
                    calculation_id: res.id,
                    explanation: expl.explanation,
                    explanation_steps: expl.steps,
                    provenance: {
                        source: res.provenance.source,
                        roundedDigits: res.provenance.roundedDigits,
                        userModified: res.provenance.userModified,
                        timestamp: res.provenance.timestamp,
                        used_previous_calculation_id: prev.id,
                        previous_expression: (0, utils_1.exprToReadable)(prev.provenance.expr),
                    },
                };
            }
            else if (m2) {
                const op = m2[2];
                const num = m2[1];
                const other = (0, evaluator_1.evaluateExpression)((0, parser_1.parseUserInput)(num), 0);
                const res = (0, evaluator_1.evaluateBinaryWithOperands)(op, other, prev);
                store.set(res.id, res);
                const expl = (0, explainer_1.generateExplanationForOperation)(res, other, prev, op);
                const parsed = res.provenance && res.provenance.expr ? (0, utils_1.exprToReadable)(res.provenance.expr) : `(${m2 ? m2[1] : '?'} ${op} previous)`;
                return {
                    expression,
                    parsed_expression: parsed,
                    display_value: res.display,
                    exact_value: `${res.exact.numerator}/${res.exact.denominator}`,
                    math_representation: `${res.exact.numerator}/${res.exact.denominator}`,
                    precision: computePrecisionFromRational(res.exact.numerator, res.exact.denominator, res.provenance.roundedDigits),
                    is_exact: res.exact.denominator === 1n,
                    operation: opName(op),
                    calculation_id: res.id,
                    explanation: expl.explanation,
                    explanation_steps: expl.steps,
                    provenance: {
                        source: res.provenance.source,
                        roundedDigits: res.provenance.roundedDigits,
                        userModified: res.provenance.userModified,
                        timestamp: res.provenance.timestamp,
                        used_previous_calculation_id: prev.id,
                        previous_expression: (0, utils_1.exprToReadable)(prev.provenance.expr),
                    },
                };
            }
            // unsupported complex uses of previous
            throw { status: 400, message: 'unsupported use of previous in expression' };
        }
        // normal evaluate
        const exprNode = (0, parser_1.parseUserInput)(expression);
        const val = (0, evaluator_1.evaluateExpression)(exprNode, 2);
        store.set(val.id, val);
        const expl = (0, explainer_1.generateExplanationForValue)(val);
        const op = (val.provenance.expr && val.provenance.expr.op) || undefined;
        return {
            expression,
            parsed_expression: (0, utils_1.exprToReadable)(exprNode),
            display_value: val.display,
            exact_value: `${val.exact.numerator}/${val.exact.denominator}`,
            math_representation: `${val.exact.numerator}/${val.exact.denominator}`,
            precision: computePrecisionFromRational(val.exact.numerator, val.exact.denominator, val.provenance.roundedDigits),
            is_exact: val.exact.denominator === 1n,
            operation: opName(op),
            calculation_id: val.id,
            explanation: expl.explanation,
            explanation_steps: expl.steps,
            provenance: {
                source: val.provenance.source,
                roundedDigits: val.provenance.roundedDigits,
                userModified: val.provenance.userModified,
                timestamp: val.provenance.timestamp,
                expr: val.provenance.expr ? (val.provenance.expr.type === 'literal' ? (val.provenance.expr.raw) : undefined) : undefined,
            },
        };
    }
    catch (err) {
        if (err && err.status)
            throw err;
        // handle division by zero
        if (err instanceof Error && /Division by zero/i.test(err.message))
            throw { status: 400, message: 'division by zero' };
        throw { status: 400, message: String(err && err.message ? err.message : err) };
    }
}
function createServer() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    // Basic security headers
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        next();
    });
    // Optional CORS allow list via ALLOWED_ORIGIN env var
    const allowedOrigin = process.env.ALLOWED_ORIGIN;
    if (allowedOrigin) {
        app.use((req, res, next) => {
            res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-KEY');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            if (req.method === 'OPTIONS')
                return res.sendStatus(204);
            next();
        });
    }
    // Simple in-memory rate limiter
    const RATE_LIMIT_WINDOW_MS = 60000;
    const RATE_LIMIT_MAX = 120;
    const rateMap = new Map();
    app.use((req, res, next) => {
        try {
            const ip = req.ip || req.connection.remoteAddress || 'unknown';
            const now = Date.now();
            const state = rateMap.get(ip) || { count: 0, reset: now + RATE_LIMIT_WINDOW_MS };
            if (now > state.reset) {
                state.count = 0;
                state.reset = now + RATE_LIMIT_WINDOW_MS;
            }
            state.count++;
            rateMap.set(ip, state);
            if (state.count > RATE_LIMIT_MAX)
                return res.status(429).json({ error: 'rate limit exceeded' });
            next();
        }
        catch (e) {
            next();
        }
    });
    // serve frontend static files if present
    app.use(express_1.default.static('frontend'));
    app.post('/api/calculate', async (req, res) => {
        try {
            // If caller requests using a previous calculation, optionally require auth
            const requireAuth = process.env.REQUIRE_HISTORY_AUTH === 'true';
            if (requireAuth && req.body && (req.body.previous_calculation_id || /\bprevious\b/i.test(String(req.body.expression || '')))) {
                const key = String(req.headers['x-api-key'] || '');
                if (!process.env.API_KEY || key !== process.env.API_KEY)
                    return res.status(401).json({ error: 'unauthorized' });
            }
            const out = await calculate(req.body);
            res.json(out);
        }
        catch (err) {
            const status = err && err.status ? err.status : 500;
            const message = status < 500 ? (err && err.message ? err.message : 'error') : 'internal server error';
            res.status(status).json({ error: message });
        }
    });
    app.get('/api/history/:id', (req, res) => {
        const id = req.params.id;
        // optional auth
        if (process.env.REQUIRE_HISTORY_AUTH === 'true') {
            const key = String(req.headers['x-api-key'] || '');
            if (!process.env.API_KEY || key !== process.env.API_KEY)
                return res.status(401).json({ error: 'unauthorized' });
        }
        const v = store.get(id);
        if (!v)
            return res.status(404).json({ error: 'not found' });
        const expl = (0, explainer_1.generateExplanationForValue)(v);
        res.json({ id: v.id, display: v.display, exact: `${v.exact.numerator}/${v.exact.denominator}`, provenance: v.provenance, explanation: expl.explanation, explanation_steps: expl.steps });
    });
    return app;
}
