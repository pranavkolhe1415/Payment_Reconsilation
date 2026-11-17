import { Router } from 'express';
import uploadRoutes from './uploadRoutes.js';
import reconciliationRoutes from './reconciliationRoutes.js';
import { getDBStatus } from '../config/db.js';

const router = Router();

// Health & status diagnostics
router.get('/health', (req, res) => {
  const dbStatus = getDBStatus();
  res.status(200).json({
    status: 'healthy',
    service: 'ReconX API Engine',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.get('/status', (req, res) => {
  const dbStatus = getDBStatus();
  res.status(200).json({
    version: '1.0.0',
    platform: 'ReconX Reconciliation Platform',
    database: dbStatus,
    features: [
      'Arbitrary-precision arithmetic (decimal.js)',
      'Compound business key bank deduplication',
      'Timing difference / late settlement classification',
      'Orphan refund detection',
      'Mongoose database layer with compound unique indexes',
      'Raw source value and line number audit preservation',
      'CSV upload and multi-format report export'
    ]
  });
});

// Mount resource routes
router.use('/upload', uploadRoutes);
router.use('/reconciliation', reconciliationRoutes);

export default router;
