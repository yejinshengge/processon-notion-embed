import { createHash } from 'node:crypto';
import { readdir, readFile, mkdir, rm, cp, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));

export async function buildSite({ source = resolve(root, 'site'), output = resolve(root, 'dist') } = {}) {
  if (resolve(output) === resolve(source) || resolve(output) === root) throw new Error('Build output must be separate from source');
  const names = (await readdir(source)).sort();
  const hash = createHash('sha256');
  for (const name of names) hash.update(name).update(await readFile(resolve(source, name)));
  const version = hash.digest('hex').slice(0, 16);
  // Only the generated output is replaced; source files remain editable.
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(source, output, { recursive: true });
  const html = (await readFile(resolve(output, 'index.html'), 'utf8'))
    .replaceAll('./app.js', `./app.js?v=${version}`)
    .replaceAll('./styles.css', `./styles.css?v=${version}`)
    .replaceAll('./favicon.svg', `./favicon.svg?v=${version}`);
  const app = (await readFile(resolve(output, 'app.js'), 'utf8'))
    .replace("'./core.js'", `'./core.js?v=${version}'`);
  await writeFile(resolve(output, 'index.html'), html);
  await writeFile(resolve(output, 'app.js'), app);
  return { version, output };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { version } = await buildSite();
  console.log(`Static site ready: dist (assets ${version})`);
}
