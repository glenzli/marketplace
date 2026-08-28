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

## Development and release boundary

Plugin source remains in its own repository. This repository contains only the
validated release package that Codex installs. For rapid local Dev Mesh iteration,
use a maintainer-configured private development marketplace. Publish an intentional,
validated snapshot here before asking other users to install it.
