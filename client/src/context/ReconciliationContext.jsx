import React, { createContext, useContext, useState, useEffect } from 'react';

// The context now only fetches existing reconciliation if an ID is stored.
// It will auto‑run a default reconciliation only when no ID is present.

import { runReconciliation, getReconciliation } from '../services/api';

const ReconciliationContext = createContext(null);

export function ReconciliationProvider({ children }) {
  const [activeReconId, setActiveReconId] = useState(() => localStorage.getItem('reconx_active_id') || '');
  const [reconData, setReconData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stagedFiles, setStagedFiles] = useState({ platform: null, bank: null });

  // Load existing or initialize active run on mount
  useEffect(() => {
    // Run once on mount. Load existing reconciliation if ID stored, otherwise auto‑run default dataset.
    // Run once on mount. Load existing reconciliation if ID stored, otherwise auto‑run default dataset.
    const initializeData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (activeReconId) {
          const res = await getReconciliation(activeReconId);
          if (res.success && res.reconciliation) {
            setReconData(res.reconciliation);
            return;
          }
        }
        // Auto-run or load default assessment dataset if no active run
        const runRes = await runReconciliation({
          reconciliation_id: 'recon_jan_2026',
          period_start: '2026-01-01',
          period_end: '2026-01-31'
        });
        if (runRes.success) {
          setActiveReconId(runRes.reconciliation_id);
          localStorage.setItem('reconx_active_id', runRes.reconciliation_id);
          setReconData(runRes);
        }
      } catch (err) {
        console.warn('[Recon Context] Error fetching initial reconciliation:', err.message);
        setError(err.message || 'Failed to connect to reconciliation engine.');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [activeReconId]);

  const refreshReconciliation = async () => {
    if (!activeReconId) return;
    setLoading(true);
    try {
      const res = await getReconciliation(activeReconId);
      if (res.success && res.reconciliation) {
        setReconData(res.reconciliation);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeRecon = async (options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runReconciliation(options);
      if (res.success) {
        setActiveReconId(res.reconciliation_id);
        localStorage.setItem('reconx_active_id', res.reconciliation_id);
        setReconData(res);
        return res;
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReconciliationContext.Provider
      value={{
        activeReconId,
        setActiveReconId,
        reconData,
        setReconData,
        loading,
        error,
        stagedFiles,
        setStagedFiles,
        refreshReconciliation,
        executeRecon
      }}
    >
      {children}
    </ReconciliationContext.Provider>
  );
}

export const useReconciliation = () => {
  const context = useContext(ReconciliationContext);
  if (!context) {
    throw new Error('useReconciliation must be used within a ReconciliationProvider');
  }
  return context;
};
