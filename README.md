# 图桥 · ProcessOn 嵌入 Notion

一个直接在网页上使用的个人工具。粘贴 ProcessOn 嵌入链接和 Notion 页面链接，即可创建 Notion 原生 `embed` 区块，保留图表画布与缩放功能。

**在线使用：<https://yejinshengge.github.io/processon-notion-embed/>**

无需下载、安装或部署服务器。网站使用 GitHub Pages；浏览器直接调用 Notion 官方 API。

## 使用

首次使用需要准备自己的 Notion 内部连接凭证：

1. 按照 [Notion 官方指引](https://www.notion.com/help/create-integrations-with-the-notion-api) 创建内部连接，开启「读取内容」和「插入内容」。无需开启更新内容或用户信息权限。
2. 在目标 Notion 页面右上角 `••• → 连接 / 添加连接` 中添加这个连接。授权父页面时，其子页面也会继承访问权限。
3. 在连接配置页复制 API token，填写到图桥的「Notion 连接凭证」中。
4. 在 ProcessOn 开启公开分享和「嵌入第三方」，复制 `https://www.processon.com/embed/…` 链接或 iframe 代码。
5. 填写两个链接，选择页面顶部或底部，可选填写标题，点击「嵌入到 Notion」。

「检查页面连接」只读取页面，不修改内容。工具在写入前会扫描页面顶层区块，发现相同的 ProcessOn 嵌入时直接提供已有区块链接。嵌套在折叠、分栏或提示区块中的图表不在此重复检测范围内。

图表加载的是 ProcessOn 在线页面。更新时机取决于 ProcessOn；保存修改后若没有立即显示，请重新打开或刷新 Notion 页面。

## 凭证与数据

- 网站公开的是工具代码，不包含任何固定 Notion 凭证、私人页面 ID 或个人图表链接。
- 你输入的凭证只保留在当前页面内存和输入框中，仅随请求发送给 `https://api.notion.com`。刷新、离开或关闭页面后需重新填写。
- 不使用 localStorage、sessionStorage、Cookie、分析统计、外部字体或第三方脚本；没有中转服务器。
- 页面中的 JavaScript 可以接触你输入的凭证。这是个人工具，建议使用只授权必要页面的内部连接；不要使用不可信的改版。用完可点击「清除凭证」。
- 点击「先预览图表」会让浏览器访问该 ProcessOn 嵌入页面。
- 写入请求不会自动重试。若网络中断导致结果未确认，请先查看目标 Notion 页面，避免重复操作。

这个网页不能继承你在其他应用中连接的 Notion 授权；需要自行提供具有目标页面权限的凭证。当前版本没有 OAuth 登录，因为 OAuth 凭证交换需要后端，而 GitHub Pages 提供的是静态托管。

## 原理

Notion 界面嵌入链接时会通过 Iframely 解析，结果可能改变区块类型。通过 API 创建 `embed` 区块不经过该解析过程。参见 [Notion embed 文档](https://developers.notion.com/reference/block#embed)。

本工具调用：

1. `GET /v1/pages/{page_id}`：检查页面访问权限与标题。
2. `GET /v1/blocks/{page_id}/children`：分页检查已有的顶层嵌入。
3. `PATCH /v1/blocks/{page_id}/children`：创建可选的二级标题与原生 `embed` 区块。

固定使用 `Notion-Version: 2026-03-11`，通过 `position` 选择页面顶部或底部。所有带凭证请求固定发送到 Notion 官方域名。浏览器 CORS 支持参见 [Notion 官方 SDK](https://github.com/makenotion/notion-sdk-js#browser-usage)。

## 本地开发

需要 Node.js 22 或更新版本，无需安装依赖。

```sh
npm test
npm run dev
```

打开 <http://127.0.0.1:8765/>。本地 `/__test__/` 页面使用模拟 API 验证界面流程，不访问真实 Notion；该测试页不会被发布。

```text
site/                  GitHub Pages 发布内容
  index.html           中文界面与首次设置指引
  styles.css           响应式布局
  core.js              校验与 Notion 调用
  app.js               页面交互
tests/                 Node 测试与本地浏览器模拟
scripts/dev.mjs        本地预览服务器
.github/workflows/     测试与 GitHub Pages 自动发布
```

## 发布

仓库设置中将 Pages 的 Source 设为 **GitHub Actions**。推送到 `main` 后，工作流先运行测试，再发布 `site/`。该站点使用 GitHub Pages 静态托管，无需设置仓库密钥。

## 常见问题

**提示找不到页面**：通常是连接尚未被添加到该页面，或链接对应的是数据库/视图而非页面。目标页面本身不需要公开。

**提示权限不足**：检查内部连接是否具有读取内容和插入内容权限。

**嵌入后无法显示**：检查 ProcessOn 的公开分享与第三方嵌入状态、访问密码、链接有效期及网络。

**跨域或网络请求失败**：检查浏览器是否能访问 `api.notion.com`。不要把凭证发给公共代理。

## 许可

MIT。项目与 Notion、ProcessOn 无隶属关系。
