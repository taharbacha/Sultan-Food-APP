import { ImageResponse } from '@vercel/og';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TEAL = '#12A9B3';
const W = 1080, H = 1920, PH = 1240;

const rd = (p) => fs.readFileSync(path.join(ROOT, p));
let FONTS;
function fonts() {
  if (!FONTS) FONTS = [
    { name: 'Anton', data: rd('fonts/anton-latin-400-normal.woff'), weight: 400 },
    { name: 'Oswald', data: rd('fonts/oswald-latin-600-normal.woff'), weight: 600 },
    { name: 'Oswald', data: rd('fonts/oswald-latin-700-normal.woff'), weight: 700 },
    { name: 'Oswald', data: rd('fonts/oswald-latin-ext-700-normal.woff'), weight: 700 },
  ];
  return FONTS;
}

const clean = (v) => String(v).replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/\s+$/,'');
const PHONE_ICON = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40"><path fill="#fff" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>').toString('base64');
const h = (type, style, ...children) => ({
  type,
  props: { style: { display: 'flex', ...style }, children: children.flat().filter((c) => c !== null && c !== undefined && c !== false && c !== '') },
});
const img = (src, style) => ({ type: 'img', props: { src, style } });

async function loadPhoto(spec) {
  const p = String(spec.photo || '');
  let buf;
  if (/^https?:\/\//.test(p)) {
    const r = await fetch(p);
    if (!r.ok) throw new Error('photo download failed: ' + r.status);
    buf = Buffer.from(await r.arrayBuffer());
  } else {
    const safe = p.replace(/[^a-z0-9_\/-]/gi, '');
    buf = rd('photos/' + safe + '.jpg');
  }
  // crop: zoom >= 1, focus point fx, fy in 0..1
  const zoom = Math.max(1, Math.min(3, Number(spec.zoom) || 1));
  const fx = Math.max(0, Math.min(1, spec.fx === undefined ? 0.5 : Number(spec.fx)));
  const fy = Math.max(0, Math.min(1, spec.fy === undefined ? 0.5 : Number(spec.fy)));
  const meta = await sharp(buf).metadata();
  const scale = Math.max(W / meta.width, PH / meta.height) * zoom;
  const sw = Math.round(meta.width * scale), sh = Math.round(meta.height * scale);
  const left = Math.round((sw - W) * fx), top = Math.round((sh - PH) * fy);
  const out = await sharp(buf).rotate().resize(sw, sh).extract({ left, top, width: W, height: PH }).jpeg({ quality: 88 }).toBuffer();
  return 'data:image/jpeg;base64,' + out.toString('base64');
}

const curve = 'data:image/svg+xml;base64,' + Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H - 1080}" viewBox="0 0 ${W} ${H - 1080}"><path d="M0,120 Q540,-60 ${W},120 L${W},${H - 1080} L0,${H - 1080} Z" fill="${TEAL}"/></svg>`
).toString('base64');

function titleSize(t) {
  const longest = Math.max(...String(t).split('\n').map((s) => s.length));
  if (longest <= 9) return 128;
  if (longest <= 13) return 108;
  if (longest <= 17) return 92;
  return 76;
}

