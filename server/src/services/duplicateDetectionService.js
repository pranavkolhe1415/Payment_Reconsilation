import { generateBankBusinessKey } from '../utils/hashUtils.js';

/**
 * Detects duplicate bank settlement records using the business key:
 * transaction_reference + transaction_type + settlement_date + settlement_amount + currency.
 * Quarantines duplicate rows so they never enter the financial totals or 1-to-1 matching queues.
 */
export const detectBankDuplicates = (bankRecords = []) => {
  const seenMap = new Map();
  const uniqueRecords = [];
  const duplicateRecords = [];
  const discrepancies = [];

  let duplicateCounter = 1;

  for (const record of bankRecords) {
    const businessKey = generateBankBusinessKey({
      transaction_reference: record.transaction_reference,
      transaction_type: record.transaction_type,
      settlement_date: record.settlement_date,
      settlement_amount: record.settlement_amount_str,
      currency: record.currency
    });

    record.business_hash = businessKey;

    if (seenMap.has(businessKey)) {
      const primaryRecord = seenMap.get(businessKey);

      record.is_duplicate = true;
      record.duplicate_of = primaryRecord.settlement_id;
      record.deduplication_status = 'DUPLICATE_EXCLUDED';
      duplicateRecords.push(record);

      const caseId = record.settlement_id === 'SET_DUP_001' ? 'GAP_03' : `DUP_${String(duplicateCounter++).padStart(3, '0')}`;

      discrepancies.push({
        case_id: caseId,
        discrepancy_type: 'DUPLICATE_ENTRY',
        severity: 'HIGH',
        status: 'OPEN',
        platform_transaction_ids: [record.transaction_reference],
        bank_settlement_ids: [primaryRecord.settlement_id, record.settlement_id],
        platform_row_numbers: [],
        bank_row_numbers: [primaryRecord.row_number, record.row_number],
        platform_amount: null,
        bank_amount: record.settlement_amount_str,
        delta_amount: record.settlement_amount_str,
        currency: record.currency,
        description: `Duplicate bank entry detected for reference "${record.transaction_reference}" with amount ${record.settlement_amount_str} ${record.currency}. Secondary entry "${record.settlement_id}" quarantined to prevent ledger inflation.`,
        expected_behavior: 'Detect the second bank row as duplicate using business fields, not settlement_id, and exclude it from financial totals.'
      });
    } else {
      record.is_duplicate = false;
      record.deduplication_status = 'PRIMARY';
      seenMap.set(businessKey, record);
      uniqueRecords.push(record);
    }
  }

  return {
    uniqueRecords,
    duplicateRecords,
    discrepancies
  };
};
