import { toDecimal, abs } from '../utils/decimalUtils.js';

/**
 * Validates bank refund records against platform transactions.
 * Flags refunds whose parent transaction reference does not exist in platform data as ORPHAN_REFUND.
 */
export const validateBankRefund = (bankRefundRecord, platformRecordsMap) => {
  const originalRef = bankRefundRecord.original_transaction_reference;

  if (!originalRef || originalRef.trim() === '') {
    return {
      isOrphan: true,
      status: 'ORPHAN_REFUND',
      reason: 'MISSING_PARENT_REFERENCE',
      parentTransaction: null,
      description: `Bank refund ${bankRefundRecord.transaction_reference} (${bankRefundRecord.settlement_id}) has no original transaction reference specified.`
    };
  }

  const parent = platformRecordsMap.get(originalRef);

  if (!parent) {
    return {
      isOrphan: true,
      status: 'ORPHAN_REFUND',
      reason: 'PARENT_TRANSACTION_NOT_FOUND',
      parentTransaction: null,
      original_transaction_reference: originalRef,
      description: `Bank refund ${bankRefundRecord.transaction_reference} (${bankRefundRecord.settlement_id}) references non-existent platform transaction "${originalRef}".`
    };
  }

  // Parent found - validate amount bounds
  const refundAmt = abs(bankRefundRecord.settlement_amount);
  const parentAmt = abs(parent.amount);

  const isExcessive = refundAmt.greaterThan(parentAmt);

  return {
    isOrphan: false,
    status: isExcessive ? 'REFUND_EXCEEDS_PARENT' : 'LINKED_REFUND',
    parentTransaction: parent,
    isExcessive,
    description: isExcessive
      ? `Refund amount (${refundAmt.toString()}) exceeds original transaction amount (${parentAmt.toString()}).`
      : `Successfully linked refund to parent payment ${originalRef}.`
  };
};
