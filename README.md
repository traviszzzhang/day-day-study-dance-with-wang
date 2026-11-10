# Day Day 跟着王哥学舞蹈

舞蹈课堂、宣传视频与日常花絮的静态视频站点，支持导师筛选、搜索、响应式布局与液态玻璃界面。

## 使用

浏览器直接打开 `index.html`，或把整个目录部署到静态网站托管服务。请保持文件的相对路径不变。

- `index.html`：网站入口，搭配 `video-data.js` 可直接离线播放视频。
- `videos/`：播放用 MP4 和保留的原始 MOV。
- `posters/`：视频封面。
- `teachers/`：教师头像。
- `teachers.json`：教师列表。
- `video-library.json`：视频路径、封面、标题、分类和老师资料。
- `video-labels.json`：已整理的分类与老师归属。
- `index.before-redesign.html`：早期页面备份。

## 展示页面

- `index.html#classroom`：舞蹈教学与展示，支持导师筛选。
- `index.html#films`：宣传放映厅。
- `index.html#moments`：课外花絮。

## 更新内容

更新视频资料时，请同步修改 `video-data.js`、`video-library.json` 与 `video-labels.json`。页面不会从浏览器修改服务器文件，无需后端或构建步骤。

## 评论与最近动态

- Giscus 负责 GitHub 登录和提交，评论保存在仓库 Discussions 的 Announcements 分类。
- `github-comments.js` 在打开／刷新网页时，直接读取 GitHub 公开 REST 接口，不使用数据库、Token 或构建快照。
- 通过 `dayday-video-vXX` 或原始严格匹配 SHA-1 识别视频讨论，分页读取评论，并按 `parent_id` 整理回复。
- 最近动态汇总所有视频最近 3 条留言（含回复）。删除评论或讨论后，下次读取会替换旧列表和评论数量。
- 打开视频复用本次页面加载的数据，不做定时轮询。自己提交评论后，只补读受影响视频的数据；页面上的刷新按钮也可主动重新读取。
- 评论者优先显示 GitHub Profile Name；未设置或姓名读取失败时回退到用户名。同一账号的姓名只在当前页面内存中读取一次。
- GitHub 匿名 REST 接口每个 IP 每小时 60 次；超过额度会显示可重试时间，不伪造零评论。页面不保存 GitHub 私密访问令牌。
- 点击播放、评论气泡或动态均使用原页面弹窗；点击评论和动态时不自动播放。旧 `video.html?id=v00` 链接仍会跳回原页面。
- 底部直接展示 Giscus 真实输入框，已登录时可以直接输入并提交。每次切换视频／关闭弹窗都会销毁旧 iframe，防止串评论。
- 本地 `file://` 预览不连接评论接口，请通过网站或本地 HTTP 服务访问。

## 发布与检查

GitHub Pages 的来源选择 **GitHub Actions**。`.github/workflows/deploy.yml` 只在推送 main 或手动运行时发布页面代码，评论新增、修改和删除不再触发发版。

检查命令：

```sh
node tests/github-comments.test.cjs
node tests/comments.test.cjs
python3 scripts/package_site.py
```

Giscus iframe 的 URL、会话保存与消息处理遵循 [官方 client.ts](https://github.com/giscus/giscus/blob/main/client.ts) 的嵌入协议。会话仅发送至 giscus.app，不写入仓库。
