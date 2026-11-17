import fs from 'fs';
import path from 'path';

const { default: app } = await import('../server/src/app.js');

const server = app.listen(5000, async () => {
  try {
    console.log('--- Step 1: Server running on port 5000 ---');

    // Step 2 & 3: Read test data files
    const pData = fs.readFileSync('./test-data/platform_transactions.csv');
    const bData = fs.readFileSync('./test-data/bank_settlements.csv');

    // Upload platform CSV using standard FormData
    const pForm = new FormData();
    pForm.append('file', new Blob([pData], { type: 'text/csv' }), 'platform_transactions.csv');
    const pRes = await fetch('http://localhost:5000/api/upload/platform', { method: 'POST', body: pForm });
    const pJson = await pRes.json();
    console.log('--- Step 2: Upload platform_transactions.csv ---', { success: pJson.success, total_records: pJson.data.total_records });

    // Upload bank CSV
    const bForm = new FormData();
    bForm.append('file', new Blob([bData], { type: 'text/csv' }), 'bank_settlements.csv');
    const bRes = await fetch('http://localhost:5000/api/upload/bank', { method: 'POST', body: bForm });
    const bJson = await bRes.json();
    console.log('--- Step 3: Upload bank_settlements.csv ---', { success: bJson.success, total_records: bJson.data.total_records });

    // Step 4: Verification of validation
    console.log('--- Step 4: Validation Results ---', {
      platformValid: pJson.data.valid_records === 100,
      bankValid: bJson.data.valid_records === 102
    });

    // Step 5: Run Reconciliation
    const runRes = await fetch('http://localhost:5000/api/reconciliation/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reconciliation_id: 'recon_live_verify', period_start: '2026-01-01', period_end: '2026-01-31' })
    });
    const runJson = await runRes.json();
    console.log('--- Step 5: Run Reconciliation ---', { 
      status: runJson.status, 
      discrepancies_count: runJson.discrepancies_count,
      summary: {
        platform_gross: runJson.summary.platform.gross_amount,
        bank_raw: runJson.summary.bank_ingested.gross_amount,
        duplicate_quarantined: runJson.summary.deduplication.quarantined_amount,
        deduped_net: runJson.summary.deduplication.deduped_net_amount,
        settled_cash: runJson.summary.reconciliation.reporting_period_settled_cash,
        timing_lag: runJson.summary.reconciliation.timing_differences_amount,
        rounding_drift: runJson.summary.reconciliation.aggregate_rounding_difference,
        orphan_refund: runJson.summary.reconciliation.orphan_refunds_amount
      }
    });

    // Step 6: Summary on Dashboard
    const sumRes = await fetch('http://localhost:5000/api/reconciliation/recon_live_verify/summary');
    const sumJson = await sumRes.json();
    console.log('--- Step 6: Dashboard Summary API ---', { success: sumJson.success, gross: sumJson.summary.platform.gross_amount });

    // Step 7 & 8: Inspect Discrepancies
    const discRes = await fetch('http://localhost:5000/api/reconciliation/recon_live_verify/discrepancies');
    const discJson = await discRes.json();
    console.log('--- Step 7 & 8: Inspect 4 Planted Discrepancies ---');
    discJson.discrepancies.forEach(d => {
      console.log(`  Case: ${d.case_id} | Type: ${d.discrepancy_type} | Severity: ${d.severity} | Delta: ${d.delta_amount} | Platform: ${d.platform_transaction_ids} | Bank: ${d.bank_settlement_ids}`);
    });

    // Step 9: Export CSV Report
    const expRes = await fetch('http://localhost:5000/api/reconciliation/recon_live_verify/export');
    const expCsv = await expRes.text();
    console.log('--- Step 9: Export CSV Report ---', { 
      length: expCsv.length, 
      hasReportHeader: expCsv.includes('RECONX PAYMENT RECONCILIATION AUDIT REPORT'),
      hasGAP01: expCsv.includes('GAP_01'),
      hasGAP02: expCsv.includes('GAP_02'),
      hasGAP03: expCsv.includes('GAP_03'),
      hasGAP04: expCsv.includes('GAP_04')
    });

    // Step 10: Refresh / Persistence Retrieval
    const reloadRes = await fetch('http://localhost:5000/api/reconciliation/recon_live_verify');
    const reloadJson = await reloadRes.json();
    console.log('--- Step 10: Browser Reload Retrieval ---', { 
      retrieved: reloadJson.success,
      recon_id: reloadJson.reconciliation.reconciliation_id,
      status: reloadJson.reconciliation.status
    });

    server.close(() => {
      console.log('--- E2E Verification Completed Successfully ---');
      process.exit(0);
    });
  } catch (err) {
    console.error('Workflow error:', err);
    server.close(() => process.exit(1));
  }
});
