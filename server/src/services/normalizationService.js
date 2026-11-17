import { toDecimal } from '../utils/decimalUtils.js';

export const normalizePlatformRecord = (record) => {
  const normId = (record.transaction_id || '').trim();
  const normDate = (record.transaction_date || '').trim();
  const normType = (record.transaction_type || '').trim().toUpperCase();
  const normCurrency = (record.currency || 'INR').trim().toUpperCase();
  const normStatus = (record.status || 'SUCCESS').trim().toUpperCase();
  const normOriginalId = record.original_transaction_id ? record.original_transaction_id.trim() : null;

  // Preserve exact source precision as string, parse into Decimal
  const rawAmountStr = (record.amount || '0').trim();
  const decimalAmount = toDecimal(rawAmountStr);

  return {
    row_number: record._row_number || 0,
    transaction_id: normId,
    transaction_date: normDate,
    transaction_type: normType,
    amount_str: rawAmountStr,
    amount: decimalAmount,
    currency: normCurrency,
    status: normStatus,
    original_transaction_id: normOriginalId,
    raw: record
  };
};

export const normalizeBankRecord = (record) => {
  const normSettlementId = (record.settlement_id || '').trim();
  const normRef = (record.transaction_reference || '').trim();
  const normDate = (record.settlement_date || '').trim();
  const normType = (record.transaction_type || '').trim().toUpperCase();
  const normCurrency = (record.currency || 'INR').trim().toUpperCase();
  const normOriginalRef = record.original_transaction_reference ? record.original_transaction_reference.trim() : null;

  // Preserve exact source precision as string, parse into Decimal
  const rawAmountStr = (record.settlement_amount || '0').trim();
  const decimalAmount = toDecimal(rawAmountStr);

  return {
    row_number: record._row_number || 0,
    settlement_id: normSettlementId,
    transaction_reference: normRef,
    settlement_date: normDate,
    transaction_type: normType,
    settlement_amount_str: rawAmountStr,
    settlement_amount: decimalAmount,
    currency: normCurrency,
    original_transaction_reference: normOriginalRef,
    raw: record
  };
};
