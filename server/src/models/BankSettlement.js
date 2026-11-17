import mongoose from 'mongoose';

const BankSettlementSchema = new mongoose.Schema(
  {
    settlement_id: {
      type: String,
      required: [true, 'settlement_id is required'],
      trim: true,
      index: true
    },
    transaction_reference: {
      type: String,
      required: [true, 'transaction_reference is required for matching'],
      trim: true,
      index: true
    },
    settlement_date: {
      type: String,
      required: [true, 'settlement_date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'settlement_date must be in YYYY-MM-DD format'],
      index: true
    },
    transaction_type: {
      type: String,
      required: [true, 'transaction_type is required'],
      enum: {
        values: ['PAYMENT', 'REFUND'],
        message: '{VALUE} is not a supported settlement type'
      },
      uppercase: true,
      index: true
    },
    settlement_amount_str: {
      type: String,
      required: [true, 'settlement_amount_str is required to preserve 3-decimal source precision'],
      trim: true
    },
    settlement_amount_decimal: {
      type: mongoose.Schema.Types.Decimal128,
      index: true
    },
    currency: {
      type: String,
      required: [true, 'currency is required'],
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
      default: 'INR'
    },
    original_transaction_reference: {
      type: String,
      default: null,
      trim: true,
      index: true
    },
    business_hash: {
      type: String,
      required: [true, 'business_hash is required for duplicate entry detection'],
      index: true
    },
    is_duplicate: {
      type: Boolean,
      default: false,
      index: true
    },
    duplicate_of: {
      type: String,
      default: null
    },
    deduplication_status: {
      type: String,
      enum: ['PRIMARY', 'DUPLICATE_EXCLUDED'],
      default: 'PRIMARY',
      index: true
    },
    source_row_number: {
      type: Number,
      required: [true, 'source_row_number is required for audit trail']
    },
    reconciliation_id: {
      type: String,
      required: [true, 'reconciliation_id is required to isolate runs'],
      index: true
    },
    file_hash: {
      type: String,
      index: true
    },
    match_status: {
      type: String,
      enum: ['UNMATCHED', 'MATCHED', 'SETTLED_AFTER_PERIOD', 'AMOUNT_MISMATCH', 'ORPHAN_REFUND', 'DUPLICATE', 'INVALID'],
      default: 'UNMATCHED',
      index: true
    },
    raw_imported_values: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate settlement records with the same settlement_id in the same reconciliation run
BankSettlementSchema.index({ reconciliation_id: 1, settlement_id: 1 }, { unique: true });

// Efficient lookups for reconciliation matching and duplicate tracking
BankSettlementSchema.index({ reconciliation_id: 1, transaction_reference: 1 });
BankSettlementSchema.index({ reconciliation_id: 1, business_hash: 1 });
BankSettlementSchema.index({ reconciliation_id: 1, is_duplicate: 1 });
BankSettlementSchema.index({ reconciliation_id: 1, settlement_date: 1 });

export default mongoose.models.BankSettlement || mongoose.model('BankSettlement', BankSettlementSchema);
