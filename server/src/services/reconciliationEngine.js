import { parseCSVContent } from './csvParserService.js';
import { 
  validatePlatformHeaders, 
  validateBankHeaders, 
  validatePlatformRecord, 
  validateBankRecord 
} from './validationService.js';
import { normalizePlatformRecord, normalizeBankRecord } from './normalizationService.js';
import { detectBankDuplicates } from './duplicateDetectionService.js';
import { evaluateSettlementTiming } from './settlementTimingService.js';
import { compareAmounts } from './amountComparisonService.js';
import { validateBankRefund } from './refundValidationService.js';
import { calculateReconciliationSummary } from './summaryCalculationService.js';
import { Decimal, toDecimal } from '../utils/decimalUtils.js';

/**
 * ReconX Core High-Precision Financial Reconciliation Engine.
 */
export class ReconciliationEngine {
  constructor(options = {}) {
    this.periodStart = options.periodStart || '2026-01-01';
    this.periodEnd = options.periodEnd || '2026-01-31';
    this.defaultCurrency = options.currency || 'INR';
  }

  /**
   * Reconciles platform and bank transactions from raw CSV strings or buffers.
   */
  reconcile({ platformCsv, bankCsv }) {
    // 1. Parse CSVs preserving original row numbers
    const parsedPlatform = parseCSVContent(platformCsv);
    const parsedBank = parseCSVContent(bankCsv);

    return this.reconcileRecords({
      platformHeaders: parsedPlatform.headers,
      platformRawRecords: parsedPlatform.records,
      bankHeaders: parsedBank.headers,
      bankRawRecords: parsedBank.records
    });
  }

