# Plugin Marketplace

An installable collection of reviewed Codex plugins.

## Install

```bash
codex plugin marketplace add glenzli/marketplace --ref main
codex plugin add dev-mesh@glenzli-marketplace
codex plugin add dev-skeleton@glenzli-marketplace
codex plugin add math-workspace@glenzli-marketplace
```

The first command registers this plugin collection once. Install or update each plugin
explicitly from its configured source afterwards.

`math-workspace` includes its CLI and Reader runtime in the plugin snapshot. It
does not require a global `math-workspace` installation.

PCP is no longer distributed as a standalone Codex plugin. ChatGPT and Codex
use the same ChatGPT PCP connection through the existing Secure MCP Tunnel.
This avoids duplicate tools and separate plugin installation, version, enrollment,
and usage-guidance state. PCP Runtime, Store, and the stdio MCP server remain local.
See the [PCP setup and rationale](https://github.com/glenzli/paged-context-protocol#为什么不再单独维护-codex-插件)
and the [English tunnel setup](https://github.com/glenzli/paged-context-protocol/blob/main/README-en.md#shared-chatgpt-and-codex-tunnel-access).

## Development and release boundary

Plugin source remains in its own repository. This repository contains only the
validated release package that Codex installs. For rapid local Dev Mesh iteration,
use a maintainer-configured private development marketplace. Publish an intentional,
validated snapshot here before asking other users to install it.

Platform binaries in a plugin release are built and tested in their source
repository, then copied into a platform-specific `dist` directory with the
plugin metadata, Skill, launcher, artwork, and license. They are release
artifacts, not the editable source of truth.
