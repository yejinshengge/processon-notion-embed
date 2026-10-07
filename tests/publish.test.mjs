import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const site = new URL('../site/', import.meta.url);

test('发布内容仅包含正式静态页面，不含测试模式或服务端凭证', async () => {
  assert.deepEqual((await readdir(site)).sort(), ['.nojekyll', 'app.js', 'core.js', 'favicon.svg', 'index.html', 'styles.css']);
  const files = await Promise.all(['app.js', 'core.js', 'index.html'].map(name => readFile(new URL(name, site), 'utf8')));
  for (const source of files) {
    assert.doesNotMatch(source, /(?:localStorage|sessionStorage)\s*(?:\.|\[)/);
    assert.doesNotMatch(source, /document\s*\.\s*cookie/);
    assert.doesNotMatch(source, /console\s*\.\s*(?:log|info|warn|error)\s*\(/);
    assert.doesNotMatch(source, /(?:ntn|secret)_[A-Za-z0-9_-]{20,}/);
    assert.doesNotMatch(source, /mockFetch|browser-fixture|__test__/);
  }
});

test('页面脚本来自同源，凭证请求只能连接 Notion 官方 API', async () => {
  const html = await readFile(new URL('index.html', site), 'utf8');
  assert.match(html, /script-src 'self';/);
  assert.match(html, /connect-src https:\/\/api\.notion\.com;/);
  assert.match(html, /object-src 'none';/);
  assert.match(html, /form-action 'none'/);
  const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)];
  assert.deepEqual(scripts.map(match => match[1]), ['./app.js']);
  assert.doesNotMatch(html, /<script[^>]*>\s*[^<\s]/);
  assert.match(html, /id="notion-token"[^>]*type="password"[^>]*autocomplete="off"/);
  const app = await readFile(new URL('app.js', site), 'utf8');
  assert.doesNotMatch(app, /innerHTML|document\.write\(/);
  assert.match(app, /addEventListener\('pagehide'/);
});

test('GitHub Pages 工作流先测试和构建，只上传 dist 目录，依赖固定提交', async () => {
  const workflow = await readFile(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  assert.match(workflow, /run: npm test/);
  assert.match(workflow, /needs: build/);
  assert.match(workflow, /run: npm run build/);
  assert.match(workflow, /path: dist\s/);
  const actions = [...workflow.matchAll(/uses:\s+actions\/[^@\s]+@([^\s]+)/g)];
  assert.equal(actions.length, 5);
  assert.ok(actions.every(match => /^[a-f0-9]{40}$/.test(match[1])));
});
