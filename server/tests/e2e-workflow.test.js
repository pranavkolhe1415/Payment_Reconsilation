import { describe, it, expect } from 'vitest';
import request from 'supertest';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDataDir = path.resolve(__dirname, '../../test-data');

describe('ReconX End-to-End Workflow Verification', () => {
  let reconciliationId = '';

  // Step 1: Verify Application Startup & Static Frontend Serving
  it('Step 1: Application should be running and serve both API and HTML5 frontend', async () => {
    const apiRes = await request(app).get('/api/health');
    expect(apiRes.status).toBe(200);
    expect(apiRes.body.status).toBe('healthy');

    const htmlRes = await request(app).get('/');
    expect(htmlRes.status).toBe(200);
    expect(htmlRes.text).toContain('<!doctype html>');
    expect(htmlRes.text).toContain('ReconX');
  });

  // Step 2 & 4: Upload and Validate platform_transactions.csv
  it('Step 2 & 4: Upload and validate platform_transactions.csv', async () => {
    const platformFilePath = path.join(testDataDir, 'platform_transactions.csv');
    const res = await request(app)
      .post('/api/upload/platform')
      .attach('file', platformFilePath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.filename).toBe('platform_transactions.csv');
    expect(res.body.data.total_records).toBe(100);
    expect(res.body.data.valid_records).toBe(100);
    expect(res.body.data.invalid_records).toBe(0);
    expect(res.body.data.file_hash).toBeDefined();
  });

  // Step 3 & 4: Upload and Validate bank_settlements.csv
  it('Step 3 & 4: Upload and validate bank_settlements.csv', async () => {
    const bankFilePath = path.join(testDataDir, 'bank_settlements.csv');
    const res = await request(app)
      .post('/api/upload/bank')
      .attach('file', bankFilePath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.filename).toBe('bank_settlements.csv');
    expect(res.body.data.total_records).toBe(102);
    expect(res.body.data.valid_records).toBe(102);
    expect(res.body.data.invalid_records).toBe(0);
    expect(res.body.data.file_hash).toBeDefined();
  });

  // Step 5: Run Reconciliation
  it('Step 5: Run reconciliation using uploaded datasets', async () => {
    reconciliationId = `recon_workflow_${Date.now()}`;
    const res = await request(app)
      .post('/api/reconciliation/run')
      .send({
        reconciliation_id: reconciliationId,
        period_start: '2026-01-01',
        period_end: '2026-01-31'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.reconciliation_id).toBe(reconciliationId);
    expect(res.body.status).toBe('COMPLETED');
  });

  // Step 6: Verify Summary Metrics Displayed on Dashboard
  it('Step 6: Display the exact financial summary metrics on the dashboard', async () => {
    const res = await request(app).get(`/api/reconciliation/${reconciliationId}/summary`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const s = res.body.summary;
    // Platform Gross: exactly 46,612.500 INR
    expect(s.platform.gross_amount).toBe('46612.500');

    // Bank Raw Ingested: exactly 46,535.012 INR
    expect(s.bank_ingested.gross_amount).toBe('46535.012');

    // Quarantined Duplicate: exactly 172.500 INR (SET_DUP_001)
    expect(s.deduplication.quarantined_amount).toBe('172.500');

    // Deduplicated Net Bank Volume: exactly 46,362.512 INR
    expect(s.deduplication.deduped_net_amount).toBe('46362.512');

    // January Settled Cash: exactly 46,505.262 INR
    expect(s.reconciliation.reporting_period_settled_cash).toBe('46505.262');

    // Next-Month Timing Difference: exactly 107.250 INR (SET2001)
    expect(s.reconciliation.timing_differences_amount).toBe('107.250');

    // Aggregate Rounding Drift: exactly 0.012 INR (TXN1002-1004)
    expect(s.reconciliation.aggregate_rounding_difference).toBe('0.012');

    // Orphan Refund Outflow: exactly -250.000 INR (SET_REFUND_001)
    expect(s.reconciliation.orphan_refunds_amount).toBe('-250.000');
  });

  // Step 7 & 8: Open Discrepancy Investigation Page & Inspect the 4 Planted Cases
  it('Step 7 & 8: Retrieve and inspect each of the four planted discrepancies', async () => {
    const res = await request(app).get(`/api/reconciliation/${reconciliationId}/discrepancies`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(4);

    const discrepancies = res.body.discrepancies;

    // Discrepancy 1: GAP_01 (Late Settlement)
    const gap01 = discrepancies.find(d => d.case_id === 'GAP_01');
    expect(gap01).toBeDefined();
    expect(gap01.discrepancy_type).toBe('SETTLED_AFTER_PERIOD');
    expect(gap01.platform_transaction_ids).toEqual(['TXN1001']);
    expect(gap01.bank_settlement_ids).toEqual(['SET2001']);
    expect(gap01.platform_row_numbers).toEqual([2]);
    expect(gap01.bank_row_numbers).toEqual([2]);
    expect(gap01.platform_amount).toBe('107.25');
    expect(gap01.bank_amount).toBe('107.250');
    expect(gap01.expected_behavior).toContain('classify as settled after January period, not permanently missing');

    // Discrepancy 2: GAP_02 (Aggregate Rounding Difference)
    const gap02 = discrepancies.find(d => d.case_id === 'GAP_02');
    expect(gap02).toBeDefined();
    expect(gap02.discrepancy_type).toBe('AGGREGATE_ROUNDING_DIFFERENCE');
    expect(gap02.platform_transaction_ids).toEqual(['TXN1002', 'TXN1003', 'TXN1004']);
    expect(gap02.bank_settlement_ids).toEqual(['SET2002', 'SET2003', 'SET2004']);
    expect(gap02.platform_row_numbers).toEqual([3, 4, 5]);
    expect(gap02.bank_row_numbers).toEqual([3, 4, 5]);
    expect(gap02.delta_amount).toBe('0.012');
    expect(gap02.expected_behavior).toContain('Preserve precision before aggregation');

    // Discrepancy 3: GAP_03 (Duplicate Bank Entry)
    const gap03 = discrepancies.find(d => d.case_id === 'GAP_03');
    expect(gap03).toBeDefined();
    expect(gap03.discrepancy_type).toBe('DUPLICATE_ENTRY');
    expect(gap03.bank_settlement_ids).toEqual(['SET2010', 'SET_DUP_001']);
    expect(gap03.bank_row_numbers).toEqual([11, 102]);
    expect(gap03.bank_amount).toBe('172.500');
    expect(gap03.expected_behavior).toContain('Detect the second bank row as duplicate using business fields');

    // Discrepancy 4: GAP_04 (Orphan Refund)
    const gap04 = discrepancies.find(d => d.case_id === 'GAP_04');
    expect(gap04).toBeDefined();
    expect(gap04.discrepancy_type).toBe('ORPHAN_REFUND');
    expect(gap04.platform_transaction_ids).toEqual(['TXN9999']);
    expect(gap04.bank_settlement_ids).toEqual(['SET_REFUND_001']);
    expect(gap04.bank_row_numbers).toEqual([103]);
    expect(gap04.bank_amount).toBe('-250.00');
    expect(gap04.expected_behavior).toContain('does not exist in platform data');
  });

  // Step 9: Export Reconciliation Report
  it('Step 9: Export the reconciliation report as a formatted CSV file', async () => {
    const res = await request(app).get(`/api/reconciliation/${reconciliationId}/export`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain(`reconciliation-report-${reconciliationId}.csv`);

    const csvContent = res.text;
    expect(csvContent).toContain('RECONX PAYMENT RECONCILIATION AUDIT REPORT');
    expect(csvContent).toContain('FINANCIAL SETTLEMENT SUMMARY (INR)');
    expect(csvContent).toContain('Gross Platform Volume,"46612.500"');
    expect(csvContent).toContain('Gross Bank Ingested Volume,"46535.012"');
    expect(csvContent).toContain('Quarantined Bank Duplicate Volume,"172.500"');
    expect(csvContent).toContain('Timing Difference (Settled in Next Period),"107.250"');
    expect(csvContent).toContain('Aggregate Rounding Difference,"0.012"');
    expect(csvContent).toContain('Orphan Bank Refund Outflow,"-250.000"');
    expect(csvContent).toContain('DISCREPANCY INVESTIGATION MATRIX');
    expect(csvContent).toContain('"GAP_01"');
    expect(csvContent).toContain('"GAP_02"');
    expect(csvContent).toContain('"GAP_03"');
    expect(csvContent).toContain('"GAP_04"');
  });

  // Step 10: Browser Refresh / Persistence Retrieval
  it('Step 10: Refresh and verify that saved reconciliation results can be retrieved', async () => {
    // Simulating browser reload with stored reconciliationId from localStorage
    const reloadRes = await request(app).get(`/api/reconciliation/${reconciliationId}`);
    expect(reloadRes.status).toBe(200);
    expect(reloadRes.body.success).toBe(true);

    const reloaded = reloadRes.body.reconciliation;
    expect(reloaded.reconciliation_id).toBe(reconciliationId);
    expect(reloaded.status).toBe('COMPLETED');
    expect(reloaded.summary.platform.gross_amount).toBe('46612.500');
    expect(reloaded.summary.bank_ingested.gross_amount).toBe('46535.012');
    expect(reloaded.summary.reconciliation.aggregate_rounding_difference).toBe('0.012');
    expect(reloaded.discrepancies.length).toBe(4);
  });
});
