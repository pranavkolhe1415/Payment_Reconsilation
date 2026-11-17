import { Router } from 'express';
import {
  runReconciliation,
  getReconciliationById,
  getReconciliationSummary,
  getReconciliationDiscrepancies,
  exportReconciliationCSV,
  updateDiscrepancyStatus,
  addDiscrepancyNote
} from '../controllers/reconciliationController.js';

const router = Router();

router.post('/run', runReconciliation);
router.get('/:id', getReconciliationById);
router.get('/:id/summary', getReconciliationSummary);
router.get('/:id/discrepancies', getReconciliationDiscrepancies);
router.patch('/:id/discrepancies/:caseId/status', updateDiscrepancyStatus);
router.post('/:id/discrepancies/:caseId/notes', addDiscrepancyNote);
router.get('/:id/export', exportReconciliationCSV);

export default router;
