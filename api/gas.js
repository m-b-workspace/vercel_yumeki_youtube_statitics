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

    const gasRes = await fetch(gasUrl, { method: 'GET' });
    if (!gasRes.ok) {
      const bodyText = await gasRes.text();
      console.error('GAS bad response', gasRes.status, bodyText);
      return res.status(502).json({ error: 'Bad response from GAS', status: gasRes.status, body: bodyText });
    }

    const json = await gasRes.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(json);
  } catch (err) {
    console.error('Fetch failed', err);
    return res.status(500).json({ error: 'Fetch failed', message: err?.message || String(err) });
  }
};


