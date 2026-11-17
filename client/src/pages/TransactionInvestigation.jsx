import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  AlertCircle, 
  Clock, 
  Scale, 
  Copy, 
  FileQuestion, 
  CheckCircle2, 
  X, 
  MessageSquare, 
  ChevronRight,
  Send,
  User,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';
import { useReconciliation } from '../context/ReconciliationContext';
import { getDiscrepancies, updateDiscrepancyStatus, addDiscrepancyNote } from '../services/api';

export default function TransactionInvestigation() {
  const { activeReconId, reconData } = useReconciliation();

  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCase, setSelectedCase] = useState(null);

  // New note form state
  const [newNote, setNewNote] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('Senior Auditor');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchDiscrepanciesList = async () => {
    if (!activeReconId) return;
    setLoading(true);
    try {
      const params = {};
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await getDiscrepancies(activeReconId, params);
      if (res.success) {
        setDiscrepancies(res.discrepancies || []);
        // Update selected case if open
        if (selectedCase) {
          const updated = res.discrepancies.find(d => d.case_id === selectedCase.case_id);
          if (updated) setSelectedCase(updated);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch discrepancies:', err.message);
      // Fallback to context discrepancies
      if (reconData?.discrepancies) {
        let list = reconData.discrepancies;
        if (typeFilter !== 'ALL') list = list.filter(d => d.discrepancy_type === typeFilter);
        if (statusFilter !== 'ALL') list = list.filter(d => d.status === statusFilter);
        setDiscrepancies(list);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscrepanciesList();
  }, [activeReconId, typeFilter, statusFilter]);

  // Handle status update
  const handleStatusChange = async (newStatus) => {
    if (!selectedCase || !activeReconId) return;
    setUpdatingStatus(true);
    try {
      await updateDiscrepancyStatus(activeReconId, selectedCase.case_id, {
        status: newStatus,
        resolved_by: noteAuthor
      });
      await fetchDiscrepanciesList();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle adding an audit note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedCase || !activeReconId) return;

    try {
      await addDiscrepancyNote(activeReconId, selectedCase.case_id, {
        text: newNote.trim(),
        author: noteAuthor
      });
      setNewNote('');
      await fetchDiscrepanciesList();
    } catch (err) {
      alert(`Failed to append note: ${err.message}`);
    }
  };

  // Filter by search query
  const filteredDiscrepancies = discrepancies.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const caseMatch = d.case_id.toLowerCase().includes(q);
    const typeMatch = d.discrepancy_type.toLowerCase().includes(q);
    const descMatch = (d.description || '').toLowerCase().includes(q);
    const platMatch = (d.platform_transaction_ids || []).some(id => id.toLowerCase().includes(q));
    const bankMatch = (d.bank_settlement_ids || []).some(id => id.toLowerCase().includes(q));
    return caseMatch || typeMatch || descMatch || platMatch || bankMatch;
  });

  const getDiscrepancyBadge = (type) => {
    switch (type) {
      case 'SETTLED_AFTER_PERIOD':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Late Settlement</span>;
      case 'AGGREGATE_ROUNDING_DIFFERENCE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Rounding Drift</span>;
      case 'DUPLICATE_ENTRY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Duplicate Entry</span>;
      case 'ORPHAN_REFUND':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Orphan Refund</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">Critical</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">High</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{sev}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RESOLVED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1"><CheckCircle2 className="w-3 h-3 text-emerald-600" /><span>Resolved</span></span>;
      case 'UNDER_INVESTIGATION':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">In Review</span>;
      case 'ACKNOWLEDGED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">Acknowledged</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Open</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Transaction Investigation Workbench</h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze planted reconciliation discrepancies, inspect side-by-side transaction fields, and log audit notes.
          </p>
        </div>
        <div className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
          Run: <span className="font-mono font-bold text-slate-800">{activeReconId}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Transaction ID (TXN1001), Settlement ID, Case ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Filter by Type */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-medium">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Types</option>
            <option value="SETTLED_AFTER_PERIOD">Late Settlement (GAP_01)</option>
            <option value="AGGREGATE_ROUNDING_DIFFERENCE">Rounding Drift (GAP_02)</option>
            <option value="DUPLICATE_ENTRY">Duplicate Entry (GAP_03)</option>
            <option value="ORPHAN_REFUND">Orphan Refund (GAP_04)</option>
          </select>
        </div>

        {/* Filter by Status */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_INVESTIGATION">In Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
          </select>
        </div>
      </div>

      {/* Discrepancies Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-5">Case ID</th>
                <th className="py-3 px-5">Discrepancy Category</th>
                <th className="py-3 px-5">Platform Reference(s)</th>
                <th className="py-3 px-5">Bank Reference(s)</th>
                <th className="py-3 px-5 text-right">Variance (INR)</th>
                <th className="py-3 px-5 text-center">Severity</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredDiscrepancies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No discrepancies match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredDiscrepancies.map((d) => (
                  <tr
                    key={d.case_id}
                    onClick={() => setSelectedCase(d)}
                    className={`cursor-pointer transition hover:bg-indigo-50/40 ${
                      selectedCase?.case_id === d.case_id ? 'bg-indigo-50/70' : ''
                    }`}
                  >
                    <td className="py-3.5 px-5 font-bold font-mono text-slate-900">{d.case_id}</td>
                    <td className="py-3.5 px-5">{getDiscrepancyBadge(d.discrepancy_type)}</td>
                    <td className="py-3.5 px-5 font-mono text-slate-800">
                      {(d.platform_transaction_ids || []).length > 0
                        ? d.platform_transaction_ids.join(', ')
                        : <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-800">
                      {(d.bank_settlement_ids || []).join(', ')}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900">
                      {d.delta_amount ? `₹${d.delta_amount}` : '₹0.000'}
                    </td>
                    <td className="py-3.5 px-5 text-center">{getSeverityBadge(d.severity)}</td>
                    <td className="py-3.5 px-5 text-center">{getStatusBadge(d.status)}</td>
                    <td className="py-3.5 px-5 text-right">
                      <button className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center space-x-1">
                        <span>Investigate</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-Side Investigation Drawer / Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end animate-fadeIn">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold font-mono text-slate-900">{selectedCase.case_id}</span>
                {getDiscrepancyBadge(selectedCase.discrepancy_type)}
                {getSeverityBadge(selectedCase.severity)}
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Description & Expected Behavior */}
              <div className="space-y-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Identified Anomaly</span>
                  <p className="text-slate-800 font-medium leading-relaxed">{selectedCase.description}</p>
                </div>

                {selectedCase.expected_behavior && (
                  <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 space-y-1.5">
                    <span className="font-bold text-indigo-800 uppercase tracking-wider text-[10px]">Expected Financial Treatment</span>
                    <p className="text-indigo-900 font-medium leading-relaxed">{selectedCase.expected_behavior}</p>
                  </div>
                )}
              </div>

              {/* Side-by-Side Transaction Inspection Matrix */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">Source Record Comparison</h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* Platform Side */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                    <span className="font-bold text-indigo-700 uppercase text-[10px]">Platform Transactions</span>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-slate-400 text-[10px]">Transaction ID:</span>
                        <p className="font-mono font-bold text-slate-900">
                          {selectedCase.platform_transaction_ids?.join(', ') || 'N/A (Unrecorded)'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Source Row Number(s):</span>
                        <p className="font-mono text-slate-700">
                          {selectedCase.platform_row_numbers?.length ? selectedCase.platform_row_numbers.join(', ') : 'None'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Amount:</span>
                        <p className="font-mono font-bold text-slate-900">
                          {selectedCase.platform_amount ? `₹${selectedCase.platform_amount}` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bank Side */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                    <span className="font-bold text-blue-700 uppercase text-[10px]">Bank Settlement Feed</span>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-slate-400 text-[10px]">Settlement ID:</span>
                        <p className="font-mono font-bold text-slate-900">
                          {selectedCase.bank_settlement_ids?.join(', ') || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Source Row Number(s):</span>
                        <p className="font-mono text-slate-700">
                          {selectedCase.bank_row_numbers?.length ? selectedCase.bank_row_numbers.join(', ') : 'None'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Settlement Amount:</span>
                        <p className="font-mono font-bold text-slate-900">
                          {selectedCase.bank_amount ? `₹${selectedCase.bank_amount}` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Update Action Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-700 uppercase text-[10px]">Investigation Workflow Status</span>
                <div className="flex flex-wrap gap-2">
                  {['OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'ACKNOWLEDGED'].map((st) => (
                    <button
                      key={st}
                      disabled={updatingStatus || selectedCase.status === st}
                      onClick={() => handleStatusChange(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selectedCase.status === st
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audit Trail & Notes Log */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>Audit Trail & Investigation Notes</span>
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {!selectedCase.notes || selectedCase.notes.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl">
                      No investigation notes logged yet.
                    </p>
                  ) : (
                    selectedCase.notes.map((n, i) => (
                      <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-bold text-slate-700 flex items-center space-x-1">
                            <User className="w-3 h-3 text-indigo-500" />
                            <span>{n.author || 'Auditor'}</span>
                          </span>
                          <span>{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-800 text-xs">{n.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="space-y-2 pt-2">
                  <textarea
                    rows={2}
                    placeholder="Add audit resolution note or inquiries..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      placeholder="Author name"
                      value={noteAuthor}
                      onChange={(e) => setNoteAuthor(e.target.value)}
                      className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 w-44"
                    />
                    <button
                      type="submit"
                      disabled={!newNote.trim()}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Log Note</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
