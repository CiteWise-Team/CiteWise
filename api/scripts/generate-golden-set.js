import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../test-data/golden-pdfs');
const MAPPING_FILE = path.join(OUTPUT_DIR, 'golden-mappings.json');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function fetchUrl(urlStr) {
  return new Promise((resolve, reject) => {
    const protocol = urlStr.startsWith('https') ? https : http;
    protocol.get(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
           redirectUrl = new URL(redirectUrl, urlStr).toString();
        }
        res.resume();
        return fetchUrl(redirectUrl).then(resolve).catch(reject);
      }
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function downloadPdf(urlStr, destPath) {
  return new Promise((resolve, reject) => {
    urlStr = urlStr.replace('http://', 'https://');
    const protocol = urlStr.startsWith('https') ? https : http;
    const req = protocol.get(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
           redirectUrl = new URL(redirectUrl, urlStr).toString();
        }
        res.resume();
        return downloadPdf(redirectUrl, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Failed to download ${urlStr}: ${res.statusCode}`));
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        resolve();
      });
      fileStream.on('error', reject);
    });
    req.on('error', reject);
  });
}

function parseArxivXml(xml) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];
    const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
    const pdfMatch = entryXml.match(/<link[^>]*?title="pdf"[^>]*?href="([^"]+)"/) || entryXml.match(/<link[^>]*?href="([^"]+)"[^>]*?title="pdf"/);
    if (titleMatch && pdfMatch) {
      entries.push({
        title: titleMatch[1].replace(/\s+/g, ' ').trim(),
        pdfUrl: pdfMatch[1] + '.pdf'
      });
    }
  }
  return entries;
}

async function getPapers(query, start, maxResults) {
  const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&start=${start}&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
  console.log(`Fetching from ${url}`);
  const xml = await fetchUrl(url);
  console.log(`XML length for ${query}: ${xml.length}`);
  if (xml.length < 1500) {
    console.log(`XML snippet: ${xml}`);
  }
  return parseArxivXml(xml).slice(0, maxResults);
}

async function main() {
  const mappings = [];
  try {
    console.log('Fetching Catalyst paper...');
    const catalyst = await getPapers('all:"Retrieval-Augmented Generation"', 0, 1);
    
    console.log('Fetching Relevant papers...');
    const relevant = await getPapers('all:"Retrieval-Augmented Generation" OR all:"Large Language Models"', 1, 10);
    
    console.log('Fetching Irrelevant papers...');
    const irrelevant = await getPapers('cat:astro-ph', 0, 10);

    const allDownloads = [
      ...catalyst.map(p => ({ ...p, type: 'catalyst' })),
      ...relevant.map(p => ({ ...p, type: 'relevant' })),
      ...irrelevant.map(p => ({ ...p, type: 'irrelevant' }))
    ];

    if (allDownloads.length < 21) {
      console.warn(`Warning: only found ${allDownloads.length} papers. Check queries.`);
    }

    for (let i = 0; i < allDownloads.length; i++) {
      const paper = allDownloads[i];
      const filename = `${paper.type}-${i}.pdf`;
      const filepath = path.join(OUTPUT_DIR, filename);
      console.log(`Downloading [${i + 1}/${allDownloads.length}] ${paper.title} -> ${filename}`);
      
      try {
        await downloadPdf(paper.pdfUrl, filepath);
        mappings.push({
          id: i,
          relevance: paper.type,
          title: paper.title,
          filePath: path.relative(path.join(__dirname, '..'), filepath).replace(/\\/g, '/'),
          originalUrl: paper.pdfUrl
        });
      } catch (err) {
        console.error(`Failed to download ${paper.pdfUrl}`, err);
      }
      
      // Delay to respect API limits
      await new Promise(r => setTimeout(r, 500));
    }

    fs.writeFileSync(MAPPING_FILE, JSON.stringify(mappings, null, 2));
    console.log(`Generated mappings at ${MAPPING_FILE}`);
  } catch (err) {
    console.error('Error during generation:', err);
    process.exit(1);
  }
}

main();
