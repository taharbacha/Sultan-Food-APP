import { renderStory } from './lib/render.mjs';
import fs from 'node:fs';
const specs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let i = 0;
for (const s of specs) {
  i++;
  const t = Date.now();
  const buf = await renderStory(s);
  fs.writeFileSync(`out_${i}.jpg`, buf);
  console.log(i, buf.length, Date.now() - t, 'ms');
}
