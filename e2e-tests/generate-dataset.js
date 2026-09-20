const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const outputDir = path.join(__dirname, 'pdfs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

async function fetchArxivPdfs(query, maxResults, start = 0) {
  const url = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&start=${start}&max_results=${maxResults}`;
  console.log(`Fetching: ${url}`);
  const response = await axios.get(url);
  const xml = response.data;
  
  const regex = /<id>http:\/\/arxiv\.org\/abs\/([^<]+)<\/id>/g;
  const links = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    let pdfUrl = `https://arxiv.org/pdf/${match[1]}.pdf`;
    links.push(pdfUrl);
  }
  return links;
}

async function downloadPdf(url, filepath) {
  console.log(`Downloading ${url} to ${filepath}`);
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 10000 // 10 seconds timeout
    });
    
    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (err) {
    console.error(`Failed to download ${url}:`, err.message);
    throw err;
  }
}

async function main() {
  console.log('Fetching relevant PDF links...');
  // 1 for catalyst, 10 for relevant
  const relevantLinks = await fetchArxivPdfs('all:"large language models"', 11);
  
  console.log('Fetching irrelevant PDF links...');
  const irrelevantLinks = await fetchArxivPdfs('all:"quantum chromodynamics"', 10);
  
  if (relevantLinks.length < 11 || irrelevantLinks.length < 10) {
    console.error('Not enough links found', { rel: relevantLinks.length, irr: irrelevantLinks.length });
  }

  // Download Catalyst PDF
  await downloadPdf(relevantLinks[0], path.join(outputDir, 'catalyst.pdf'));
  
  // Download Relevant PDFs
  for (let i = 1; i < 11; i++) {
    if (relevantLinks[i]) {
      await downloadPdf(relevantLinks[i], path.join(outputDir, `relevant-${i}.pdf`));
    }
  }

  // Download Irrelevant PDFs
  for (let i = 0; i < 10; i++) {
    if (irrelevantLinks[i]) {
      await downloadPdf(irrelevantLinks[i], path.join(outputDir, `irrelevant-${i+1}.pdf`));
    }
  }
  
  console.log('Finished generating golden dataset.');
}

main().catch(console.error);
