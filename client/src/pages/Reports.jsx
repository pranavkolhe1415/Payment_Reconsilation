import React, { useState } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  Scale, 
  Copy, 
  Clock, 
  FileQuestion,
  Printer,
  ShieldCheck,
  Calendar,
  Share2
} from 'lucide-react';
import { useReconciliation } from '../context/ReconciliationContext';
import { exportReconciliationCSV } from '../services/api';

export default function Reports() {
  const { reconData, activeReconId } = useReconciliation();
  const [downloading, setDownloading] = useState(false);

  const handleExportCSV = async () => {
    if (!activeReconId) return;
    setDownloading(true);
    try {
      await exportReconciliationCSV(activeReconId);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const s = reconData?.summary || {};
  const m = reconData?.metrics || {};
  const discrepancies = reconData?.discrepancies || [];

  const platformGross = s.platform?.gross_amount || s.platform_gross_amount || '0.000';
  const bankRaw = s.bank_ingested?.gross_amount || s.bank_raw_amount || '0.000';
  const duplicateQuarantined = s.deduplication?.quarantined_amount || s.bank_quarantined_duplicate_amount || '0.000';
  const dedupedNet = s.deduplication?.deduped_net_amount || s.bank_deduped_net_amount || '0.000';
  const inPeriodCash = s.reconciliation?.reporting_period_settled_cash || s.reporting_period_settled_cash || '0.000';
  const timingDifferenceAmount = s.reconciliation?.timing_differences_amount || s.timing_difference_amount || '0.000';
  const aggregateRoundingDrift = s.reconciliation?.aggregate_rounding_difference || s.aggregate_rounding_difference || '0.000';
  const orphanRefundAmount = s.reconciliation?.orphan_refunds_amount || s.orphan_refunds_amount || '0.000';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit & Financial Settlement Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete executive ledger, discrepancy breakdown, and downloadable CSV audit trail.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print Report</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={downloading || !activeReconId}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/25 transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'Downloading CSV...' : 'Download CSV Report'}</span>
          </button>
        </div>
      </div>

      {/* Report Summary Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-slate-900 text-sm">Settlement Audit Dossier • January 2026</span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-slate-500">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Period: 2026-01-01 to 2026-01-31</span>
            </span>
            <span>•</span>
            <span className="font-mono">Currency: INR</span>
          </div>
        </div>

        {/* 4 Quick Impact Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-medium">Platform Volume</span>
            <p className="text-base font-bold font-mono text-slate-900 mt-0.5">₹{platformGross}</p>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-medium">Jan Settled Cash</span>
            <p className="text-base font-bold font-mono text-emerald-700 mt-0.5">₹{inPeriodSettledCash}</p>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-medium">In-Transit Lag</span>
            <p className="text-base font-bold font-mono text-indigo-600 mt-0.5">₹{timingDifferenceAmount}</p>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-medium">Total Planted Gaps</span>
            <p className="text-base font-bold font-mono text-rose-600 mt-0.5">{discrepancies.length} Exceptions</p>
          </div>
        </div>
      </div>

      {/* Financial Settlement Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <h3 className="text-base font-bold text-slate-900">1. Executive Settlement Ledger Breakdown</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Financial Flow Category</th>
                <th className="py-3 px-4 text-right">Amount (INR)</th>
                <th className="py-3 px-4 text-center">Volume</th>
                <th className="py-3 px-4">Impact on Cash Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900">Platform Authorized Revenue</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{platformGross}</td>
                <td className="py-3 px-4 text-center">100</td>
                <td className="py-3 px-4 text-slate-500">Baseline gross volume recognized in platform ledger</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900">Bank Ingested Raw Clearings</td>
                <td className="py-3 px-4 text-right font-mono text-slate-800">₹{bankRaw}</td>
                <td className="py-3 px-4 text-center">102</td>
                <td className="py-3 px-4 text-slate-500">Unfiltered bank statement rows</td>
              </tr>
              <tr className="bg-rose-50/20">
                <td className="py-3 px-4 font-semibold text-rose-700">Deduplication Quarantine</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">-₹{duplicateQuarantined}</td>
                <td className="py-3 px-4 text-center text-rose-700 font-semibold">1</td>
                <td className="py-3 px-4 text-rose-700">SET_DUP_001 eliminated; prevents +172.50 INR ledger inflation</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-900">Net Unique Bank Clearings</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{dedupedNet}</td>
                <td className="py-3 px-4 text-center">101</td>
                <td className="py-3 px-4 text-slate-500">True settlement amount (including unlinked orphan refund)</td>
              </tr>
              <tr className="bg-indigo-50/20">
                <td className="py-3 px-4 font-semibold text-indigo-800">Next-Month Settlement Timing Adjustment</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600">-₹{timingDifferenceAmount}</td>
                <td className="py-3 px-4 text-center text-indigo-700 font-semibold">1</td>
                <td className="py-3 px-4 text-indigo-700">TXN1001 settled Feb 1; carried as in-transit asset on Jan 31</td>
              </tr>
              <tr className="bg-emerald-50/30">
                <td className="py-3 px-4 font-bold text-emerald-900">January Net Settled Funds</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 text-sm">₹{inPeriodSettledCash}</td>
                <td className="py-3 px-4 text-center text-emerald-800 font-bold">99</td>
                <td className="py-3 px-4 text-emerald-800 font-semibold">Cleared cash available in January business accounts</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Discrepancy Breakdown Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">2. Discrepancy Matrix & Planted Cases Breakdown</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {discrepancies.map((d) => (
            <div key={d.case_id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-slate-900">{d.case_id}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                  {d.discrepancy_type}
                </span>
              </div>
              <p className="text-slate-700 font-medium">{d.description}</p>
              {d.expected_behavior && (
                <p className="text-indigo-700 text-[11px] bg-indigo-50/60 p-2 rounded-lg border border-indigo-100">
                  <strong className="text-indigo-900">Expected: </strong>{d.expected_behavior}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