export async function renderStory(spec) {
  const photo = await loadPhoto(spec);
  const logo = 'data:image/png;base64,' + rd('assets/logo_white.png').toString('base64');
  const branch = spec.branch_label || 'BAB EZZOUAR';
  const phone = spec.phone || '0542 36 02 33';
  const chips = Array.isArray(spec.chips) ? spec.chips.slice(0, 5) : [];
  const footer = spec.footer !== false;
  const title = clean(spec.title || '');

  const textBlock = h('div', { position: 'absolute', left: 60, right: 60, top: 1150, height: 560, justifyContent: 'center', flexDirection: 'column', alignItems: 'center', textAlign: 'center', color: '#fff' },
    spec.kicker ? h('div', { fontFamily: 'Oswald', fontWeight: 600, fontSize: 36, letterSpacing: 6, textTransform: 'uppercase', opacity: 0.92 }, clean(spec.kicker)) : null,
    title ? h('div', { fontFamily: 'Anton', fontSize: titleSize(title), lineHeight: 1.02, textTransform: 'uppercase', marginTop: 6, flexDirection: 'column', alignItems: 'center' },
      ...title.split('\n').map((l) => h('div', {}, l))) : null,
    spec.text ? h('div', { fontFamily: 'Oswald', fontWeight: 600, fontSize: 44, marginTop: 10, lineHeight: 1.3, justifyContent: 'center' }, clean(spec.text)) : null,
    chips.length ? h('div', { flexWrap: 'wrap', justifyContent: 'center', marginTop: 14 },
      ...chips.map((c) => h('div', { fontFamily: 'Oswald', fontWeight: 700, fontSize: 34, background: '#fff', color: TEAL, padding: '6px 24px', borderRadius: 50, margin: 6 }, clean(c)))) : null,
    spec.price ? h('div', { marginTop: 18, background: '#fff', color: TEAL, fontFamily: 'Anton', fontSize: 70, padding: '6px 44px', borderRadius: 80, alignItems: 'baseline' },
      spec.price_prefix ? h('span', { fontSize: 44, marginRight: 12 }, String(spec.price_prefix)) : null,
      String(spec.price),
      h('span', { fontSize: 44, marginLeft: 12 }, 'DA')) : null,
    spec.sub ? h('div', { fontFamily: 'Oswald', fontWeight: 600, fontSize: 34, marginTop: 14, opacity: 0.95 }, clean(spec.sub)) : null,
  );

  const root = h('div', { width: W, height: H, position: 'relative', background: TEAL, fontFamily: 'Oswald' },
    img(photo, { position: 'absolute', left: 0, top: 0, width: W, height: PH }),
    h('div', { position: 'absolute', left: 0, top: 0, width: W, height: 440, backgroundImage: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0))' }),
    img(curve, { position: 'absolute', left: 0, top: 1080, width: W, height: H - 1080 }),
    img(logo, { position: 'absolute', top: 190, left: 70, width: 300 }),
    h('div', { position: 'absolute', top: 222, right: 70, fontFamily: 'Oswald', fontWeight: 700, fontSize: 34, letterSpacing: 2, padding: '10px 26px', border: '3px solid #fff', borderRadius: 60, color: '#fff' }, branch),
    spec.sticker_big ? h('div', { position: 'absolute', right: 60, top: 900, width: 250, height: 250, borderRadius: 125, background: '#FF6B1A', color: '#fff', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-12deg)', fontFamily: 'Anton', fontSize: 60, lineHeight: 1, textAlign: 'center' },
      h('div', {}, clean(spec.sticker_big)),
      spec.sticker_small ? h('div', { fontFamily: 'Oswald', fontWeight: 700, fontSize: 32, marginTop: 4 }, clean(spec.sticker_small)) : null) : null,
    textBlock,
    footer ? h('div', { position: 'absolute', left: 0, right: 0, bottom: 160, justifyContent: 'center' },
      h('div', { fontFamily: 'Oswald', fontWeight: 700, fontSize: 40, letterSpacing: 2, color: '#fff', background: 'rgba(0,0,0,0.18)', padding: '12px 34px', borderRadius: 60, alignItems: 'center' }, img(PHONE_ICON, { width: 38, height: 38, marginRight: 14 }), `${phone} · Livraison dispo`)) : null,
  );

  const res = new ImageResponse(root, { width: W, height: H, fonts: fonts() });
  const png = Buffer.from(await res.arrayBuffer());
  return sharp(png).flatten({ background: TEAL }).jpeg({ quality: 90 }).toBuffer();
}

export function decodeSpec(d) {
  return JSON.parse(Buffer.from(String(d), 'base64url').toString('utf8'));
}
