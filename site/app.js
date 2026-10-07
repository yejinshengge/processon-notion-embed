import { ToolError, normalizeProcessOn, parseNotionPage, normalizeToken, NotionClient, readPageTitle, notionPageUrl, embedGraph } from './core.js';

export function mountApp(root = document, { fetchImpl = globalThis.fetch } = {}) {
  const byId = id => root.getElementById(id);
  const form = byId('embed-form');
  const fields = ['processon-url', 'notion-url', 'notion-token', 'block-title', 'position'];
  const submit = byId('submit-button');
  const check = byId('check-button');
  const preview = byId('preview-button');
  const clear = byId('clear-token');
  const show = byId('show-token');
  const result = byId('result');
  const progress = byId('progress-text');
  let busy = false;

  function clearErrors() {
    fields.forEach(id => {
      byId(id).removeAttribute('aria-invalid');
      const error = byId(`${id}-error`);
      if (error) error.textContent = '';
    });
  }

  function setStatus(kind, title, message, href) {
    result.hidden = false;
    result.dataset.kind = kind;
    byId('result-title').textContent = title;
    byId('result-message').textContent = message;
    const link = byId('result-link');
    link.hidden = !href;
    if (href) link.href = href;
    else link.removeAttribute('href');
  }

  function showError(error, { pageId } = {}) {
    const known = error instanceof ToolError;
    setStatus('error', known && error.uncertain ? '请先确认写入结果' : '还差一步', known ? error.message : '操作未完成，请刷新页面后重试。', known && error.uncertain && pageId ? notionPageUrl(pageId) : undefined);
    if (known && error.field && byId(error.field)) {
      byId(error.field).setAttribute('aria-invalid', 'true');
      const text = byId(`${error.field}-error`);
      if (text) text.textContent = error.message;
      byId(error.field).focus();
    }
    if (known && ['unauthorized', 'object_not_found', 'restricted_resource'].includes(error.code)) {
      byId('setup-guide').open = true;
    }
  }

  function setBusy(value) {
    busy = value;
    fields.forEach(id => { byId(id).disabled = value; });
    [submit, check, clear, show, preview].forEach(button => { button.disabled = value; });
    submit.classList.toggle('is-busy', value);
    submit.setAttribute('aria-busy', String(value));
    byId('submit-label').textContent = value ? '正在处理…' : '嵌入到 Notion';
    progress.hidden = !value;
    if (!value) progress.textContent = '';
  }

  function readConnection() {
    return { pageId: parseNotionPage(byId('notion-url').value), token: normalizeToken(byId('notion-token').value) };
  }

  function connected(title) {
    byId('connection-state').dataset.state = 'connected';
    byId('connection-label').textContent = '页面可访问';
    byId('page-name').textContent = title;
    byId('page-name').hidden = false;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    clearErrors();
    let connection;
    try {
      const embedUrl = normalizeProcessOn(byId('processon-url').value);
      connection = readConnection();
      const title = byId('block-title').value.trim();
      if (title.length > 80) throw new ToolError('标题最多 80 个字符。', { field: 'block-title' });
      const position = byId('position').value;
      setBusy(true);
      result.hidden = true;
      const messages = { page: '正在检查目标页面…', duplicates: '正在检查页面中已有的图表…', insert: '正在创建原生嵌入区块…' };
      const data = await embedGraph({ ...connection, embedUrl, title, position, fetchImpl, onProgress: step => { progress.textContent = messages[step] ?? '正在处理…'; } });
      connected(data.pageTitle);
      setStatus('success', data.created ? '图表已嵌入' : '这张图已在页面中', data.created
        ? `已添加到「${data.pageTitle}」。打开 Notion 即可查看在线图表；修改后若未立即更新，可刷新 Notion 页面。`
        : `「${data.pageTitle}」的页面顶层已有相同嵌入，本次没有重复添加。`, notionPageUrl(data.pageId, data.blockId));
    } catch (error) {
      setBusy(false);
      showError(error, connection);
    } finally {
      setBusy(false);
    }
  });

  check.addEventListener('click', async () => {
    if (busy) return;
    clearErrors();
    try {
      const { pageId, token } = readConnection();
      setBusy(true);
      progress.textContent = '正在检查页面访问权限…';
      const client = new NotionClient(token, { fetchImpl });
      const page = await client.page(pageId);
      const title = readPageTitle(page);
      connected(title);
      setStatus('info', '页面连接正常', `可以读取「${title}」。嵌入时还需要连接具备「插入内容」权限。本次检查没有修改页面。`, notionPageUrl(pageId));
    } catch (error) {
      setBusy(false);
      showError(error);
    } finally {
      setBusy(false);
    }
  });

  preview.addEventListener('click', () => {
    clearErrors();
    try {
      const url = normalizeProcessOn(byId('processon-url').value);
      byId('preview-panel').hidden = false;
      byId('preview-frame').src = url;
      byId('preview-original').href = url;
      byId('preview-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) { showError(error); }
  });

  byId('close-preview').addEventListener('click', () => {
    byId('preview-panel').hidden = true;
    byId('preview-frame').removeAttribute('src');
  });

  show.addEventListener('click', () => {
    const visible = byId('notion-token').type === 'password';
    byId('notion-token').type = visible ? 'text' : 'password';
    show.textContent = visible ? '隐藏' : '显示';
    show.setAttribute('aria-pressed', String(visible));
  });

  clear.addEventListener('click', () => {
    clearErrors();
    byId('notion-token').value = '';
    byId('notion-token').type = 'password';
    show.textContent = '显示';
    show.setAttribute('aria-pressed', 'false');
    byId('connection-state').dataset.state = 'idle';
    byId('connection-label').textContent = '等待连接';
    byId('page-name').hidden = true;
    setStatus('info', '凭证已清除', '链接仍保留在表单中。下次操作时，重新填写你的 Notion 凭证即可。');
    byId('notion-token').focus();
  });

  for (const id of ['notion-token', 'notion-url']) {
    byId(id).addEventListener('input', () => {
      byId('connection-state').dataset.state = 'idle';
      byId('connection-label').textContent = '等待连接';
      byId('page-name').hidden = true;
    });
  }
  fields.forEach(id => {
    byId(id).addEventListener('input', () => {
      byId(id).removeAttribute('aria-invalid');
      const error = byId(`${id}-error`);
      if (error) error.textContent = '';
    });
  });

  root.defaultView?.addEventListener('pagehide', () => {
    byId('notion-token').value = '';
    byId('notion-token').type = 'password';
    show.textContent = '显示';
    show.setAttribute('aria-pressed', 'false');
  });

  // No storage, analytics, third-party scripts or credential logging.
  byId('js-notice').hidden = true;
  return { form };
}

if (typeof document !== 'undefined' && document.documentElement.dataset.embedTool === 'true') mountApp();
