import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  image: { type: 'string' }, annotation: { type: 'string' }, output: { type: 'string' },
  browser: { type: 'string' },
  review: { type: 'string' },
} });
assert.ok(values.image && values.annotation && values.output, 'Explicit image, annotation and new output directory required');
const original = readFileSync(values.image);
const sha256 = createHash('sha256').update(original).digest('hex');
const { validateSceneAnnotation90, applySceneReview90 } = await import('./matchrim-scene-evidence90.ts');
const annotationBytes = readFileSync(values.annotation);
let annotation = validateSceneAnnotation90(JSON.parse(String(annotationBytes)));
if (values.review) annotation = applySceneReview90(annotation, JSON.parse(readFileSync(values.review, 'utf8')),
  createHash('sha256').update(annotationBytes).digest('hex'));
assert.equal(annotation.fixture.sha256, sha256, 'Never bind another scene to these slots');
const output = resolve(values.output);
assert.ok(!existsSync(output), 'Preserve previous evidence');
mkdirSync(output, { recursive: true, mode: 0o700 });
const { chromium } = await import(process.env.MATCHRIM_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: values.browser });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
let externalRequests = 0;
await page.route('**/*', async (route) => { externalRequests += 1; await route.abort(); });
try {
  await page.setContent('<!doctype html><html lang="en"><title>Pixel annotation review</title><body></body></html>');
  const sheets = [];
  for (const shelf of [...new Set(annotation.slots.map((slot) => slot.shelf))]) {
    const slots = annotation.slots.filter((slot) => slot.shelf === shelf);
    for (let start = 0; start < slots.length; start += 6) {
      const subset = slots.slice(start, start + 6);
      await page.evaluate(async ({ data, slots, fixture }) => {
        const image = new Image(); image.src = data; await image.decode();
        if (image.naturalWidth !== fixture.width || image.naturalHeight !== fixture.height) throw Error('Original pixel dimensions changed');
        document.body.replaceChildren();
        Object.assign(document.body.style, { margin: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', fontFamily: 'system-ui', background: '#eceff1' });
        for (const slot of slots) {
          const section = document.createElement('section');
          section.style.minWidth = '0';
          const heading = document.createElement('h2'); heading.textContent = slot.id;
          const source = document.createElement('p'); source.textContent = JSON.stringify(slot.label_box_px);
          Object.assign(source.style, { overflowWrap: 'anywhere', fontSize: '12px' });
          const canvas = document.createElement('canvas');
          const { x, y, width, height } = slot.label_box_px;
          if (![x, y, width, height].every(Number.isInteger) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > image.naturalWidth || y + height > image.naturalHeight) throw Error('Invalid slot bounds');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(image, x, y, width, height, 0, 0, width, height);
          Object.assign(canvas.style, { width: '100%', height: '360px', objectFit: 'contain', background: '#ffffff' });
          const text = document.createElement('p'); text.textContent = slot.literal_lines.join(' | ') || 'Unreadable / not yet transcribed';
          section.append(heading, source, canvas, text); document.body.append(section);
        }
      }, { data: `data:image/jpeg;base64,${original.toString('base64')}`, slots: subset, fixture: annotation.fixture });
      const name = `${shelf}-${start + 1}.png`;
      await page.screenshot({ path: join(output, name), fullPage: true });
      sheets.push({ shelf, slots: subset.map((slot) => slot.id), image: name });
    }
  }
  assert.equal(externalRequests, 0, 'No remote image/model/catalog traffic');
  writeFileSync(join(output, 'receipt.json'), JSON.stringify({ sourceSha256: sha256,
    annotationSha256: createHash('sha256').update(readFileSync(values.annotation)).digest('hex'),
    reviewSha256: values.review ? createHash('sha256').update(readFileSync(values.review)).digest('hex') : null,
    sheets, externalRequests, scope: 'Actual original pixels through Canvas; diagnostic magnification does not add legibility or independent human approval' }, null, 2));
  console.log(JSON.stringify({ sheets: sheets.length, slots: annotation.slots.length, sourceSha256: sha256, externalRequests }));
} finally { await browser.close(); }
