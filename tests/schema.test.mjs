import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DigestEdition } from '../scripts/schema.mjs';
import { buildIndex } from '../scripts/build-index.mjs';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const text = { he: 'כותרת בדיקה', en: 'Test headline' };
const fixture = () =>
  structuredClone({
    schemaVersion: '2.0',
    date: '2026-11-13',
    editionSlug: '1715-open',
    editionType: 'open',
    editionNumber: 1,
    publishedAt: '2026-11-13T17:15:00+02:00',
    editorialLead: text,
    marketRibbon: [],
    items: [
      {
        id: 'test',
        section: 'tech',
        isLead: true,
        kicker: text,
        headline: text,
        summary: text,
        source: { name: 'Source', url: 'https://example.com/story' },
        priority: 1,
      },
    ],
  });
test('accepts a bilingual edition with unavailable market data', () =>
  assert.equal(DigestEdition.safeParse(fixture()).success, true));
test('rejects missing translations', () => {
  const d = fixture();
  d.items[0].headline.en = '';
  assert.equal(DigestEdition.safeParse(d).success, false);
});
test('rejects Hebrew masquerading as English', () => {
  const d = fixture();
  d.items[0].headline.en = 'כותרת';
  assert.equal(DigestEdition.safeParse(d).success, false);
});
test('rejects mismatched type, time, date, duplicate IDs and unknown keys', () => {
  for (const mutate of [
    (d) => (d.editionType = 'mid'),
    (d) => (d.editionSlug = '1800-open'),
    (d) => (d.date = '2026-11-12'),
    (d) => d.items.push(d.items[0]),
    (d) => (d.secret = 'bad'),
  ]) {
    const d = fixture();
    mutate(d);
    assert.equal(DigestEdition.safeParse(d).success, false);
  }
});
test('rejects unsafe source links', () => {
  const d = fixture();
  d.items[0].source.url = 'javascript:alert(1)';
  assert.equal(DigestEdition.safeParse(d).success, false);
});
test('rejects remote tweet media', () => {
  const d = fixture();
  d.items[0].tweets = [
    {
      id: '1',
      authorName: 'Source',
      authorHandle: 'source',
      text,
      timestamp: '17:15 IST',
      url: 'https://x.com/source/status/1',
      media: {
        type: 'image',
        url: 'https://pbs.twimg.com/image.jpg',
        alt: text,
      },
    },
  ];
  assert.equal(DigestEdition.safeParse(d).success, false);
});
test('accepts SVG chart data, rejects one-point and non-finite series', () => {
  const d = fixture();
  d.marketRibbon = [
    {
      symbol: 'TEST',
      name: 'Test',
      price: 10,
      currency: 'USD',
      changePercent: -1,
      sparkline: { timeframe: '14D', points: [9, 10] },
    },
  ];
  assert.equal(DigestEdition.safeParse(d).success, true);
  d.marketRibbon[0].sparkline.points = [10];
  assert.equal(DigestEdition.safeParse(d).success, false);
  d.marketRibbon[0].sparkline.points = [1, NaN];
  assert.equal(DigestEdition.safeParse(d).success, false);
});
test('index orders dates descending and editions chronologically', async () => {
  const root = await mkdtemp(join(tmpdir(), 'digest-test-'));
  try {
    for (const [date, slug, num] of [
      ['2026-11-13', '1715-open', 1],
      ['2026-11-13', '2000-mid', 2],
      ['2026-11-12', '2345-close', 3],
    ]) {
      await mkdir(join(root, date), { recursive: true });
      const d = fixture();
      Object.assign(d, {
        date,
        editionSlug: slug,
        editionType: slug.split('-')[1],
        editionNumber: num,
        publishedAt: `${date}T${slug.slice(0, 2)}:${slug.slice(2, 4)}:00+02:00`,
      });
      await writeFile(join(root, date, slug + '.json'), JSON.stringify(d));
    }
    const x = await buildIndex(root);
    assert.equal(x.latestDate, '2026-11-13');
    assert.equal(x.latestEditionSlug, '2000-mid');
    assert.deepEqual(
      x.days[0].editions.map((e) => e.slug),
      ['1715-open', '2000-mid'],
    );
    assert.equal(
      JSON.parse(await readFile(join(root, 'index.json'), 'utf8')).days.length,
      2,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('index rejects file and payload slug mismatch', async () => {
  const root = await mkdtemp(join(tmpdir(), 'digest-test-'));
  try {
    await mkdir(join(root, '2026-11-13'));
    await writeFile(
      join(root, '2026-11-13', '1800-open.json'),
      JSON.stringify(fixture()),
    );
    await assert.rejects(buildIndex(root), /mismatch/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('official social embeds accept only matching ID and URL', () => {
  const d = fixture();
  d.items[0].socialPost = { id: '20', url: 'https://x.com/jack/status/20' };
  assert.equal(DigestEdition.safeParse(d).success, true);
  for (const value of [
    { id: '21', url: 'https://x.com/jack/status/20' },
    { id: '20', url: 'https://x.com/jack/status/20', text: 'copied text' },
    { id: '20', url: 'https://evil.example/status/20' },
  ]) {
    d.items[0].socialPost = value;
    assert.equal(DigestEdition.safeParse(d).success, false);
  }
});
test('remove-post removes all editions and build prevents reintroduction', async () => {
  const { removePost } = await import('../scripts/remove-post.mjs');
  const root = await mkdtemp(join(tmpdir(), 'digest-remove-'));
  try {
    await mkdir(join(root, '2026-11-13'));
    const path = join(root, '2026-11-13/1715-open.json'),
      d = fixture();
    d.items[0].socialPost = { id: '20', url: 'https://x.com/jack/status/20' };
    await writeFile(path, JSON.stringify(d));
    assert.equal(await removePost('20', root), 1);
    assert.equal(
      JSON.parse(await readFile(path)).items[0].socialPost,
      undefined,
    );
    await buildIndex(root);
    await writeFile(path, JSON.stringify(d));
    await assert.rejects(buildIndex(root), /removed social post/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
