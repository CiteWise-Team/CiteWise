const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

async function main() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  const targetUrl = process.env.TARGET_URL || 'https://citewise-seven.vercel.app';
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;

  if (!email || !password) {
    throw new Error('Missing E2E_EMAIL or E2E_PASSWORD environment variables. Never hardcode live credentials.');
  }

  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to CiteWise login...');
  await page.goto(`${targetUrl}/login`);

  let apiUrl = process.env.API_ORIGIN || '';
  page.on('request', request => {
    if (request.url().includes('/api/auth/login')) {
      const urlObj = new URL(request.url());
      apiUrl = urlObj.origin;
    }
  });

  console.log('Logging in...');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/groups');
  console.log('Login successful. Extracting auth token...');
  
  await page.waitForTimeout(2000);
  
  const token = await page.evaluate(() => localStorage.getItem('token'));
  if (!token) {
    throw new Error('Token not found in localStorage');
  }
  
  const userStr = await page.evaluate(() => localStorage.getItem('user'));
  const user = JSON.parse(userStr);
  const ownerId = user.id;

  if (!apiUrl) {
    throw new Error('Could not determine API origin from login request. Set API_ORIGIN env var.');
  }
  console.log(`Extracted token. API URL is ${apiUrl}`);

  console.log('Running Validation Metric Tests...');
  const metrics = {};

  const axiosInstance = axios.create({
    baseURL: apiUrl,
    headers: { Authorization: `Bearer ${token}` }
  });

  // 1. Setup Time: Create a workspace & initialize CiteWise manual/import baseline
  const setupStart = Date.now();
  const groupRes = await axiosInstance.post(`/api/groups/create`, {
    name: `Validation Test Group ${Date.now()}`,
    description: 'E2E Testing',
    ownerId: ownerId
  });
  const groupId = groupRes.data.data?.id || groupRes.data.id;

  const baselineRes = await axiosInstance.post('/api/catalyst/manual-baseline', {
    workspaceId: String(groupId),
    title: 'Validation Baseline Study',
    rationale: 'Automated validation harness baseline for T3/T4 verification.',
    gaps: ['Lack of traceable citation verification in academic synthesis'],
    setupStartedAt: new Date(setupStart).toISOString(),
  });
  const sessionId = baselineRes.data?.data?.sessionId;
  if (!sessionId) {
    throw new Error('Failed to obtain CiteWise sessionId from /api/catalyst/manual-baseline');
  }
  metrics['Setup Time (ms)'] = Date.now() - setupStart;
  console.log(`Setup Time measured: ${metrics['Setup Time (ms)']}ms (sessionId=${sessionId})`);

  // 2. T3 PDF Text Parsing: Upload PDFs to CiteWise's actual /api/rrl/upload endpoint
  console.log('Testing T3 PDF Text Parsing via /api/rrl/upload...');
  const pdfsDir = process.env.VALIDATION_PDF_DIR || path.join(__dirname, 'pdfs');
  const files = fs.readdirSync(pdfsDir).filter(f => f.endsWith('.pdf'));
  if (files.length === 0) {
    throw new Error(`No PDF files found in ${pdfsDir}`);
  }

  let parsedWithText = 0;
  const uploadedDocIds = [];

  for (const file of files) {
    const filePath = path.join(pdfsDir, file);
    const form = new FormData();
    form.append('files', fs.createReadStream(filePath), file);

    try {
      const uploadRes = await axiosInstance.post('/api/rrl/upload', form, {
        headers: {
          ...form.getHeaders(),
          'X-Session-Id': sessionId,
        }
      });
      const firstResult = uploadRes.data?.data?.results?.[0];
      if (firstResult?.success && firstResult.documentId) {
        uploadedDocIds.push(firstResult.documentId);
        if (firstResult.characterCount > 0 || firstResult.status === 'EXTRACTING') {
          parsedWithText++;
        }
      } else {
        console.warn(`Upload rejected for ${file}: ${firstResult?.message || 'Unknown reason'}`);
      }
    } catch (err) {
      console.error(`Failed to upload ${file}: ${err.message}`);
    }
  }

  metrics['T3 Text Parsing (%)'] = Number(((parsedWithText / files.length) * 100).toFixed(2));
  console.log(`T3 Text Parsing Success: ${metrics['T3 Text Parsing (%)']}% (${parsedWithText}/${files.length})`);

  // 3. T4 AI Assessment Time: call /api/v1/documents/assess-batch with valid documentIds array
  if (uploadedDocIds.length === 0) {
    throw new Error('No documents were uploaded successfully; cannot run assess-batch.');
  }
  console.log(`Triggering /api/v1/documents/assess-batch for ${uploadedDocIds.length} document(s)...`);
  const batchRes = await axiosInstance.post(
    '/api/v1/documents/assess-batch',
    { documentIds: uploadedDocIds },
    { headers: { 'X-Session-Id': sessionId } }
  );
  if (batchRes.status >= 400) {
    throw new Error(`assess-batch failed with HTTP ${batchRes.status}`);
  }

  // Poll until all documents leave PENDING/PROCESSING/EXTRACTING
  const pollStart = Date.now();
  while (Date.now() - pollStart < 300000) {
    const docsRes = await axiosInstance.get(`/api/v1/documents/session/${sessionId}`, {
      headers: { 'X-Session-Id': sessionId }
    });
    const docs = Array.isArray(docsRes.data) ? docsRes.data : (docsRes.data?.data || []);
    const pending = docs.filter(d => !['complete', 'completed', 'failed', 'timeout'].includes(String(d.scoringStatus || '').toLowerCase()));
    if (docs.length > 0 && pending.length === 0) break;
    await new Promise(r => setTimeout(r, 3000));
  }

  const timingsRes = await axiosInstance.get(`/api/v1/documents/assessment-timings?sessionId=${encodeURIComponent(sessionId)}&targetMs=15000`);
  const timingSummary = timingsRes.data?.data?.overall ?? {};
  metrics['T4 Mean Assessment (s)'] = timingSummary.meanAssessmentSeconds ?? 'N/A';
  metrics['T4 p95 Assessment (s)'] = timingSummary.p95AssessmentSeconds ?? 'N/A';
  metrics['T4 Within 15s (%)'] = timingSummary.within15sPct ?? 'N/A';

  // Print all metrics
  console.log('\n--- MVP Validation Metrics ---');
  for (const [key, value] of Object.entries(metrics)) {
    console.log(`${key}: ${value}`);
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
