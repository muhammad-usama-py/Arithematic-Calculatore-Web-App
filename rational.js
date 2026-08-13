"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rational = void 0;
exports.rationalFromString = rationalFromString;
// Rational numbers are represented as reduced BigInt numerator/denominator pairs.
// This avoids floating-point errors and preserves exact arithmetic for rationals.
function bigintGCD(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) {
        const t = a % b;
        a = b;
        b = t;
    }
    return a;
}
class Rational {
    constructor(n, d = 1n) {
        if (d === 0n)
            throw new Error('Denominator cannot be zero');
        if (d < 0n) {
            n = -n;
            d = -d;
        }
        const g = bigintGCD(n, d);
        this.numerator = n / g;
        this.denominator = d / g;
    }
    static fromInteger(n) {
        return new Rational(BigInt(n), 1n);
    }
    static fromDecimalString(s) {
        // Accept forms like "3.33", "-0.125", "10"
        s = s.trim();
        // parse with regex to avoid JS Number conversion and limit sizes
        const m = s.match(/^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);
        if (!m)
            throw new Error('Invalid numeric format');
        const sign = m[1] === '-' ? -1n : 1n;
        const intPart = m[2] || '0';
        const fracPart = m[3] || '';
        const expPart = m[4] ? Number(m[4]) : 0;
        // defensive limits
        const MAX_TOTAL_DIGITS = 1000;
        if (intPart.length + fracPart.length > MAX_TOTAL_DIGITS)
            throw new Error('Numeric literal too long');
        if (Math.abs(expPart) > 1000)
            throw new Error('Exponent magnitude too large');
        // apply exponent: shift decimal point by expPart
        let digits = intPart + fracPart;
        let exp = expPart;
        if (exp > 0) {
            // append zeros
            digits = digits + '0'.repeat(exp);
            const denom = 1n;
            const numer = BigInt(digits || '0') * sign;
            return new Rational(numer, denom);
        }
        else if (exp < 0) {
            const shift = Math.abs(exp);
            // ensure we have enough leading zeros in digits
            if (shift > digits.length) {
                // produce fractional number
                const fracLen = shift - digits.length;
                digits = '0'.repeat(fracLen) + digits;
            }
            const splitIndex = digits.length - shift;
            const intP = digits.slice(0, splitIndex) || '0';
            const fracP = digits.slice(splitIndex) || '';
            const denom = 10n ** BigInt(fracP.length);
            const numer = BigInt(intP + fracP) * sign;
            return new Rational(numer, denom);
        }
        else {
            const denom = 10n ** BigInt(fracPart.length);
            const numer = BigInt(intPart + fracPart || '0') * sign;
            return new Rational(numer, denom);
        }
    }
    add(other) {
        return new Rational(this.numerator * other.denominator + other.numerator * this.denominator, this.denominator * other.denominator);
    }
    sub(other) {
        return new Rational(this.numerator * other.denominator - other.numerator * this.denominator, this.denominator * other.denominator);
    }
    mul(other) {
        return new Rational(this.numerator * other.numerator, this.denominator * other.denominator);
    }
    div(other) {
        if (other.numerator === 0n)
            throw new Error('Division by zero');
        return new Rational(this.numerator * other.denominator, this.denominator * other.numerator);
    }
    isInteger() {
        return this.denominator === 1n;
    }
    toDecimalString(maxFractionDigits = 20) {
        // Produce decimal string with up to maxFractionDigits, without scientific notation
        const n = this.numerator;
        const d = this.denominator;
        const sign = n < 0n ? '-' : '';
        const absN = n < 0n ? -n : n;
        const intPart = absN / d;
        let rem = absN % d;
        if (rem === 0n)
            return sign + intPart.toString();
        let frac = '';
        let count = 0;
        while (rem !== 0n && count < maxFractionDigits) {
            rem *= 10n;
            const digit = rem / d;
            frac += digit.toString();
            rem = rem % d;
            count++;
        }
        return sign + intPart.toString() + '.' + frac;
    }
    toRoundedDecimalString(digits) {
        if (digits < 0)
            throw new Error('digits must be non-negative');
        const n = this.numerator;
        const d = this.denominator;
        const sign = n < 0n ? '-' : '';
        const absN = n < 0n ? -n : n;
        const intPart = absN / d;
        let rem = absN % d;
        // compute fractional digits up to digits+1 to decide rounding
        let frac = '';
        for (let i = 0; i <= digits; i++) {
            rem *= 10n;
            const digit = rem / d;
            frac += digit.toString();
            rem = rem % d;
        }
        // now round based on last digit
        if (digits === 0) {
            const roundDigit = Number(frac[0] || '0');
            let intStr = intPart.toString();
            if (roundDigit >= 5) {
                intStr = (BigInt(intStr) + 1n).toString();
            }
            return sign + intStr;
        }
        const roundDigit = Number(frac[digits]);
        let mainFrac = frac.slice(0, digits);
        if (roundDigit >= 5) {
            // round up
            let carry = 1;
            const arr = mainFrac.split('').map((c) => Number(c));
            for (let i = arr.length - 1; i >= 0; i--) {
                const sum = arr[i] + carry;
                arr[i] = sum % 10;
                carry = Math.floor(sum / 10);
            }
            if (carry) {
                // increment integer part
                const newInt = intPart + 1n;
                return sign + newInt.toString() + '.' + arr.map(String).join('');
            }
            mainFrac = arr.map(String).join('');
        }
        return sign + intPart.toString() + '.' + mainFrac.padEnd(digits, '0');
    }
}
exports.Rational = Rational;
function rationalFromString(s) {
    return Rational.fromDecimalString(s);
}
