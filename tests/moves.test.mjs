import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('historical moves keep explicit signs in both languages, not non-price percentages', async () => {
  const d = JSON.parse(
    await readFile('public/data/2026-11-13/1715-open.json', 'utf8'),
  );
  const get = (id) => d.items.find((x) => x.id === id);
  for (const locale of ['he', 'en']) {
    for (const move of ['-0.67%', '-1%', '-0.08%'])
      assert.ok(
        get('wall-street-reversal').summary[locale].includes(
          '{{move:' + move + '}}',
        ),
      );
    assert.ok(
      get('microsoft-outage').summary[locale].includes('{{move:-2.2%}}'),
    );
    assert.ok(
      get('amd-nvidia-gap').summary[locale].includes('{{move:+44.7%}}'),
    );
    assert.ok(get('amd-nvidia-gap').summary[locale].includes('{{move:-8.5%}}'));
  }
  for (const id of ['ppi-inflation', 'goolsbee-inflation', 'goldman-outlook'])
    assert.ok(!JSON.stringify(get(id)).includes('{{move:'));
});
test('text metadata and accessible link names use plain move text', async () => {
  const card = await readFile('src/components/NewsCard.astro', 'utf8');
  assert.ok(card.includes('plainMoves(item.headline[locale])'));
  assert.ok(!card.includes('$<MoveText'));
  const metadata = await readFile('src/layouts/BaseLayout.astro', 'utf8');
  assert.ok(metadata.includes('plainMoves'));
  const indexer = await readFile('scripts/build-index.mjs', 'utf8');
  assert.ok(indexer.includes('move:'));
});

test('lead hero follows explicitly sourcedNasdaq100, not fixed stock defaults', async () => {
  const d = JSON.parse(
    await readFile('public/data/2026-11-13/1715-open.json', 'utf8'),
  );
  assert.equal(d.heroCharts[0].symbol, '^NDX');
  assert.equal(d.heroCharts.length, 1);
  assert.match(d.items[0].source.url, /2121256081842479517$/);
  const chart = await readFile('src/components/MarketChart.astro', 'utf8');
  assert.ok(!chart.includes("let symbol = 'NASDAQ:NVDA'"));
  const client = await readFile('src/lib/market-client.ts', 'utf8');
  assert.ok(!client.includes("range === '1d' ? ''"));
});
