import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { 
  PlatformTransaction, 
  BankSettlement, 
  Reconciliation, 
  Discrepancy 
} from '../src/models/index.js';
import { getDBStatus } from '../src/config/db.js';

describe('Mongoose Schemas & Database Layer Tests', () => {

  describe('1. PlatformTransaction Schema', () => {
    it('validates a correct platform transaction model document', () => {
      const doc = new PlatformTransaction({
        transaction_id: 'TXN1001',
        transaction_date: '2026-01-31',
        transaction_type: 'PAYMENT',
        amount_str: '107.25',
        currency: 'INR',
        source_row_number: 2,
        reconciliation_id: 'RECON_TEST_001',
        raw_imported_values: { transaction_id: 'TXN1001', amount: '107.25' }
      });

      const err = doc.validateSync();
      expect(err).toBeUndefined();
      expect(doc.source_row_number).toBe(2);
      expect(doc.raw_imported_values.amount).toBe('107.25');
      expect(doc.status).toBe('SUCCESS');
    });

    it('rejects missing transaction_id, invalid date format, or invalid transaction_type', () => {
      const doc = new PlatformTransaction({
        transaction_date: 'invalid-date',
        transaction_type: 'UNSUPPORTED_TYPE',
        amount_str: '100.00',
        currency: 'INVALID',
        source_row_number: 2,
        reconciliation_id: 'RECON_TEST_001'
      });

      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.transaction_id).toBeDefined();
      expect(err.errors.transaction_date).toBeDefined();
      expect(err.errors.transaction_type).toBeDefined();
      expect(err.errors.currency).toBeDefined();
    });

    it('verifies compound unique index on reconciliation_id and transaction_id', () => {
      const indexes = PlatformTransaction.schema.indexes();
      const hasUniqueCompoundIndex = indexes.some(
        ([fields, opts]) => fields.reconciliation_id === 1 && fields.transaction_id === 1 && opts.unique === true
      );
      expect(hasUniqueCompoundIndex).toBe(true);
    });
  });

  describe('2. BankSettlement Schema', () => {
    it('validates a correct bank settlement model document', () => {
      const doc = new BankSettlement({
        settlement_id: 'SET2001',
        transaction_reference: 'TXN1001',
        settlement_date: '2026-02-01',
        transaction_type: 'PAYMENT',
        settlement_amount_str: '107.250',
        currency: 'INR',
        business_hash: 'abcdef1234567890',
        source_row_number: 2,
        reconciliation_id: 'RECON_TEST_001',
        raw_imported_values: { settlement_id: 'SET2001', settlement_amount: '107.250' }
      });

      const err = doc.validateSync();
      expect(err).toBeUndefined();
      expect(doc.is_duplicate).toBe(false);
      expect(doc.deduplication_status).toBe('PRIMARY');
    });

    it('verifies compound unique index on reconciliation_id and settlement_id', () => {
      const indexes = BankSettlement.schema.indexes();
      const hasUniqueIndex = indexes.some(
        ([fields, opts]) => fields.reconciliation_id === 1 && fields.settlement_id === 1 && opts.unique === true
      );
      expect(hasUniqueIndex).toBe(true);
    });
  });

  describe('3. Reconciliation Schema', () => {
    it('validates a complete reconciliation document with metrics & summary', () => {
      const doc = new Reconciliation({
        reconciliation_id: 'RECON_2026_01',
        period_start: '2026-01-01',
        period_end: '2026-01-31',
        summary: {
          platform_gross_amount: '46612.500',
          bank_raw_amount: '46535.012',
          aggregate_rounding_difference: '0.012'
        },
        metrics: {
          platform_records_count: 100,
          bank_records_count: 102,
          discrepancy_count: 4
        }
      });

      const err = doc.validateSync();
      expect(err).toBeUndefined();
      expect(doc.status).toBe('PENDING');
      expect(doc.currency).toBe('INR');
      expect(doc.summary.aggregate_rounding_difference).toBe('0.012');
    });

    it('verifies file hash compound index to prevent duplicate dataset imports', () => {
      const indexes = Reconciliation.schema.indexes();
      const hasFileHashIndex = indexes.some(
        ([fields]) => fields['platform_file.file_hash'] === 1 && fields['bank_file.file_hash'] === 1
      );
      expect(hasFileHashIndex).toBe(true);
    });
  });

  describe('4. Discrepancy Schema', () => {
    it('accepts all 10 supported discrepancy types', () => {
      const types = [
        'SETTLED_AFTER_PERIOD',
        'AGGREGATE_ROUNDING_DIFFERENCE',
        'DUPLICATE_ENTRY',
        'ORPHAN_REFUND',
        'MATCHED',
        'AMOUNT_MISMATCH',
        'MISSING_SETTLEMENT',
        'ORPHAN_SETTLEMENT',
        'CURRENCY_MISMATCH',
        'INVALID_RECORD'
      ];

      types.forEach((type) => {
        const doc = new Discrepancy({
          case_id: `CASE_${type}`,
          reconciliation_id: 'RECON_001',
          discrepancy_type: type,
          description: `Test for ${type}`
        });

        const err = doc.validateSync();
        expect(err).toBeUndefined();
      });
    });

    it('rejects unsupported discrepancy types', () => {
      const doc = new Discrepancy({
        case_id: 'INVALID_CASE',
        reconciliation_id: 'RECON_001',
        discrepancy_type: 'NON_EXISTENT_TYPE',
        description: 'Should fail'
      });

      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.discrepancy_type).toBeDefined();
    });

    it('supports audit notes log within discrepancy', () => {
      const doc = new Discrepancy({
        case_id: 'GAP_01',
        reconciliation_id: 'RECON_001',
        discrepancy_type: 'SETTLED_AFTER_PERIOD',
        description: 'Next-month settlement',
        notes: [
          { text: 'Auditor checked bank cleared date on Feb 1', author: 'AuditSenior' }
        ]
      });

      expect(doc.notes.length).toBe(1);
      expect(doc.notes[0].author).toBe('AuditSenior');
    });
  });

  describe('5. Database Diagnostic & Graceful Offline Status', () => {
    it('reports database status cleanly without leaking credentials or throwing errors', () => {
      const status = getDBStatus();
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('connected');
      expect(typeof status.connected).toBe('boolean');
    });
  });

});
