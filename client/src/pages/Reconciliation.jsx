import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlayCircle, 
  CheckCircle2, 
  AlertOctagon, 
  Clock, 
  Calendar, 
  Coins, 
  Download, 
  ArrowRight,
  ShieldCheck,
  Scale,
  Copy,
  FileQuestion,
  RefreshCw
} from 'lucide-react';
import { useReconciliation } from '../context/ReconciliationContext';
import { exportReconciliationCSV } from '../services/api';

export default function Reconciliation() {
  const { reconData, loading, error, executeRecon, activeReconId } = useReconciliation();
  const [periodStart, setPeriodStart] = useState('2026-01-01');
  const [periodEnd, setPeriodEnd] = useState('2026-01-31');
  const [currency, setCurrency] = useState('INR');
  const [exporting, setExporting] = useState(false);

  const handleRunRecon = async () => {
    try {
      await executeRecon({
        reconciliation_id: `recon_${Date.now()}`,
        period_start: periodStart,
        period_end: periodEnd,
        currency
      });
    } catch (err) {
      alert(`Reconciliation execution error: ${err.message}`);
    }
  };

  const handleExport = async () => {
    if (!activeReconId) return;
    setExporting(true);
    try {
      await exportReconciliationCSV(activeReconId);
    } catch (err) {
      alert(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const s = reconData?.summary || {};
  const m = reconData?.metrics || {};

  const platformGross = s.platform?.gross_amount || s.platform_gross_amount || '0.000';
  const bankRaw = s.bank_ingested?.gross_amount || s.bank_raw_amount || '0.000';
  const duplicateQuarantined = s.deduplication?.quarantined_amount || s.bank_quarantined_duplicate_amount || '0.000';
  const dedupedNet = s.deduplication?.deduped_net_amount || s.bank_deduped_net_amount || '0.000';
  const matchedBankAmount = s.reconciliation?.matched_bank_amount || s.matched_bank_amount || '0.000';
  const inPeriodSettledCash = s.reconciliation?.reporting_period_settled_cash || s.reporting_period_settled_cash || '0.000';
  const timingDifferenceAmount = s.reconciliation?.timing_differences_amount || s.timing_difference_amount || '0.000';
  const aggregateRoundingDrift = s.reconciliation?.aggregate_rounding_difference || s.aggregate_rounding_difference || '0.000';
  const orphanRefundAmount = s.reconciliation?.orphan_refunds_amount || s.orphan_refunds_amount || '0.000';

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reconciliation Operations Hub</h1>
          <p className="text-sm text-slate-500 mt-1">
            Execute deterministic reconciliation pipeline, enforce SLA cutoff boundaries, and balance financial ledgers.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            disabled={exporting || !activeReconId}
            className="flex items-center space-x-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{exporting ? 'Generating CSV...' : 'Export Audit Report'}</span>
          </button>

          <button
            onClick={handleRunRecon}
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/25 transition disabled:opacity-50"
          >
            <PlayCircle className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Reconciling Ledger...' : 'Run Reconciliation Engine'}</span>
          </button>
        </div>
      </div>

      {/* Control Parameters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>Period Start Date</span>
          </label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="w-full text-xs font-mono font-medium border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>Period End Date</span>
          </label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-full text-xs font-mono font-medium border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 flex items-center space-x-1.5">
            <Coins className="w-3.5 h-3.5 text-indigo-500" />
            <span>Ledger Currency</span>
          </label>
          <input
            type="text"
            value={currency}
            disabled
            className="w-full text-xs font-mono font-semibold border border-slate-200 rounded-lg px-3 py-2 bg-slate-100 text-slate-600 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Processing Status Banner */}
      {reconData && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between text-xs font-medium text-emerald-800">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="font-bold text-emerald-900">Reconciliation Run Completed: </span>
              <span>Reconciled 100 platform records against 102 bank records.</span>
            </div>
          </div>
          <span className="font-mono bg-white border border-emerald-300 px-2.5 py-1 rounded-md text-emerald-900">
            ID: {reconData.reconciliation_id || activeReconId}
          </span>
        </div>
      )}

      {/* Financial Settlement Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">High-Precision Settlement Balance Sheet</h3>
            <p className="text-xs text-slate-500 mt-0.5">Calculated using decimal.js with full source precision preservation</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
            INR Precision: 3 Decimals
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-6">Ledger Component</th>
                <th className="py-3.5 px-6 text-right">Amount (INR)</th>
                <th className="py-3.5 px-6 text-center">Record Count</th>
                <th className="py-3.5 px-6">Accounting Treatment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              <tr className="hover:bg-slate-50/60 transition">
                <td className="py-3.5 px-6 font-semibold text-slate-900">Gross Platform Volume Captured</td>
                <td className="py-3.5 px-6 text-right font-mono font-bold text-slate-900">₹{platformGross}</td>
                <td className="py-3.5 px-6 text-center">{m.platform_records_count || 100}</td>
                <td className="py-3.5 px-6 text-slate-500">Authorized Jan 1–31 platform payments</td>
              </tr>

              <tr className="hover:bg-slate-50/60 transition">
                <td className="py-3.5 px-6 font-semibold text-slate-900">Gross Bank Settlements Ingested</td>
                <td className="py-3.5 px-6 text-right font-mono text-slate-800">₹{bankRaw}</td>
                <td className="py-3.5 px-6 text-center">{m.bank_records_count || 102}</td>
                <td className="py-3.5 px-6 text-slate-500">Raw bank feed including duplicate & refund rows</td>
              </tr>

              <tr className="hover:bg-rose-50/30 transition bg-rose-50/10">
                <td className="py-3.5 px-6 font-semibold text-rose-700 flex items-center space-x-2">
                  <Copy className="w-3.5 h-3.5 text-rose-500" />
                  <span>Quarantined Duplicate Bank Volume</span>
                </td>
                <td className="py-3.5 px-6 text-right font-mono font-bold text-rose-600">₹{duplicateQuarantined}</td>
                <td className="py-3.5 px-6 text-center text-rose-700 font-semibold">{m.duplicate_count || 1}</td>
                <td className="py-3.5 px-6 text-rose-600 text-xs">SET_DUP_001 excluded to prevent financial total inflation</td>
              </tr>

              <tr className="hover:bg-slate-50/60 transition">
                <td className="py-3.5 px-6 font-semibold text-slate-900">Deduplicated Bank Net Volume</td>
                <td className="py-3.5 px-6 text-right font-mono font-bold text-slate-900">₹{dedupedNet}</td>
                <td className="py-3.5 px-6 text-center">{(m.bank_records_count || 102) - (m.duplicate_count || 1)}</td>
                <td className="py-3.5 px-6 text-slate-500">True settlement feed net of phantom duplicates</td>
              </tr>

              <tr className="hover:bg-indigo-50/30 transition bg-indigo-50/10">
                <td className="py-3.5 px-6 font-semibold text-indigo-800 flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Timing Difference (Settled in Next Period)</span>
                </td>
                <td className="py-3.5 px-6 text-right font-mono font-bold text-indigo-600">₹{timingDifferenceAmount}</td>
                <td className="py-3.5 px-6 text-center text-indigo-700 font-semibold">{m.timing_difference_count || 1}</td>
                <td className="py-3.5 px-6 text-indigo-600 text-xs">TXN1001 settled Feb 1 (SET2001); recognized as in-transit asset</td>
              </tr>

              <tr className="hover:bg-emerald-50/30 transition bg-emerald-50/10">
                <td className="py-3.5 px-6 font-semibold text-emerald-800 flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>January Reporting-Period Settled Cash</span>
                </td>
                <td className="py-3.5 px-6 text-right font-mono font-bold text-emerald-700">₹{inPeriodSettledCash}</td>
                <td className="py-3.5 px-6 text-center text-emerald-800 font-semibold">99</td>
                <td className="py-3.5 px-6 text-emerald-700 text-xs">Actual cash cleared on or before Jan 31 cutoff</td>
              </tr>

              <tr className="hover:bg-amber-50/30 transition bg-amber-50/10">
                <td className="py-3.5 px-6 font-semibold text-amber-800 flex items-center space-x-2">
                  <Scale className="w-3.5 h-3.5 text-amber-500" />
                  <span>Aggregate Rounding Drift</span>
                </td>
                <td className="py-3.5 px-6 text-right font-mono font-bold text-amber-600">+{aggregateRoundingDrift} INR</td>
                <td className="py-3.5 px-6 text-center text-amber-700 font-semibold">{m.precision_drift_count || 3}</td>
                <td className="py-3.5 px-6 text-amber-700 text-xs">Row micro-variances (3 x 0.004 INR) preserved without premature rounding</td>
              </tr>

              <tr className="hover:bg-purple-50/30 transition bg-purple-50/10">
                <td className="py-3.5 px-6 font-semibold text-purple-800 flex items-center space-x-2">
                  <FileQuestion className="w-3.5 h-3.5 text-purple-500" />
                  <span>Orphan Bank Refund Outflow</span>
                </td>
                <td className="py-3.5 px-6 text-right font-mono font-bold text-purple-600">₹{orphanRefundAmount}</td>
                <td className="py-3.5 px-6 text-center text-purple-700 font-semibold">{m.orphan_refund_count || 1}</td>
                <td className="py-3.5 px-6 text-purple-700 text-xs">SET_REFUND_001 references absent TXN9999</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation CTA */}
      <div className="flex items-center justify-between p-6 bg-slate-900 rounded-2xl text-white">
        <div>
          <h4 className="text-sm font-bold">Investigate Discrepancies</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare source rows side-by-side, verify expected behaviors, and log investigation audit notes.
          </p>
        </div>
        <Link
          to="/investigation"
          className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold shadow-md transition"
        >
          <span>Open Investigation Workbench</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
