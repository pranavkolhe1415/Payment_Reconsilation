import { Decimal } from '../utils/decimalUtils.js';

const REQUIRED_PLATFORM_HEADERS = ['transaction_id', 'transaction_date', 'transaction_type', 'amount', 'currency'];
const REQUIRED_BANK_HEADERS = ['settlement_id', 'transaction_reference', 'settlement_date', 'transaction_type', 'settlement_amount', 'currency'];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;

export const validatePlatformHeaders = (headers = []) => {
  const missing = REQUIRED_PLATFORM_HEADERS.filter((col) => !headers.includes(col));
  return {
    isValid: missing.length === 0,
    missing
  };
};

export const validateBankHeaders = (headers = []) => {
  const missing = REQUIRED_BANK_HEADERS.filter((col) => !headers.includes(col));
  return {
    isValid: missing.length === 0,
    missing
  };
};

export const validatePlatformRecord = (record) => {
  const errors = [];

  if (!record.transaction_id || record.transaction_id.trim() === '') {
    errors.push('Missing transaction_id');
  }

  if (!record.transaction_date || !DATE_REGEX.test(record.transaction_date.trim()) || isNaN(Date.parse(record.transaction_date))) {
    errors.push(`Invalid transaction_date: "${record.transaction_date}". Expected YYYY-MM-DD.`);
  }

  const type = (record.transaction_type || '').trim().toUpperCase();
  if (!['PAYMENT', 'REFUND'].includes(type)) {
    errors.push(`Invalid transaction_type: "${record.transaction_type}". Expected PAYMENT or REFUND.`);
  }

  try {
    if (record.amount === undefined || record.amount === null || record.amount === '') {
      errors.push('Missing amount');
    } else {
      const dec = new Decimal(record.amount);
      if (dec.isNaN()) {
        errors.push(`Amount "${record.amount}" is not a valid number`);
      }
    }
  } catch (err) {
    errors.push(`Amount "${record.amount}" cannot be parsed: ${err.message}`);
  }

  const currency = (record.currency || '').trim().toUpperCase();
  if (!CURRENCY_REGEX.test(currency)) {
    errors.push(`Invalid currency: "${record.currency}". Expected 3-letter currency code.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateBankRecord = (record) => {
  const errors = [];

  if (!record.settlement_id || record.settlement_id.trim() === '') {
    errors.push('Missing settlement_id');
  }

  if (!record.transaction_reference || record.transaction_reference.trim() === '') {
    errors.push('Missing transaction_reference');
  }

  if (!record.settlement_date || !DATE_REGEX.test(record.settlement_date.trim()) || isNaN(Date.parse(record.settlement_date))) {
    errors.push(`Invalid settlement_date: "${record.settlement_date}". Expected YYYY-MM-DD.`);
  }

  const type = (record.transaction_type || '').trim().toUpperCase();
  if (!['PAYMENT', 'REFUND'].includes(type)) {
    errors.push(`Invalid transaction_type: "${record.transaction_type}". Expected PAYMENT or REFUND.`);
  }

  try {
    if (record.settlement_amount === undefined || record.settlement_amount === null || record.settlement_amount === '') {
      errors.push('Missing settlement_amount');
    } else {
      const dec = new Decimal(record.settlement_amount);
      if (dec.isNaN()) {
        errors.push(`Settlement amount "${record.settlement_amount}" is not a valid number`);
      }
    }
  } catch (err) {
    errors.push(`Settlement amount "${record.settlement_amount}" cannot be parsed: ${err.message}`);
  }

  const currency = (record.currency || '').trim().toUpperCase();
  if (!CURRENCY_REGEX.test(currency)) {
    errors.push(`Invalid currency: "${record.currency}". Expected 3-letter currency code.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
