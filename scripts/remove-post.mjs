import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
export async function removePost(id, root = resolve('public/data')) {
  if (!/^\d+$/.test(id || '')) throw new Error('Pass the numeric X post ID');
  const path = join(root, 'removed-posts.json');
  let removed = [];
  try {
    removed = JSON.parse(await readFile(path, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  let changed = 0;
  for (const date of (await readdir(root)).filter((d) =>
    /^\d{4}-\d{2}-\d{2}$/.test(d),
  )) {
    for (const file of (await readdir(join(root, date))).filter((f) =>
      f.endsWith('.json'),
    )) {
      const path = join(root, date, file),
        edition = JSON.parse(await readFile(path, 'utf8'));
      let dirty = false;
      for (const item of edition.items) {
        if (item.socialPost?.id === id) {
          delete item.socialPost;
          dirty = true;
          changed++;
        }
      }
      if (dirty) await writeFile(path, JSON.stringify(edition, null, 2) + '\n');
    }
  }
  if (!removed.includes(id)) removed.push(id);
  await writeFile(path, JSON.stringify(removed, null, 2) + '\n');
  return changed;
}
if (process.argv[1] === new URL(import.meta.url).pathname)
  console.log(
    `Removed ${await removePost(process.argv[2])} embed reference(s). Build and deploy to make this live.`,
  );
