import { describe, it, expect } from 'vitest';
import request from 'supertest';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDataDir = path.resolve(__dirname, '../../test-data');

describe('ReconX API Endpoints Integration Tests (Supertest)', () => {
  let createdReconciliationId = '';

  describe('1. Health Check Endpoint', () => {
    it('GET /api/health should return status healthy and database status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('ReconX API Engine');
      expect(res.body.database).toBeDefined();
      expect(res.body.database).toHaveProperty('connected');
    });
  });

  describe('2. POST /api/upload/platform', () => {
    it('should return 400 Bad Request when no file is attached', async () => {
      const res = await request(app).post('/api/upload/platform');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('No file uploaded');
    });

    it('should return 400 Bad Request when non-csv file is uploaded', async () => {
      const res = await request(app)
        .post('/api/upload/platform')
        .attach('file', Buffer.from('hello world'), 'sample.txt');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Only .csv files are supported');
    });

    it('should return 400 Bad Request when required columns are missing in CSV', async () => {
      const badCsv = 'colA,colB\n1,2';
      const res = await request(app)
        .post('/api/upload/platform')
        .attach('file', Buffer.from(badCsv), 'bad_platform.csv');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('missing required headers');
    });

    it('should successfully upload and validate platform_transactions.csv', async () => {
      const platformFilePath = path.join(testDataDir, 'platform_transactions.csv');
      const res = await request(app)
        .post('/api/upload/platform')
        .attach('file', platformFilePath);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total_records).toBe(100);
      expect(res.body.data.valid_records).toBe(100);
      expect(res.body.data.invalid_records).toBe(0);
      expect(res.body.data.file_hash).toBeDefined();
    });
  });

  describe('3. POST /api/upload/bank', () => {
    it('should return 400 Bad Request when no file is attached', async () => {
      const res = await request(app).post('/api/upload/bank');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('No file uploaded');
    });

    it('should return 400 Bad Request when required columns are missing in CSV', async () => {
      const badCsv = 'colA,colB\n1,2';
      const res = await request(app)
        .post('/api/upload/bank')
        .attach('file', Buffer.from(badCsv), 'bad_bank.csv');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('missing required headers');
    });

    it('should successfully upload and validate bank_settlements.csv', async () => {
      const bankFilePath = path.join(testDataDir, 'bank_settlements.csv');
      const res = await request(app)
        .post('/api/upload/bank')
        .attach('file', bankFilePath);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total_records).toBe(102);
      expect(res.body.data.valid_records).toBe(102);
      expect(res.body.data.invalid_records).toBe(0);
      expect(res.body.data.file_hash).toBeDefined();
    });
  });

  describe('4. POST /api/reconciliation/run', () => {
    it('should execute reconciliation and return full summary and 4 planted discrepancies', async () => {
      const testJobId = `recon_test_${Date.now()}`;
      const res = await request(app)
        .post('/api/reconciliation/run')
        .send({
          reconciliation_id: testJobId,
          period_start: '2026-01-01',
          period_end: '2026-01-31'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.reconciliation_id).toBe(testJobId);
      createdReconciliationId = testJobId;

      const summary = res.body.summary;
      expect(summary.platform.gross_amount).toBe('46612.500');
      expect(summary.bank_ingested.gross_amount).toBe('46535.012');
      expect(summary.deduplication.quarantined_amount).toBe('172.500');
      expect(summary.deduplication.deduped_net_amount).toBe('46362.512');
      expect(summary.reconciliation.timing_differences_amount).toBe('107.250');
      expect(summary.reconciliation.reporting_period_settled_cash).toBe('46505.262');
      expect(summary.reconciliation.aggregate_rounding_difference).toBe('0.012');
      expect(summary.reconciliation.orphan_refunds_amount).toBe('-250.000');

      expect(res.body.discrepancies_count).toBe(4);
      const caseIds = res.body.discrepancies.map(d => d.case_id);
      expect(caseIds).toContain('GAP_01');
      expect(caseIds).toContain('GAP_02');
      expect(caseIds).toContain('GAP_03');
      expect(caseIds).toContain('GAP_04');
    });
  });

  describe('5. GET /api/reconciliation/:id', () => {
    it('should fetch the reconciliation run details by ID', async () => {
      const res = await request(app).get(`/api/reconciliation/${createdReconciliationId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reconciliation.reconciliation_id).toBe(createdReconciliationId);
      expect(res.body.reconciliation.status).toBe('COMPLETED');
    });

    it('should return 404 for unknown reconciliation ID', async () => {
      const res = await request(app).get('/api/reconciliation/non_existent_id');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not found');
    });
  });

  describe('6. GET /api/reconciliation/:id/summary', () => {
    it('should return the high-precision financial summary', async () => {
      const res = await request(app).get(`/api/reconciliation/${createdReconciliationId}/summary`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reconciliation_id).toBe(createdReconciliationId);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.platform.gross_amount).toBe('46612.500');
      expect(res.body.summary.reconciliation.aggregate_rounding_difference).toBe('0.012');
    });

    it('should return 404 for unknown reconciliation ID', async () => {
      const res = await request(app).get('/api/reconciliation/non_existent_id/summary');
      expect(res.status).toBe(404);
    });
  });

  describe('7. GET /api/reconciliation/:id/discrepancies', () => {
    it('should return all discrepancies for the run', async () => {
      const res = await request(app).get(`/api/reconciliation/${createdReconciliationId}/discrepancies`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(4);
      expect(res.body.discrepancies.length).toBe(4);
    });

    it('should filter discrepancies by type=SETTLED_AFTER_PERIOD', async () => {
      const res = await request(app)
        .get(`/api/reconciliation/${createdReconciliationId}/discrepancies?type=SETTLED_AFTER_PERIOD`);
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.discrepancies[0].case_id).toBe('GAP_01');
    });

    it('should filter discrepancies by severity=CRITICAL', async () => {
      const res = await request(app)
        .get(`/api/reconciliation/${createdReconciliationId}/discrepancies?severity=CRITICAL`);
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.discrepancies[0].case_id).toBe('GAP_04');
    });

    it('PATCH /api/reconciliation/:id/discrepancies/:caseId/status should update discrepancy workflow status', async () => {
      const res = await request(app)
        .patch(`/api/reconciliation/${createdReconciliationId}/discrepancies/GAP_01/status`)
        .send({
          status: 'RESOLVED',
          resolved_by: 'Lead Auditor',
          note: 'Verified timing difference against bank cleared date on Feb 1.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.discrepancy.status).toBe('RESOLVED');
    });

    it('POST /api/reconciliation/:id/discrepancies/:caseId/notes should append an investigation audit note', async () => {
      const res = await request(app)
        .post(`/api/reconciliation/${createdReconciliationId}/discrepancies/GAP_04/notes`)
        .send({
          text: 'Contacted acquiring bank regarding orphan refund SET_REFUND_001 referencing TXN9999.',
          author: 'Risk Specialist'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.note.text).toContain('Contacted acquiring bank');
    });
  });

  describe('8. GET /api/reconciliation/:id/export', () => {
    it('should export a downloadable CSV reconciliation audit report', async () => {
      const res = await request(app).get(`/api/reconciliation/${createdReconciliationId}/export`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain(`reconciliation-report-${createdReconciliationId}.csv`);

      const text = res.text;
      expect(text).toContain('RECONX PAYMENT RECONCILIATION AUDIT REPORT');
      expect(text).toContain('FINANCIAL SETTLEMENT SUMMARY (INR)');
      expect(text).toContain('DISCREPANCY INVESTIGATION MATRIX');
      expect(text).toContain('GAP_01');
      expect(text).toContain('GAP_02');
      expect(text).toContain('GAP_03');
      expect(text).toContain('GAP_04');
      expect(text).toContain('0.012');
      expect(text).toContain('46612.500');
    });

    it('should return 404 when exporting non-existent reconciliation ID', async () => {
      const res = await request(app).get('/api/reconciliation/non_existent_id/export');
      expect(res.status).toBe(404);
    });
  });

});
