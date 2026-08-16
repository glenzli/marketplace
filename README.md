# Glenzli Marketplace

Installable, reviewed snapshots of Glenzli Codex plugins.

## Install

```bash
codex plugin marketplace add glenzli/marketplace --ref main
codex plugin add dev-mesh@glenzli-marketplace
```

The first command registers this marketplace once. Install or update each plugin
explicitly from the named marketplace afterwards.

## Development and release boundary

Plugin source remains in its own repository. This repository contains only the
validated release package that Codex installs. For rapid local Dev Mesh iteration,
use the private development marketplace (`glenzli-local`); publish an intentional,
validated snapshot here before asking other users to install it.
