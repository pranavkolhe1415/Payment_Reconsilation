# ReconX Architecture & Design Specification

## System Overview
ReconX is an AI-native financial reconciliation and discrepancy investigation platform. It provides high-precision data ingestion, automated matching, temporal classification, and an investigation portal.

## Technology Stack
- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, Axios, Recharts, Lucide React
- **Backend**: Node.js, Express.js (ES modules), Mongoose / MongoDB, Multer
- **Financial Arithmetic**: `decimal.js` for arbitrary-precision floating-point operations
- **CSV Ingestion**: `csv-parse` for stream and batch file processing
- **Testing**: Vitest, Supertest

## Architectural Components

### 1. Ingestion & Normalization Layer
- Streaming CSV parser via `csv-parse`.
- Deduplication hash generator using SHA-256 compound keys (`transaction_reference`, `transaction_type`, `settlement_date`, `settlement_amount`, `currency`).
- Validation against schemas before persisting to MongoDB.

### 2. Reconciliation Engine
- **Stage 1 (Deduplication)**: Identifies and quarantines duplicate bank entries (`SET_DUP_001`).
- **Stage 2 (Deterministic Match)**: Maps `platform.transaction_id` to `bank.transaction_reference`.
- **Stage 3 (Precision & Delta Analysis)**: Uses `decimal.js` to compute row deltas and aggregate rounding drift.
- **Stage 4 (Temporal Classification)**: Distinguishes settled vs in-transit / late settlements (`SET2001`).
- **Stage 5 (Refund & Orphan Graph)**: Links refunds to parent transactions and flags unlinked items (`SET_REFUND_001`).

### 3. Investigation & Audit Workbench
- Discrepancy management with severity scoring (Low, Medium, High, Critical).
- Status workflow (`OPEN`, `UNDER_INVESTIGATION`, `RESOLVED`, `ACKNOWLEDGED`).
- Audit note trail and resolution reporting.
