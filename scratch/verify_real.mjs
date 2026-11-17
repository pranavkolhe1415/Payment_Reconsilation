// verify_real.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ReconciliationEngine } from '../server/src/services/reconciliationEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDataDir = path.resolve(__dirname, '../test-data');
const platformCsv = fs.readFileSync(path.join(testDataDir, 'platform_transactions.csv'), 'utf8');
const bankCsv = fs.readFileSync(path.join(testDataDir, 'bank_settlements.csv'), 'utf8');

const engine = new ReconciliationEngine({ periodStart: '2026-01-01', periodEnd: '2026-01-31', currency: 'INR' });
const result = engine.reconcile({ platformCsv, bankCsv });

// Summarize key totals
const summary = result.summary;
console.log('--- Summary Totals ---');
console.log(JSON.stringify(summary, null, 2));

// Discrepancies
console.log('--- Detected Discrepancies ---');
result.discrepancies.forEach(d => {
  console.log(`${d.case_id},${d.discrepancy_type},${d.platform_transaction_ids?.join('|') || ''},${d.bank_settlement_ids?.join('|') || ''},${d.description || ''}`);
});

// Export to JSON file for easier parsing
fs.writeFileSync(path.join(__dirname, 'reconciliation_output.json'), JSON.stringify(result, null, 2));