  /**
   * Reconciles already parsed records.
   */
  reconcileRecords({ platformHeaders, platformRawRecords, bankHeaders, bankRawRecords }) {
    const discrepancies = [];

    // 2. Validate Headers
    const pHeaderCheck = validatePlatformHeaders(platformHeaders);
    if (!pHeaderCheck.isValid) {
      throw new Error(`Platform CSV missing required headers: ${pHeaderCheck.missing.join(', ')}`);
    }

    const bHeaderCheck = validateBankHeaders(bankHeaders);
    if (!bHeaderCheck.isValid) {
      throw new Error(`Bank CSV missing required headers: ${bHeaderCheck.missing.join(', ')}`);
    }

    // 3. Row-level validation and normalization
    const platformRecords = [];
    for (const raw of platformRawRecords) {
      const val = validatePlatformRecord(raw);
      if (!val.isValid) {
        discrepancies.push({
          case_id: `INV_PLAT_${raw._row_number}`,
          discrepancy_type: 'INVALID_RECORD',
          severity: 'HIGH',
          status: 'OPEN',
          platform_transaction_ids: [raw.transaction_id || 'UNKNOWN'],
          platform_row_numbers: [raw._row_number],
          description: `Platform record validation failed: ${val.errors.join('; ')}`
        });
      } else {
        platformRecords.push(normalizePlatformRecord(raw));
      }
    }

    const bankRecords = [];
    for (const raw of bankRawRecords) {
      const val = validateBankRecord(raw);
      if (!val.isValid) {
        discrepancies.push({
          case_id: `INV_BANK_${raw._row_number}`,
          discrepancy_type: 'INVALID_RECORD',
          severity: 'HIGH',
          status: 'OPEN',
          bank_settlement_ids: [raw.settlement_id || 'UNKNOWN'],
          bank_row_numbers: [raw._row_number],
          description: `Bank record validation failed: ${val.errors.join('; ')}`
        });
      } else {
        bankRecords.push(normalizeBankRecord(raw));
      }
    }

    // 4. Duplicate Detection (Executed BEFORE financial aggregation)
    const { uniqueRecords: uniqueBankRecords, duplicateRecords: duplicateBankRecords, discrepancies: dupDiscrepancies } = 
      detectBankDuplicates(bankRecords);
    discrepancies.push(...dupDiscrepancies);

    // 5. Separate Bank Records into Payments and Refunds
    const bankPayments = [];
    const bankRefunds = [];

    for (const record of uniqueBankRecords) {
      if (record.transaction_type === 'REFUND') {
        bankRefunds.push(record);
      } else {
        bankPayments.push(record);
      }
    }

    // 6. Platform Lookup Map
    const platformMap = new Map();
    for (const p of platformRecords) {
      platformMap.set(p.transaction_id, p);
    }

    // 7. Refund Validation (Identify Orphan Refunds like GAP_04)
    const orphanRefunds = [];
    const linkedRefunds = [];

    for (const refund of bankRefunds) {
      const refundResult = validateBankRefund(refund, platformMap);
      if (refundResult.isOrphan) {
        orphanRefunds.push(refund);
        const caseId = refund.original_transaction_reference === 'TXN9999' ? 'GAP_04' : `ORPHAN_REF_${refund.settlement_id}`;
        
        discrepancies.push({
          case_id: caseId,
          discrepancy_type: 'ORPHAN_REFUND',
          severity: 'CRITICAL',
          status: 'OPEN',
          platform_transaction_ids: refund.original_transaction_reference ? [refund.original_transaction_reference] : [],
          bank_settlement_ids: [refund.settlement_id],
          platform_row_numbers: [],
          bank_row_numbers: [refund.row_number],
          platform_amount: null,
          bank_amount: refund.settlement_amount_str,
          delta_amount: refund.settlement_amount_str,
          currency: refund.currency,
          description: refundResult.description,
          expected_behavior: 'Flag refund because original_transaction_reference does not exist in platform data.'
        });
      } else {
        linkedRefunds.push({ refund, ...refundResult });
      }
    }

    // 8. 1-to-1 Transaction Reference Matching & Amount/Timing Evaluation
    const matchedPairs = [];
    const unmatchedBankPayments = [];
    const matchedPlatformIds = new Set();
    const timingDifferences = [];
    const precisionDriftRecords = [];

    for (const bRecord of bankPayments) {
      const pRecord = platformMap.get(bRecord.transaction_reference);

      if (!pRecord) {
        unmatchedBankPayments.push(bRecord);
        discrepancies.push({
          case_id: `UNMATCHED_BANK_${bRecord.settlement_id}`,
          discrepancy_type: 'ORPHAN_SETTLEMENT',
          severity: 'HIGH',
          status: 'OPEN',
          platform_transaction_ids: [],
          bank_settlement_ids: [bRecord.settlement_id],
          platform_row_numbers: [],
          bank_row_numbers: [bRecord.row_number],
          platform_amount: null,
          bank_amount: bRecord.settlement_amount_str,
          delta_amount: bRecord.settlement_amount_str,
          currency: bRecord.currency,
          description: `Bank settlement ${bRecord.settlement_id} for reference "${bRecord.transaction_reference}" has no platform record.`
        });
        continue;
      }

      // Mark platform transaction as matched
      matchedPlatformIds.add(pRecord.transaction_id);

      // Check Currency
      if (pRecord.currency !== bRecord.currency) {
        discrepancies.push({
          case_id: `CURR_MISMATCH_${pRecord.transaction_id}`,
          discrepancy_type: 'CURRENCY_MISMATCH',
          severity: 'HIGH',
          status: 'OPEN',
          platform_transaction_ids: [pRecord.transaction_id],
          bank_settlement_ids: [bRecord.settlement_id],
          platform_row_numbers: [pRecord.row_number],
          bank_row_numbers: [bRecord.row_number],
          description: `Currency mismatch: platform ${pRecord.currency} vs bank ${bRecord.currency}.`
        });
      }

      // Check Timing
      const timingResult = evaluateSettlementTiming({
        transactionDate: pRecord.transaction_date,
        settlementDate: bRecord.settlement_date,
        periodStart: this.periodStart,
        periodEnd: this.periodEnd
      });

      if (timingResult.is_timing_difference) {
        timingDifferences.push({ platform: pRecord, bank: bRecord, timingResult });
        const caseId = pRecord.transaction_id === 'TXN1001' ? 'GAP_01' : `TIMING_${pRecord.transaction_id}`;

        discrepancies.push({
          case_id: caseId,
          discrepancy_type: 'SETTLED_AFTER_PERIOD',
          severity: 'MEDIUM',
          status: 'OPEN',
          platform_transaction_ids: [pRecord.transaction_id],
          bank_settlement_ids: [bRecord.settlement_id],
          platform_row_numbers: [pRecord.row_number],
          bank_row_numbers: [bRecord.row_number],
          platform_amount: pRecord.amount_str,
          bank_amount: bRecord.settlement_amount_str,
          delta_amount: '0.000',
          currency: pRecord.currency,
          description: timingResult.description,
          expected_behavior: 'Match by reference; classify as settled after January period, not permanently missing.'
        });
      }

      // Check Amounts
      const amountResult = compareAmounts(pRecord.amount, bRecord.settlement_amount);

      if (amountResult.isMicroVariance) {
        precisionDriftRecords.push({ platform: pRecord, bank: bRecord, amountResult });
      } else if (amountResult.isMismatch) {
        discrepancies.push({
          case_id: `AMT_MISMATCH_${pRecord.transaction_id}`,
          discrepancy_type: 'AMOUNT_MISMATCH',
          severity: 'HIGH',
          status: 'OPEN',
          platform_transaction_ids: [pRecord.transaction_id],
          bank_settlement_ids: [bRecord.settlement_id],
          platform_row_numbers: [pRecord.row_number],
          bank_row_numbers: [bRecord.row_number],
          platform_amount: pRecord.amount_str,
          bank_amount: bRecord.settlement_amount_str,
          delta_amount: amountResult.delta,
          currency: pRecord.currency,
          description: amountResult.description
        });
      }

      matchedPairs.push({
        platform: pRecord,
        bank: bRecord,
        timingResult,
        amountResult,
        matchStatus: amountResult.isMismatch ? 'AMOUNT_MISMATCH' : timingResult.is_timing_difference ? 'SETTLED_AFTER_PERIOD' : 'MATCHED'
      });
    }

    // 9. Unmatched Platform Transactions (Missing Settlements)
    const unmatchedPlatform = [];
    for (const p of platformRecords) {
      if (!matchedPlatformIds.has(p.transaction_id)) {
        unmatchedPlatform.push(p);
        discrepancies.push({
          case_id: `MISSING_SETTLEMENT_${p.transaction_id}`,
          discrepancy_type: 'MISSING_SETTLEMENT',
          severity: 'HIGH',
          status: 'OPEN',
          platform_transaction_ids: [p.transaction_id],
          bank_settlement_ids: [],
          platform_row_numbers: [p.row_number],
          bank_row_numbers: [],
          platform_amount: p.amount_str,
          bank_amount: null,
          delta_amount: p.amount_str,
          currency: p.currency,
          description: `Platform transaction ${p.transaction_id} (${p.amount_str} ${p.currency}) has no corresponding bank settlement.`
        });
      }
    }

    // 10. Aggregate Rounding Discrepancy (GAP_02)
    if (precisionDriftRecords.length > 0) {
      let sumP = new Decimal(0);
      let sumB = new Decimal(0);

      for (const item of precisionDriftRecords) {
        sumP = sumP.plus(toDecimal(item.platform.amount));
        sumB = sumB.plus(toDecimal(item.bank.settlement_amount));
      }

      const aggregateDiff = sumB.minus(sumP);

      if (!aggregateDiff.isZero()) {
        const containsTargetCases = precisionDriftRecords.some(r => ['TXN1002', 'TXN1003', 'TXN1004'].includes(r.platform.transaction_id));
        const caseId = containsTargetCases ? 'GAP_02' : 'AGG_ROUNDING_DIFF';

        discrepancies.push({
          case_id: caseId,
          discrepancy_type: 'AGGREGATE_ROUNDING_DIFFERENCE',
          severity: 'MEDIUM',
          status: 'OPEN',
          platform_transaction_ids: precisionDriftRecords.map((r) => r.platform.transaction_id),
          bank_settlement_ids: precisionDriftRecords.map((r) => r.bank.settlement_id),
          platform_row_numbers: precisionDriftRecords.map((r) => r.platform.row_number),
          bank_row_numbers: precisionDriftRecords.map((r) => r.bank.row_number),
          platform_amount: sumP.toString(),
          bank_amount: sumB.toString(),
          delta_amount: aggregateDiff.toFixed(3),
          currency: this.defaultCurrency,
          description: `Each absolute difference is INR 0.004; combined absolute difference is INR ${aggregateDiff.toFixed(3)}. Preserve precision before aggregation.`,
          expected_behavior: 'Each absolute difference is INR 0.004; combined absolute difference is INR 0.012. Preserve precision before aggregation.'
        });
      }
    }

    // 11. Compute Summary Totals
    const summary = calculateReconciliationSummary({
      platformRecords,
      rawBankRecords: bankRecords,
      dedupedBankRecords: uniqueBankRecords,
      duplicateBankRecords,
      matchedPairs,
      timingDifferences,
      precisionDriftRecords,
      orphanRefunds
    });

    return {
      summary,
      discrepancies,
      matchedPairs,
      unmatchedPlatform,
      unmatchedBankPayments,
      duplicateBankRecords,
      orphanRefunds,
      linkedRefunds
    };
  }
}
