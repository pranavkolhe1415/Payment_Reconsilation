# ReconX - Payment Reconciliation & Investigation Platform

ReconX is a high-precision Payment Reconciliation and Discrepancy Investigation Platform designed for financial operations, finance engineering, and internal audit teams.

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, React Router, Recharts, Lucide React
- **Backend**: Node.js, Express.js (ES Modules), Mongoose / MongoDB
- **Financial Arithmetic**: `decimal.js` for arbitrary-precision decimal operations
- **CSV Processing**: `csv-parse`
- **Testing**: Vitest & Supertest

## Project Structure
```
ReconX/
├── client/              # React + Vite Frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components (Navbar, Cards, Drawers)
│   │   ├── pages/       # Dashboard, Ingestion, Investigation, Ledger
│   │   ├── services/    # Axios API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── server/              # Node.js + Express Backend
│   ├── src/
│   │   ├── config/      # DB connection & env configurations
│   │   ├── controllers/ # API route handlers
│   │   ├── models/      # Mongoose schemas
│   │   ├── routes/      # REST API route definitions
│   │   ├── services/    # Ingestion, matching & discrepancy algorithms
│   │   ├── utils/       # decimal.js helpers, hash generators
│   │   ├── app.js       # Express application configuration
│   │   └── index.js     # Server entry point
│   ├── tests/           # Vitest + Supertest test suites
│   ├── vitest.config.js
│   └── package.json
├── test-data/           # Assessment CSV datasets & manifest
│   ├── ASSUMPTIONS.md
│   ├── dataset_manifest.json
│   ├── expected_results.csv
│   ├── platform_transactions.csv
│   └── bank_settlements.csv
├── docs/                # Architecture, assumptions & testing docs
│   ├── architecture.md
│   ├── assumptions.md
│   └── testing.md
└── package.json         # Workspace root scripts
```

## Quick Start

### 1. Install Dependencies
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Run Applications
```bash
# Terminal 1 - Backend (port 5000)
cd server && npm run dev

# Terminal 2 - Frontend (port 5173)
cd client && npm run dev
```

### 3. Run Tests
```bash
cd server && npm test
```
