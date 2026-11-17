import crypto from 'crypto';

/**
 * Generates a deterministic SHA-256 compound hash from business fields.
 * Used for identifying duplicate bank settlement records regardless of surrogate settlement_id.
 */
export const generateBankBusinessKey = ({
  transaction_reference,
  transaction_type,
  settlement_date,
  settlement_amount,
  currency
}) => {
  const normRef = (transaction_reference || '').toString().trim().toUpperCase();
  const normType = (transaction_type || '').toString().trim().toUpperCase();
  const normDate = (settlement_date || '').toString().trim();
  const normAmount = (settlement_amount || '').toString().trim();
  const normCurrency = (currency || '').toString().trim().toUpperCase();

  const rawKey = `${normRef}|${normType}|${normDate}|${normAmount}|${normCurrency}`;
  return crypto.createHash('sha256').update(rawKey).digest('hex');
};
