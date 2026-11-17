import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    author: { type: String, default: 'Auditor', trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const DiscrepancySchema = new mongoose.Schema(
  {
    case_id: {
      type: String,
      required: [true, 'case_id is required'],
      trim: true,
      index: true
    },
    reconciliation_id: {
      type: String,
      required: [true, 'reconciliation_id is required'],
      trim: true,
      index: true
    },
    discrepancy_type: {
      type: String,
      enum: {
        values: [
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
        ],
        message: '{VALUE} is not a valid discrepancy type'
      },
      required: [true, 'discrepancy_type is required'],
      index: true
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true
    },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'ACKNOWLEDGED'],
      default: 'OPEN',
      index: true
    },
    platform_transaction_ids: [{ type: String, trim: true }],
    bank_settlement_ids: [{ type: String, trim: true }],
    platform_row_numbers: [{ type: Number }],
    bank_row_numbers: [{ type: Number }],
    platform_amount: { type: String, default: null },
    bank_amount: { type: String, default: null },
    delta_amount: { type: String, default: null },
    currency: { type: String, default: 'INR', uppercase: true },
    description: { type: String, required: [true, 'description is required'] },
    expected_behavior: { type: String, default: null },
    notes: [NoteSchema],
    resolved_by: { type: String, default: null },
    resolved_at: { type: Date, default: null }
  },
  {
    timestamps: true
  }
);

// Compound indexes for rapid dashboard querying and filter matrix
DiscrepancySchema.index({ reconciliation_id: 1, case_id: 1 });
DiscrepancySchema.index({ reconciliation_id: 1, discrepancy_type: 1 });
DiscrepancySchema.index({ reconciliation_id: 1, status: 1 });
DiscrepancySchema.index({ reconciliation_id: 1, severity: 1 });
DiscrepancySchema.index({ platform_transaction_ids: 1 });
DiscrepancySchema.index({ bank_settlement_ids: 1 });

export default mongoose.models.Discrepancy || mongoose.model('Discrepancy', DiscrepancySchema);
