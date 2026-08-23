const fs = require('fs');

const oldWfRaw = fs.readFileSync('old_wf.json', 'utf8').replace(/^\uFEFF/, '');
const oldWf = JSON.parse(oldWfRaw);

const gemini = oldWf.nodes.find(n => n.name.includes('Google Gemini Chat Model'));
const aiAgent = oldWf.nodes.find(n => n.name.includes('AI Metadata Extractor'));

const mergeCode = fs.readFileSync('metadata_merge_node.js', 'utf8');

const parseInputCode = `const body = $input.first().json.body ?? $input.first().json;
const rawText = String(body.text ?? "").slice(0, 8000).trim();
const filename = String(body.filename ?? "");
const documentId = body.documentId ?? null;

if (!rawText) throw new Error("No text provided");

const doiMatch = rawText.match(/\\b(?:doi|DOI)[:\\s\\/]+([^\\s,;)\\]]+)/);
const doi = doiMatch ? doiMatch[1].replace(/[.,;)\\]]+$/, "") : null;

const arxivMatch = rawText.match(/arXiv[:\\s]+([0-9]{4}\\.[0-9]+)/i);
const arxivId = arxivMatch ? arxivMatch[1] : null;

return [{ json: { rawText, filename, documentId, doi, arxivId } }];`;

const aiPrompt = `=Extract citation metadata from this academic paper text:

FILENAME: {{ $("Parse Input").first().json.filename }}

TEXT (first 8000 chars):
{{ $("Parse Input").first().json.rawText }}

Return ONLY valid JSON with this exact schema, no markdown fences:
{
  "title": "full paper title or null",
  "authorDisplay": "Author One, Author Two or null",
  "authors": ["Author One", "Author Two"],
  "year": "4-digit year string or null",
  "journal": "journal or conference name or null",
  "doi": "DOI string or null",
  "metadataReliable": true
}

Rules:
- title: the paper's full title, NOT the filename
- authorDisplay: comma-separated real human names only; null if not found
- Look for author names near affiliation markers (superscripts like 1,2,*, †)
- Look in text for "Author contributions:", "Correspondence:", "Contact:" sections
- year: publication/submission year; for arXiv IDs like 2207.xxxxx the year is 2022
- metadataReliable: true only if title AND year AND authorDisplay are all non-null
- Never invent data; return null for any field you cannot find with confidence`;

const parseAiCode = `const item = $input.first().json;
let raw = item.output ?? item.text ?? item.response ?? item.message?.content ?? item.content ?? "";
raw = String(raw).replace(/^\\s*\`\`\`(?:json)?\\s*/i, "").replace(/\\s*\`\`\`\\s*$/i, "").trim();
const firstBrace = raw.indexOf("{");
const lastBrace = raw.lastIndexOf("}");
if (firstBrace === -1 || lastBrace === -1) return [{ json: { title: null, authorDisplay: null, authors: [], year: null, journal: null, doi: null } }];
let parsed = {};
try { parsed = JSON.parse(raw.slice(firstBrace, lastBrace + 1)); } catch(e) {}
return [{ json: {
  title: parsed.title || null,
  authorDisplay: parsed.authorDisplay || null,
  authors: Array.isArray(parsed.authors) ? parsed.authors : (parsed.authorDisplay ? [parsed.authorDisplay] : []),
  year: parsed.year || null,
  journal: parsed.journal || null,
  doi: parsed.doi || null
} }];`;

const workflow = {
  name: 'CiteWise Enhanced Metadata Extractor',
  nodes: [
    {
      id: 'webhook-1', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [240, 300],
      parameters: { path: 'citewise-metadata-extractor', responseMode: 'responseNode', httpMethod: 'POST' },
      webhookId: 'citewise-metadata-extractor-v2'
    },
    {
      id: 'parse-1', name: 'Parse Input', type: 'n8n-nodes-base.code', typeVersion: 2, position: [460, 300],
      parameters: { jsCode: parseInputCode }
    },
    {
      id: 'crossref-check', name: 'Has DOI', type: 'n8n-nodes-base.if', typeVersion: 2, position: [680, 180],
      parameters: {
        conditions: {
          options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
          conditions: [{ id: 'cond1', leftValue: '={{ $json.doi || $json.arxivId }}', rightValue: '', operator: { type: 'string', operation: 'notEmpty' } }]
        }
      }
    },
    {
      id: 'crossref-1', name: 'CrossRef Lookup', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [900, 100],
      parameters: {
        method: 'GET',
        url: '=https://api.crossref.org/works/{{ $json.doi || ("10.48550/arXiv." + $json.arxivId) }}',
        options: { response: { response: { responseFormat: 'json', neverError: true } } },
        headers: { parameters: [{ name: 'User-Agent', value: 'CiteWise/2.0 (mailto:gregoryivanonyx.badinas@gmail.com)' }] }
      }
    },
    {
      ...aiAgent, id: 'ai-1', position: [900, 300],
      parameters: { ...aiAgent.parameters, text: aiPrompt }
    },
    { ...gemini, id: 'gemini-1', position: [900, 450] },
    {
      id: 'parse-ai-1', name: 'Parse AI Output', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1120, 300],
      parameters: { jsCode: parseAiCode }
    },
    {
      id: 'semsch-1', name: 'Semantic Scholar Lookup', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1340, 420],
      parameters: {
        method: 'GET',
        url: '=https://api.semanticscholar.org/graph/v1/paper/search',
        sendQuery: true,
        queryParameters: {
          parameters: [
            { name: 'query', value: '={{ $("Parse AI Output").first().json.title || $("Parse Input").first().json.filename }}' },
            { name: 'fields', value: 'title,authors,year,externalIds,journal,venue' },
            { name: 'limit', value: '1' }
          ]
        },
        options: { response: { response: { responseFormat: 'json', neverError: true } } }
      }
    },
    { id: 'merge-1', name: 'Merge Best Metadata', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1560, 300], parameters: { jsCode: mergeCode } },
    { id: 'respond-1', name: 'Respond', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1, position: [1780, 300], parameters: { respondWith: 'json', responseBody: '={{ $json }}' } }
  ],
  connections: {
    'Webhook': { main: [[{ node: 'Parse Input', type: 'main', index: 0 }]] },
    'Parse Input': { main: [[{ node: 'Has DOI', type: 'main', index: 0 }]] },
    'Has DOI': { main: [[{ node: 'CrossRef Lookup', type: 'main', index: 0 }], [{ node: 'AI Metadata Extractor', type: 'main', index: 0 }]] },
    'CrossRef Lookup': { main: [[{ node: 'AI Metadata Extractor', type: 'main', index: 0 }]] },
    'AI Metadata Extractor': { main: [[{ node: 'Parse AI Output', type: 'main', index: 0 }]] },
    'Parse AI Output': { main: [[{ node: 'Semantic Scholar Lookup', type: 'main', index: 0 }]] },
    'Semantic Scholar Lookup': { main: [[{ node: 'Merge Best Metadata', type: 'main', index: 0 }]] },
    'Merge Best Metadata': { main: [[{ node: 'Respond', type: 'main', index: 0 }]] },
    [gemini.name]: { ai_languageModel: [[{ node: 'AI Metadata Extractor', type: 'ai_languageModel', index: 0 }]] }
  },
  settings: { executionOrder: 'v1' }
};

fs.writeFileSync('new_wf.json', JSON.stringify(workflow, null, 2));
