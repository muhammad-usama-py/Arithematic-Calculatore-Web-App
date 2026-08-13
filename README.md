# ExactCalc

ExactCalc is a small calculator web application that preserves the distinction between a displayed (rounded) numeric value and the underlying exact mathematical value. It demonstrates how rounding for presentation does not change the true rational value produced by calculations, and how tracking provenance (where a value came from) lets the engine make correct decisions when composing further operations.

## Problem: Decimal Rounding

Decimal displays commonly round results for human readability (for example, showing `3.33` instead of the repeating decimal `10/3 ≈ 3.333...`). Rounding is a presentation decision and should not be treated as a mathematical identity. If an application silently treats `3.33` as the exact rational `333/100` and substitutes it where the exact value `10/3` is intended, subsequent results can be incorrect.

This project demonstrates and enforces the correct distinction:

- `10 / 3` is exactly `10/3` (a repeating decimal). The UI may display `3.33`.
- If the engine retains provenance that the value came from `10/3`, then `(previous result) * 3` evaluates to the exact integer `10`.
- But an independently entered literal `3.33 * 3` evaluates to `9.99`.

ExactCalc never fabricates provenance: a user-entered `3.33` has no prior provenance and is treated as the exact decimal `333/100`.

## Why 10 / 3 produces a repeating decimal

In base 10, rational numbers whose denominators (after reduction) have prime factors other than 2 or 5 produce non-terminating repeating decimal expansions. `3` is such a denominator, so `10/3` is repeating (`3.333...`).

## Why 3.33 × 3 produces 9.99

The literal `3.33` represents the exact rational `333/100`. Multiplying by `3` yields `999/100`, which is `9.99` exactly.

## How ExactCalc preserves calculation meaning

- All numeric values are stored internally as exact rationals using `BigInt` numerator and denominator.
- Each `Value` also carries `provenance` metadata describing whether the value was `user`-entered or `calc`-derived and which expression produced it.
- When combining values, the engine prefers to use the retained exact rational for values that were produced by previous calculations and not explicitly modified by the user. This preserves mathematical identity when appropriate.

## What calculation provenance means

Provenance records the origin of a value:

- `source: 'user'` — the value was entered directly by the user (no earlier provenance).
- `source: 'calc'` — the value was produced by evaluating an expression; `expr` is included.
- `roundedDigits` indicates whether a display rounding was applied.

Provenance is conservative: ExactCalc never assumes provenance for user-entered literals.

## Representation of exact and approximate values

- Exact values: `Rational { numerator: BigInt, denominator: BigInt }` stored reduced.
- Display values: decimal string, optionally rounded to `N` digits for presentation.

Both are returned by the API and shown in the UI; explanations show how the decision was made.

## Parser

The parser is a small, safe recursive-descent parser that accepts:

- numeric literals (integers, decimals, optional exponent)
- unary `+` and `-`
- binary `+ - * /`
- parentheses

Defensive limits are applied to prevent huge or malicious inputs: maximum expression length, token count, numeric digit limits, and exponent magnitude.

## Calculation engine

- Uses `BigInt`-backed `Rational` arithmetic (`src/engine/rational.ts`) for exactness.
- Arithmetic operations return new reduced rationals; division by zero throws a controlled error.
- `evaluateExpression` builds `Value` objects with exact rational and provenance metadata.

## API

- `POST /api/calculate` — accepts `{ expression: string, previous_calculation_id?: string }` and returns a detailed result including `display_value`, `exact_value` (numerator/denominator), `precision`, `calculation_id`, `explanation` and `provenance`.
- `GET /api/history/:id` — retrieves a stored calculation's details.
- Security: optional `ALLOWED_ORIGIN` env var for CORS and `API_KEY` with `REQUIRE_HISTORY_AUTH=true` for protecting history access and `previous` usage.
- Basic rate limiting and security headers are included.

## How to run the project

Prerequisites: Node.js (>=16) and npm.

Install and run tests:

```bash
npm install
npm test
```

Run the app locally:

```bash
npm run build
node dist/server.js
# or in dev: node src/server.ts (with ts-node)
```

The frontend is served from `frontend/` by the Express static middleware.

## How to run tests

Unit and integration tests are in `test/` and run with Vitest via `npm test`.

## Examples

- `10 / 3` → displays `3.33` but `previous * 3` → exact `10` when using the previous result's provenance.
- `3.33 * 3` → `9.99`.

## Limitations

- History is in-memory (no persistent DB) — a production deployment should add durable storage and robust authentication/authorization.
- Rate limiting is in-memory and single-process — use a central store (Redis) for distributed deployments.
- Parser is intentionally small and does not support functions or variables; it is designed to be safe and auditable.

## Code quality and security notes

- No use of `eval`, `new Function`, or subprocess execution for expression evaluation.
- Defensive input validation prevents extremely large tokens or exponent magnitudes.
- Frontend sanitizes explanation markup to avoid XSS in the why-panel.

---

If you'd like, I can add persistent history storage (SQLite) and API-backed authentication next.
