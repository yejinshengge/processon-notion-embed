import { mountApp } from '/app.js';

// Local UI fixture. This file is not part of the GitHub Pages artifact.
const pageId = '00000000-0000-4000-8000-000000000001';
const blockId = '00000000-0000-4000-8000-000000000002';
let embeds = [];
let writes = 0;
const banner = document.createElement('div');
banner.className = 'notice';
banner.id = 'fixture-status';
banner.textContent = '本地测试模式：模拟 Notion API，写入次数 0。不会访问真实 Notion。';
document.querySelector('main').prepend(banner);
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
async function mockFetch(url, options) {
  await new Promise(resolve => setTimeout(resolve, 150));
  const token = options.headers.Authorization;
  if (token.includes('invalid')) return json({ code: 'unauthorized' }, 401);
  if (token.includes('no_access')) return json({ code: 'object_not_found' }, 404);
  if (url.includes('/pages/')) return json({ object: 'page', id: pageId, properties: { Name: { type: 'title', title: [{ plain_text: '我的阅读笔记' }] } } });
  if (options.method === 'GET') return json({ results: embeds, has_more: false });
  const body = JSON.parse(options.body);
  const embed = body.children.find(block => block.type === 'embed');
  embeds.push({ ...embed, id: blockId });
  writes += 1;
  banner.textContent = `本地测试模式：模拟 Notion API，写入次数 ${writes}。不会访问真实 Notion。`;
  return json({ results: [{ ...embed, id: blockId }] });
}
mountApp(document, { fetchImpl: mockFetch });
