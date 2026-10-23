import { ImageResponse } from '@vercel/og';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

// Contact sheet: many small photos with their key on one image, so the AI can SEE every photo cheaply.
// POST { k, items: [{ key, src }] }   src = https URL (supabase / drive) or a local photo id like "babezzouar/p13"
const KEY = 'sultan7Kq2';
const ROOT = process.cwd();
const OK_HOSTS = /(^|\.)supabase\.co$|(^|\.)googleusercontent\.com$|(^|\.)google\.com$/;
const CELL = 200, LABEL = 40, COLS = 8;
let FONT;

async function thumb(src) {
  let buf;
  if (/^https?:\/\//.test(src)) {
    const u = new URL(src);
    if (!OK_HOSTS.test(u.hostname)) throw new Error('host not allowed');
    const r = await fetch(src);
    if (!r.ok) throw new Error('fetch ' + r.status);
    buf = Buffer.from(await r.arrayBuffer());
  } else {
    buf = fs.readFileSync(path.join(ROOT, 'photos', String(src).replace(/[^a-z0-9_\/-]/gi, '') + '.jpg'));
  }
  const out = await sharp(buf).rotate().resize(CELL, CELL, { fit: 'cover' }).jpeg({ quality: 70 }).toBuffer();
  return 'data:image/jpeg;base64,' + out.toString('base64');
}

export default async function handler(req, res) {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (body.k !== KEY) return res.status(403).send('forbidden');
    const items = (body.items || []).slice(0, 64);
    const thumbs = await Promise.all(items.map((it) => thumb(it.src).catch(() => null)));
    if (!FONT) FONT = fs.readFileSync(path.join(ROOT, 'fonts/oswald-latin-700-normal.woff'));
    const rows = Math.ceil(items.length / COLS) || 1;
    const W = COLS * CELL, H = rows * (CELL + LABEL);
    const cells = items.map((it, i) => ({
      type: 'div',
      props: {
        style: { position: 'absolute', left: (i % COLS) * CELL, top: Math.floor(i / COLS) * (CELL + LABEL), width: CELL, height: CELL + LABEL, display: 'flex', flexDirection: 'column', background: '#222' },
        children: [
          thumbs[i] ? { type: 'img', props: { src: thumbs[i], style: { width: CELL, height: CELL } } }
                    : { type: 'div', props: { style: { width: CELL, height: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f66', fontSize: 22 }, children: 'NO IMAGE' } },
          { type: 'div', props: { style: { height: LABEL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontFamily: 'Oswald', background: '#12A9B3', borderTop: '2px solid #fff' }, children: String(it.key) } }
        ]
      }
    }));
    const root = { type: 'div', props: { style: { width: W, height: H, position: 'relative', display: 'flex', background: '#111' }, children: cells } };
    const png = Buffer.from(await new ImageResponse(root, { width: W, height: H, fonts: [{ name: 'Oswald', data: FONT, weight: 700 }] }).arrayBuffer());
    const jpg = await sharp(png).jpeg({ quality: 78 }).toBuffer();
    res.setHeader('Content-Type', 'image/jpeg');
    res.status(200).send(jpg);
  } catch (e) {
    res.status(400).json({ error: String((e && e.message) || e) });
  }
}
