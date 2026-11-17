import { Decimal } from 'decimal.js';

// Configure high precision for financial accounting
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const toDecimal = (val) => {
  if (val instanceof Decimal) return val;
  if (val === null || val === undefined || val === '') return new Decimal(0);
  return new Decimal(val.toString().trim());
};

export const add = (a, b) => toDecimal(a).plus(toDecimal(b));

export const sub = (a, b) => toDecimal(a).minus(toDecimal(b));

export const mul = (a, b) => toDecimal(a).times(toDecimal(b));

export const div = (a, b) => toDecimal(a).dividedBy(toDecimal(b));

export const abs = (a) => toDecimal(a).abs();

export const eq = (a, b) => toDecimal(a).equals(toDecimal(b));

export const isZero = (a) => toDecimal(a).isZero();

export const gt = (a, b) => toDecimal(a).greaterThan(toDecimal(b));

export const lt = (a, b) => toDecimal(a).lessThan(toDecimal(b));

export const formatMoney = (val, decimals = 3) => {
  const dec = toDecimal(val);
  return dec.toFixed(decimals);
};

export { Decimal };
