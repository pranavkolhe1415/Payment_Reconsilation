import { toDecimal, sub, abs, isZero, gt, formatMoney } from '../utils/decimalUtils.js';

const MICRO_VARIANCE_THRESHOLD = '0.01'; // Variance <= 1 paisa (0.01 INR) treated as rounding/precision variance

/**
 * Compares platform amount and bank settlement amount with full decimal precision.
 * Preserves source precision and never truncates or rounds prematurely.
 */
export const compareAmounts = (platformAmount, bankAmount) => {
  const pDec = toDecimal(platformAmount);
  const bDec = toDecimal(bankAmount);

  const delta = sub(bDec, pDec);
  const absDelta = abs(delta);

  if (isZero(delta)) {
    return {
      status: 'EXACT_MATCH',
      delta: '0.000',
      absDelta: '0.000',
      isExact: true,
      isMicroVariance: false,
      isMismatch: false
    };
  }

  const thresholdDec = toDecimal(MICRO_VARIANCE_THRESHOLD);

  if (absDelta.lessThanOrEqualTo(thresholdDec)) {
    return {
      status: 'PRECISION_VARIANCE',
      delta: delta.toString(),
      absDelta: absDelta.toString(),
      isExact: false,
      isMicroVariance: true,
      isMismatch: false,
      description: `Row precision drift of ${delta.toString()} INR preserved.`
    };
  }

  return {
    status: 'AMOUNT_MISMATCH',
    delta: delta.toString(),
    absDelta: absDelta.toString(),
    isExact: false,
    isMicroVariance: false,
    isMismatch: true,
    description: `Significant amount mismatch: platform ${formatMoney(pDec)} vs bank ${formatMoney(bDec)} (delta: ${delta.toString()} INR).`
  };
};
