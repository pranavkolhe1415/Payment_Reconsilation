import mongoose from 'mongoose';

const ReconciliationJobSchema = new mongoose.Schema(
  {
    job_id: { type: String, required: true, unique: true, index: true },
    period_start: { type: String, required: true },
    period_end: { type: String, required: true },
    status: { type: String, enum: ['PROCESSING', 'COMPLETED', 'FAILED'], default: 'PROCESSING' },
    summary: { type: mongoose.Schema.Types.Mixed },
    discrepancy_count: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model('ReconciliationJob', ReconciliationJobSchema);
