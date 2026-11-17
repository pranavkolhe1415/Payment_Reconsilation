import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('ReconX API Initial Startup Checks', () => {
  it('GET / should return welcome message and endpoints when requested as JSON', async () => {
    const res = await request(app).get('/').set('Accept', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('ReconX');
  });

  it('GET /api/health should return healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('ReconX API Engine');
  });

  it('GET /api/status should list core reconciliation capabilities', async () => {
    const res = await request(app).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.features.length).toBeGreaterThan(0);
  });

  it('GET /unknown-route should return 404 for API requests', async () => {
    const res = await request(app).get('/unknown-route').set('Accept', 'application/json');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Endpoint not found');
  });
});
