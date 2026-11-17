import mongoose from 'mongoose';

const ReconciliationSchema = new mongoose.Schema(
  {
    reconciliation_id: {
      type: String,
      required: [true, 'reconciliation_id is required'],
      unique: true,
      trim: true,
      index: true
    },
    reporting_period: {
      type: String,
      default: '2026-01',
      index: true
    },
    period_start: {
      type: String,
      required: [true, 'period_start is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'period_start must be in YYYY-MM-DD format']
    },
    period_end: {
      type: String,
      required: [true, 'period_end is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'period_end must be in YYYY-MM-DD format']
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      index: true
    },
    platform_file: {
      filename: { type: String, default: 'platform_transactions.csv' },
      file_hash: { type: String, index: true },
      total_rows: { type: Number, default: 0 },
      gross_amount: { type: String, default: '0.000' }
    },
    bank_file: {
      filename: { type: String, default: 'bank_settlements.csv' },
      file_hash: { type: String, index: true },
      total_rows: { type: Number, default: 0 },
      gross_amount: { type: String, default: '0.000' }
    },
    summary: {
      platform_gross_amount: { type: String, default: '0.000' },
      bank_raw_amount: { type: String, default: '0.000' },
      bank_quarantined_duplicate_amount: { type: String, default: '0.000' },
      bank_deduped_net_amount: { type: String, default: '0.000' },
      matched_bank_amount: { type: String, default: '0.000' },
      timing_difference_amount: { type: String, default: '0.000' },
      reporting_period_settled_cash: { type: String, default: '0.000' },
      eventual_settlement_cash: { type: String, default: '0.000' },
      aggregate_rounding_difference: { type: String, default: '0.000' },
      orphan_refunds_amount: { type: String, default: '0.000' },
      net_matched_difference: { type: String, default: '0.000' }
    },
    metrics: {
      platform_records_count: { type: Number, default: 0 },
      bank_records_count: { type: Number, default: 0 },
      matched_count: { type: Number, default: 0 },
      duplicate_count: { type: Number, default: 0 },
      timing_difference_count: { type: Number, default: 0 },
      precision_drift_count: { type: Number, default: 0 },
      orphan_refund_count: { type: Number, default: 0 },
      discrepancy_count: { type: Number, default: 0 }
    },
    error_message: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index to quickly identify whether identical files have already been reconciled
ReconciliationSchema.index({ 'platform_file.file_hash': 1, 'bank_file.file_hash': 1 });
ReconciliationSchema.index({ createdAt: -1 });

export default mongoose.models.Reconciliation || mongoose.model('Reconciliation', ReconciliationSchema);
