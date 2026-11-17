import crypto from 'crypto';
import mongoose from 'mongoose';
import { isDBConnected } from '../config/db.js';
import { 
  PlatformTransaction, 
  BankSettlement, 
  Reconciliation, 
  Discrepancy 
} from '../models/index.js';

const computeFileHash = (content) => {
  return crypto.createHash('sha256').update(content || '').digest('hex');
};

/**
 * Persists full reconciliation output into MongoDB with duplicate protection,
 * raw value preservation, and graceful offline fallback.
 */
export const persistReconciliationRun = async ({
  reconciliationId,
  platformCsv,
  bankCsv,
  engineResult,
  platformFilename = 'platform_transactions.csv',
  bankFilename = 'bank_settlements.csv',
  periodStart = '2026-01-01',
  periodEnd = '2026-01-31'
}) => {
  if (!isDBConnected()) {
    console.warn('[Persistence] MongoDB is currently offline. Skipping database persistence.');
    return {
      persisted: false,
      reason: 'DATABASE_OFFLINE',
      reconciliationId
    };
  }

  const pHash = computeFileHash(platformCsv);
  const bHash = computeFileHash(bankCsv);

  // Check for duplicate file import to prevent duplicate financial records
  const existingJob = await Reconciliation.findOne({
    'platform_file.file_hash': pHash,
    'bank_file.file_hash': bHash,
    status: 'COMPLETED'
  }).lean();

  if (existingJob) {
    console.log(`[Persistence] Notice: Exactly identical dataset already reconciled under ID "${existingJob.reconciliation_id}".`);
  }

  // 1. Create or upsert Reconciliation record
  const summary = engineResult.summary;
  const reconDoc = await Reconciliation.findOneAndUpdate(
    { reconciliation_id: reconciliationId },
    {
      reconciliation_id: reconciliationId,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'PROCESSING',
      platform_file: {
        filename: platformFilename,
        file_hash: pHash,
        total_rows: summary.platform.total_records,
        gross_amount: summary.platform.gross_amount
      },
      bank_file: {
        filename: bankFilename,
        file_hash: bHash,
        total_rows: summary.bank_ingested.total_records,
        gross_amount: summary.bank_ingested.gross_amount
      },
      summary: {
        platform_gross_amount: summary.platform.gross_amount,
        bank_raw_amount: summary.bank_ingested.gross_amount,
        bank_quarantined_duplicate_amount: summary.deduplication.quarantined_amount,
        bank_deduped_net_amount: summary.deduplication.deduped_net_amount,
        matched_bank_amount: summary.reconciliation.matched_bank_amount,
        timing_difference_amount: summary.reconciliation.timing_differences_amount,
        reporting_period_settled_cash: summary.reconciliation.reporting_period_settled_cash,
        eventual_settlement_cash: summary.reconciliation.eventual_settlement_cash,
        aggregate_rounding_difference: summary.reconciliation.aggregate_rounding_difference,
        orphan_refunds_amount: summary.reconciliation.orphan_refunds_amount,
        net_matched_difference: summary.reconciliation.net_matched_difference
      },
      metrics: {
        platform_records_count: summary.platform.total_records,
        bank_records_count: summary.bank_ingested.total_records,
        matched_count: summary.reconciliation.matched_records_count,
        duplicate_count: summary.deduplication.duplicate_records_count,
        timing_difference_count: summary.reconciliation.timing_differences_count,
        precision_drift_count: summary.reconciliation.precision_drift_records_count,
        orphan_refund_count: summary.reconciliation.orphan_refunds_count,
        discrepancy_count: engineResult.discrepancies.length
      }
    },
    { upsert: true, new: true }
  );

  // 2. Persist Platform Transactions (bulk upsert by reconciliation_id + transaction_id)
  const platformOps = engineResult.matchedPairs
    .map(p => p.platform)
    .concat(engineResult.unmatchedPlatform)
    .map((p) => {
      let decimalVal = null;
      try {
        decimalVal = mongoose.Types.Decimal128.fromString(p.amount_str);
      } catch (err) {}

      return {
        updateOne: {
          filter: { reconciliation_id: reconciliationId, transaction_id: p.transaction_id },
          update: {
            $set: {
              transaction_id: p.transaction_id,
              transaction_date: p.transaction_date,
              transaction_type: p.transaction_type,
              amount_str: p.amount_str,
              amount_decimal: decimalVal,
              currency: p.currency,
              status: p.status,
              original_transaction_id: p.original_transaction_id,
              source_row_number: p.row_number,
              reconciliation_id: reconciliationId,
              file_hash: pHash,
              raw_imported_values: p.raw
            }
          },
          upsert: true
        }
      };
    });

  if (platformOps.length > 0) {
    await PlatformTransaction.bulkWrite(platformOps, { ordered: false });
  }

  // 3. Persist Bank Settlements (bulk upsert by reconciliation_id + settlement_id)
  const allBankRecords = engineResult.matchedPairs
    .map(p => p.bank)
    .concat(engineResult.unmatchedBankPayments)
    .concat(engineResult.duplicateBankRecords)
    .concat(engineResult.orphanRefunds)
    .concat(engineResult.linkedRefunds.map(l => l.refund));

  const bankOps = allBankRecords.map((b) => {
    let decimalVal = null;
    try {
      decimalVal = mongoose.Types.Decimal128.fromString(b.settlement_amount_str);
    } catch (err) {}

    return {
      updateOne: {
        filter: { reconciliation_id: reconciliationId, settlement_id: b.settlement_id },
        update: {
          $set: {
            settlement_id: b.settlement_id,
            transaction_reference: b.transaction_reference,
            settlement_date: b.settlement_date,
            transaction_type: b.transaction_type,
            settlement_amount_str: b.settlement_amount_str,
            settlement_amount_decimal: decimalVal,
            currency: b.currency,
            original_transaction_reference: b.original_transaction_reference,
            business_hash: b.business_hash,
            is_duplicate: !!b.is_duplicate,
            duplicate_of: b.duplicate_of || null,
            deduplication_status: b.deduplication_status || 'PRIMARY',
            source_row_number: b.row_number,
            reconciliation_id: reconciliationId,
            file_hash: bHash,
            raw_imported_values: b.raw
          }
        },
        upsert: true
      }
    };
  });

  if (bankOps.length > 0) {
    await BankSettlement.bulkWrite(bankOps, { ordered: false });
  }

  // 4. Persist Discrepancies
  // Delete any existing discrepancies for this reconciliation run to ensure idempotency
  await Discrepancy.deleteMany({ reconciliation_id: reconciliationId });

  if (engineResult.discrepancies.length > 0) {
    const discrepancyDocs = engineResult.discrepancies.map((d) => ({
      case_id: d.case_id,
      reconciliation_id: reconciliationId,
      discrepancy_type: d.discrepancy_type,
      severity: d.severity || 'MEDIUM',
      status: d.status || 'OPEN',
      platform_transaction_ids: d.platform_transaction_ids || [],
      bank_settlement_ids: d.bank_settlement_ids || [],
      platform_row_numbers: d.platform_row_numbers || [],
      bank_row_numbers: d.bank_row_numbers || [],
      platform_amount: d.platform_amount,
      bank_amount: d.bank_amount,
      delta_amount: d.delta_amount,
      currency: d.currency || 'INR',
      description: d.description,
      expected_behavior: d.expected_behavior || null,
      notes: d.notes || []
    }));

    await Discrepancy.insertMany(discrepancyDocs);
  }

  // 5. Mark Reconciliation as COMPLETED
  reconDoc.status = 'COMPLETED';
  await reconDoc.save();

  return {
    persisted: true,
    reconciliationId,
    status: 'COMPLETED',
    duplicateDetected: !!existingJob
  };
};
