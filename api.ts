import express from 'express';
import { parseUserInput } from './engine/parser';
import { evaluateExpression, evaluateBinaryWithOperands } from './engine/evaluator';
import { generateExplanationForValue, generateExplanationForOperation } from './engine/explainer';
import { Value } from './engine/types';
import { exprToReadable } from './engine/utils';

type CalcRequest = {
  expression: string;
  previous_calculation_id?: string;
};

type CalcResponse = {
  expression: string;
  display_value: string;
  exact_value: string;
  is_exact: boolean;
  operation?: string;
  calculation_id: string;
  explanation: string;
  provenance: any;
  parsed_expression?: string;
  math_representation?: string;
  explanation_steps?: string[];
  precision?: string;
};

function computePrecisionFromRational(numer: bigint, denom: bigint, roundedDigits: number | null | undefined) {
  if (roundedDigits != null) return `${roundedDigits} digits (rounded for display)`;
  // if denom is power of 10, return number of decimal digits
  let d = denom < 0n ? -denom : denom;
  let digits = 0;
  while (d % 10n === 0n && d > 1n) {
    d /= 10n;
    digits++;
  }
  if (d === 1n) return `${digits} decimal digits (exact)`;
  return 'non-terminating / repeating decimal (infinite precision)';
}

const store: Map<string, Value> = new Map();

function opName(sym: string | undefined) {
  if (!sym) return undefined;
  if (sym === '+') return 'addition';
  if (sym === '-') return 'subtraction';
  if (sym === '*') return 'multiplication';
  if (sym === '/') return 'division';
  return undefined;
}

export async function calculate(req: CalcRequest): Promise<CalcResponse> {
  const { expression, previous_calculation_id } = req;
  if (!expression || typeof expression !== 'string') throw { status: 400, message: 'expression is required' };

  // quick safety: prevent extremely large inputs
  if (expression.length > 2000) throw { status: 413, message: 'expression too long' };

  try {
    const hasPreviousToken = /\bprevious\b/i.test(expression);
    if (hasPreviousToken) {
      if (!previous_calculation_id) throw { status: 400, message: 'previous_calculation_id required when using previous' };
      const prev = store.get(previous_calculation_id);
      if (!prev) throw { status: 404, message: 'previous calculation not found' };
      // support simple forms: "previous <op> <number>" or "<number> <op> previous"
      const m1 = expression.match(/\bprevious\b\s*([+\-*/])\s*([0-9.]+)/i);
      const m2 = expression.match(/([0-9.]+)\s*([+\-*/])\s*\bprevious\b/i);
      if (m1) {
        const op = m1[1] as '+' | '-' | '*' | '/';
        const num = m1[2];
        const other = evaluateExpression(parseUserInput(num), 0);
        const res = evaluateBinaryWithOperands(op, prev, other);
        // store result
        store.set(res.id, res);
        const expl = generateExplanationForOperation(res, prev, other, op);
        const parsed = res.provenance && res.provenance.expr ? exprToReadable(res.provenance.expr) : `(previous ${op} ${m1 ? m1[2] : '?'})`;
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
            previous_expression: exprToReadable(prev.provenance.expr),
          },
        };
      } else if (m2) {
        const op = m2[2] as '+' | '-' | '*' | '/';
        const num = m2[1];
        const other = evaluateExpression(parseUserInput(num), 0);
        const res = evaluateBinaryWithOperands(op, other, prev);
        store.set(res.id, res);
        const expl = generateExplanationForOperation(res, other, prev, op);
        const parsed = res.provenance && res.provenance.expr ? exprToReadable(res.provenance.expr) : `(${m2 ? m2[1] : '?'} ${op} previous)`;
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
            previous_expression: exprToReadable(prev.provenance.expr),
          },
        };
      }
      // unsupported complex uses of previous
      throw { status: 400, message: 'unsupported use of previous in expression' };
    }

    // normal evaluate
    const exprNode = parseUserInput(expression);
    const val = evaluateExpression(exprNode, 2);
    store.set(val.id, val);
    const expl = generateExplanationForValue(val);
    const op = (val.provenance.expr && (val.provenance.expr as any).op) || undefined;
    return {
      expression,
      parsed_expression: exprToReadable(exprNode),
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
  } catch (err: any) {
    if (err && err.status) throw err;
    // handle division by zero
    if (err instanceof Error && /Division by zero/i.test(err.message)) throw { status: 400, message: 'division by zero' };
    throw { status: 400, message: String(err && err.message ? err.message : err) };
  }
}

export function createServer() {
  const app = express();
  app.use(express.json());
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
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      next();
    });
  }
  // Simple in-memory rate limiter
  const RATE_LIMIT_WINDOW_MS = 60_000;
  const RATE_LIMIT_MAX = 120;
  const rateMap: Map<string, { count: number; reset: number }> = new Map();
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
      if (state.count > RATE_LIMIT_MAX) return res.status(429).json({ error: 'rate limit exceeded' });
      next();
    } catch (e) {
      next();
    }
  });
  // serve frontend static files if present
  app.use(express.static('frontend'));
  app.post('/api/calculate', async (req, res) => {
    try {
      // If caller requests using a previous calculation, optionally require auth
      const requireAuth = process.env.REQUIRE_HISTORY_AUTH === 'true';
      if (requireAuth && req.body && (req.body.previous_calculation_id || /\bprevious\b/i.test(String(req.body.expression || '')))) {
        const key = String(req.headers['x-api-key'] || '');
        if (!process.env.API_KEY || key !== process.env.API_KEY) return res.status(401).json({ error: 'unauthorized' });
      }
      const out = await calculate(req.body);
      res.json(out);
    } catch (err: any) {
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
      if (!process.env.API_KEY || key !== process.env.API_KEY) return res.status(401).json({ error: 'unauthorized' });
    }
    const v = store.get(id);
    if (!v) return res.status(404).json({ error: 'not found' });
    const expl = generateExplanationForValue(v);
    res.json({ id: v.id, display: v.display, exact: `${v.exact.numerator}/${v.exact.denominator}`, provenance: v.provenance, explanation: expl.explanation, explanation_steps: expl.steps });
  });
  return app;
}

export { store };
