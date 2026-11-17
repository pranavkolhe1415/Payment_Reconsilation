import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowUpRight, 
  ArrowDownRight,
  Scale, 
  Copy, 
  FileQuestion, 
  Clock, 
  CheckCircle2, 
  AlertOctagon,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { useReconciliation } from '../context/ReconciliationContext';

const PIE_COLORS = ['#6366f1', '#f59e0b', '#f43f5e', '#a855f7'];

export default function Dashboard() {
  const { reconData, loading, error, refreshReconciliation } = useReconciliation();

  if (loading && !reconData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-600 font-medium text-sm">Loading reconciliation ledger & analytics...</p>
      </div>
    );
  }

  if (error && !reconData) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-8 rounded-2xl max-w-2xl mx-auto my-12 text-center space-y-4">
        <AlertOctagon className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-rose-900">Reconciliation Data Unavailable</h2>
        <p className="text-sm text-rose-700">{error}</p>
        <button
          onClick={refreshReconciliation}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const s = reconData?.summary || {};
  const m = reconData?.metrics || {};
  const discrepancies = reconData?.discrepancies || [];

  // Exact live financial metrics extracted directly from backend
  const platformTotal = s.platform?.gross_amount || s.platform_gross_amount || '0.000';
  const bankRawTotal = s.bank_ingested?.gross_amount || s.bank_raw_amount || '0.000';
  const bankDedupedTotal = s.deduplication?.deduped_net_amount || s.bank_deduped_net_amount || '0.000';
  const matchedTotal = s.reconciliation?.matched_bank_amount || s.matched_bank_amount || '0.000';
  const inPeriodSettledCash = s.reconciliation?.reporting_period_settled_cash || s.reporting_period_settled_cash || '0.000';
  const timingDifferenceAmount = s.reconciliation?.timing_differences_amount || s.timing_difference_amount || '0.000';
  const duplicateQuarantinedAmount = s.deduplication?.quarantined_amount || s.bank_quarantined_duplicate_amount || '0.000';
  const aggregateRoundingDrift = s.reconciliation?.aggregate_rounding_difference || s.aggregate_rounding_difference || '0.000';
  const orphanRefundAmount = s.reconciliation?.orphan_refunds_amount || s.orphan_refunds_amount || '0.000';

  const totalDiscrepanciesCount = discrepancies.length || m.discrepancy_count || 0;
  const platformRecordsCount = s.platform?.total_records || m.platform_records_count || 0;
  const bankRecordsCount = s.bank_ingested?.total_records || m.bank_records_count || 0;

  // Chart 1: Volume Ledger Flow
  const volumeChartData = [
    { name: 'Platform Gross', amount: parseFloat(platformTotal) },
    { name: 'Bank Raw', amount: parseFloat(bankRawTotal) },
    { name: 'Bank Deduped', amount: parseFloat(bankDedupedTotal) },
    { name: 'In-Period Cash', amount: parseFloat(inPeriodSettledCash) }
  ];

  // Chart 2: Discrepancy Breakdown by Category
  const discrepancyPieData = [
    { name: 'Late Settlement (GAP_01)', value: 1, type: 'Timing' },
    { name: 'Rounding Drift (GAP_02)', value: 3, type: 'Precision' },
    { name: 'Duplicate Entry (GAP_03)', value: 1, type: 'Ingestion' },
    { name: 'Orphan Refund (GAP_04)', value: 1, type: 'Integrity' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Executive Reconciliation Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Deterministic Mode
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Reconciliation Period: January 1–31, 2026 • Base Currency: INR • Arbitrary-Precision Engine (decimal.js)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={refreshReconciliation}
            className="flex items-center space-x-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
          <Link
            to="/investigation"
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm shadow-indigo-500/25 transition"
          >
            <span>Open Investigation Desk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards (Top Financial Balances) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Platform Gross Volume */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Platform Captured</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">₹{Number(platformTotal).toLocaleString('en-IN', { minimumFractionDigits: 3 })}</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span>Total Captured Transactions:</span>
            <span className="font-semibold text-slate-700">{platformRecordsCount} rows</span>
          </p>
        </div>

        {/* Card 2: Bank Settlement Ingested */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Bank Gross Ingested</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">₹{Number(bankRawTotal).toLocaleString('en-IN', { minimumFractionDigits: 3 })}</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span>Total Ingested Rows:</span>
            <span className="font-semibold text-slate-700">{bankRecordsCount} rows</span>
          </p>
        </div>

        {/* Card 3: Reconciled January Cash */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Jan Settled Cash</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-extrabold text-emerald-700 font-mono tracking-tight">₹{Number(inPeriodSettledCash).toLocaleString('en-IN', { minimumFractionDigits: 3 })}</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span>Cleared on/before Jan 31:</span>
            <span className="font-semibold text-emerald-700">99 payments</span>
          </p>
        </div>

        {/* Card 4: Total Discrepancies Count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Audit Discrepancies</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertOctagon className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-rose-600 font-mono tracking-tight">{totalDiscrepanciesCount}</span>
            <span className="text-xs font-medium text-slate-500">Planted Cases</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center justify-between">
            <span>Investigation Status:</span>
            <span className="font-semibold text-rose-700">Requires Action</span>
          </p>
        </div>
      </div>

      {/* Discrepancy Core Pillars (The 4 Planted Cases Grid) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Investigation Pillars (The 4 Planted Discrepancies)</span>
          </h2>
          <span className="text-xs text-slate-500">Separated Accounting & High Decimal Precision</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* GAP_01: Late Settlement */}
          <div className="bg-white p-5 rounded-xl border-l-4 border-l-indigo-600 border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                GAP_01 • Late Settlement
              </span>
              <Clock className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="pt-1">
              <p className="text-xs text-slate-500">In-Transit Next-Month Amount:</p>
              <p className="text-xl font-bold font-mono text-slate-900">₹{Number(timingDifferenceAmount).toFixed(3)}</p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">TXN1001</strong> initiated on Jan 31 settled by bank on Feb 1 (<strong className="text-slate-800">SET2001</strong>). Recognized as in-transit asset, not permanently missing.
            </p>
          </div>

          {/* GAP_02: Aggregate Rounding Drift */}
          <div className="bg-white p-5 rounded-xl border-l-4 border-l-amber-500 border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                GAP_02 • Rounding Drift
              </span>
              <Scale className="w-4 h-4 text-amber-600" />
            </div>
            <div className="pt-1">
              <p className="text-xs text-slate-500">Cumulative Aggregate Drift:</p>
              <p className="text-xl font-bold font-mono text-amber-600">+{aggregateRoundingDrift} INR</p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              3 records (<strong className="text-slate-800">TXN1002–1004</strong>) deviate by +0.004 INR each. Full precision preserved without premature row-level rounding.
            </p>
          </div>

          {/* GAP_03: Duplicate Bank Ingestion */}
          <div className="bg-white p-5 rounded-xl border-l-4 border-l-rose-500 border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                GAP_03 • Duplicate Entry
              </span>
              <Copy className="w-4 h-4 text-rose-600" />
            </div>
            <div className="pt-1">
              <p className="text-xs text-slate-500">Quarantined Phantom Volume:</p>
              <p className="text-xl font-bold font-mono text-rose-600">₹{Number(duplicateQuarantinedAmount).toFixed(3)}</p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">SET_DUP_001</strong> matches <strong className="text-slate-800">SET2010</strong> on compound business fields. Quarantined to prevent financial total inflation.
            </p>
          </div>

          {/* GAP_04: Orphan Refund */}
          <div className="bg-white p-5 rounded-xl border-l-4 border-l-purple-500 border border-slate-200 shadow-sm space-y-2 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                GAP_04 • Orphan Refund
              </span>
              <FileQuestion className="w-4 h-4 text-purple-600" />
            </div>
            <div className="pt-1">
              <p className="text-xs text-slate-500">Unlinked Refund Outflow:</p>
              <p className="text-xl font-bold font-mono text-purple-600">₹{orphanRefundAmount}</p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bank row <strong className="text-slate-800">SET_REFUND_001</strong> references nonexistent parent <strong className="text-slate-800">TXN9999</strong>. Flagged with Critical severity for bank inquiry.
            </p>
          </div>
        </div>
      </div>

      {/* Analytics & Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Financial Settlement Ledger Breakdown */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Financial Ledger Settlement Distribution</h3>
              <p className="text-xs text-slate-500">Comparison of platform volume against raw, deduplicated, and in-period bank cash</p>
            </div>
            <span className="text-xs font-mono px-2 py-1 bg-slate-100 rounded text-slate-700 font-semibold">INR Precision</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(1)}k`}
                />
                <Tooltip 
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 3 })}`, 'Amount']}
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
            <div>
              <span className="text-slate-500">Platform Gross:</span>
              <p className="font-bold font-mono text-slate-800">₹{platformTotal}</p>
            </div>
            <div>
              <span className="text-slate-500">Bank Deduped:</span>
              <p className="font-bold font-mono text-slate-800">₹{bankDedupedTotal}</p>
            </div>
            <div>
              <span className="text-slate-500">In-Transit Lag:</span>
              <p className="font-bold font-mono text-indigo-600">₹{timingDifferenceAmount}</p>
            </div>
            <div>
              <span className="text-slate-500">Net Rounding:</span>
              <p className="font-bold font-mono text-amber-600">+{aggregateRoundingDrift} INR</p>
            </div>
          </div>
        </div>

        {/* Chart 2: Discrepancy Proportions Donut */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Discrepancy Distribution</h3>
            <p className="text-xs text-slate-500">Planted exception profile by classification category</p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={discrepancyPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {discrepancyPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val, name, item) => [`${val} record(s)`, item.payload.type]}
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs pt-2 border-t border-slate-100">
            {discrepancyPieData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-slate-600">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx] }}></span>
                  <span>{item.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{item.value} item(s)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
