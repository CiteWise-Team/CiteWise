import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { jsPDF } = require('../../../web/node_modules/jspdf');


describe('BUG 2 Fix: Asynchronous Paraphrasing and Status Polling', () => {
  let app;
  const mockToken = 'mock-valid-token';

  beforeEach(async () => {
    process.env.SUPABASE_URL ||= 'http://127.0.0.1:1/';
    process.env.SUPABASE_KEY ||= 'test-key';
    process.env.SUPABASE_ANON_KEY ||= 'test-key';
    vi.resetModules();

    // Mock auth middleware to let test requests through
    vi.doMock('../common/middlewares/auth.middleware.js', () => ({
      default: (req, res, next) => {
        req.user = { id: 'test-user-id', email: 'test@citewise.internal' };
        next();
      },
    }));

    app = (await import('../app.js')).default;
  });

  it('rejects POST /api/v1/synthesis/paraphrase with 400 if text is empty', async () => {
    const res = await request(app)
      .post('/api/v1/synthesis/paraphrase')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({ text: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns HTTP 202 Accepted immediately with status PARAPHRASING and jobId', async () => {
    const res = await request(app)
      .post('/api/v1/synthesis/paraphrase')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({
        text: 'This is a sample introduction that requires paraphrasing (Vaswani et al., 2017).',
        sessionId: 'test-session-123',
      });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('PARAPHRASING');
    expect(res.body.jobId).toBeDefined();
    expect(res.body.sessionId).toBe('test-session-123');
  });

  it('rejects GET /api/v1/synthesis/paraphrase/status with 400 if no jobId or sessionId provided', async () => {
    const res = await request(app)
      .get('/api/v1/synthesis/paraphrase/status')
      .set('Authorization', `Bearer ${mockToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 for non-existent jobId', async () => {
    const res = await request(app)
      .get('/api/v1/synthesis/paraphrase/status?jobId=non-existent-uuid')
      .set('Authorization', `Bearer ${mockToken}`);

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('NOT_FOUND');
  });

  it('allows status polling via /api/v1/synthesis/paraphrase/status with jobId', async () => {
    const postRes = await request(app)
      .post('/api/v1/synthesis/paraphrase')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({
        text: 'Background literature indicates that model context limits are significant (Brown et al., 2020).',
        sessionId: 'test-session-456',
      });

    const jobId = postRes.body.jobId;
    expect(jobId).toBeDefined();

    const statusRes = await request(app)
      .get(`/api/v1/synthesis/paraphrase/status?jobId=${jobId}`)
      .set('Authorization', `Bearer ${mockToken}`);

    expect(statusRes.status).toBe(200);
    expect(['PARAPHRASING', 'COMPLETE', 'FAILED']).toContain(statusRes.body.status);
    expect(statusRes.body.jobId).toBe(jobId);
  });

  it('supports alias /api/v1/synthesis/paraphrase-status endpoint', async () => {
    const postRes = await request(app)
      .post('/api/v1/synthesis/paraphrase')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({
        text: 'Background literature (Devlin et al., 2019).',
        sessionId: 'test-session-789',
      });

    const jobId = postRes.body.jobId;
    const statusRes = await request(app)
      .get(`/api/v1/synthesis/paraphrase-status?jobId=${jobId}`)
      .set('Authorization', `Bearer ${mockToken}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.jobId).toBe(jobId);
  });
});

describe('BUG 1 Fix: Client-Side PDF Export Unicode Support & Margin Enforcement', () => {
  it('renders Turkish "İ" and international characters correctly without replacing them with "0"', () => {
    const fontPath = path.resolve(__dirname, '../../../web/public/fonts/Roboto-Regular.ttf');
    expect(fs.existsSync(fontPath)).toBe(true);

    const fontBase64 = fs.readFileSync(fontPath).toString('base64');
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');

    const testText = 'İstanbul Üniversitesi: İ, Ğ, Ü, Ş, Ö, Ç, ı, ğ, ü, ş, ö, ç.';
    doc.text(testText, 72, 72);

    const output = doc.output();
    expect(output.length).toBeGreaterThan(10000);
    expect(output).not.toContain('0stanbul');
  });

  it('enforces standard margins and wraps multiline text cleanly within page width', () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const fontPath = path.resolve(__dirname, '../../../web/public/fonts/Roboto-Regular.ttf');
    const fontBase64 = fs.readFileSync(fontPath).toString('base64');
    doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(10);

    const margin = 72; // Standard 1-inch margins
    const pageWidth = doc.internal.pageSize.getWidth(); // 612
    const usableWidth = pageWidth - margin * 2; // 468

    const longParagraph = [
      'This is a comprehensive research synthesis addressing critical literature gaps in academic computing.',
      'International citations include Turkish studies from İstanbul Üniversitesi examining neural attention networks.',
      'Every line must strictly fit inside the usable width without overflowing right margins or distorting word spacing.'
    ].join(' ');

    const lines = doc.splitTextToSize(longParagraph, usableWidth);
    expect(lines.length).toBeGreaterThan(1);

    for (const line of lines) {
      const lineWidth = doc.getTextWidth(line);
      // Ensure each line never exceeds the usable page width
      expect(lineWidth).toBeLessThanOrEqual(usableWidth);
    }
  });
});
