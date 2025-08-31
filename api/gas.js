module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const gasUrlBase = process.env.GAS_API_URL;
  if (!gasUrlBase) {
    console.error('Missing env GAS_API_URL');
    return res.status(500).json({ error: 'Missing environment variable: GAS_API_URL' });
  }

  try {
    const query = new URLSearchParams(req.query || {});
    const gasUrl = query.size > 0
      ? `${gasUrlBase}${gasUrlBase.includes('?') ? '&' : '?'}${query.toString()}`
      : gasUrlBase;

    const gasRes = await fetch(gasUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!gasRes.ok) {
      const bodyText = await gasRes.text();
      console.error('GAS bad response', gasRes.status, bodyText);
      return res.status(502).json({ error: 'Bad response from GAS', status: gasRes.status, body: bodyText });
    }

    const contentType = (gasRes.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      const bodyText = await gasRes.text();
      const looksLikeHtml = /^\s*<!doctype html|<html/i.test(bodyText);
      const redirectedToLogin = /accounts\.google\.com|ServiceLogin/i.test(gasRes.url) || looksLikeHtml;
      return res.status(502).json({
        error: 'Non-JSON response from GAS',
        hint: redirectedToLogin ? 'GASが未公開/認証必須の可能性。ウェブアプリを「全員（匿名）」に公開し、JSONを返すよう設定してください。' : undefined,
        contentType,
        url: gasRes.url,
        bodySnippet: bodyText.slice(0, 500)
      });
    }

    const json = await gasRes.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(json);
  } catch (err) {
    console.error('Fetch failed', err);
    return res.status(500).json({ error: 'Fetch failed', message: err?.message || String(err) });
  }
};


