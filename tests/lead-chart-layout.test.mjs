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
test('stock panel groups a clear symbol, price and large daily change without vague quote label', async () => {
  const panel = await readFile('src/components/MarketChart.astro', 'utf8');
  assert.ok(panel.includes('data-main-symbol'));
  assert.ok(panel.includes('market-daily-change'));
  assert.ok(panel.includes('data-main-change-label'));
  assert.ok(!panel.includes('Latest quote'));
  assert.ok(!panel.includes('ציטוט אחרון'));
});
test('range controls follow the plot while quote identity and price retain RTL treatment', async () => {
  const panel = await readFile('src/components/MarketChart.astro', 'utf8');
  const css = await readFile('src/styles/global.css', 'utf8');
  assert.ok(
    panel.indexOf('class="native-ranges"') > panel.indexOf('data-main-svg'),
  );
  assert.ok(css.includes(".market-desk[data-lang='he'] .native-ranges"));
  assert.ok(css.includes(".market-desk[data-lang='he'] .native-main-head"));
});
test('edition panel rotates configured stocks without a manual stock selector', async () => {
  const panel = await readFile('src/components/MarketChart.astro', 'utf8');
  assert.ok(!panel.includes('data-chart-symbol'));
  assert.ok(!panel.includes('class="chart-tabs"'));
  assert.ok(panel.includes('data-assets={JSON.stringify(assets)}'));
  assert.ok(panel.includes('cachedQuote(a[0], range)'));
  assert.ok(panel.includes('8000'));
});
