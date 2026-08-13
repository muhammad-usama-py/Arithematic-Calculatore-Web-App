"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateExplanationForValue = generateExplanationForValue;
exports.generateExplanationForOperation = generateExplanationForOperation;
const utils_1 = require("./utils");
function generateExplanationForValue(value) {
    const p = value.provenance;
    const steps = [];
    if (p.source === 'user') {
        steps.push(`Step 1: The user entered the literal ${value.display}.`);
        steps.push(`Step 2: The application treats this input as an exact decimal value (no prior provenance).`);
        steps.push(`Step 3: Internally it is represented exactly as the rational ${value.exact.numerator}/${value.exact.denominator}.`);
        if (p.roundedDigits != null)
            steps.push(`Step 4: The input was explicitly rounded to ${p.roundedDigits} digits for display.`);
        return { steps, explanation: steps.join('\n') };
    }
    if (p.source === 'calc') {
        steps.push(`Step 1: The calculator evaluated the expression ${(0, utils_1.exprToReadable)(p.expr)}.`);
        const denom = value.exact.denominator;
        // If expression contains literal operands, mention whether they were user-entered
        function gatherLiterals(node, acc = []) {
            if (!node)
                return acc;
            if (node.type === 'literal') {
                acc.push({ raw: node.raw, source: node.source });
                return acc;
            }
            gatherLiterals(node.left, acc);
            gatherLiterals(node.right, acc);
            return acc;
        }
        const literals = gatherLiterals(p.expr);
        if (literals.length > 0) {
            const userEntered = literals.filter((l) => l.source === 'user').map((l) => l.raw);
            if (userEntered.length > 0) {
                steps.push(`Step 2: The expression contains user-entered literal(s): ${userEntered.join(', ')}. These have no prior provenance.`);
            }
        }
        if (denom === 1n) {
            steps.push(`Step 2: The mathematical result is the integer ${value.exact.numerator}.`);
        }
        else if ((0, utils_1.isTerminatingDenominator)(denom)) {
            steps.push(`Step 2: The mathematical result is a terminating decimal equal to ${value.exact.numerator}/${value.exact.denominator}.`);
        }
        else {
            steps.push(`Step 2: The mathematical result is a repeating (non-terminating) decimal represented exactly as ${value.exact.numerator}/${value.exact.denominator}.`);
        }
        if (p.roundedDigits != null) {
            steps.push(`Step 3: For presentation the interface displays ${value.display}, rounded to ${p.roundedDigits} digits.`);
            steps.push(`Step 4: Internally, the calculation engine preserves the underlying exact rational and the provenance of this value rather than replacing it with the rounded display.`);
        }
        else {
            steps.push(`Step 3: The interface displays ${value.display}.`);
        }
        return { steps, explanation: steps.join('\n') };
    }
    // fallback
    steps.push(`Step 1: Value ${value.display} has provenance ${p.source}.`);
    return { steps, explanation: steps.join('\n') };
}
function generateExplanationForOperation(result, a, b, op) {
    const steps = [];
    // Describe inputs
    steps.push(`Step 1: The operation performed is ${a.display} ${op} ${b.display}.`);
    // Explain provenance of A
    if (a.provenance.source === 'calc' && a.provenance.expr) {
        steps.push(`Step 2: The first operand originated from a previous calculation: ${(0, utils_1.exprToReadable)(a.provenance.expr)}.`);
        if (a.provenance.roundedDigits != null) {
            steps.push(`Step 3: Its displayed form ${a.display} was rounded to ${a.provenance.roundedDigits} digits for presentation.`);
            steps.push(`Step 4: However, the engine retained the full exact rational ${a.exact.numerator}/${a.exact.denominator} and its provenance.`);
        }
        else {
            steps.push(`Step 3: Its internal exact value is ${a.exact.numerator}/${a.exact.denominator}.`);
        }
    }
    else if (a.provenance.source === 'user') {
        steps.push(`Step 2: The first operand was entered by the user as ${a.display} and has no earlier provenance.`);
        steps.push(`Step 3: It is therefore treated as the exact input value ${a.exact.numerator}/${a.exact.denominator}.`);
    }
    else {
        steps.push(`Step 2: The first operand provenance is ${a.provenance.source}.`);
    }
    // Explain provenance of B
    const baseStep = steps.length + 1;
    if (b.provenance.source === 'calc' && b.provenance.expr) {
        steps.push(`Step ${baseStep}: The second operand originated from a previous calculation: ${(0, utils_1.exprToReadable)(b.provenance.expr)}.`);
        if (b.provenance.roundedDigits != null) {
            steps.push(`Step ${baseStep + 1}: Its displayed form ${b.display} was rounded to ${b.provenance.roundedDigits} digits for presentation.`);
            steps.push(`Step ${baseStep + 2}: The engine retained the full exact rational ${b.exact.numerator}/${b.exact.denominator} and its provenance.`);
        }
        else {
            steps.push(`Step ${baseStep + 1}: Its internal exact value is ${b.exact.numerator}/${b.exact.denominator}.`);
        }
    }
    else if (b.provenance.source === 'user') {
        steps.push(`Step ${baseStep}: The second operand was entered by the user as ${b.display} and has no earlier provenance.`);
        steps.push(`Step ${baseStep + 1}: It is therefore treated as the exact input value ${b.exact.numerator}/${b.exact.denominator}.`);
    }
    else {
        steps.push(`Step ${baseStep}: The second operand provenance is ${b.provenance.source}.`);
    }
    // Explain the decision to use exact rationals or displayed values
    const next = steps.length + 1;
    const usedExactA = a.provenance.source === 'calc' && !a.provenance.userModified;
    const usedExactB = b.provenance.source === 'calc' && !b.provenance.userModified;
    if (usedExactA || usedExactB) {
        steps.push(`Step ${next}: Because one or both operands originated from prior calculations and were not modified by the user, the engine uses their retained exact rationals for the computation.`);
    }
    else {
        steps.push(`Step ${next}: Both operands are treated as the exact values the user provided (no retained provenance used).`);
    }
    // Perform the math explanation
    const finalStepIndex = steps.length + 1;
    if (result.exact.denominator === 1n) {
        steps.push(`Step ${finalStepIndex}: The exact mathematical result is ${result.exact.numerator}.`);
    }
    else {
        steps.push(`Step ${finalStepIndex}: The exact mathematical result is ${result.exact.numerator}/${result.exact.denominator}.`);
        if (!(0, utils_1.isTerminatingDenominator)(result.exact.denominator)) {
            steps.push(`Step ${finalStepIndex + 1}: This is a repeating (non-terminating) decimal when expressed in base 10; the interface may show a rounded representation.`);
        }
    }
    return { steps, explanation: steps.join('\n') };
}
