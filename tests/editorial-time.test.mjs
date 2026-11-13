import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  validTimeRef,
  displayEventTime,
  plainEditorial,
} from '../src/lib/editorial-time.mjs';
import { DigestItem } from '../scripts/schema.mjs';
test('offset and named source timezone agree across winter and DST', () => {
  assert.ok(!validTimeRef({ at: '2026-02-30T10:00:00Z', timeZone: 'UTC' }));
  assert.ok(
    !validTimeRef({ at: '2026-11-13T10:00:00-05:00', timeZone: 'EST' }),
  );
  assert.ok(
    validTimeRef({
      at: '2026-11-13T16:57:00+02:00',
      timeZone: 'Asia/Jerusalem',
    }),
  );
  assert.ok(
    validTimeRef({
      at: '2026-07-13T16:57:00+03:00',
      timeZone: 'Asia/Jerusalem',
    }),
  );
  assert.ok(
    !validTimeRef({
      at: '2026-07-13T16:57:00+02:00',
      timeZone: 'Asia/Jerusalem',
    }),
  );
  assert.ok(
    !validTimeRef({ at: '2026-11-13T16:57:00', timeZone: 'Asia/Jerusalem' }),
  );
  assert.ok(
    !validTimeRef({ at: '2026-11-13T16:57:00+02:00', timeZone: 'made-up' }),
  );
});
test('same instant renders in browser zone, shows local date on date crossing', () => {
  const r = { at: '2026-11-13T00:30:00+02:00', timeZone: 'Asia/Jerusalem' };
  assert.equal(displayEventTime(r, 'en-GB', 'Asia/Jerusalem'), '00:30');
  assert.match(
    displayEventTime(r, 'en-GB', 'America/New_York'),
    /12\/11\/2026.*17:30/,
  );
  assert.match(
    displayEventTime(
      { at: '2026-03-29T01:30:00+00:00' },
      'en-GB',
      'Europe/London',
    ),
    /02:30/,
  );
});
test('only explicit references are converted; duration and unmarked text stay intact', () => {
  assert.equal(
    plainEditorial('16 hours, at {{time:report}}, {{move:-1%}}', {
      report: { at: '2026-11-13T16:57:00+02:00' },
    }),
    '16 hours, at 2026-11-13 14:57 UTC, -1%',
  );
});
test('schema rejects missing time references and offsets with wrong DST', async () => {
  const d = JSON.parse(await readFile('public/data/2026-11-13/1715-open.json'));
  const i = structuredClone(d.items[0]);
  assert.ok(DigestItem.safeParse(i).success);
  delete i.timeRefs;
  assert.ok(!DigestItem.safeParse(i).success);
  i.timeRefs = {
    'first-squawk': {
      at: '2026-07-13T16:57:00+02:00',
      timeZone: 'Asia/Jerusalem',
    },
  };
  assert.ok(!DigestItem.safeParse(i).success);
});
