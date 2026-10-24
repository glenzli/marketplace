"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const crypto__namespace = /* @__PURE__ */ _interopNamespaceDefault(crypto);
const nodeFs = require("node:fs");
async function pathExists$1(filePath) {
  try {
    await fs__namespace.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}
async function cleanDir$1(dir) {
  await fs__namespace.rm(dir, { recursive: true, force: true });
  await fs__namespace.mkdir(dir, { recursive: true });
}
async function copyFile$1(src, dest) {
  await fs__namespace.mkdir(path__namespace.dirname(dest), { recursive: true });
  await fs__namespace.copyFile(src, dest);
}
async function copyDir$1(src, dest) {
  const entries = await fs__namespace.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path__namespace.join(src, entry.name);
    const destPath = path__namespace.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir$1(srcPath, destPath);
    } else if (entry.isFile()) {
      await copyFile$1(srcPath, destPath);
    }
  }
}
async function readJson$1(filePath) {
  return JSON.parse(await fs__namespace.readFile(filePath, "utf8"));
}
async function copyPluginRuntime(rootPath, pluginRoot) {
  const runtimeRoot = path__namespace.join(pluginRoot, "out");
  await cleanDir$1(runtimeRoot);
  await copyDir$1(path__namespace.join(rootPath, "out", "cli"), path__namespace.join(runtimeRoot, "cli"));
  await copyDir$1(path__namespace.join(rootPath, "out", "reader"), path__namespace.join(runtimeRoot, "reader"));
  await nodeFs.promises.chmod(path__namespace.join(pluginRoot, "scripts", "launch_math_workspace_mcp"), 493);
}
async function stageSourcePluginRuntime(rootPath) {
  const pluginRoot = path__namespace.join(rootPath, "plugins", "math-workspace");
  await copyPluginRuntime(rootPath, pluginRoot);
  return pluginRoot;
}
async function assemblePluginSnapshot(rootPath, destination) {
  const sourceRoot = path__namespace.join(rootPath, "plugins", "math-workspace");
  await cleanDir$1(destination);
  await copyDir$1(sourceRoot, destination);
  await copyPluginRuntime(rootPath, destination);
  await copyFile$1(path__namespace.join(rootPath, "LICENSE"), path__namespace.join(destination, "LICENSE"));
  return destination;
}
async function syncPluginToMarketplace(snapshotRoot, marketplaceRoot) {
  const catalogPath = path__namespace.join(marketplaceRoot, ".agents", "plugins", "marketplace.json");
  if (!await pathExists$1(catalogPath)) {
    throw new Error(`Marketplace catalog is missing: ${catalogPath}`);
  }
  const catalog = await readJson$1(catalogPath);
  const entry = (catalog.plugins || []).find((candidate) => candidate.name === "math-workspace");
  if (!entry || entry.source?.source !== "local" || entry.source?.path !== "./plugins/math-workspace") {
    throw new Error("Marketplace must contain a local ./plugins/math-workspace catalog entry before publishing.");
  }
  const destination = path__namespace.join(marketplaceRoot, "plugins", "math-workspace");
  await cleanDir$1(destination);
  await copyDir$1(snapshotRoot, destination);
  return destination;
}
const ROOT = process.cwd();
const DIST_DIR = path__namespace.join(ROOT, "dist");
function parseReleaseArgs(args) {
  let marketplaceRoot;
  let stagePluginRuntime = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--marketplace-root") {
      marketplaceRoot = args[++index];
      if (!marketplaceRoot) throw new Error("--marketplace-root requires a directory.");
      continue;
    }
    if (arg.startsWith("--marketplace-root=")) {
      marketplaceRoot = arg.slice("--marketplace-root=".length);
      continue;
    }
    if (arg === "--stage-plugin-runtime") {
      stagePluginRuntime = true;
      continue;
    }
    throw new Error(`Unknown release option: ${arg}`);
  }
  return {
    marketplaceRoot: marketplaceRoot ? path__namespace.resolve(ROOT, marketplaceRoot) : void 0,
    stagePluginRuntime
  };
}
async function readJson(filePath) {
  return JSON.parse(await fs__namespace.readFile(filePath, "utf8"));
}
async function pathExists(filePath) {
  try {
    await fs__namespace.access(filePath);
    return true;
  } catch (_err) {
    return false;
  }
}
async function cleanDir(dir) {
  await fs__namespace.rm(dir, { recursive: true, force: true });
  await fs__namespace.mkdir(dir, { recursive: true });
}
async function copyFile(src, dest) {
  await fs__namespace.mkdir(path__namespace.dirname(dest), { recursive: true });
  await fs__namespace.copyFile(src, dest);
}
async function copyDir(src, dest) {
  const entries = await fs__namespace.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path__namespace.join(src, entry.name);
    const destPath = path__namespace.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await copyFile(srcPath, destPath);
    }
  }
}
async function copyPublicDocs(destDocs) {
  const publicDocs = ["install.md", "usage.md", "release.md"];
  for (const fileName of publicDocs) {
    await copyFile(path__namespace.join(ROOT, "docs", fileName), path__namespace.join(destDocs, fileName));
  }
}
async function writeText(filePath, content) {
  await fs__namespace.mkdir(path__namespace.dirname(filePath), { recursive: true });
  await fs__namespace.writeFile(filePath, content.endsWith("\n") ? content : `${content}
`, "utf8");
}
async function writeJson(filePath, value) {
  await fs__namespace.mkdir(path__namespace.dirname(filePath), { recursive: true });
  await fs__namespace.writeFile(filePath, `${JSON.stringify(value, null, 2)}
`, "utf8");
}
function makeCliPackageJson(pkg) {
  return {
    name: `${pkg.name}-cli`,
    version: pkg.version,
    private: true,
    license: pkg.license,
    repository: pkg.repository,
    description: "CLI and local Math Workspace artifacts for math-workspace",
    bin: {
      "math-workspace": "out/cli/math-workspace.js"
    },
    scripts: {
      formal: "node out/cli/math-workspace.js"
    }
  };
}
async function requiredPath(filePath) {
  if (!await pathExists(filePath)) {
    throw new Error(`Missing required release input: ${path__namespace.relative(ROOT, filePath)}`);
  }
}
async function collectFiles(dir) {
  const result = [];
  async function walk(current) {
    const entries = await fs__namespace.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path__namespace.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        result.push(fullPath);
      }
    }
  }
  await walk(dir);
  return result.sort((a, b) => toPosix(path__namespace.relative(dir, a)).localeCompare(toPosix(path__namespace.relative(dir, b))));
}
function toPosix(filePath) {
  return filePath.split(path__namespace.sep).join("/");
}
async function sha256(filePath) {
  const hash = crypto__namespace.createHash("sha256");
  hash.update(await fs__namespace.readFile(filePath));
  return hash.digest("hex");
}
async function writeChecksums(releaseRoot) {
  const files = await collectFiles(releaseRoot);
  const lines = [];
  for (const file of files) {
    const rel = toPosix(path__namespace.relative(releaseRoot, file));
    if (rel === "checksums.txt") continue;
    lines.push(`${await sha256(file)}  ${rel}`);
  }
  await fs__namespace.writeFile(path__namespace.join(releaseRoot, "checksums.txt"), `${lines.join("\n")}
`, "utf8");
}
function releaseInstallDoc(pkg) {
  return `# ${pkg.name} ${pkg.version}

Language: [English](#english) | [中文](#中文)

<a id="english"></a>

## English

Choose the tool provider to match the installation. Codex users use the plugin's bundled CLI, Reader and generic skills. Independent users use Math Workspace's own CLI/npm; Codex is not required.

### Codex plugin

Register this release as a marketplace and install the self-contained plugin:

\`\`\`bash
codex plugin marketplace add /path/to/math-workspace-release
codex plugin add math-workspace@personal
\`\`\`

Start a new Codex task after installation or updates. Reuse the installed plugin's actual launcher or Node/CLI entry for initialization and file operations. Keep project configuration, source, review records and project-specific rules in the project. Do not copy a second runtime into \`tools/math-workspace\`, add a second npm dependency, or embed generic skill copies just to use the Codex plugin.

### Independent CLI

For terminal, CI or other-host use, manage the release CLI outside the writing project or explicitly select the standalone npm package. For example:

\`\`\`bash
node /absolute/path/to/math-workspace-release/cli/out/cli/math-workspace.js open /path/to/project
\`\`\`

The Reader binds only to \`127.0.0.1\`. The standalone CLI uses the same project file formats and does not require Codex. Keep one selected runtime version per workflow.

### Artifacts and rules

- \`.agents/plugins/\` and \`plugins/\`: the Codex marketplace and self-contained plugin.
- \`cli/\`: the standalone CLI and Reader runtime.
- \`skills/\`: reviewed generic rules for explicit standalone integration; Codex projects read the installed plugin skills.
- \`vasm-catalog/\`: optional hash-lockable exports for explicit artifact/VASMC consumers.
- \`docs/\`, \`manifest.json\`, \`checksums.txt\`: public documentation, artifact map and SHA-256 checksums.

Keep project-specific axioms, terminology and stricter requirements in native project instructions. Preserve configuration, review decisions and evidence records when updating tools. See \`docs/install.md\` for complete setup choices.

<a id="中文"></a>

## 中文

按安装方式选择工具来源：通过 Codex 使用时，复用插件自带的 CLI、Reader 和通用 skills；独立使用时，走 Math Workspace 自己的 CLI/npm，无需安装 Codex。

### Codex 插件

把本 release 注册为 marketplace，再安装自包含插件：

\`\`\`bash
codex plugin marketplace add /path/to/math-workspace-release
codex plugin add math-workspace@personal
\`\`\`

安装或更新后新建 Codex 任务。初始化和文件操作复用已安装插件的实际启动器或 Node/CLI 入口。项目保留配置、源稿、审阅记录和特化规则；不要仅为使用 Codex 插件再内置 \`tools/math-workspace\`、添加第二份 npm 依赖或复制通用 skills。

### 独立 CLI

终端、CI 或其他宿主可在写作项目之外管理 release CLI，或明确选择独立 npm 包。例如：

\`\`\`bash
node /absolute/path/to/math-workspace-release/cli/out/cli/math-workspace.js open /path/to/project
\`\`\`

Reader 只绑定 \`127.0.0.1\`。独立 CLI 使用同一项目文件格式，不依赖 Codex；同一流程明确使用一份已选运行时。

### 产物与规则

- \`.agents/plugins/\` 与 \`plugins/\`：Codex marketplace 和自包含插件。
- \`cli/\`：独立 CLI 与 Reader 运行时。
- \`skills/\`：供独立接入时审阅的通用规则；Codex 项目读取已安装插件的 skills。
- \`vasm-catalog/\`：供明确采用 artifact/VASMC 分发的消费者锁定所需 exports。
- \`docs/\`、\`manifest.json\`、\`checksums.txt\`：公开文档、产物表与 SHA-256 校验和。

项目自己的公理、术语和更严格约束留在原生规则中；工具更新保留配置、人工审阅与证据记录。完整接入选择见 \`docs/install.md\`。
`;
}
async function main() {
  const options = parseReleaseArgs(process.argv.slice(2));
  if (options.stagePluginRuntime) {
    const staged = await stageSourcePluginRuntime(ROOT);
    console.log(`OK plugin runtime: ${toPosix(path__namespace.relative(ROOT, staged))}`);
    return;
  }
  const pkg = await readJson(path__namespace.join(ROOT, "package.json"));
  const releaseRoot = DIST_DIR;
  const cliRoot = path__namespace.join(releaseRoot, "cli");
  const catalogRoot = path__namespace.join(ROOT, "vasm-catalog");
  const marketplaceRoot = path__namespace.join(ROOT, ".agents", "plugins");
  const pluginRoot = path__namespace.join(ROOT, "plugins");
  await requiredPath(path__namespace.join(ROOT, "out", "cli", "math-workspace.js"));
  await requiredPath(path__namespace.join(ROOT, "out", "cli", "release.js"));
  await requiredPath(path__namespace.join(ROOT, "out", "reader", "index.html"));
  await requiredPath(path__namespace.join(ROOT, "skills", "editor.md"));
  await requiredPath(path__namespace.join(ROOT, "skills", "math-writing.md"));
  await requiredPath(path__namespace.join(ROOT, "skills", "integrator.md"));
  await requiredPath(path__namespace.join(ROOT, "skills", "lean-formalization.md"));
  await requiredPath(path__namespace.join(catalogRoot, "vasmc-catalog.yaml"));
  await requiredPath(path__namespace.join(ROOT, "README.md"));
  await requiredPath(path__namespace.join(ROOT, "LICENSE"));
  await requiredPath(path__namespace.join(ROOT, "docs", "usage.md"));
  await requiredPath(path__namespace.join(ROOT, "docs", "release.md"));
  await requiredPath(path__namespace.join(marketplaceRoot, "marketplace.json"));
  await requiredPath(path__namespace.join(pluginRoot, "math-workspace", ".codex-plugin", "plugin.json"));
  await requiredPath(path__namespace.join(pluginRoot, "math-workspace", "scripts", "launch_math_workspace_mcp"));
  await cleanDir(releaseRoot);
  await copyFile(path__namespace.join(ROOT, "README.md"), path__namespace.join(releaseRoot, "README.md"));
  await copyFile(path__namespace.join(ROOT, "LICENSE"), path__namespace.join(releaseRoot, "LICENSE"));
  await copyDir(path__namespace.join(ROOT, "media", "readme"), path__namespace.join(releaseRoot, "media", "readme"));
  await copyDir(path__namespace.join(ROOT, "skills"), path__namespace.join(releaseRoot, "skills"));
  await copyDir(marketplaceRoot, path__namespace.join(releaseRoot, ".agents", "plugins"));
  const pluginSnapshotRoot = await assemblePluginSnapshot(
    ROOT,
    path__namespace.join(releaseRoot, "plugins", "math-workspace")
  );
  await copyDir(catalogRoot, path__namespace.join(releaseRoot, "vasm-catalog"));
  await copyPublicDocs(path__namespace.join(releaseRoot, "docs"));
  await writeText(path__namespace.join(releaseRoot, "INSTALL.md"), releaseInstallDoc(pkg));
  await writeJson(path__namespace.join(cliRoot, "package.json"), makeCliPackageJson(pkg));
  await copyDir(path__namespace.join(ROOT, "out", "cli"), path__namespace.join(cliRoot, "out", "cli"));
  await copyDir(path__namespace.join(ROOT, "out", "reader"), path__namespace.join(cliRoot, "out", "reader"));
  await copyDir(path__namespace.join(ROOT, "skills"), path__namespace.join(cliRoot, "skills"));
  await copyDir(catalogRoot, path__namespace.join(cliRoot, "vasm-catalog"));
  await copyPublicDocs(path__namespace.join(cliRoot, "docs"));
  await copyFile(path__namespace.join(ROOT, "LICENSE"), path__namespace.join(cliRoot, "LICENSE"));
  await writeJson(path__namespace.join(releaseRoot, "manifest.json"), {
    name: pkg.name,
    version: pkg.version,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    artifacts: {
      reader: {
        path: "cli/out/reader",
        serve: "node cli/out/cli/math-workspace.js serve /path/to/project",
        mode: "Primary local read-only interface, bound to 127.0.0.1"
      },
      cli: {
        path: "cli",
        entry: "out/cli/math-workspace.js",
        bin: "math-workspace",
        skillsPath: "cli/skills",
        vasmCatalogPath: "cli/vasm-catalog/vasmc-catalog.yaml",
        install: "Codex installations use the plugin runtime; independent users run this CLI from their selected standalone installation."
      },
      codexMcpPlugin: {
        marketplace: ".agents/plugins/marketplace.json",
        plugin: "plugins/math-workspace",
        command: "./scripts/launch_math_workspace_mcp mcp",
        mode: "Self-contained Codex MCP plugin with bundled CLI and Reader runtime; no global math-workspace command is required."
      },
      skills: {
        path: "skills",
        cliPath: "cli/skills",
        mode: "Codex projects reference installed plugin skills; explicit standalone consumers review these artifacts and preserve project-specific rules"
      },
      vasmCatalog: {
        path: "vasm-catalog",
        index: "vasm-catalog/vasmc-catalog.yaml",
        mode: "VASMC catalog exports; consume with vasmc add --catalog and commit the consumer lockfile."
      },
      docs: {
        path: "docs"
      }
    }
  });
  await writeChecksums(releaseRoot);
  if (options.marketplaceRoot) {
    const published = await syncPluginToMarketplace(pluginSnapshotRoot, options.marketplaceRoot);
    console.log(`Marketplace plugin: ${toPosix(published)}`);
  }
  console.log(`OK release: ${toPosix(path__namespace.relative(ROOT, releaseRoot))}`);
  console.log(`Manifest: ${toPosix(path__namespace.relative(ROOT, path__namespace.join(releaseRoot, "manifest.json")))}`);
  console.log(`Checksums: ${toPosix(path__namespace.relative(ROOT, path__namespace.join(releaseRoot, "checksums.txt")))}`);
}
main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
