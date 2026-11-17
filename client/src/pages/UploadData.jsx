import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  PlayCircle, 
  Sparkles,
  Database,
  RefreshCw
} from 'lucide-react';
import { uploadPlatformCSV, uploadBankCSV, runReconciliation } from '../services/api';
import { useReconciliation } from '../context/ReconciliationContext';

export default function UploadData() {
  const navigate = useNavigate();
  const { setReconData, setActiveReconId, executeRecon } = useReconciliation();

  const [platformUpload, setPlatformUpload] = useState({
    file: null,
    loading: false,
    success: false,
    data: null,
    error: null
  });

  const [bankUpload, setBankUpload] = useState({
    file: null,
    loading: false,
    success: false,
    data: null,
    error: null
  });

  const [runningRecon, setRunningRecon] = useState(false);
  const [quickLoadLoading, setQuickLoadLoading] = useState(false);
  const [quickLoadSuccess, setQuickLoadSuccess] = useState(false);

  // Handle platform file change
  const handlePlatformFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPlatformUpload({ file, loading: true, success: false, data: null, error: null });
    try {
      const res = await uploadPlatformCSV(file);
      if (res.success) {
        setPlatformUpload({ file, loading: false, success: true, data: res.data, error: null });
      }
    } catch (err) {
      setPlatformUpload({
        file,
        loading: false,
        success: false,
        data: null,
        error: err.response?.data?.error || err.message
      });
    }
  };

  // Handle bank file change
  const handleBankFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBankUpload({ file, loading: true, success: false, data: null, error: null });
    try {
      const res = await uploadBankCSV(file);
      if (res.success) {
        setBankUpload({ file, loading: false, success: true, data: res.data, error: null });
      }
    } catch (err) {
      setBankUpload({
        file,
        loading: false,
        success: false,
        data: null,
        error: err.response?.data?.error || err.message
      });
    }
  };

  // Run reconciliation with staged files
  const handleRunReconFromStaged = async () => {
    setRunningRecon(true);
    try {
      const res = await executeRecon({
        reconciliation_id: `recon_${Date.now()}`,
        period_start: '2026-01-01',
        period_end: '2026-01-31'
      });
      if (res.success) {
        navigate('/');
      }
    } catch (err) {
      alert(`Error running reconciliation: ${err.message}`);
    } finally {
      setRunningRecon(false);
    }
  };

  // One-click quick load assessment datasets
  const handleQuickLoadAssessment = async () => {
    setQuickLoadLoading(true);
    setQuickLoadSuccess(false);
    try {
      const res = await executeRecon({
        reconciliation_id: `recon_assessment_${Date.now()}`,
        period_start: '2026-01-01',
        period_end: '2026-01-31'
      });
      if (res.success) {
        setQuickLoadSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 600);
      }
    } catch (err) {
      alert(`Error loading assessment dataset: ${err.message}`);
    } finally {
      setQuickLoadLoading(false);
    }
  };

  const bothFilesUploaded = platformUpload.success && bankUpload.success;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Data Ingestion & Schema Validation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload source platform transaction records and bank settlement feeds for validation and reconciliation.
          </p>
        </div>

        {/* Quick Load Shortcut */}
        <button
          onClick={handleQuickLoadAssessment}
          disabled={quickLoadLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{quickLoadLoading ? 'Loading Assessment Files...' : 'Quick Load Assessment Datasets'}</span>
        </button>
      </div>

      {quickLoadSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-3 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Assessment datasets successfully loaded and reconciled! Redirecting to Dashboard...</span>
        </div>
      )}

      {/* Upload Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Platform Transactions Upload */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Platform Transactions CSV</h3>
                <p className="text-[11px] text-slate-500">Merchant captured payments</p>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">Required: 5 cols</span>
          </div>

          <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center space-y-2">
            <UploadCloud className="w-8 h-8 text-indigo-500" />
            <div className="text-xs">
              <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
            </div>
            <p className="text-[11px] text-slate-400">platform_transactions.csv (up to 15MB)</p>
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handlePlatformFileChange} 
            />
          </label>

          {/* Platform Status & Stats */}
          {platformUpload.loading && (
            <div className="flex items-center space-x-2 text-xs text-indigo-600 font-medium">
              <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <span>Validating schema and headers...</span>
            </div>
          )}

          {platformUpload.error && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl space-y-1 text-xs">
              <div className="flex items-center space-x-1.5 font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Upload Failed</span>
              </div>
              <p className="text-rose-700">{platformUpload.error}</p>
            </div>
          )}

          {platformUpload.success && platformUpload.data && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between text-emerald-700 font-semibold">
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{platformUpload.data.filename}</span>
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px]">Valid CSV</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-center">
                <div>
                  <span className="text-slate-400 text-[10px]">Total Rows</span>
                  <p className="font-bold font-mono text-slate-800">{platformUpload.data.total_records}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Valid</span>
                  <p className="font-bold font-mono text-emerald-600">{platformUpload.data.valid_records}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Invalid</span>
                  <p className="font-bold font-mono text-slate-800">{platformUpload.data.invalid_records}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Bank Settlements Upload */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Bank Settlements CSV</h3>
                <p className="text-[11px] text-slate-500">Acquiring bank clearing feed</p>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">Required: 6 cols</span>
          </div>

          <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center space-y-2">
            <UploadCloud className="w-8 h-8 text-blue-500" />
            <div className="text-xs">
              <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
            </div>
            <p className="text-[11px] text-slate-400">bank_settlements.csv (up to 15MB)</p>
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleBankFileChange} 
            />
          </label>

          {/* Bank Status & Stats */}
          {bankUpload.loading && (
            <div className="flex items-center space-x-2 text-xs text-blue-600 font-medium">
              <div className="w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <span>Validating schema and headers...</span>
            </div>
          )}

          {bankUpload.error && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl space-y-1 text-xs">
              <div className="flex items-center space-x-1.5 font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Upload Failed</span>
              </div>
              <p className="text-rose-700">{bankUpload.error}</p>
            </div>
          )}

          {bankUpload.success && bankUpload.data && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between text-emerald-700 font-semibold">
                <span className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{bankUpload.data.filename}</span>
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px]">Valid CSV</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-center">
                <div>
                  <span className="text-slate-400 text-[10px]">Total Rows</span>
                  <p className="font-bold font-mono text-slate-800">{bankUpload.data.total_records}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Valid</span>
                  <p className="font-bold font-mono text-emerald-600">{bankUpload.data.valid_records}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Invalid</span>
                  <p className="font-bold font-mono text-slate-800">{bankUpload.data.invalid_records}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold">
            {bothFilesUploaded ? 'Both Files Validated & Ready!' : 'Ready to Run Reconciliation?'}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {bothFilesUploaded 
              ? 'Execute reconciliation with your uploaded platform and bank datasets.' 
              : 'Execute the reconciliation engine against uploaded datasets or the assessment test data.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {bothFilesUploaded ? (
            <button
              onClick={handleRunReconFromStaged}
              disabled={runningRecon}
              className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold transition shadow-lg shadow-emerald-500/25"
            >
              <PlayCircle className={`w-4 h-4 ${runningRecon ? 'animate-spin' : ''}`} />
              <span>{runningRecon ? 'Reconciling Datasets...' : 'Run Reconciliation Now'}</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/reconciliation')}
              className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold transition shadow-lg shadow-indigo-500/25"
            >
              <span>Go to Reconciliation Run</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
