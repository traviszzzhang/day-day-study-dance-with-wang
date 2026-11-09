# Day Day 跟着王哥学舞蹈

舞蹈课堂、宣传视频与日常花絮的静态视频站点，支持导师筛选、搜索、响应式布局与液态玻璃界面。

## 使用

浏览器直接打开 `index.html`，或把整个目录部署到静态网站托管服务。请保持文件的相对路径不变。

- `index.html`：网站入口，内嵌视频与教师数据，可直接离线使用。
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

更新视频资料时，请同步修改 `index.html` 中的 `originalItems`、`video-library.json` 与 `video-labels.json`。页面不会从浏览器修改服务器文件，无需后端或构建步骤。

## 视频评论

播放器下方使用 Giscus，每个视频按固定编号映射到独立的 GitHub Discussion（`dayday-video-vXX`），重命名视频不会改变评论归属。评论者需要使用 GitHub 登录。首次评论或回应时才会自动创建对应 Discussion。

- `comments.js`：Giscus 仓库、分类配置与视频评论切换。
- 仓库需要启用 Discussions，并授权 Giscus GitHub App。
- 评论使用 Announcements 分类，在仓库 Discussions 中管理。
- 本地 `file://` 打开页面时不加载评论，请通过已发布网站访问。
