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

## 视频评论

播放器下方使用 Giscus，每个视频按固定编号映射到独立的 GitHub Discussion（`dayday-video-vXX`），重命名视频不会改变评论归属。评论者需要使用 GitHub 登录。首次评论或回应时才会自动创建对应 Discussion。

- `comments.js`：Giscus 仓库、分类配置与视频评论切换。
- 仓库需要启用 Discussions，并授权 Giscus GitHub App。
- 评论使用 Announcements 分类，在仓库 Discussions 中管理。
- 本地 `file://` 打开页面时不加载评论，请通过已发布网站访问。

## 评论与视频独立页

- `video.html?id=v00`：独立视频页面，可分享给他人；`#comments` 直接定位评论。
- 首页各栏目中的最近动态汇总整个视频库最近 3 条公开留言（包括回复），点击进入对应视频独立页。
- 视频列表的评论气泡显示留言与回复总数，点击直接进入独立页评论区。
- 页面从同站点的 `comment-data.json` 读取评论，无需数据库或前端密钥。支持手动刷新与每分钟读取已发布摘要；加载失败时保留已有内容并提示。
- 阅读区直接展示文本与回复；写评论使用 Giscus 官方的 GitHub 登录和编辑器，通过 `giscus-compose.css` 保留编辑器、隐藏重复阅读区。
- 写评论入口固定在弹窗或独立页底部，展开后可以登录、编辑和提交；评论内容始终存储于 GitHub Discussions。

### 评论自动更新

GitHub Pages 的发布来源需要选择 **GitHub Actions**。`.github/workflows/deploy.yml` 会在推送、Discussion 或评论的新增／编辑／删除事件发生时运行：

1. 使用 GitHub Actions 自带的临时 `GITHUB_TOKEN`，通过 GitHub GraphQL 读取公开讨论；不需要手工创建 Token。
2. 按视频固定编号匹配讨论，生成 `comment-data.json`。读取失败时会停止发布，避免把真实评论覆盖为空数据。
3. 打包并发布页面与最新摘要，评论变化通常需要等待一次构建和部署。

`scripts/build_comment_data.py` 在本地没有 Token 时，可以通过 Giscus 公开接口生成预览摘要；浏览器本身不会跨域调用该接口。评论摘要中的每条讨论最多保留每个主评论最近 100 条回复，完整回复可通过“查看原文 / 回复”访问 GitHub。

运行检查：`python3 -m unittest discover -s tests -p 'test_*.py'` 与 `node tests/comments.test.cjs`。
