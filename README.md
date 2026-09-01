# Plugin Marketplace

An installable collection of reviewed Codex plugins.

## Install

```bash
codex plugin marketplace add glenzli/marketplace --ref main
codex plugin add dev-mesh@glenzli-marketplace
codex plugin add dev-skeleton@glenzli-marketplace
codex plugin add math-workspace@glenzli-marketplace
codex plugin add pcp@glenzli-marketplace
```

The first command registers this plugin collection once. Install or update each plugin
explicitly from its configured source afterwards.

`math-workspace` includes its CLI and Reader runtime in the plugin snapshot. It
does not require a global `math-workspace` installation.

`pcp` includes the Codex Skill, MCP launcher, artwork, license, and a compiled
`pcp-mcp` for macOS on Apple silicon. PCP Runtime, Console, Store, enrollment,
and their service lifecycle remain a separate local installation. On another
platform, set `PCP_MCP_BINARY` to a compatible build or install PCP so the
launcher can use `PCP_HOME/bin/pcp-mcp`.

## Development and release boundary

Plugin source remains in its own repository. This repository contains only the
validated release package that Codex installs. For rapid local Dev Mesh iteration,
use a maintainer-configured private development marketplace. Publish an intentional,
validated snapshot here before asking other users to install it.

Platform binaries in a plugin release are built and tested in their source
repository, then copied into a platform-specific `dist` directory with the
plugin metadata, Skill, launcher, artwork, and license. They are release
artifacts, not the editable source of truth.
