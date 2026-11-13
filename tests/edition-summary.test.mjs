import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DigestEdition } from '../scripts/schema.mjs';
const edition = JSON.parse(
  await readFile('public/data/2026-11-13/2136-mid.json'),
);
test('top summary is bilingual, optional for archives, and schema validated', () => {
  assert.equal(DigestEdition.safeParse(edition).success, true);
  assert.equal(
    DigestEdition.safeParse({
      ...edition,
      topSummary: { he: 'טקסט בדיקה', en: 'Test summary' },
    }).success,
    true,
  );
  assert.equal(
    DigestEdition.safeParse({ ...edition, topSummary: { he: 'טקסט בדיקה' } })
      .success,
    false,
  );
  assert.equal(
    DigestEdition.safeParse({
      ...edition,
      topSummary: { he: '', en: 'Test summary' },
    }).success,
    false,
  );
});
test('masthead uses edition editorial summary rather than a global slogan or guessed lead fallback', async () => {
  const masthead = await readFile('src/components/Masthead.astro', 'utf8');
  assert.ok(masthead.includes('edition.topSummary?.[locale]'));
  assert.ok(!masthead.includes('{t.tagline}'));
  assert.ok(!masthead.includes('editorialLead'));
});
