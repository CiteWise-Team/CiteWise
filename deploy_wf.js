// Reads new_wf.json and POSTs it to n8n API, then activates it
const https = require('https');
const fs = require('fs');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MjVjMGIyOS1iZGE0LTRiMjgtOTNiZC1jOTcwY2IxMTI3MjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNDI5YjRkMzMtZWMyMC00MjQwLWI5OWQtODY0MWQ0ZTAwYTkwIiwiaWF0IjoxNzg3NDc3NzMwfQ.YI0q9CSPRgGNTRmXlPIVeS5aISXu4MEX1z49ve9u_uA';

function doRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const wfJson = fs.readFileSync('new_wf.json'); // Buffer — no encoding conversion
  const wfStr = wfJson.toString('utf8');
  const bodyBuf = Buffer.from(wfStr, 'utf8');

  console.log('POSTing workflow (' + bodyBuf.length + ' bytes)...');
  const r1 = await doRequest({
    hostname: 'citewise-n8n.duckdns.org', port: 443,
    path: '/api/v1/workflows', method: 'POST',
    headers: { 'X-N8N-API-KEY': token, 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': bodyBuf.length }
  }, bodyBuf);

  console.log('Status:', r1.status);
  if (r1.status !== 200 && r1.status !== 201) {
    console.error('Error:', r1.body.slice(0, 400));
    return;
  }

  const wf = JSON.parse(r1.body);
  console.log('New workflow ID:', wf.id);

  const r2 = await doRequest({
    hostname: 'citewise-n8n.duckdns.org', port: 443,
    path: `/api/v1/workflows/${wf.id}/activate`, method: 'POST',
    headers: { 'X-N8N-API-KEY': token, 'Content-Type': 'application/json', 'Content-Length': 2 }
  }, '{}');
  console.log('Activate:', r2.status);
}

main().catch(console.error);
