import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { DigestEdition } from './schema.mjs';
export async function buildIndex(root = resolve('public/data')) {
  let removed = [];
  try {
    removed = JSON.parse(
      await readFile(join(root, 'removed-posts.json'), 'utf8'),
    );
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const days = [],
    numbers = new Set();
  for (const date of (await readdir(root)).filter((d) =>
    /^\d{4}-\d{2}-\d{2}$/.test(d),
  )) {
    if (!(await stat(join(root, date))).isDirectory()) continue;
    const editions = [];
    for (const file of (await readdir(join(root, date))).filter((f) =>
      f.endsWith('.json'),
    )) {
      const path = join(root, date, file);
      const raw = await readFile(path, 'utf8');
      if (raw.length > 2_000_000) throw new Error(`${path}: file too large`);
      const result = DigestEdition.safeParse(JSON.parse(raw));
      if (!result.success) throw new Error(`${path}: ${result.error.message}`);
      const ed = result.data;
      if (
        ed.items.some(
          (item) => item.socialPost && removed.includes(item.socialPost.id),
        )
      )
        throw new Error(`${path}: removed social post cannot be republished`);
      if (ed.date !== date || ed.editionSlug !== file.slice(0, -5))
        throw new Error(`${path}: date or slug mismatch`);
      if (numbers.has(ed.editionNumber))
        throw new Error(`Duplicate edition number ${ed.editionNumber}`);
      numbers.add(ed.editionNumber);
      const lead = ed.items.find((i) => i.isLead) || ed.items[0];
      editions.push({
        slug: ed.editionSlug,
        editionType: ed.editionType,
        editionNumber: ed.editionNumber,
        publishedAt: ed.publishedAt,
        headlinePreview: Object.fromEntries(
          Object.entries(lead.headline).map(([lang, text]) => [
            lang,
            text.replace(/\{\{move:([+-]\d+(?:\.\d+)?%)\}\}/g, '$1'),
          ]),
        ),
        itemCount: ed.items.length,
      });
    }
    if (!editions.length) continue;
    editions.sort(
      (a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt),
    );
    days.push({
      date,
      latestEditionSlug: editions.at(-1).slug,
      editionCount: editions.length,
      editions,
    });
  }
  days.sort((a, b) => b.date.localeCompare(a.date));
  if (!days.length) throw new Error('No valid editions found');
  const index = {
    generatedAt: new Date().toISOString(),
    latestDate: days[0].date,
    latestEditionSlug: days[0].latestEditionSlug,
    days,
  };
  await writeFile(
    join(root, 'index.json'),
    JSON.stringify(index, null, 2) + '\n',
  );
  console.log(
    `Validated ${numbers.size} edition(s) across ${days.length} day(s).`,
  );
  return index;
}
if (process.argv[1] === new URL(import.meta.url).pathname) await buildIndex();
