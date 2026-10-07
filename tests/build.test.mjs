import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite } from '../scripts/build.mjs';

test('发布构建给所有入口和模块添加相同版本，代码更新后改变资源 URL', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'graph-bridge-build-'));
  try {
    const source = join(temporary, 'source');
    const output = join(temporary, 'output');
    await cp(new URL('../site/', import.meta.url), source, { recursive: true });
    const first = await buildSite({ source, output });
    const html = await readFile(join(output, 'index.html'), 'utf8');
    const app = await readFile(join(output, 'app.js'), 'utf8');
    assert.match(html, new RegExp(`src="\\./app\\.js\\?v=${first.version}"`));
    assert.match(html, new RegExp(`href="\\./styles\\.css\\?v=${first.version}"`));
    assert.ok(app.includes(`'./core.js?v=${first.version}'`));
    assert.doesNotMatch(html, /tests\/|__test__/);
    assert.deepEqual((await readdir(output)).sort(), (await readdir(source)).sort());
    assert.ok(!(await readFile(join(source, 'index.html'), 'utf8')).includes('?v='));
    const core = await readFile(join(source, 'core.js'), 'utf8');
    await writeFile(join(source, 'core.js'), `${core}\n// Changed module for cache invalidation test\n`);
    const second = await buildSite({ source, output });
    assert.notEqual(second.version, first.version);
    assert.ok((await readFile(join(output, 'app.js'), 'utf8')).includes(`'./core.js?v=${second.version}'`));
    assert.ok((await readFile(join(output, 'index.html'), 'utf8')).includes(`./app.js?v=${second.version}`));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
