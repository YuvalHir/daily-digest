import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('lead skips only charts already covered by the edition hero', async () => {
  const card = await readFile('src/components/NewsCard.astro', 'utf8'),
    page = await readFile('src/pages/[...path].astro', 'utf8');
  assert.ok(card.includes('!heroSymbols.includes(symbol)'));
  assert.ok(page.includes('heroSymbols='));
});
test('source label names the linked account without merging it with the reported outlet', async () => {
  const d = JSON.parse(await readFile('public/data/2026-11-13/2136-mid.json'));
  const lead = d.items[0];
  assert.equal(
    lead.secondarySources.find((x) => x.url.includes('/StockMKTNewz/')).name,
    '@StockMKTNewz',
  );
  assert.ok(lead.summary.en.includes('CNBC'));
});

test('section count follows the cards rendered below, and separately links its lead', async () => {
  const page = await readFile('src/pages/[...path].astro', 'utf8');
  assert.ok(page.includes('stories.length ||'));
  assert.ok(page.includes('section-lead-link'));
  assert.ok(
    !page.includes('edition.items.filter((i) => i.section === section).length'),
  );
});
