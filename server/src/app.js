import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// API Welcome endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to ReconX Payment Reconciliation & Investigation API',
    docs: '/api/status',
    health: '/api/health'
  });
});

// Root route
app.get('/', (req, res, next) => {
  if (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html')) {
    return res.json({
      message: 'Welcome to ReconX Payment Reconciliation & Investigation API',
      docs: '/api/status',
      health: '/api/health'
    });
  }

  if (fs.existsSync(clientDistPath)) {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  }

  res.json({
    message: 'Welcome to ReconX Payment Reconciliation & Investigation API',
    docs: '/api/status',
    health: '/api/health'
  });
});

// Mount API routes
app.use('/api', routes);

// Serve static frontend assets if built
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// 404 handler for unknown routes
app.use((req, res, next) => {
  // If it's an API route or requested by an API client/test
  if (req.path.startsWith('/api') || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found'
    });
  }

  // HTML5 History API fallback for browser page loads
  if (req.method === 'GET' && fs.existsSync(clientDistPath)) {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  }

  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Terminal error handling middleware
app.use(errorHandler);

export default app;
