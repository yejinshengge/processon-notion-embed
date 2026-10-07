import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const site = resolve(root, 'site');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.mjs': 'text/javascript; charset=utf-8' };
const port = Number(process.argv[2] || 8765);

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/__test__/') {
      const page = (await readFile(resolve(site, 'index.html'), 'utf8'))
        .replace('data-embed-tool="true"', 'data-embed-tool="fixture"')
        .replace('src="./app.js"', 'src="/tests/browser-fixture.mjs"')
        .replace('src="./favicon.svg"', 'src="/favicon.svg"')
        .replaceAll('href="./', 'href="/');
      response.writeHead(200, { 'Content-Type': types['.html'], 'Cache-Control': 'no-store' });
      response.end(page);
      return;
    }
    const base = pathname.startsWith('/tests/') ? root : site;
    const path = resolve(base, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!path.startsWith(`${base}${sep}`)) throw new Error('invalid path');
    const data = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(data);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`图桥本地预览：http://127.0.0.1:${port}`));
