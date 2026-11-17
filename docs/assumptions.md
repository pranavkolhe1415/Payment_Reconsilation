# ReconX Domain Assumptions & Business Rules

## 1. Scope & Financial Boundaries
- **Reporting Period**: January 1, 2026 00:00:00 to January 31, 2026 23:59:59 (inclusive, local business timezone).
- **Currency**: INR for all transactions. Single-currency reconciliation (no foreign exchange conversion required).
- **Platform Lifecycle**: Platform records indicate successful consumer payment capture.
- **Bank Lifecycle**: Bank settlements normally clear within T+1 to T+2 calendar days.

## 2. Primary Linkage Keys
- `platform_transactions.transaction_id` matches `bank_settlements.transaction_reference`.
- `settlement_id` is an internal bank surrogate ID and **must not** be used as a business transaction identifier.

## 3. Deduplication Logic
- A duplicate bank record is identified by identical values across:
  `transaction_reference + transaction_type + settlement_date + settlement_amount + currency`
- Duplicate rows must be flagged, quarantined, and excluded from ledger totals to prevent phantom financial inflation.

## 4. Precision & Aggregate Rounding Rule
- High financial precision must be preserved across all intermediate calculations using `decimal.js`.
- Never round row-level differences prematurely to 2 decimal places before computing aggregate sums, as doing so masks deliberate micro-variances (e.g., 3 x 0.004 INR = 0.012 INR).

## 5. Temporal Settlement Classifications
- **In-Period Settled**: Platform transaction in Jan 2026 settled by bank on or before Jan 31, 2026.
- **Timing Difference (Late Settlement)**: Platform transaction in Jan 2026 settled by bank after Jan 31, 2026 (e.g. Feb 1, 2026). This is recognized as an In-Transit asset, not a missing record.
- **Missing Settlement**: Platform transaction with no settlement record found across any ingested batch.

## 6. Refunds & Reversals
- Bank refunds (`transaction_type: REFUND`) must reference a parent payment via `original_transaction_reference`.
- If the original reference does not exist in platform records, it must be flagged as an `ORPHAN_REFUND` requiring operational investigation.
