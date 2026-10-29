"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("node:fs/promises");
const path = require("node:path");
const publication = require("./index-DcNU1SXc.js");
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
const os = require("node:os");
const { execFile } = require("node:child_process");
function git(root, args) {
  return new Promise((resolve) => execFile("git", ["--no-optional-locks", "--literal-pathspecs", "-c", "core.fsmonitor=false", ...args], {
    cwd: root,
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))), GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_NO_LAZY_FETCH: "1" },
    encoding: "utf8",
    timeout: 5e3,
    maxBuffer: publication.MAX_SNAPSHOT_BYTES + 1024 * 1024,
    windowsHide: true
  }, (error, stdout) => resolve({ code: error ? -1 : 0, stdout: stdout || "" })));
}
function publishedSource(profileId, buildId, receipt, manifest) {
  const profile = manifest.plan?.profile;
  return {
    profileId,
    buildId,
    ...receipt,
    ...typeof profile?.releaseTag === "string" ? { sourceTag: profile.releaseTag.slice(0, 256) } : {},
    ...typeof profile?.releaseCommit === "string" ? { sourceCommit: profile.releaseCommit.slice(0, 256) } : {}
  };
}
async function publicationReceipt(store, build) {
  const remote = await store.remote(build.profileId);
  const receipt = remote?.history?.find((item) => item.buildId === build.id && item.pdfSha256 === build.pdfSha256) || (remote?.status === "published" && remote.upload?.buildId === build.id && remote.upload.pdfSha256 === build.pdfSha256 ? { recordId: remote.recordId || remote.draftId, versionDoi: remote.versionDoi } : void 0);
  if (receipt) return { recordId: receipt.recordId, doi: receipt.versionDoi };
  const verification = (await store.verifications(build.profileId)).find((item) => item.buildId === build.id && item.pdfSha256 === build.pdfSha256 && item.status === "verified");
  if (verification) return { recordId: verification.recordId, doi: verification.versionDoi };
  const repository = await store.repository(build.profileId, build.id);
  if (repository?.status === "published" && !repository.pending && repository.manifestSha256 === build.manifestSha256 && /^[a-f0-9]{40,64}$/.test(repository.commit || "")) return { tag: repository.target.tag, commit: repository.commit };
}
async function gitFile(root, filePath, commit) {
  const real = await fs__namespace.realpath(root), top = await git(real, ["rev-parse", "--show-toplevel"]);
  if (top.code) return;
  const repository = top.stdout.trim(), relative = path__namespace.relative(repository, path__namespace.join(real, filePath)).split(path__namespace.sep).join("/");
  if (relative.startsWith("../")) return;
  const tree = await git(real, ["ls-tree", "-z", "--full-tree", commit, "--", relative]);
  const match = /^(100644|100755) blob ([a-f0-9]{40,64})\t([^\0]+)\0$/.exec(tree.stdout);
  if (tree.code || !match || match[3] !== relative) return;
  return { blob: match[2], mode: match[1] };
}
async function documentHistorySources(root, filePath) {
  const sources = [], warnings = [];
  const store = new publication.PublicationStore(root);
  try {
    for (const profile of await store.profiles()) {
      const id = profile.profile.id;
      for (const build of await store.builds(id)) {
        const receipt = await publicationReceipt(store, build);
        if (!receipt) continue;
        try {
          const manifest = JSON.parse((await store.artifact(id, build.id, "manifest.json")).toString("utf8"));
          const selected = [...manifest.plan.selected.map((page) => page.path), ...manifest.plan.frontMatter.map((item) => item.file), ...manifest.plan.backMatter.map((item) => item.file)];
          if (!selected.includes(filePath)) continue;
          const input = manifest.plan.inputs.find((item) => item.path === filePath);
          if (!input || !/^[a-f0-9]{64}$/.test(input.sha256)) continue;
          const file = await store.directory(`builds/${id}/${build.id}/inputs/${filePath}`), available = await fs__namespace.stat(file).then((stat) => stat.isFile() && stat.size <= publication.MAX_SNAPSHOT_BYTES, () => false);
          const source = publishedSource(id, build.id, receipt, manifest);
          sources.push({
            id: publication.historyId(["publication", id, build.id, filePath]),
            label: build.version,
            kind: "publication",
            contentHash: input.sha256,
            recordedAt: build.createdAt,
            source,
            available,
            artifacts: ["publication.pdf", "lean.zip", "source.zip"].filter((name) => manifest.artifacts[name])
          });
        } catch {
          warnings.push(`Cannot read frozen publication ${id}/${build.id}.`);
        }
      }
    }
  } catch {
    warnings.push("Some local publication records are unavailable.");
  }
  const tags = await git(root, ["for-each-ref", "--count=101", "--sort=-creatordate", "--format=%(refname:strip=2)%09%(creatordate:iso-strict)", "refs/tags"]);
  if (!tags.code) {
    const lines = tags.stdout.trim().split("\n").filter(Boolean);
    if (lines.length > 100) warnings.push("Showing the latest 100 local tags.");
    const deadline = Date.now() + 5e3;
    for (const line of lines.slice(0, 100)) {
      if (Date.now() > deadline) {
        warnings.push("Tag discovery reached its time limit. Some older tags were not inspected.");
        break;
      }
      const [tag, recordedAt] = line.split("	");
      if (!tag || tag.length > 256 || !recordedAt) continue;
      const result = await git(root, ["rev-parse", "--verify", `refs/tags/${tag}^{commit}`]), commit = result.stdout.trim();
      if (result.code || !/^[a-f0-9]{40,64}$/.test(commit)) continue;
      const file = await gitFile(root, filePath, commit);
      if (!file) continue;
      sources.push({ id: publication.historyId(["git-tag", tag, commit, filePath, file.blob]), label: tag, recordedAt, kind: "git-tag", source: { tag, commit }, available: true });
    }
  }
  return { sources, warnings };
}
async function readDocumentHistorySource(root, filePath, id) {
  const candidate = (await documentHistorySources(root, filePath)).sources.find((item) => item.id === id);
  if (!candidate?.available) throw new Error("The historical source is unavailable or changed. Reload its history.");
  let content;
  if (candidate.kind === "publication") {
    const file = await new publication.PublicationStore(root).directory(`builds/${candidate.source.profileId}/${candidate.source.buildId}/inputs/${filePath}`);
    content = await fs__namespace.readFile(file, "utf8");
    if (publication.documentHash(content) !== candidate.contentHash) throw new Error("The frozen publication source changed.");
  } else {
    const file = await gitFile(root, filePath, candidate.source.commit);
    if (!file) throw new Error("The tag no longer contains this regular Markdown file.");
    const blob = await git(root, ["cat-file", "blob", file.blob]);
    if (blob.code) throw new Error("The historical Git blob is unavailable.");
    content = blob.stdout;
  }
  if (Buffer.byteLength(content) > publication.MAX_SNAPSHOT_BYTES || content.includes("\0")) throw new Error("Invalid or oversized historical Markdown.");
  return { entry: {
    id: candidate.id,
    label: candidate.label.slice(0, 80),
    recordedAt: candidate.recordedAt,
    kind: candidate.kind,
    contentHash: publication.documentHash(content),
    source: candidate.source
  }, content };
}
async function documentHistoryHunks(previous, current) {
  if (previous === current) return [];
  if (Buffer.byteLength(previous) > publication.MAX_SNAPSHOT_BYTES || Buffer.byteLength(current) > publication.MAX_SNAPSHOT_BYTES) throw new Error("The comparison exceeds the snapshot limit.");
  const temporary = await require("node:fs/promises").mkdtemp(path__namespace.join(os.tmpdir(), "math-document-compare-"));
  try {
    await fs__namespace.writeFile(path__namespace.join(temporary, "before"), previous);
    await fs__namespace.writeFile(path__namespace.join(temporary, "after"), current);
    const result = await new Promise((resolve, reject) => execFile(
      "git",
      ["--no-optional-locks", "diff", "--no-index", "--no-ext-diff", "--no-textconv", "--no-color", "--text", "--unified=0", "--", "before", "after"],
      { cwd: temporary, env: { PATH: process.env.PATH, HOME: os.homedir(), GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: os.devNull }, encoding: "utf8", timeout: 5e3, maxBuffer: publication.MAX_SNAPSHOT_BYTES },
      (error, stdout) => error && error.code !== 1 ? reject(new Error("Cannot compare the historical manuscript.")) : resolve(stdout)
    ));
    return [...result.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)].map((match) => ({ beforeStartLine: Number(match[1]), beforeCount: match[2] === void 0 ? 1 : Number(match[2]), startLine: Number(match[3]), count: match[4] === void 0 ? 1 : Number(match[4]) }));
  } finally {
    await fs__namespace.rm(temporary, { recursive: true, force: true });
  }
}
async function recordPublishedDocumentMilestones(root, profileId, buildId) {
  const store = new publication.PublicationStore(root), build = await store.build(profileId, buildId), receipt = await publicationReceipt(store, build);
  if (!receipt) throw new Error("No publication acknowledgement binds this frozen build.");
  const manifest = JSON.parse((await store.artifact(profileId, buildId, "manifest.json")).toString("utf8"));
  const config = JSON.parse(await fs__namespace.readFile(await publication.documentSafePath(root, ".math-workspace/config.json"), "utf8"));
  const { readDocumentState, updateDocumentState } = await Promise.resolve().then(() => require("./index-DcNU1SXc.js")).then((n) => n.documentState);
  const selected = [...new Set([...manifest.plan.selected.map((page) => page.path), ...manifest.plan.frontMatter.map((item) => item.file), ...manifest.plan.backMatter.map((item) => item.file)].filter(Boolean))];
  let count = 0;
  for (const filePath of selected) {
    const expected = manifest.plan.inputs.find((item) => item.path === filePath)?.sha256;
    const content = await fs__namespace.readFile(await store.directory(`builds/${profileId}/${buildId}/inputs/${filePath}`), "utf8");
    if (publication.documentHash(content) !== expected) throw new Error("The frozen publication source changed.");
    const current = await fs__namespace.readFile(await publication.documentSafePath(root, filePath), "utf8");
    const documents = /* @__PURE__ */ new Map([[filePath, current]]), id = publication.historyId(["publication", profileId, buildId, filePath]);
    const known = (await readDocumentState(root, config, documents)).records[filePath]?.history?.find((item) => item.id === id);
    if (known && (known.kind !== "publication" || known.contentHash !== expected || known.label !== build.version || known.recordedAt !== build.createdAt)) throw new Error("The immutable publication milestone changed.");
    if (known) await publication.saveDocumentSnapshot(root, content);
    else await updateDocumentState(root, config, documents, { filePath, milestone: {
      content,
      entry: {
        id,
        label: build.version,
        kind: "publication",
        contentHash: expected,
        recordedAt: build.createdAt,
        source: publishedSource(profileId, buildId, receipt, manifest)
      }
    } });
    count++;
  }
  return count;
}
exports.documentHistoryHunks = documentHistoryHunks;
exports.documentHistorySources = documentHistorySources;
exports.readDocumentHistorySource = readDocumentHistorySource;
exports.recordPublishedDocumentMilestones = recordPublishedDocumentMilestones;
