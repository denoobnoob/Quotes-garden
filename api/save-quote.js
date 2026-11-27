// Vercel serverless function: appends a quote to data/quotes.json in your GitHub repo
const FILE_PATH = 'data/quotes.json';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const quote = typeof body.quote === 'string' ? body.quote.trim() : '';
  const book = typeof body.book === 'string' ? body.book.trim() : '';
  const author = typeof body.author === 'string' ? body.author.trim() : '';

  if (!quote) {
    return res.status(400).json({ error: 'Quote is required' });
  }
  if (quote.length > 1000 || book.length > 200 || author.length > 200) {
    return res.status(400).json({ error: 'Input is too long' });
  }

  const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_BRANCH = 'main'
  } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'Server is not configured' });
  }

  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'quote-garden'
  };

  try {
    // 1. Read the current file (if it exists)
    let quotes = [];
    let sha;
    const getRes = await fetch(`${apiUrl}?ref=${GITHUB_BRANCH}`, { headers });

    if (getRes.status === 200) {
      const file = await getRes.json();
      sha = file.sha;
      quotes = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    } else if (getRes.status !== 404) {
      return res.status(502).json({ error: 'Could not read repository' });
    }

    // 2. Add the new quote
    quotes.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      quote,
      book,
      author,
      createdAt: new Date().toISOString()
    });

    // 3. Write the file back
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: 'Add quote to garden',
        content: Buffer.from(JSON.stringify(quotes, null, 2)).toString('base64'),
        sha,
        branch: GITHUB_BRANCH
      })
    });

    if (!putRes.ok) {
      // 409 usually means two quotes were saved at the same moment; the user can try again
      return res.status(502).json({ error: 'Could not save quote' });
    }

    return res.status(201).json({ ok: true, count: quotes.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

