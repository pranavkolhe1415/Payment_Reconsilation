import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Decimal, toDecimal, add, sub } from '../src/utils/decimalUtils.js';
import { generateBankBusinessKey } from '../src/utils/hashUtils.js';
import { detectBankDuplicates } from '../src/services/duplicateDetectionService.js';
import { evaluateSettlementTiming } from '../src/services/settlementTimingService.js';
import { compareAmounts } from '../src/services/amountComparisonService.js';
import { validateBankRefund } from '../src/services/refundValidationService.js';
import { ReconciliationEngine } from '../src/services/reconciliationEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDataDir = path.resolve(__dirname, '../../test-data');

describe('Reconciliation Engine - Unit & Verification Tests', () => {

  describe('1. Decimal & Financial Precision Utilities', () => {
    it('demonstrates standard JavaScript float imprecision vs decimal.js exactness', () => {
      // In standard JS floats on the actual dataset values:
      const floatDiff1 = 114.504 - 114.50; // TXN1002
      expect(floatDiff1).not.toBe(0.004); // Produces 0.0040000000000048885 due to IEEE 754

      const floatDiff2 = 129.004 - 129.00; // TXN1004
      expect(floatDiff2).not.toBe(0.004); // Produces 0.003999999999990678 due to IEEE 754

      // In decimal.js:
      const decDiff1 = sub('114.504', '114.50');
      expect(decDiff1.toString()).toBe('0.004');

      const decDiff2 = sub('129.004', '129.00');
      expect(decDiff2.toString()).toBe('0.004');

      const combinedDiff = add(add(decDiff1, sub('121.754', '121.75')), decDiff2);
      expect(combinedDiff.toString()).toBe('0.012');
    });

    it('demonstrates that premature row-level rounding to 2 decimals hides micro-differences', () => {
      const row1Diff = 0.004;
      const row2Diff = 0.004;
      const row3Diff = 0.004;

      // Prematurely rounded at row level:
      const prematurelyRoundedSum = Number(row1Diff.toFixed(2)) + Number(row2Diff.toFixed(2)) + Number(row3Diff.toFixed(2));
      expect(prematurelyRoundedSum).toBe(0.00); // The drift is completely masked!

      // Preserving full source precision:
      const preciseSum = add(add(toDecimal('0.004'), toDecimal('0.004')), toDecimal('0.004'));
      expect(preciseSum.toFixed(3)).toBe('0.012'); // Unmasked!
    });
  });

  describe('2. Deduplication Service', () => {
    it('detects duplicate bank records by business hash regardless of settlement_id', () => {
      const records = [
        {
          settlement_id: 'SET2010',
          transaction_reference: 'TXN1010',
          transaction_type: 'PAYMENT',
          settlement_date: '2026-01-11',
          settlement_amount_str: '172.500',
          settlement_amount: toDecimal('172.500'),
          currency: 'INR',
          row_number: 11
        },
        {
          settlement_id: 'SET_DUP_001',
          transaction_reference: 'TXN1010',
          transaction_type: 'PAYMENT',
          settlement_date: '2026-01-11',
          settlement_amount_str: '172.500',
          settlement_amount: toDecimal('172.500'),
          currency: 'INR',
          row_number: 102
        }
      ];

      const result = detectBankDuplicates(records);
      expect(result.uniqueRecords.length).toBe(1);
      expect(result.duplicateRecords.length).toBe(1);
      expect(result.duplicateRecords[0].settlement_id).toBe('SET_DUP_001');
      expect(result.duplicateRecords[0].duplicate_of).toBe('SET2010');
      expect(result.discrepancies.length).toBe(1);
      expect(result.discrepancies[0].discrepancy_type).toBe('DUPLICATE_ENTRY');
      expect(result.discrepancies[0].case_id).toBe('GAP_03');
      expect(result.discrepancies[0].bank_row_numbers).toEqual([11, 102]);
    });
  });

  describe('3. Settlement Timing Service', () => {
    it('correctly classifies next-month settlement as SETTLED_AFTER_PERIOD, not permanently missing', () => {
      const timing = evaluateSettlementTiming({
        transactionDate: '2026-01-31',
        settlementDate: '2026-02-01',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31'
      });

      expect(timing.timing_status).toBe('SETTLED_AFTER_PERIOD');
      expect(timing.is_timing_difference).toBe(true);
      expect(timing.in_period_settled).toBe(false);
    });

    it('classifies ordinary in-period settlement as SETTLED_IN_PERIOD', () => {
      const timing = evaluateSettlementTiming({
        transactionDate: '2026-01-15',
        settlementDate: '2026-01-17',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31'
      });

      expect(timing.timing_status).toBe('SETTLED_IN_PERIOD');
      expect(timing.is_timing_difference).toBe(false);
      expect(timing.in_period_settled).toBe(true);
    });
  });

  describe('4. Refund Validation Service', () => {
    it('flags bank refund with missing parent as ORPHAN_REFUND', () => {
      const refundRecord = {
        settlement_id: 'SET_REFUND_001',
        transaction_reference: 'REFUND9001',
        transaction_type: 'REFUND',
        settlement_amount_str: '-250.00',
        settlement_amount: toDecimal('-250.00'),
        currency: 'INR',
        original_transaction_reference: 'TXN9999',
        row_number: 103
      };

      const platformMap = new Map(); // Empty map, TXN9999 does not exist
      const result = validateBankRefund(refundRecord, platformMap);

      expect(result.isOrphan).toBe(true);
      expect(result.status).toBe('ORPHAN_REFUND');
      expect(result.reason).toBe('PARENT_TRANSACTION_NOT_FOUND');
    });

    it('links refund when parent transaction exists in platform records', () => {
      const refundRecord = {
        settlement_id: 'SET_REFUND_002',
        transaction_reference: 'REFUND9002',
        transaction_type: 'REFUND',
        settlement_amount: toDecimal('-50.00'),
        original_transaction_reference: 'TXN1005'
      };

      const platformMap = new Map([
        ['TXN1005', { transaction_id: 'TXN1005', amount: toDecimal('136.25'), transaction_type: 'PAYMENT' }]
      ]);

      const result = validateBankRefund(refundRecord, platformMap);
      expect(result.isOrphan).toBe(false);
      expect(result.status).toBe('LINKED_REFUND');
    });
  });

  describe('5. Full Assessment Dataset Verification (Golden Test)', () => {
    const platformCsv = fs.readFileSync(path.join(testDataDir, 'platform_transactions.csv'), 'utf8');
    const bankCsv = fs.readFileSync(path.join(testDataDir, 'bank_settlements.csv'), 'utf8');

    const engine = new ReconciliationEngine({
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      currency: 'INR'
    });

    const result = engine.reconcile({ platformCsv, bankCsv });

    it('processes all 100 platform records and 102 bank records with row numbers preserved', () => {
      expect(result.summary.platform.total_records).toBe(100);
      expect(result.summary.bank_ingested.total_records).toBe(102);
      expect(result.matchedPairs.length).toBe(100);
      expect(result.unmatchedPlatform.length).toBe(0);
      expect(result.unmatchedBankPayments.length).toBe(0);
      expect(result.duplicateBankRecords.length).toBe(1);
      expect(result.orphanRefunds.length).toBe(1);
    });

    it('identifies exactly the 4 planted discrepancies', () => {
      const discrepancies = result.discrepancies;
      expect(discrepancies.length).toBe(4);

      const caseIds = discrepancies.map(d => d.case_id);
      expect(caseIds).toContain('GAP_01');
      expect(caseIds).toContain('GAP_02');
      expect(caseIds).toContain('GAP_03');
      expect(caseIds).toContain('GAP_04');
    });

    it('validates GAP_01: NEXT_MONTH_SETTLEMENT / SETTLED_AFTER_PERIOD', () => {
      const gap01 = result.discrepancies.find(d => d.case_id === 'GAP_01');
      expect(gap01).toBeDefined();
      expect(gap01.discrepancy_type).toBe('SETTLED_AFTER_PERIOD');
      expect(gap01.platform_transaction_ids).toEqual(['TXN1001']);
      expect(gap01.bank_settlement_ids).toEqual(['SET2001']);
      expect(gap01.platform_row_numbers).toEqual([2]);
      expect(gap01.bank_row_numbers).toEqual([2]);
      expect(gap01.platform_amount).toBe('107.25');
      expect(gap01.bank_amount).toBe('107.250');
    });

    it('validates GAP_02: AGGREGATE_ROUNDING_DIFFERENCE', () => {
      const gap02 = result.discrepancies.find(d => d.case_id === 'GAP_02');
      expect(gap02).toBeDefined();
      expect(gap02.discrepancy_type).toBe('AGGREGATE_ROUNDING_DIFFERENCE');
      expect(gap02.platform_transaction_ids).toEqual(['TXN1002', 'TXN1003', 'TXN1004']);
      expect(gap02.bank_settlement_ids).toEqual(['SET2002', 'SET2003', 'SET2004']);
      expect(gap02.platform_row_numbers).toEqual([3, 4, 5]);
      expect(gap02.bank_row_numbers).toEqual([3, 4, 5]);
      expect(gap02.delta_amount).toBe('0.012');
    });

    it('validates GAP_03: DUPLICATE_ENTRY', () => {
      const gap03 = result.discrepancies.find(d => d.case_id === 'GAP_03');
      expect(gap03).toBeDefined();
      expect(gap03.discrepancy_type).toBe('DUPLICATE_ENTRY');
      expect(gap03.bank_settlement_ids).toEqual(['SET2010', 'SET_DUP_001']);
      expect(gap03.bank_row_numbers).toEqual([11, 102]);
      expect(gap03.bank_amount).toBe('172.500');
    });

    it('validates GAP_04: ORPHAN_REFUND', () => {
      const gap04 = result.discrepancies.find(d => d.case_id === 'GAP_04');
      expect(gap04).toBeDefined();
      expect(gap04.discrepancy_type).toBe('ORPHAN_REFUND');
      expect(gap04.bank_settlement_ids).toEqual(['SET_REFUND_001']);
      expect(gap04.bank_row_numbers).toEqual([103]);
      expect(gap04.platform_transaction_ids).toEqual(['TXN9999']);
      expect(gap04.bank_amount).toBe('-250.00');
    });

    it('verifies exact financial ledger totals with high decimal precision', () => {
      const s = result.summary;

      // Platform gross volume: 46612.500
      expect(s.platform.gross_amount).toBe('46612.500');

      // Bank raw volume (all 102 rows): 46535.012
      expect(s.bank_ingested.gross_amount).toBe('46535.012');

      // Quarantined duplicate volume: 172.500
      expect(s.deduplication.quarantined_amount).toBe('172.500');
      expect(s.deduplication.prevented_inflation_amount).toBe('172.500');

      // Deduplicated bank net volume (101 rows): 46362.512
      expect(s.deduplication.deduped_net_amount).toBe('46362.512');

      // Matched bank payments volume (100 rows): 46612.512
      expect(s.reconciliation.matched_bank_amount).toBe('46612.512');

      // Timing difference (SET2001 on Feb 1): 107.250
      expect(s.reconciliation.timing_differences_amount).toBe('107.250');

      // Reporting period settled cash (Jan 1-31): 46505.262
      expect(s.reconciliation.reporting_period_settled_cash).toBe('46505.262');

      // Eventual settled cash: 46612.512
      expect(s.reconciliation.eventual_settlement_cash).toBe('46612.512');

      // Aggregate rounding drift: 0.012
      expect(s.reconciliation.aggregate_rounding_difference).toBe('0.012');

      // Orphan refund outflow: -250.000
      expect(s.reconciliation.orphan_refunds_amount).toBe('-250.000');
    });
  });

  describe('6. Additional Discrepancy Statuses & Edge Cases', () => {
    const engine = new ReconciliationEngine({
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      currency: 'INR'
    });

    it('detects AMOUNT_MISMATCH when variance exceeds tolerance threshold (> 0.01)', () => {
      const pCsv = 'transaction_id,transaction_date,transaction_type,amount,currency\nTXN_MISMATCH,2026-01-10,PAYMENT,100.00,INR';
      const bCsv = 'settlement_id,transaction_reference,settlement_date,transaction_type,settlement_amount,currency\nSET_MISM,TXN_MISMATCH,2026-01-11,PAYMENT,105.00,INR';

      const res = engine.reconcile({ platformCsv: pCsv, bankCsv: bCsv });
      const mismatch = res.discrepancies.find(d => d.discrepancy_type === 'AMOUNT_MISMATCH');
      expect(mismatch).toBeDefined();
      expect(mismatch.delta_amount).toBe('5');
    });

    it('detects MISSING_SETTLEMENT when platform transaction has no bank settlement', () => {
      const pCsv = 'transaction_id,transaction_date,transaction_type,amount,currency\nTXN_UNSETTLED,2026-01-10,PAYMENT,500.00,INR';
      const bCsv = 'settlement_id,transaction_reference,settlement_date,transaction_type,settlement_amount,currency\nSET_OTHER,TXN_OTHER,2026-01-11,PAYMENT,200.00,INR';

      const res = engine.reconcile({ platformCsv: pCsv, bankCsv: bCsv });
      const missing = res.discrepancies.find(d => d.discrepancy_type === 'MISSING_SETTLEMENT');
      expect(missing).toBeDefined();
      expect(missing.platform_transaction_ids).toEqual(['TXN_UNSETTLED']);
    });

    it('detects ORPHAN_SETTLEMENT when bank payment has no platform transaction', () => {
      const pCsv = 'transaction_id,transaction_date,transaction_type,amount,currency\nTXN_A,2026-01-10,PAYMENT,100.00,INR';
      const bCsv = 'settlement_id,transaction_reference,settlement_date,transaction_type,settlement_amount,currency\nSET_A,TXN_A,2026-01-11,PAYMENT,100.00,INR\nSET_EXTRA,TXN_UNKNOWN,2026-01-12,PAYMENT,999.00,INR';

      const res = engine.reconcile({ platformCsv: pCsv, bankCsv: bCsv });
      const orphanSettlement = res.discrepancies.find(d => d.discrepancy_type === 'ORPHAN_SETTLEMENT');
      expect(orphanSettlement).toBeDefined();
      expect(orphanSettlement.bank_settlement_ids).toEqual(['SET_EXTRA']);
    });

    it('detects CURRENCY_MISMATCH when currencies differ', () => {
      const pCsv = 'transaction_id,transaction_date,transaction_type,amount,currency\nTXN_CURR,2026-01-10,PAYMENT,100.00,INR';
      const bCsv = 'settlement_id,transaction_reference,settlement_date,transaction_type,settlement_amount,currency\nSET_CURR,TXN_CURR,2026-01-11,PAYMENT,100.00,USD';

      const res = engine.reconcile({ platformCsv: pCsv, bankCsv: bCsv });
      const curr = res.discrepancies.find(d => d.discrepancy_type === 'CURRENCY_MISMATCH');
      expect(curr).toBeDefined();
      expect(curr.description).toContain('Currency mismatch');
    });

    it('detects INVALID_RECORD when columns or formats are corrupt', () => {
      const pCsv = 'transaction_id,transaction_date,transaction_type,amount,currency\nTXN_CORRUPT,not-a-date,PAYMENT,abc,INR';
      const bCsv = 'settlement_id,transaction_reference,settlement_date,transaction_type,settlement_amount,currency\nSET_VALID,TXN_CORRUPT,2026-01-11,PAYMENT,100.00,INR';

      const res = engine.reconcile({ platformCsv: pCsv, bankCsv: bCsv });
      const invalid = res.discrepancies.find(d => d.discrepancy_type === 'INVALID_RECORD');
      expect(invalid).toBeDefined();
    });
  });

});
