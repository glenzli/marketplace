# Plugin Marketplace

An installable collection of reviewed Codex plugins.

## Install

```bash
codex plugin marketplace add glenzli/marketplace --ref main
codex plugin add dev-mesh@glenzli-marketplace
codex plugin add dev-skeleton@glenzli-marketplace
codex plugin add math-workspace@glenzli-marketplace
codex plugin add markdown-book@glenzli-marketplace
```

The first command registers this plugin collection once. Install or update each plugin
explicitly from its configured source afterwards.

## Math Workspace

[Math Workspace](https://github.com/glenzli/math-workspace) is a local writing and
review workspace for mathematical manuscripts: book navigation, stable references,
prose/Lean comparison, Codex-assisted review, and selected-chapter PDF editions.
Front matter, afterwords, and continuing-work notices stay in the manuscript.

The plugin snapshot includes its CLI and Reader runtime; it does not require a
global `math-workspace` installation. Start a new Codex task after an update.
See the [workflow guide and current screenshots](https://github.com/glenzli/math-workspace#readme)
and [project setup](https://github.com/glenzli/math-workspace/blob/main/docs/install.md).

![Math Workspace Reader](https://raw.githubusercontent.com/glenzli/math-workspace/main/media/readme/banner.jpg)

## Markdown Book

[Markdown Book](https://github.com/glenzli/markdown-book) reads ordinary Markdown
books with local media, KaTeX math, and optional interactive components. The MIT
plugin includes the shared Reader, builder, format specification, and
`open-markdown-book` / `write-markdown-book` skills. No global CLI or project-local
npm install is needed; Node.js 22+ must be available to the host.

The interface supports Chinese and English, with automatic or manual language and
light/dark appearance with neutral grayscale surfaces. Book text and author-owned demos retain their original
language. See the [bilingual README](https://github.com/glenzli/markdown-book#readme),
[format](https://github.com/glenzli/markdown-book/blob/main/docs/format-v1.en.md),
and [authoring guide](https://github.com/glenzli/markdown-book/blob/main/docs/authoring.md).
Optional experiment sessions restore parameters, tabs, and paused playback locally.
Discussion drafts can include a reviewed snapshot of parameters, readings, and model
conditions. See the [session contract](https://github.com/glenzli/markdown-book/blob/main/docs/experiment-sessions.md).
Native panels rebuild a lost backend session while retaining the current chapter,
reading position and unconfirmed experiment changes. Reopening a panel restores
the experiment in place, with playback paused. Reload the plugin or restart the host
after an update so existing panels use the new runtime.
The current snapshot is **0.7.5**. Chapter changes retain the live directory and its
scroll position, and newly added chapters open from the refreshed catalog. Reading
settings show the loaded panel version so an old panel can be identified.

Markdown Book 提供普通 Markdown 书籍的阅读、校验、静态构建和互动演示，包含
中英界面、黑白灰底色、自动/手动明暗及写作 skill。支持组件恢复本机实验状态，并把经读者确认的
参数与读数放入讨论草稿。工具采用 MIT，教材与素材保留各自许可。
后台会话失效后可在原面板重建连接，保留章节、阅读位置和待保存参数；重新打开时回到原实验，播放保持暂停。
当前快照为 **0.7.5**，切章保留目录节点与滚动位置，书稿新增章节后可从更新目录进入；阅读设置显示实际面板版本。通过上方统一来源安装，更新后重新加载插件或重启宿主，再核对面板版本。

## PCP connection

PCP is no longer distributed as a standalone Codex plugin. ChatGPT and Codex
use the same ChatGPT PCP connection through the existing Secure MCP Tunnel.
This avoids duplicate tools and separate plugin installation, version, enrollment,
and usage-guidance state. PCP Runtime, Store, and the stdio MCP server remain local.
See the [PCP setup and rationale](https://github.com/glenzli/paged-context-protocol#为什么不再单独维护-codex-插件)
and the [English tunnel setup](https://github.com/glenzli/paged-context-protocol/blob/main/README-en.md#shared-chatgpt-and-codex-tunnel-access).

## Development and release boundary

Plugin source remains in its own repository. This repository contains only the
validated release package that Codex installs. Public distribution uses
`glenzli/marketplace`, registered as `glenzli-marketplace`.

Maintainers share the private `glenzli-local` catalog for local development,
including Markdown Book, Math Workspace, Dev Mesh, and Dev Skeleton. Its entries
point to each project's local plugin directory; generated files must be rebuilt
and reinstalled after changes. Publish an intentional, validated snapshot here
before asking other users to install it.

Platform binaries in a plugin release are built and tested in their source
repository, then copied into a platform-specific `dist` directory with the
plugin metadata, Skill, launcher, artwork, and license. They are release
artifacts, not the editable source of truth.
