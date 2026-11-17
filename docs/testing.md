# ReconX Test Strategy & Quality Assurance

## Testing Hierarchy

### 1. Unit Tests (`vitest`)
- **Precision Arithmetic**: Verifies `decimal.js` calculations for sub-cent values (e.g. 0.004 INR) and proves standard float precision loss.
- **Deduplication Engine**: Verifies hashing of compound business fields and duplicate exclusion.
- **Classification Engine**: Tests matching logic, late settlement categorization, and orphan refund detection.

### 2. Integration Tests (`supertest` + `vitest`)
- Express REST API endpoint tests.
- File upload multipart handling.
- Discrepancy retrieval, filtering, and status updates.

### 3. Golden Dataset E2E Verification
- Runs reconciliation against the supplied `platform_transactions.csv` and `bank_settlements.csv`.
- Validates 100% agreement with `expected_results.csv`:
  - `GAP_01`: `TXN1001` / `SET2001` - Next Month Settlement.
  - `GAP_02`: `TXN1002`, `TXN1003`, `TXN1004` - Aggregate Rounding Discrepancy of exactly INR 0.012.
  - `GAP_03`: `SET_DUP_001` - Duplicate bank entry flagged and isolated.
  - `GAP_04`: `SET_REFUND_001` - Orphan refund on missing `TXN9999`.
