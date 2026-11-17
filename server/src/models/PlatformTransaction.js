import mongoose from 'mongoose';

const PlatformTransactionSchema = new mongoose.Schema(
  {
    transaction_id: {
      type: String,
      required: [true, 'transaction_id is required'],
      trim: true,
      index: true
    },
    transaction_date: {
      type: String,
      required: [true, 'transaction_date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'transaction_date must be in YYYY-MM-DD format'],
      index: true
    },
    transaction_type: {
      type: String,
      required: [true, 'transaction_type is required'],
      enum: {
        values: ['PAYMENT', 'REFUND'],
        message: '{VALUE} is not a supported transaction type'
      },
      uppercase: true,
      index: true
    },
    amount_str: {
      type: String,
      required: [true, 'amount_str is required to preserve source precision'],
      trim: true
    },
    amount_decimal: {
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
    status: {
      type: String,
      default: 'SUCCESS',
      trim: true,
      uppercase: true
    },
    original_transaction_id: {
      type: String,
      default: null,
      trim: true
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
      enum: ['UNMATCHED', 'MATCHED', 'SETTLED_AFTER_PERIOD', 'AMOUNT_MISMATCH', 'INVALID'],
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

// Compound unique index prevents accidental duplicate transaction imports within the same reconciliation run
PlatformTransactionSchema.index({ reconciliation_id: 1, transaction_id: 1 }, { unique: true });

// Compound index for efficient date-range filtering per reconciliation batch
PlatformTransactionSchema.index({ reconciliation_id: 1, transaction_date: 1 });

export default mongoose.models.PlatformTransaction || mongoose.model('PlatformTransaction', PlatformTransactionSchema);
