import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReconciliationProvider } from './context/ReconciliationContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import UploadData from './pages/UploadData';
import Reconciliation from './pages/Reconciliation';
import TransactionInvestigation from './pages/TransactionInvestigation';
import Reports from './pages/Reports';

export default function App() {
  return (
    <ReconciliationProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<UploadData />} />
              <Route path="/reconciliation" element={<Reconciliation />} />
              <Route path="/investigation" element={<TransactionInvestigation />} />
              <Route path="/reports" element={<Reports />} />
              {/* Backward compatibility redirects */}
              <Route path="/ingestion" element={<Navigate to="/upload" replace />} />
              <Route path="/ledger" element={<Navigate to="/reports" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ReconciliationProvider>
  );
}
