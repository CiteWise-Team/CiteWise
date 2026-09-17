import https from 'https';
https.get('https://export.arxiv.org/api/query?search_query=all:LLM&start=0&max_results=1', { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
