import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Health check
export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Platform CSV Upload
export const uploadPlatformCSV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload/platform', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// Bank Settlement CSV Upload
export const uploadBankCSV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload/bank', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// Execute Reconciliation
export const runReconciliation = async (payload = {}) => {
  const response = await api.post('/reconciliation/run', payload);
  return response.data;
};

// Get Reconciliation by ID
export const getReconciliation = async (id) => {
  const response = await api.get(`/reconciliation/${id}`);
  return response.data;
};

// Get High-Precision Financial Summary
export const getSummary = async (id) => {
  const response = await api.get(`/reconciliation/${id}/summary`);
  return response.data;
};

// Get Discrepancies with optional filters
export const getDiscrepancies = async (id, params = {}) => {
  const response = await api.get(`/reconciliation/${id}/discrepancies`, { params });
  return response.data;
};

// Update Discrepancy Status
export const updateDiscrepancyStatus = async (id, caseId, payload) => {
  const response = await api.patch(`/reconciliation/${id}/discrepancies/${caseId}/status`, payload);
  return response.data;
};

// Add Discrepancy Note
export const addDiscrepancyNote = async (id, caseId, payload) => {
  const response = await api.post(`/reconciliation/${id}/discrepancies/${caseId}/notes`, payload);
  return response.data;
};

// Download CSV Export Report
export const exportReconciliationCSV = async (id) => {
  const response = await api.get(`/reconciliation/${id}/export`, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `reconciliation-report-${id}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default api;
