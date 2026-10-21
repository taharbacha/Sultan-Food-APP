import { renderStory, decodeSpec } from '../lib/render.mjs';

const KEY = 'sultan7Kq2';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    let spec;
    if (req.method === 'POST') {
      spec = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else {
      if (url.searchParams.get('k') !== KEY) return res.status(403).send('forbidden');
      spec = decodeSpec(url.searchParams.get('d') || '');
    }
    if (req.method === 'POST' && (spec.k !== KEY)) return res.status(403).send('forbidden');
    const jpg = await renderStory(spec);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.status(200).send(jpg);
  } catch (e) {
    res.status(400).json({ error: String(e && e.message || e) });
  }
}
