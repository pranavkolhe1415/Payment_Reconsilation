# ReconX synthetic test dataset

## Files
- `platform_transactions.csv`: 100 successful platform payment records.
- `bank_settlements.csv`: 100 payment settlement records plus one duplicate bank entry and one orphan refund.
- `expected_results.csv`: planted discrepancy cases and expected behavior.

## Dataset assumptions
1. Reporting period is January 1–31, 2026 (inclusive), using the business's local reporting timezone.
2. Currency is INR for every record. Cross-currency conversion is out of scope.
3. Platform records are created when a payment succeeds. Ordinary bank settlements occur 1–2 calendar days later.
4. `transaction_id` and `transaction_reference` are the primary payment linkage fields.
5. `settlement_id` identifies a bank source row; it is not the business transaction key.
6. A duplicate bank entry is identified by matching transaction reference, transaction type, settlement date, amount, and currency, even if settlement IDs differ.
7. For the rounding test, source precision is preserved. Three bank amounts differ from their platform amounts by INR 0.004 each; their aggregate difference is INR 0.012. The system must not round each record to two decimals before summing.
8. The intentionally late settlement is still a valid match to its January transaction, but is classified as a timing difference for the January close.
9. The orphan refund is a bank-side refund record whose original transaction reference (`TXN9999`) is absent from the platform dataset.
10. This is synthetic assessment data, not real customer or bank information.

## Important implementation note
Report row-level and aggregate differences separately. Do not round each record before computing aggregate totals, because doing so would hide the deliberately planted aggregate rounding discrepancy.
