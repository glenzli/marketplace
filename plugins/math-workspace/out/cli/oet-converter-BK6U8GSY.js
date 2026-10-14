"use strict";
const path = require("node:path");
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
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs$6 = require("node:fs/promises");
const crypto$1 = require("node:crypto");
const os$1 = require("node:os");
const MAX_ARCHIVE_BYTES = 192 * 1024 * 1024;
const MAX_ARCHIVE_OBJECTS = 3e4;
const MAX_SOURCE_BYTES = 128 * 1024 * 1024;
const ARCHIVE_DIRECTORY = ".math-archive";
function sha256(data) {
  return crypto$1.createHash("sha256").update(data).digest("hex");
}
function digest(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error("Invalid full SHA-256 digest.");
  return value;
}
function relative(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || /[\0\r\n]/.test(value) || path__namespace.posix.isAbsolute(value) || value.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Archive paths must be normalized project-relative paths.");
  }
  return value;
}
function canonical(value) {
  const encode = (item) => {
    if (item === null || typeof item === "boolean" || typeof item === "string") return JSON.stringify(item);
    if (typeof item === "number" && Number.isSafeInteger(item)) return JSON.stringify(item);
    if (Array.isArray(item)) return "[" + item.map(encode).join(",") + "]";
    if (item && typeof item === "object") {
      return "{" + Object.keys(item).sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))).map((key) => JSON.stringify(key) + ":" + encode(item[key])).join(",") + "}";
    }
    throw new Error("Archive JSON accepts strings, safe integers, booleans, arrays and objects.");
  };
  return Buffer.from(encode(value) + "\n", "utf8");
}
function parseJson(data, exact = false) {
  const value = JSON.parse(data.toString("utf8"));
  if (exact && !canonical(value).equals(data)) throw new Error("Archive JSON bytes are not canonical.");
  return value;
}
async function exists(file) {
  try {
    await fs$6.lstat(file);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
async function safePath(root, name) {
  const parts = relative(name).split("/");
  let current = path__namespace.resolve(root);
  if ((await fs$6.lstat(current)).isSymbolicLink()) throw new Error("Archive roots cannot be symbolic links.");
  for (const part of parts) {
    current = path__namespace.join(current, part);
    try {
      if ((await fs$6.lstat(current)).isSymbolicLink()) throw new Error("Archive paths cannot pass through symbolic links.");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return current;
}
async function readFile(root, name, limit = MAX_ARCHIVE_BYTES) {
  const file = await safePath(root, name);
  const stat = await fs$6.stat(file);
  if (!stat.isFile() || stat.size > limit) throw new Error("Archive input is not a bounded regular file.");
  return fs$6.readFile(file);
}
async function readObject(root, hash) {
  const data = await readFile(root, `objects/${digest(hash)}`);
  if (sha256(data) !== hash) throw new Error(`Archive object has changed: ${hash}`);
  return data;
}
async function writeObject(root, data) {
  const hash = sha256(data);
  await fs$6.mkdir(path__namespace.join(root, "objects"), { recursive: true });
  const file = await safePath(root, `objects/${hash}`);
  try {
    await fs$6.writeFile(file, data, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    if (!(await readObject(root, hash)).equals(data)) throw new Error("Archive object collision.");
  }
  return hash;
}
async function atomicWrite(root, name, data) {
  const file = await safePath(root, name);
  await fs$6.mkdir(path__namespace.dirname(file), { recursive: true });
  const temporary = file + ".tmp-" + crypto$1.randomBytes(12).toString("hex");
  let handle;
  try {
    handle = await fs$6.open(temporary, "wx");
    await handle.writeFile(data);
    await handle.sync();
    await handle.close();
    handle = void 0;
    await fs$6.rename(temporary, file);
  } finally {
    if (handle) await handle.close();
    await fs$6.rm(temporary, { force: true });
  }
}
async function withLock(root, work) {
  const file = await safePath(root, "LOCK.json");
  const token = crypto$1.randomBytes(16).toString("hex");
  try {
    await fs$6.writeFile(file, canonical({ pid: process.pid, host: os$1.hostname(), token }), { flag: "wx" });
  } catch (error) {
    if (error.code === "EEXIST") throw new Error("Another archive operation owns this project. If it exited, use archive recover-lock.");
    throw error;
  }
  try {
    return await work();
  } finally {
    if (parseJson(await readFile(root, "LOCK.json")).token === token) await fs$6.unlink(file);
  }
}
async function recoverLock(root) {
  const data = await readFile(root, "LOCK.json");
  const lock = parseJson(data);
  if (lock.host !== os$1.hostname() || !Number.isInteger(lock.pid) || lock.pid < 1) throw new Error("Cannot recover a lock belonging to another host.");
  try {
    process.kill(lock.pid, 0);
    throw new Error("The archive owner process is still running.");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
  if (!(await readFile(root, "LOCK.json")).equals(data)) throw new Error("The archive lock changed during recovery.");
  await fs$6.unlink(await safePath(root, "LOCK.json"));
}
const { spawn } = require("node:child_process");
const fs$5 = require("node:fs/promises");
const os = require("node:os");
const { URL } = require("node:url");
function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, stdio: ["pipe", "pipe", "pipe"] });
    let output = "", errorOutput = "", overflow = false;
    const timer = setTimeout(() => child.kill("SIGTERM"), options.timeout || 3e4);
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
      if (options.stream) process.stderr.write(chunk);
      options.onOutput?.(String(chunk), "stdout");
      if (output.length > 8 * 1024 * 1024) {
        overflow = true;
        child.kill();
      }
    });
    child.stderr.on("data", (chunk) => {
      errorOutput = (errorOutput + String(chunk)).slice(-16e3);
      if (options.stream) process.stderr.write(chunk);
      options.onOutput?.(String(chunk), "stderr");
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      code === 0 && !overflow ? resolve(output) : reject(new Error(`${command} did not complete (${code}): ${errorOutput}`));
    });
    child.stdin.on("error", () => {
    });
    child.stdin.end(options.input);
  });
}
function deviceAuthentication(output) {
  const pattern = /Enter the verification code ([A-Z0-9-]{4,32}) in your browser at:\s*(https:\/\/[^\s]+)[\r\n]/g;
  for (const match of output.matchAll(pattern)) {
    try {
      const url = new URL(match[2]);
      if (url.origin !== "https://oauth2.sigstore.dev" || url.pathname !== "/auth/device" || url.username || url.password || url.searchParams.get("user_code") !== match[1]) continue;
      return { url: `https://oauth2.sigstore.dev/auth/device?user_code=${encodeURIComponent(match[1])}`, code: match[1] };
    } catch (_) {
    }
  }
}
function normalAuthentication(output) {
  for (const match of output.matchAll(/https:\/\/oauth2\.sigstore\.dev\/[^\s<>"']+(?=[\s<>"'])/g)) {
    try {
      const url = new URL(match[0]), redirect = new URL(url.searchParams.get("redirect_uri") || "");
      if (url.origin !== "https://oauth2.sigstore.dev" || url.pathname !== "/auth/auth" || url.username || url.password || url.hash || url.searchParams.get("client_id") !== "sigstore" || url.searchParams.get("response_type") !== "code" || redirect.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(redirect.hostname) || !redirect.port || redirect.pathname !== "/auth/callback" || redirect.username || redirect.password || redirect.search || redirect.hash || url.href.length > 8e3) continue;
      return { url: url.href, flow: "normal" };
    } catch (_) {
    }
  }
}
function sameIdentity(a, b) {
  return a?.identity === b?.identity && a?.issuer === b?.issuer;
}
function validIdentity(value) {
  if (!value || typeof value.identity !== "string" || !value.identity || value.identity.length > 512 || typeof value.issuer !== "string" || !/^https:\/\//.test(value.issuer) || value.issuer.length > 512) throw new Error("A signing identity and HTTPS OIDC issuer are required.");
  return { identity: value.identity, issuer: value.issuer };
}
class SigstoreVerifier {
  constructor(trustedRoot) {
    this.trustedRoot = trustedRoot;
    this.inspected = /* @__PURE__ */ new Map();
    this.verified = /* @__PURE__ */ new Map();
  }
  async inspect(data) {
    const key = sha256(data);
    const cached = this.inspected.get(key);
    if (cached) return cached;
    const bundle = JSON.parse(data.toString("utf8"));
    const message = bundle?.messageSignature?.messageDigest;
    if (message?.algorithm !== "SHA2_256") throw new Error("A SHA2_256 Sigstore message-signature bundle is required.");
    const material = bundle.verificationMaterial;
    const certificate = Buffer.from(material.certificate.rawBytes, "base64");
    const text = await runProcess("openssl", ["x509", "-inform", "DER", "-text", "-noout"], { input: certificate });
    const identity = text.match(/(?:email:|URI:)([^\s,]+)/)?.[1];
    const issuer = text.match(/1\.3\.6\.1\.4\.1\.57264\.1\.1:\s*\n\s*(\S+)/)?.[1];
    const times = (material.tlogEntries || []).map((item) => Number(item.integratedTime)).filter((time) => Number.isSafeInteger(time) && time > 0);
    const info = {
      digest: digest(Buffer.from(message.digest, "base64").toString("hex")),
      identity: validIdentity({ identity, issuer }),
      loggedAt: times.length ? new Date(Math.min(...times) * 1e3).toISOString() : null,
      timestampCount: material.timestampVerificationData?.rfc3161Timestamps?.length || 0
    };
    this.inspected.set(key, info);
    return info;
  }
  async verify(payload, bundle, identities) {
    const info = await this.inspect(bundle);
    if (sha256(payload) !== info.digest) throw new Error("The bundle does not sign these payload bytes.");
    if (!identities.some((identity) => sameIdentity(identity, info.identity))) throw new Error("The signing identity is not accepted by this project.");
    const trustBytes = this.trustedRoot ? await fs$5.readFile(this.trustedRoot) : Buffer.from("cosign-default-trust");
    const key = [sha256(payload), sha256(bundle), sha256(trustBytes)].join(":");
    if (this.verified.has(key)) return this.verified.get(key);
    const directory = await fs$5.mkdtemp(path__namespace.join(os.tmpdir(), "math-archive-verify-"));
    try {
      await fs$5.writeFile(path__namespace.join(directory, "payload"), payload);
      await fs$5.writeFile(path__namespace.join(directory, "bundle"), bundle);
      const args = [
        "verify-blob",
        path__namespace.join(directory, "payload"),
        "--bundle",
        path__namespace.join(directory, "bundle"),
        "--certificate-identity",
        info.identity.identity,
        "--certificate-oidc-issuer",
        info.identity.issuer,
        "--use-signed-timestamps",
        "--timeout",
        "20s"
      ];
      if (this.trustedRoot) args.push("--trusted-root", this.trustedRoot);
      await runProcess("cosign", args);
      this.verified.set(key, info);
      return info;
    } finally {
      await fs$5.rm(directory, { recursive: true, force: true });
    }
  }
}
async function defaultVerifier(explicit) {
  const requested = explicit || process.env.MATH_WORKSPACE_SIGSTORE_TRUSTED_ROOT;
  if (requested && !await exists(requested)) throw new Error("The configured Sigstore trusted-root file does not exist.");
  const cached = path__namespace.join(os.homedir(), ".sigstore/root/tuf-repo-cdn.sigstore.dev/targets/trusted_root.json");
  return new SigstoreVerifier(requested || (await exists(cached) ? cached : void 0));
}
function validWorkId(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(value)) throw new Error("Invalid stable work identifier.");
  return value;
}
function validScope(value) {
  if (!value || !Array.isArray(value.paths) || !value.paths.length || value.paths.length > 128 || !Array.isArray(value.extensions) || !value.extensions.length || value.extensions.some((item) => typeof item !== "string" || !/^\.[a-zA-Z0-9]+$/.test(item))) throw new Error("An explicit archive file scope is required.");
  const paths = value.paths.map(relative);
  if (new Set(paths).size !== paths.length) throw new Error("Archive scope paths must be unique.");
  if (value.maxDepth !== void 0 && (!Number.isSafeInteger(value.maxDepth) || value.maxDepth < 1 || value.maxDepth > 100)) throw new Error("Invalid archive scope depth.");
  if (value.exclude !== void 0 && (!Array.isArray(value.exclude) || value.exclude.length > 128)) throw new Error("Invalid archive exclusions.");
  return {
    paths: [...paths].sort(),
    extensions: [...new Set(value.extensions)].sort(),
    ...value.maxDepth !== void 0 ? { maxDepth: value.maxDepth } : {},
    ...value.exclude !== void 0 ? { exclude: [...new Set(value.exclude.map(relative))].sort() } : {}
  };
}
function fileMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > 3e4) throw new Error("Invalid archive file map.");
  return Object.fromEntries(Object.entries(value).map(([name, hash]) => [relative(name), digest(hash)]));
}
const sameJson = (a, b) => canonical(a).equals(canonical(b));
const matchesPath = (name, prefix) => name === prefix || name.startsWith(prefix + "/");
function inScope(name, scope) {
  if (name.split("/").some((part) => part === ".git" || part === ".math-archive") || scope.exclude?.some((prefix) => matchesPath(name, prefix))) return false;
  return scope.paths.some((prefix) => name === prefix || name.startsWith(prefix + "/") && scope.extensions.includes(path__namespace.extname(name).toLowerCase()) && name.slice(prefix.length + 1).split("/").length <= (scope.maxDepth || 100) && !name.slice(prefix.length + 1).split("/").some((part) => part.startsWith(".")));
}
function validPolicy(value) {
  if (value?.schema !== "math-workspace.archive-policy/v1" || typeof value.title !== "string" || !value.title || value.title.length > 300 || !Array.isArray(value.identities) || !value.identities.length || value.identities.length > 32) throw new Error("Invalid academic archive policy.");
  const identities = value.identities.map(validIdentity), signingIdentity = validIdentity(value.signingIdentity);
  if (!identities.some((identity) => sameIdentity(identity, signingIdentity))) throw new Error("The active signer must be an accepted project identity.");
  const scope = validScope(value.scope);
  let volumes;
  if (value.volumes !== void 0) {
    if (!Array.isArray(value.volumes) || value.volumes.length > 128) throw new Error("Invalid declared archive volumes.");
    const ids = /* @__PURE__ */ new Set(), prefixes = [];
    volumes = value.volumes.map((volume) => {
      const id = validWorkId(volume?.id);
      if (ids.has(id)) throw new Error("Archive volume identifiers must be unique.");
      ids.add(id);
      if (typeof volume.title !== "string" || !volume.title || volume.title.length > 200 || !Array.isArray(volume.paths) || !volume.paths.length || volume.paths.length > 128) throw new Error("A volume requires a title and explicit paths.");
      const paths = volume.paths.map(relative).sort();
      for (const prefix of paths) {
        if (!scope.paths.some((root) => matchesPath(prefix, root)) || scope.exclude?.some((exclude) => matchesPath(prefix, exclude))) throw new Error("A declared volume path is outside the archive scope.");
        if (prefixes.some((old) => matchesPath(prefix, old) || matchesPath(old, prefix))) throw new Error("Declared volume paths overlap.");
        prefixes.push(prefix);
      }
      return { id, title: volume.title, paths };
    }).sort((a, b) => a.id.localeCompare(b.id));
  }
  return {
    schema: value.schema,
    workId: validWorkId(value.workId),
    title: value.title,
    scope,
    identities,
    signingIdentity,
    ...volumes !== void 0 ? { volumes } : {}
  };
}
function partitionFiles(files, policy) {
  const volumes = (policy.volumes || []).map((volume) => ({ ...volume, files: {} }));
  const outside = {};
  for (const [name, hash] of Object.entries(fileMap(files))) {
    if (!inScope(name, policy.scope)) throw new Error("A snapshot file is outside its signed scope.");
    const matches = volumes.filter((volume) => volume.paths.some((prefix) => matchesPath(name, prefix)));
    if (matches.length > 1) throw new Error("A snapshot file belongs to overlapping volumes.");
    if (matches.length) {
      matches[0].files[name] = hash;
    } else outside[name] = hash;
  }
  return { volumes, outside };
}
const crypto = require("node:crypto");
function pointer(value, recordKey = "record", bundleKey = "bundle") {
  return value === null ? null : { record: digest(value?.[recordKey]), bundle: digest(value?.[bundleKey]) };
}
async function checkFiles(context, files) {
  const missing = [];
  for (const [name, hash] of Object.entries(files)) {
    try {
      await context.object(hash);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      missing.push({ path: name, expected: hash });
    }
  }
  return missing;
}
const nativeFormat = {
  id: "math-workspace.archive-record/v1",
  async project(context) {
    const record = parseJson(context.payload, true);
    if (record.schema !== this.id || !Number.isSafeInteger(record.sequence) || record.sequence < 1 || typeof record.label !== "string" || record.label.length > 200 || typeof record.preparedAt !== "string" || !Array.isArray(record.imports) || record.imports.some((item) => typeof item !== "string")) throw new Error("Invalid native archive record.");
    const scope = validScope(record.scope);
    const previous = pointer(record.previous);
    if (record.sequence === 1 !== (previous === null)) throw new Error("Invalid archive sequence predecessor.");
    const files = fileMap(record.files);
    if (!Object.keys(files).length) throw new Error("An archive snapshot cannot be empty.");
    if (Object.keys(files).some((name) => !inScope(name, scope))) throw new Error("A snapshot file is outside its signed scope.");
    const missing = await checkFiles(context, files);
    for (const hash of record.imports) {
      const imported = parseJson(await context.object(digest(hash)), true);
      if (imported.schema !== "math-workspace.archive-import/v1" || imported.workId !== record.workId || !Array.isArray(imported.objects)) throw new Error("A native archive import binding is invalid.");
      for (const objectHash of imported.objects) {
        try {
          await context.object(digest(objectHash));
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
    }
    return {
      workId: validWorkId(record.workId),
      label: record.label,
      kind: "snapshot",
      files,
      missing,
      sequence: record.sequence,
      previous,
      imports: record.imports.map(digest),
      signer: validIdentity(record.signer),
      ...record.sourceLocator ? { sourceLocator: record.sourceLocator } : {}
    };
  }
};
async function signedPolicy(context, record) {
  const policyDigest = digest(record.policy), bytes = await context.object(policyDigest);
  const raw = parseJson(bytes, true), policy = validPolicy(raw);
  if (sha256(bytes) !== policyDigest || !sameJson(raw, policy) || record.workId !== policy.workId || !sameJson(validIdentity(record.signer), policy.signingIdentity)) throw new Error("The signed archive policy, work or author identity differs.");
  if (typeof record.preparedAt !== "string" || !Number.isFinite(Date.parse(record.preparedAt))) throw new Error("Invalid archive preparation time.");
  return { policy, policyDigest };
}
const volumeFormat = {
  id: "math-workspace.archive-volume/v1",
  async project(context) {
    const record = parseJson(context.payload, true);
    if (record.schema !== this.id) throw new Error("Invalid archive volume payload.");
    const { policy, policyDigest } = await signedPolicy(context, record);
    const volume = policy.volumes?.find((item) => item.id === record.volumeId);
    if (!volume || volume.title !== record.title) throw new Error("The volume is not declared by its signed policy.");
    const files = fileMap(record.files), partition = partitionFiles(files, policy);
    if (!sameJson(partition.volumes.find((item) => item.id === volume.id).files, files)) throw new Error("A volume includes a file outside its declared mapping.");
    const missing = await checkFiles(context, files);
    return {
      workId: policy.workId,
      label: volume.title,
      kind: "volume",
      volumeId: volume.id,
      policyDigest,
      files,
      missing,
      signer: policy.signingIdentity
    };
  }
};
const totalFormat = {
  id: "math-workspace.archive-total/v1",
  async project(context) {
    const record = parseJson(context.payload, true);
    if (record.schema !== this.id || !Number.isSafeInteger(record.sequence) || record.sequence < 1 || typeof record.label !== "string" || !record.label || record.label.length > 200 || !Array.isArray(record.imports) || !Array.isArray(record.volumes)) throw new Error("Invalid archive total payload.");
    const { policy, policyDigest } = await signedPolicy(context, record), scope = validScope(record.scope);
    if (!sameJson(scope, policy.scope)) throw new Error("The total scope differs from its signed policy.");
    const previous = pointer(record.previous);
    if (record.sequence === 1 !== (previous === null)) throw new Error("Invalid archive total predecessor.");
    const files = fileMap(record.files);
    if (!Object.keys(files).length) throw new Error("An archive total cannot be empty.");
    const partition = partitionFiles(files, policy);
    const volumes = record.volumes.map((item) => ({ id: validWorkId(item.id), record: digest(item.record), bundle: digest(item.bundle) }));
    if (volumes.length !== partition.volumes.length || new Set(volumes.map((item) => item.id)).size !== volumes.length) throw new Error("Total volume mappings are missing, additional or repeated.");
    for (const volume of partition.volumes) {
      const receipt = volumes.find((item) => item.id === volume.id);
      if (!receipt) throw new Error("A declared volume is missing from the total.");
      const payload = await context.object(receipt.record), bundle = await context.object(receipt.bundle);
      if (sha256(payload) !== receipt.record || sha256(bundle) !== receipt.bundle) throw new Error("A total volume receipt digest differs.");
      const projected = await volumeFormat.project({ ...context, input: { format: volumeFormat.id, payload: receipt.record, bundle: receipt.bundle }, payload });
      if (projected.volumeId !== volume.id || projected.policyDigest !== policyDigest || !sameJson(projected.files, volume.files)) throw new Error("A total does not bind the exact declared volume file map and policy.");
    }
    const imports = record.imports.map(digest);
    if (new Set(imports).size !== imports.length) throw new Error("Total imports must be unique.");
    for (const hash of imports) {
      const imported = parseJson(await context.object(hash), true);
      if (imported.schema !== "math-workspace.archive-import/v1" || imported.workId !== policy.workId || !Array.isArray(imported.objects)) throw new Error("A total import binding is invalid.");
    }
    return {
      workId: policy.workId,
      label: record.label,
      kind: "total",
      policyDigest,
      files,
      missing: await checkFiles(context, files),
      sequence: record.sequence,
      previous,
      imports,
      signer: policy.signingIdentity,
      volumes,
      outside: partition.outside,
      ...record.sourceLocator ? { sourceLocator: record.sourceLocator } : {}
    };
  }
};
const HASHES = [["SHA-256", "sha256", 64], ["SHA-512", "sha512", 128], ["BLAKE2b", "blake2b512", 128]];
function manifestMembers(data) {
  const blocks = data.toString("utf8").split(/^## /m).slice(1);
  if (!blocks.length) throw new Error("OET manifest has no members.");
  const seen = /* @__PURE__ */ new Set();
  return blocks.map((block) => {
    const name = relative(block.split("\n")[0].replace(/^\[(Root Component|Volume Bundle)\] /, "").replace(/^\.\//, "").trimEnd());
    if (seen.has(name)) throw new Error("OET manifest repeats a member path.");
    seen.add(name);
    const hashes = {};
    for (const [label, , length] of HASHES) {
      const matches = [...block.matchAll(new RegExp("^" + label + ":\\s+([0-9a-f]+)\\s*$", "gm"))];
      if (matches.length !== 1 || matches[0][1].length !== length) throw new Error(`Invalid ${label} in OET manifest.`);
      hashes[label] = matches[0][1];
    }
    return { path: name, hashes };
  });
}
function verifyMember(data, member) {
  for (const [label, algorithm] of HASHES) if (crypto.createHash(algorithm).update(data).digest("hex") !== member.hashes[label]) {
    throw new Error(`OET manifest hash mismatch: ${member.path}`);
  }
}
async function walkManifest(context, rootManifest, files, allowedMissing = []) {
  const visited = /* @__PURE__ */ new Set(), missing = [];
  const rootDirectory = path__namespace.posix.dirname(rootManifest);
  const visit = async (name) => {
    if (visited.has(name)) return;
    visited.add(name);
    const data = await context.object(files[name]);
    if (!name.endsWith("MANIFEST.txt")) return;
    for (const member of manifestMembers(data)) {
      const target = relative(path__namespace.posix.join(path__namespace.posix.dirname(name), member.path));
      if (rootDirectory !== "." && !target.startsWith(rootDirectory + "/")) throw new Error("OET manifest escapes its signed scope.");
      if (!Object.hasOwn(files, target)) {
        const declared = allowedMissing.find((row) => row.path === target);
        if (!declared || !canonical(declared.expected_hashes).equals(canonical(member.hashes))) throw new Error(`Missing OET evidence: ${target}`);
        missing.push({ path: target, expected: member.hashes["SHA-256"] });
        continue;
      }
      const content = await context.object(files[target]);
      verifyMember(content, member);
      await visit(target);
    }
  };
  await visit(rootManifest);
  if (missing.length !== allowedMissing.length) throw new Error("OET unresolved references do not match the signed manifests.");
  return { visited, missing };
}
const oetLegacyFormat = {
  id: "oet.legacy-signatures/v1",
  async project(context) {
    const indexHash = digest(context.input.metadata?.index);
    const index = parseJson(await context.object(indexHash), true);
    if (index.schema !== this.id || !Array.isArray(index.records)) throw new Error("Invalid OET legacy archive index.");
    const candidates = index.records.filter((record2) => record2.bundle_sha256 === context.input.bundle);
    if (candidates.length !== 1 || candidates[0].manifest_sha256 !== context.input.payload) throw new Error("OET archive record does not identify the original signature.");
    const record = candidates[0];
    const rootManifest = relative(record.origin.bundle_path.replace(/\.bundle$/, ".txt"));
    const files = fileMap(record.closure.files);
    if (files[rootManifest] !== context.input.payload) throw new Error("OET closure omits its signed manifest.");
    const { visited, missing } = await walkManifest(context, rootManifest, files, record.closure.unresolved);
    if (visited.size !== Object.keys(files).length || record.closure.complete !== !missing.length) throw new Error("OET closure includes unbound files or an incorrect completeness claim.");
    for (const item of [...record.closure.recovered, ...record.closure.unresolved]) {
      for (const key of ["original_object_sha256", "observed_object_sha256"]) if (item[key]) await context.object(digest(item[key]));
    }
    const roots = index.historical_project_paths.map(relative);
    const sourceRoot = roots.find((root) => rootManifest.startsWith(root + "/"));
    if (!sourceRoot) throw new Error("OET source locator is outside its declared project.");
    const sourceFiles = Object.fromEntries(Object.entries(files).filter(([name]) => name.endsWith(".md")));
    return {
      workId: validWorkId(index.work_id),
      label: path__namespace.posix.dirname(rootManifest),
      kind: record.kind === "root" ? "root" : "volume",
      files: sourceFiles,
      missing,
      sourceLocator: { ...record.origin, historicalProjectPath: sourceRoot, binding: "imported Git locator; file bytes are checked against original manifests" }
    };
  }
};
const oetRecordFormat = {
  id: "oet.sign-record/v1",
  async project(context) {
    const record = parseJson(context.payload, true);
    if (record.schema !== this.id || !Number.isSafeInteger(record.sequence) || record.sequence < 1 || record.snapshot?.scope !== "root-markdown-and-direct-child-markdown/v1") throw new Error("Invalid OET continuation record.");
    const files = fileMap(record.snapshot.files);
    if (files["MANIFEST.txt"] !== digest(record.snapshot.root_manifest_sha256)) throw new Error("OET continuation root manifest differs.");
    await checkFiles(context, files);
    const { visited, missing } = await walkManifest(context, "MANIFEST.txt", files);
    const additionalSignatures = [];
    const allowedFiles = new Set(visited);
    for (const name of visited) {
      if (!name.endsWith("MANIFEST.txt")) continue;
      const bundlePath = name.replace(/\.txt$/, ".bundle");
      if (!Object.hasOwn(files, bundlePath)) throw new Error("OET continuation lacks a manifest bundle.");
      allowedFiles.add(bundlePath);
      additionalSignatures.push({ payload: files[name], bundle: files[bundlePath] });
    }
    if (Object.keys(files).some((name) => !allowedFiles.has(name))) throw new Error("OET continuation has unbound source files.");
    const markdown = Object.keys(files).filter((name) => name.endsWith(".md"));
    const directories = /* @__PURE__ */ new Set([".", ...markdown.map((name) => path__namespace.posix.dirname(name))]);
    const expectedFiles = new Set(markdown);
    for (const directory of directories) {
      const prefix2 = directory === "." ? "" : directory + "/";
      expectedFiles.add(prefix2 + "MANIFEST.txt");
      expectedFiles.add(prefix2 + "MANIFEST.bundle");
      const expectedMembers = directory === "." ? [...markdown.filter((name) => !name.includes("/")), ...[...directories].filter((name) => name !== ".").map((name) => name + "/MANIFEST.txt")] : markdown.filter((name) => path__namespace.posix.dirname(name) === directory).map((name) => path__namespace.posix.basename(name));
      const members = manifestMembers(await context.object(files[prefix2 + "MANIFEST.txt"])).map((member) => member.path).sort();
      if (!canonical(members).equals(canonical(expectedMembers.sort()))) throw new Error("OET manifest membership differs from its declared snapshot.");
    }
    if (Object.keys(files).length !== expectedFiles.size || Object.keys(files).some((name) => !expectedFiles.has(name))) throw new Error("OET continuation scope includes unsupported files.");
    for (const name of markdown) {
      const parts = name.split("/");
      if (parts.length > 2 || parts.some((part) => part.startsWith(".")) || parts.length === 2 && ["tools", "scripts", "release", "formal-oet"].includes(parts[0])) throw new Error("OET source is outside its declared scope.");
      const content = (await context.object(files[name])).toString("utf8");
      const footer = content.match(/\*\[OE\][^\n]*⊢ \[([0-9a-f]{16})\]\*\s*$/);
      const body = content.replace(/(?:\n*(?:-{3,}\s*\n)?\*\[(?:IDFS|OE)\][^*\n]*\*\s*)+$/, "").replace(/\n+$/, "") + "\n";
      if (!footer || sha256(Buffer.from(body)).slice(0, 16) !== footer[1]) throw new Error("OET content footer does not match the archived source.");
    }
    const previous = pointer(record.previous, "record_sha256", "bundle_sha256");
    if (record.sequence === 1 !== (previous === null)) throw new Error("Invalid OET continuation sequence.");
    if (record.sequence === 1) {
      const legacy = parseJson(await context.object(digest(record.legacy_archive_sha256)), true);
      if (legacy.schema !== "oet.legacy-signatures/v1" || legacy.work_id !== record.work_id) throw new Error("OET continuation references another legacy archive.");
    } else if (record.legacy_archive_sha256 !== null) throw new Error("Only the first OET continuation can bind a legacy archive.");
    const prefix = relative(record.source_locator?.project_path);
    const locatedFiles = Object.fromEntries(Object.entries(files).filter(([name]) => name.endsWith(".md")).map(([name, hash]) => [prefix + "/" + name, hash]));
    return {
      workId: validWorkId(record.work_id),
      label: `OET #${record.sequence}`,
      kind: "snapshot",
      files: locatedFiles,
      missing,
      sequence: record.sequence,
      previous,
      signer: validIdentity(record.signer),
      additionalSignatures,
      ...record.sequence === 1 ? { legacyArchive: record.legacy_archive_sha256 } : {},
      sourceLocator: record.source_locator
    };
  }
};
const archiveFormats = new Map(
  [nativeFormat, volumeFormat, totalFormat, oetLegacyFormat, oetRecordFormat].map((format) => [format.id, format])
);
async function projectArchiveRecord(context) {
  digest(context.input.payload);
  digest(context.input.bundle);
  if (sha256(context.payload) !== context.input.payload) throw new Error("Archive payload digest differs.");
  const format = archiveFormats.get(context.input.format);
  if (!format) throw new Error(`Unsupported archive format: ${context.input.format}`);
  return format.project(context);
}
const fs$4 = require("node:fs/promises");
function inputId(input) {
  return sha256(canonical(input));
}
function selectRecord(records, selector) {
  digest(selector);
  const exact = records.find((record) => record.id === selector);
  if (exact) return exact;
  const matches = records.filter((record) => record.payload === selector);
  if (matches.length !== 1) throw new Error(matches.length ? "The archive payload selector is ambiguous; use its record ID." : "Archive record not found.");
  return matches[0];
}
function inputRecord(value) {
  if (!value || typeof value.format !== "string" || !archiveFormats.has(value.format)) throw new Error("Unknown archive evidence format.");
  if (value.metadata !== void 0 && (!value.metadata || typeof value.metadata !== "object" || Array.isArray(value.metadata))) throw new Error("Archive metadata must be an object.");
  return { format: value.format, payload: digest(value.payload), bundle: digest(value.bundle), ...value.metadata ? { metadata: value.metadata } : {} };
}
async function readHead(store) {
  if (!await exists(path__namespace.join(store, "HEAD.json"))) return null;
  const head = parseJson(await readFile(store, "HEAD.json"), true);
  if (head.schema !== "math-workspace.archive-head/v1" || !Number.isSafeInteger(head.sequence) || head.sequence < 1) throw new Error("Invalid archive head.");
  return { pointer: { record: digest(head.record), bundle: digest(head.bundle) }, sequence: head.sequence };
}
async function readRetainedHeads(store) {
  if (!await exists(path__namespace.join(store, "retained-heads.json"))) return [];
  const value = parseJson(await readFile(store, "retained-heads.json"), true);
  if (value.schema !== "math-workspace.archive-retained-heads/v1" || !Array.isArray(value.heads) || value.heads.length > 5e3) throw new Error("Invalid retained archive heads.");
  return value.heads.map((head) => {
    if (!Number.isSafeInteger(head.sequence) || head.sequence < 1) throw new Error("Invalid retained archive sequence.");
    return { pointer: { record: digest(head.record), bundle: digest(head.bundle) }, sequence: head.sequence };
  });
}
async function readCatalog(store, policy) {
  const imports = [], inputs = [], objects = /* @__PURE__ */ new Set();
  const importDir = await safePath(store, "imports");
  if (await exists(importDir)) {
    const names = (await fs$4.readdir(importDir)).sort();
    if (names.length > 5e3) throw new Error("Too many archive imports.");
    for (const name of names) {
      if (!/^[a-f0-9]{64}\.json$/.test(name)) throw new Error("Unexpected archive import file.");
      const data = await readFile(store, `imports/${name}`), hash = digest(name.slice(0, -5));
      if (sha256(data) !== hash) throw new Error("An immutable archive import has changed.");
      const index = parseJson(data, true);
      if (index.schema !== "math-workspace.archive-import/v1" || index.workId !== policy.workId || !Array.isArray(index.records) || !Array.isArray(index.objects) || index.objects.length > MAX_ARCHIVE_OBJECTS) throw new Error("Invalid archive import index.");
      imports.push(hash);
      objects.add(hash);
      index.objects.forEach((hash2) => objects.add(digest(hash2)));
      inputs.push(...index.records.map(inputRecord));
    }
  }
  const head = await readHead(store);
  const retained = await readRetainedHeads(store);
  const seen = /* @__PURE__ */ new Map();
  const volumeInputs = [];
  const walk = async (start) => {
    let pointer2 = start?.pointer || null, sequence = start?.sequence || 0;
    const chain = /* @__PURE__ */ new Set();
    while (pointer2) {
      if (chain.has(pointer2.record)) throw new Error("Archive chain contains a cycle.");
      chain.add(pointer2.record);
      if (seen.has(pointer2.record)) {
        const old = seen.get(pointer2.record);
        if (old.bundle !== pointer2.bundle || old.sequence !== sequence) throw new Error("Retained archive predecessor bundle or sequence differs.");
        break;
      }
      const payload = await readFile(store, `entries/${pointer2.record}/record.json`);
      const bundle = await readFile(store, `entries/${pointer2.record}/record.bundle`);
      if (sha256(payload) !== pointer2.record || sha256(bundle) !== pointer2.bundle) throw new Error("Archive chain receipt has changed.");
      const record = parseJson(payload, true);
      if (!["math-workspace.archive-record/v1", "math-workspace.archive-total/v1"].includes(record.schema) || record.workId !== policy.workId || record.sequence !== sequence) throw new Error("Archive chain sequence or work identity differs.");
      seen.set(pointer2.record, { bundle: pointer2.bundle, sequence });
      inputs.push({ format: record.schema, payload: pointer2.record, bundle: pointer2.bundle });
      objects.add(pointer2.record);
      objects.add(pointer2.bundle);
      Object.values(record.files || {}).forEach((hash) => objects.add(digest(hash)));
      if (record.schema === "math-workspace.archive-total/v1") {
        objects.add(digest(record.policy));
        if (!Array.isArray(record.volumes)) throw new Error("Invalid total volume bindings.");
        for (const item of record.volumes) {
          const payload2 = digest(item.record), bundle2 = digest(item.bundle);
          volumeInputs.push({ format: "math-workspace.archive-volume/v1", payload: payload2, bundle: bundle2 });
          objects.add(payload2);
          objects.add(bundle2);
        }
      }
      if (!Array.isArray(record.imports) || record.imports.some((hash) => !imports.includes(digest(hash)))) throw new Error("An archive import bound by the chain is missing.");
      pointer2 = record.previous === null ? null : { record: digest(record.previous?.record), bundle: digest(record.previous?.bundle) };
      sequence--;
    }
    if (!pointer2 && sequence !== 0) throw new Error("Archive chain ended before its first entry.");
  };
  await walk(head);
  for (const old of retained) await walk(old);
  inputs.push(...volumeInputs);
  const entryDir = await safePath(store, "entries");
  const orphans = await exists(entryDir) ? (await fs$4.readdir(entryDir)).filter((name) => !seen.has(name)).map(digest) : [];
  const unique = /* @__PURE__ */ new Map();
  for (const input of inputs) {
    const key = `${input.format}:${input.payload}:${input.bundle}`;
    const old = unique.get(key);
    if (old && inputId(old) !== inputId(input)) throw new Error("Duplicate signature has conflicting import metadata.");
    unique.set(key, input);
  }
  return { inputs: [...unique.values()], imports, objects, head: head?.pointer || null, sequence: head?.sequence || 0, orphans };
}
async function projectInputs(inputs, object, policy, verifier, verify = false, progress = () => {
}) {
  const views = [];
  for (const [index, input] of inputs.entries()) {
    const payload = await object(input.payload), bundle = await object(input.bundle);
    const projection = await projectArchiveRecord({ input, payload, object });
    if (projection.workId !== policy.workId) throw new Error("Imported evidence belongs to another work.");
    const info = verify ? await verifier.verify(payload, bundle, policy.identities) : await verifier.inspect(bundle);
    if (info.digest !== input.payload) throw new Error("Archive payload and bundle do not match.");
    if (!policy.identities.some((identity) => sameIdentity(identity, info.identity))) throw new Error("Archive signer is not accepted by the project policy.");
    if (projection.signer && !sameIdentity(projection.signer, info.identity)) throw new Error("The signed author identity differs from the signing certificate.");
    if (verify) for (const extra of projection.additionalSignatures || []) await verifier.verify(await object(extra.payload), await object(extra.bundle), policy.identities);
    views.push({
      ...projection,
      id: inputId(input),
      format: input.format,
      payload: input.payload,
      bundle: input.bundle,
      identity: info.identity,
      loggedAt: info.loggedAt,
      timestampCount: info.timestampCount,
      verification: verify ? "verified" : "unchecked",
      contentComplete: projection.missing.length === 0
    });
    progress(index + 1, inputs.length);
  }
  const byReceipt = new Map(views.map((view) => [`${view.payload}:${view.bundle}`, view]));
  for (const view of views) {
    if (view.legacyArchive) {
      const index = parseJson(await object(view.legacyArchive), true);
      for (const row of index.records) if (!byReceipt.has(`${row.manifest_sha256}:${row.bundle_sha256}`)) throw new Error("The OET continuation is missing a bound legacy signature.");
    }
    for (const hash of view.imports || []) {
      const imported = parseJson(await object(hash), true);
      for (const input of imported.records) if (!byReceipt.has(`${input.payload}:${input.bundle}`)) throw new Error("A snapshot is missing a signature from its bound import.");
    }
    for (const receipt of view.volumes || []) {
      const volume = byReceipt.get(`${receipt.record}:${receipt.bundle}`);
      if (!volume || volume.format !== "math-workspace.archive-volume/v1" || volume.volumeId !== receipt.id || volume.policyDigest !== view.policyDigest || !sameIdentity(volume.identity, view.identity)) throw new Error("A total is missing the exact original volume signature.");
    }
    if (!view.previous) continue;
    const previous = byReceipt.get(`${view.previous.record}:${view.previous.bundle}`);
    if (!previous || previous.sequence !== view.sequence - 1 || !(previous.format === view.format || view.format === "math-workspace.archive-total/v1" && previous.format === "math-workspace.archive-record/v1")) throw new Error("Archive predecessor or original predecessor bundle is missing.");
  }
  return views.sort((a, b) => (b.loggedAt || "").localeCompare(a.loggedAt || "") || a.id.localeCompare(b.id));
}
function cachedObjects(store) {
  const cache = /* @__PURE__ */ new Map();
  return (hash) => {
    digest(hash);
    if (!cache.has(hash)) cache.set(hash, readObject(store, hash));
    return cache.get(hash);
  };
}
async function importExchange(store, policy, exchange, verifier, progress) {
  if (exchange?.schema !== "math-workspace.archive-exchange/v1" || exchange.workId !== policy.workId || !Array.isArray(exchange.records) || !exchange.records.length || exchange.records.length > 1e4 || !exchange.objects || typeof exchange.objects !== "object" || Array.isArray(exchange.objects)) throw new Error("Invalid academic archive exchange document.");
  const hashes = Object.keys(exchange.objects);
  if (hashes.length > MAX_ARCHIVE_OBJECTS) throw new Error("Archive exchange has too many objects.");
  let totalBytes = 0;
  const bytes = /* @__PURE__ */ new Map();
  for (const hash of hashes) {
    digest(hash);
    const encoded = exchange.objects[hash];
    if (typeof encoded !== "string") throw new Error("Archive objects must use base64.");
    const data2 = Buffer.from(encoded, "base64");
    if (data2.toString("base64") !== encoded || sha256(data2) !== hash) throw new Error("Archive exchange object bytes do not match their full digest.");
    totalBytes += data2.length;
    if (totalBytes > MAX_ARCHIVE_BYTES) throw new Error("Archive exchange exceeds its byte limit.");
    bytes.set(hash, data2);
  }
  const object = async (hash) => {
    const data2 = bytes.get(digest(hash));
    if (!data2) {
      const error = new Error(`Exchange is missing original evidence: ${hash}`);
      error.code = "ENOENT";
      throw error;
    }
    return data2;
  };
  const records = exchange.records.map(inputRecord);
  await projectInputs(records, object, policy, verifier, true, progress);
  const index = { schema: "math-workspace.archive-import/v1", workId: policy.workId, records, objects: hashes.sort() };
  const data = canonical(index), imported = sha256(data);
  return withLock(store, async () => {
    const livePolicy = parseJson(await readFile(store, "policy.json"));
    if (!canonical(livePolicy).equals(canonical(policy))) throw new Error("Archive policy changed during import.");
    const before = await readCatalog(store, policy);
    const allInputs = [...before.inputs, ...records];
    const combined = /* @__PURE__ */ new Map();
    for (const input of allInputs) {
      const key = `${input.format}:${input.payload}:${input.bundle}`, existing = combined.get(key);
      if (existing && inputId(existing) !== inputId(input)) throw new Error("Import would alter metadata for an existing receipt.");
      combined.set(key, input);
    }
    await fs$4.mkdir(path__namespace.join(store, "imports"), { recursive: true });
    const target = await safePath(store, `imports/${imported}.json`);
    const alreadyPresent = await exists(target);
    if (alreadyPresent) {
      if (!(await readFile(store, `imports/${imported}.json`)).equals(data)) throw new Error("Imported index was modified.");
      for (const hash of hashes) if (!(await readObject(store, hash)).equals(bytes.get(hash))) throw new Error("Imported object was modified.");
    } else {
      for (const value of bytes.values()) await writeObject(store, value);
      await writeObject(store, data);
      await fs$4.writeFile(target, data, { flag: "wx" });
    }
    return { imported, records: records.length, objects: hashes.length, alreadyPresent };
  });
}
async function exportExchange(store, policy, recordId) {
  const catalog = await readCatalog(store, policy);
  let inputs = catalog.inputs, hashes = catalog.objects;
  if (recordId) {
    const selected = selectRecord(catalog.inputs.map((item) => ({ ...item, id: inputId(item) })), recordId);
    const { id: _, ...input } = selected;
    if (input.format === "math-workspace.archive-volume/v1") {
      const payload = await readObject(store, input.payload), object = cachedObjects(store);
      const projection = await projectArchiveRecord({ input, payload, object });
      inputs = [input];
      hashes = /* @__PURE__ */ new Set([input.payload, input.bundle, projection.policyDigest, ...Object.values(projection.files)]);
    }
  }
  const objects = {};
  let total = 0;
  for (const hash of [...hashes].sort()) {
    let data;
    try {
      data = await readObject(store, hash);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      continue;
    }
    total += data.length;
    if (total > MAX_ARCHIVE_BYTES) throw new Error("Archive export exceeds its byte limit.");
    objects[hash] = data.toString("base64");
  }
  for (const input of inputs) if (!objects[input.payload] || !objects[input.bundle]) throw new Error("Archive export is missing original signature evidence.");
  return { schema: "math-workspace.archive-exchange/v1", workId: policy.workId, records: inputs, objects };
}
const fs$3 = require("node:fs/promises");
async function captureSource(projectRoot, scope) {
  scope = validScope(scope);
  const files = /* @__PURE__ */ new Map();
  let total = 0;
  const excluded = /* @__PURE__ */ new Set([".git", ".math-archive", ".signatures", "node_modules", "out", "dist"]);
  const visit = async (name, depth, explicit) => {
    const file = await safePath(projectRoot, name), stat = await fs$3.lstat(file);
    if (stat.isSymbolicLink()) throw new Error("Snapshot inputs cannot be symbolic links.");
    if (scope.exclude?.some((prefix) => name === prefix || name.startsWith(prefix + "/"))) return;
    if (name.split("/").includes(ARCHIVE_DIRECTORY) || name.split("/").includes(".git")) throw new Error("An archive cannot include itself or Git internals.");
    if (stat.isDirectory()) {
      if (depth >= (scope.maxDepth || 100)) return;
      const names = (await fs$3.readdir(file)).sort();
      for (const child of names) {
        if (child.startsWith(".") || excluded.has(child)) continue;
        await visit(`${name}/${child}`, depth + 1, false);
      }
    } else if (stat.isFile() && (explicit || scope.extensions.includes(path__namespace.extname(name).toLowerCase()))) {
      if (files.has(name)) return;
      if (stat.size > MAX_SOURCE_BYTES || total + stat.size > MAX_SOURCE_BYTES || files.size >= 1e4) throw new Error("Snapshot exceeds its file or byte limit.");
      const data = await readFile(projectRoot, name, MAX_SOURCE_BYTES);
      total += data.length;
      files.set(name, data);
    }
  };
  for (const name of scope.paths) await visit(name, 0, true);
  if (!files.size) throw new Error("The declared snapshot scope is empty.");
  return new Map([...files].sort(([a], [b]) => a.localeCompare(b)));
}
function hashFiles(files) {
  return Object.fromEntries([...files].map(([name, data]) => [name, sha256(data)]));
}
function equal(a, b) {
  return canonical(a).equals(canonical(b));
}
function compareFiles(previous, current) {
  return [.../* @__PURE__ */ new Set([...Object.keys(previous), ...Object.keys(current)])].sort().flatMap((name) => {
    if (previous[name] === current[name]) return [];
    return [{ path: name, change: !Object.hasOwn(previous, name) ? "added" : !Object.hasOwn(current, name) ? "removed" : "modified" }];
  });
}
const fs$2 = require("node:fs/promises");
function volumeStatus(files, policy, records, policyDigest) {
  const partition = partitionFiles(files, policy);
  return { outside: partition.outside, volumes: partition.volumes.map((volume) => {
    const reusable = records.find((record) => record.format === "math-workspace.archive-volume/v1" && record.volumeId === volume.id && record.policyDigest === policyDigest && record.verification === "verified" && record.contentComplete && sameJson(record.files, volume.files));
    const latest = records.find((record) => record.format === "math-workspace.archive-volume/v1" && record.volumeId === volume.id);
    return {
      id: volume.id,
      title: volume.title,
      files: Object.keys(volume.files).length,
      fileMap: volume.files,
      changed: !reusable,
      reused: !!reusable,
      changes: compareFiles(latest?.files || {}, volume.files),
      ...reusable ? { record: reusable.payload, bundle: reusable.bundle } : {}
    };
  }) };
}
async function prepareArchive(archive, label) {
  if (typeof label !== "string" || !label.trim() || label.length > 200) throw new Error("A snapshot label between 1 and 200 characters is required.");
  return withLock(archive.directory, async () => {
    const policy = await archive.policy(), policyBytes = await readFile(archive.directory, "policy.json");
    const state = await archive.records(true, void 0, true);
    if (state.orphans.length) throw new Error(`Completed records await publication; resume with archive sign --prepared ${state.orphans[0]}`);
    const files = await captureSource(archive.projectRoot, policy.scope), hashes = hashFiles(files), policyObject = canonical(policy);
    const policyHash = sha256(policyObject), head = state.records.find((row) => row.payload === state.head?.record && row.bundle === state.head?.bundle);
    if (head?.kind === "total" && head.policyDigest === policyHash && sameJson(head.files, hashes) && sameJson(head.imports, state.imports)) {
      return { prepared: head.payload, alreadySigned: true, sequence: head.sequence, changes: [], scheme: "volume-total" };
    }
    const status = volumeStatus(hashes, policy, state.records, policyHash), preparedAt = (/* @__PURE__ */ new Date()).toISOString();
    const volumes = [];
    for (const volume of status.volumes) {
      if (volume.reused) volumes.push({ id: volume.id, record: volume.record, bundle: volume.bundle });
      else {
        const record = {
          schema: "math-workspace.archive-volume/v1",
          workId: policy.workId,
          volumeId: volume.id,
          title: volume.title,
          preparedAt,
          signer: policy.signingIdentity,
          policy: policyHash,
          files: volume.fileMap
        };
        volumes.push({ id: volume.id, record: await writeObject(archive.directory, canonical(record)), bundle: null });
      }
    }
    let sourceLocator;
    try {
      const commit = (await runProcess("git", ["-C", archive.projectRoot, "rev-parse", "HEAD"])).trim();
      if (/^[a-f0-9]{40,64}$/.test(commit)) sourceLocator = { gitBaseCommit: commit, meaning: "Git is a locator; archived files contain the actual working-tree bytes." };
    } catch (_) {
    }
    const plan = {
      schema: "math-workspace.archive-plan/v1",
      workId: policy.workId,
      label: label.trim(),
      sequence: (head?.sequence || 0) + 1,
      preparedAt,
      signer: policy.signingIdentity,
      previous: state.head,
      imports: state.imports,
      scope: policy.scope,
      policy: policyHash,
      files: hashes,
      volumes,
      ...sourceLocator ? { sourceLocator } : {}
    };
    if (!(await readFile(archive.directory, "policy.json")).equals(policyBytes) || !sameJson((await readHead(archive.directory))?.pointer || null, state.head) || !sameJson(hashes, hashFiles(await captureSource(archive.projectRoot, policy.scope)))) throw new Error("Source, head or signing policy changed during preparation.");
    for (const bytes of files.values()) await writeObject(archive.directory, bytes);
    await writeObject(archive.directory, policyObject);
    const data = canonical(plan), prepared = sha256(data), pending = await safePath(archive.directory, `pending/${prepared}`);
    await fs$2.mkdir(pending, { recursive: true });
    await fs$2.writeFile(path__namespace.join(pending, "plan.json"), data, { flag: "wx" });
    return {
      prepared,
      alreadySigned: false,
      scheme: "volume-total",
      sequence: plan.sequence,
      label: plan.label,
      files: files.size,
      volumes: status.volumes.map(({ fileMap: fileMap2, ...view }) => ({ ...view, record: volumes.find((item) => item.id === view.id).record })),
      outside: status.outside,
      outsideFiles: Object.keys(status.outside).length,
      totalSignaturePending: true,
      changes: compareFiles(head?.files || {}, hashes),
      signatureCreated: false
    };
  });
}
async function signBundle(archive, directory, payload, signer, onAuthentication, authFlow, identity) {
  await fs$2.mkdir(directory, { recursive: true });
  const recordPath = path__namespace.join(directory, "record.json"), bundlePath = path__namespace.join(directory, "record.bundle");
  if (await exists(recordPath)) {
    if (!(await readFile(directory, "record.json")).equals(payload)) throw new Error("The prepared record changed during authentication.");
  } else await fs$2.writeFile(recordPath, payload, { flag: "wx" });
  if (!await exists(bundlePath)) {
    if (signer) await signer(recordPath, bundlePath);
    else {
      const args = ["sign-blob", "--yes", "--oidc-disable-ambient-providers", "--fulcio-auth-flow", authFlow, "--timeout", "15m", "--bundle", bundlePath, recordPath];
      if (archive.verifier instanceof SigstoreVerifier && archive.verifier.trustedRoot) args.push("--trusted-root", archive.verifier.trustedRoot);
      const output = { stdout: "", stderr: "" };
      let authenticationUrl = "";
      await runProcess("cosign", args, { timeout: 15 * 60 * 1e3, stream: true, onOutput: (chunk, stream) => {
        output[stream] = (output[stream] + chunk).slice(-16e3);
        const authentication = authFlow === "normal" ? normalAuthentication(output[stream]) : deviceAuthentication(output[stream]);
        if (authentication && authentication.url !== authenticationUrl) {
          authenticationUrl = authentication.url;
          onAuthentication?.(authentication);
        }
      } });
    }
  }
  if (!(await readFile(directory, "record.json")).equals(payload)) throw new Error("The prepared record changed during authentication.");
  const bundle = await readFile(directory, "record.bundle");
  const info = await archive.verifier.verify(payload, bundle, [identity]);
  if (info.digest !== sha256(payload)) throw new Error("The original signature bundle does not bind the prepared payload.");
  return bundle;
}
async function signArchive(archive, prepared, signer, onAuthentication, options = {}) {
  digest(prepared);
  const authFlow = options.authFlow || "normal";
  if (!["normal", "device"].includes(authFlow)) throw new Error("Archive authentication flow must be normal or device.");
  return withLock(archive.directory, async () => {
    const policy = await archive.policy(), policyBytes = await readFile(archive.directory, "policy.json");
    const before = await archive.records(true, void 0, true);
    if (before.head?.record === prepared) return { signed: true, alreadyPublished: true, head: before.head };
    const pending = await safePath(archive.directory, `pending/${prepared}`);
    const pendingPlan = await exists(path__namespace.join(pending, "plan.json"));
    let plan, directory;
    if (pendingPlan) {
      const data = await readFile(pending, "plan.json");
      if (sha256(data) !== prepared) throw new Error("Prepared archive bytes have changed.");
      plan = parseJson(data, true);
      directory = pending;
      if (plan.schema !== "math-workspace.archive-plan/v1") throw new Error("Invalid prepared volume signing operation.");
      if (await exists(path__namespace.join(pending, "result.json"))) {
        const result = parseJson(await readFile(pending, "result.json"), true);
        if (before.head?.record === result.head?.record && before.head?.bundle === result.head?.bundle) return { signed: true, alreadyPublished: true, head: before.head };
      }
    } else {
      directory = await safePath(archive.directory, `entries/${prepared}`);
      const data = await readFile(directory, "record.json");
      if (sha256(data) !== prepared) throw new Error("Completed archive bytes have changed.");
      plan = parseJson(data, true);
      if (plan.schema !== "math-workspace.archive-total/v1" && plan.schema !== "math-workspace.archive-record/v1") throw new Error("Choose a prepared volume signing operation or completed original record.");
    }
    let allowedOrphan = prepared;
    if (pendingPlan) {
      if (await exists(path__namespace.join(pending, "total/record.json"))) allowedOrphan = sha256(await readFile(pending, "total/record.json"));
      else if (await exists(path__namespace.join(pending, "result.json"))) allowedOrphan = digest(parseJson(await readFile(pending, "result.json"), true).head?.record);
      else if (await exists(path__namespace.join(pending, "receipts.json"))) {
        const receipts = parseJson(await readFile(pending, "receipts.json"), true).volumes;
        if (Array.isArray(receipts) && receipts.length === plan.volumes.length) {
          const { schema: _, volumes: __, ...base } = plan;
          allowedOrphan = sha256(canonical({ ...base, schema: "math-workspace.archive-total/v1", volumes: receipts }));
        }
      } else if (!plan.volumes.length) {
        const { schema: _, volumes: __, ...base } = plan;
        allowedOrphan = sha256(canonical({ ...base, schema: "math-workspace.archive-total/v1", volumes: [] }));
      }
    }
    if (pendingPlan && before.head?.record === allowedOrphan) return { signed: true, alreadyPublished: true, head: before.head };
    if (before.orphans.some((hash) => hash !== allowedOrphan)) throw new Error("Another completed record awaits publication.");
    const checkUnchanged = async () => {
      const currentHead = await readHead(archive.directory);
      if (!(await readFile(archive.directory, "policy.json")).equals(policyBytes) || !sameJson(currentHead?.pointer || null, before.head) || !sameJson(plan.previous, before.head) || plan.sequence !== (currentHead?.sequence || 0) + 1 || plan.workId !== policy.workId || !sameJson(plan.signer, policy.signingIdentity) || !sameJson(plan.scope, policy.scope) || plan.schema !== "math-workspace.archive-total/v1" && plan.schema !== "math-workspace.archive-plan/v1" && pendingPlan) {
        throw new Error("The predecessor, scope or signing policy changed; prepare a new record.");
      }
      if (plan.schema !== "math-workspace.archive-record/v1" && plan.policy !== sha256(canonical(policy))) throw new Error("The signed policy changed; prepare a new record.");
      if (!sameJson(plan.files, hashFiles(await captureSource(archive.projectRoot, policy.scope)))) throw new Error("Source files changed after preparation; the archive head was not advanced.");
      const catalog = await readCatalog(archive.directory, policy);
      if (!sameJson(catalog.imports, plan.imports)) throw new Error("Imported history changed after preparation.");
      for (const hash of Object.values(plan.files)) await readObject(archive.directory, hash);
    };
    await checkUnchanged();
    let record, payload, bundle, recordHash;
    if (pendingPlan) {
      const signedPlan = plan, partition = partitionFiles(plan.files, policy), receipts = [];
      if (signedPlan.volumes.length !== partition.volumes.length || new Set(signedPlan.volumes.map((item) => item.id)).size !== signedPlan.volumes.length) throw new Error("Prepared volume mappings differ from the policy.");
      const totalOperations = signedPlan.volumes.filter((item) => !item.bundle).length + 1;
      let done = 0;
      options.onProgress?.(0, totalOperations);
      for (const volume of signedPlan.volumes) {
        const bytes = await readObject(archive.directory, digest(volume.record));
        const projection = await projectArchiveRecord({ input: { format: "math-workspace.archive-volume/v1", payload: volume.record, bundle: volume.bundle || "0".repeat(64) }, payload: bytes, object: (hash) => readObject(archive.directory, hash) });
        const expected = partition.volumes.find((item) => item.id === volume.id);
        if (!expected || projection.policyDigest !== signedPlan.policy || projection.volumeId !== volume.id || !sameJson(projection.files, expected.files)) throw new Error("Prepared volume file map or policy differs.");
        await checkUnchanged();
        let original;
        if (volume.bundle) {
          const trusted = before.records.find((row) => row.payload === volume.record && row.bundle === volume.bundle && row.verification === "verified");
          if (!trusted || trusted.format !== "math-workspace.archive-volume/v1" || !trusted.contentComplete) throw new Error("A reused volume does not have a verified original receipt.");
          original = await readObject(archive.directory, volume.bundle);
          await archive.verifier.verify(bytes, original, [policy.signingIdentity]);
        } else {
          original = await signBundle(archive, path__namespace.join(pending, "volumes", volume.record), bytes, signer, onAuthentication, authFlow, policy.signingIdentity);
          await writeObject(archive.directory, original);
          options.onProgress?.(++done, totalOperations);
        }
        receipts.push({ id: volume.id, record: volume.record, bundle: await writeObject(archive.directory, original) });
        await atomicWrite(pending, "receipts.json", canonical({ schema: "math-workspace.archive-receipts/v1", volumes: receipts }));
        await checkUnchanged();
      }
      const { schema: _, volumes: __, ...base } = signedPlan;
      record = { ...base, schema: "math-workspace.archive-total/v1", volumes: receipts };
      payload = canonical(record);
      recordHash = sha256(payload);
      const destination2 = await safePath(archive.directory, `entries/${recordHash}`);
      if (await exists(destination2)) {
        if (!(await readFile(destination2, "record.json")).equals(payload)) throw new Error("The completed total differs from its preparation.");
        bundle = await readFile(destination2, "record.bundle");
        await archive.verifier.verify(payload, bundle, [policy.signingIdentity]);
      } else {
        await checkUnchanged();
        bundle = await signBundle(archive, path__namespace.join(pending, "total"), payload, signer, onAuthentication, authFlow, policy.signingIdentity);
      }
      options.onProgress?.(++done, totalOperations);
    } else {
      record = plan;
      payload = await readFile(directory, "record.json");
      recordHash = prepared;
      bundle = await readFile(directory, "record.bundle");
      await archive.verifier.verify(payload, bundle, [policy.signingIdentity]);
      for (const receipt of record.volumes || []) await archive.verifier.verify(await readObject(archive.directory, receipt.record), await readObject(archive.directory, receipt.bundle), [policy.signingIdentity]);
    }
    await writeObject(archive.directory, payload);
    const bundleHash = await writeObject(archive.directory, bundle);
    await projectArchiveRecord({ input: { format: record.schema, payload: recordHash, bundle: bundleHash }, payload, object: (hash) => readObject(archive.directory, hash) });
    await checkUnchanged();
    await archive.records(true, void 0, true);
    await checkUnchanged();
    const destination = await safePath(archive.directory, `entries/${recordHash}`);
    const head = { record: recordHash, bundle: bundleHash };
    if (pendingPlan) await atomicWrite(pending, "result.json", canonical({ head }));
    if (!await exists(destination)) {
      await fs$2.mkdir(path__namespace.dirname(destination), { recursive: true });
      await fs$2.rename(path__namespace.join(pending, "total"), destination);
    }
    await atomicWrite(archive.directory, "HEAD.json", canonical({ schema: "math-workspace.archive-head/v1", sequence: record.sequence, ...head }));
    return {
      signed: true,
      alreadyPublished: false,
      head,
      scheme: record.schema === "math-workspace.archive-total/v1" ? "volume-total" : "native-original",
      ...record.volumes ? { volumes: record.volumes } : {}
    };
  });
}
const fs$1 = require("node:fs/promises");
class AcademicArchive {
  constructor(projectRoot, verifier) {
    this.projectRoot = projectRoot;
    this.verifier = verifier;
    this.directory = path__namespace.join(projectRoot, ARCHIVE_DIRECTORY);
  }
  static async open(projectRoot, trustedRoot) {
    return new AcademicArchive(path__namespace.resolve(projectRoot), await defaultVerifier(trustedRoot));
  }
  async configured() {
    if (!await exists(this.directory)) return false;
    await safePath(this.projectRoot, ARCHIVE_DIRECTORY);
    return exists(path__namespace.join(this.directory, "policy.json"));
  }
  async policy() {
    if (!await this.configured()) throw new Error("Academic archives are not configured for this project.");
    return validPolicy(parseJson(await readFile(this.directory, "policy.json")));
  }
  async initialize(input) {
    const policy = validPolicy(input);
    partitionFiles(hashFiles(await captureSource(this.projectRoot, policy.scope)), policy);
    await safePath(this.projectRoot, ARCHIVE_DIRECTORY);
    await fs$1.mkdir(this.directory, { recursive: true });
    return withLock(this.directory, async () => {
      if (await this.configured()) {
        const old = await this.policy();
        if (!equal(old, policy)) throw new Error("This project already has a different archive policy.");
        return old;
      }
      await fs$1.writeFile(await safePath(this.directory, "policy.json"), canonical(policy), { flag: "wx" });
      await fs$1.writeFile(await safePath(this.directory, ".gitignore"), "LOCK.json\npending/\n*.tmp-*\n", { flag: "wx" });
      return policy;
    });
  }
  async updatePolicy(input, expectedPolicy) {
    const policy = validPolicy(input);
    return withLock(this.directory, async () => {
      const old = await this.policy(), bytes = await readFile(this.directory, "policy.json");
      if (expectedPolicy && sha256(canonical(old)) !== digest(expectedPolicy)) throw new Error("The archive policy changed before this update.");
      if (policy.workId !== old.workId) throw new Error("A policy update cannot change the stable work identity.");
      for (const identity of old.identities) if (!policy.identities.some((item) => equal(item, identity))) throw new Error("A policy update must retain accepted historical identities.");
      partitionFiles(hashFiles(await captureSource(this.projectRoot, policy.scope)), policy);
      if (!(await readFile(this.directory, "policy.json")).equals(bytes)) throw new Error("The archive policy changed during this update.");
      await atomicWrite(this.directory, "policy.json", canonical(policy));
      return policy;
    });
  }
  async hiddenIds() {
    if (!await exists(path__namespace.join(this.directory, "visibility.json"))) return [];
    const value = parseJson(await readFile(this.directory, "visibility.json"), true);
    if (value.schema !== "math-workspace.archive-visibility/v1" || !Array.isArray(value.hidden) || value.hidden.length > 1e4) throw new Error("Invalid local archive visibility.");
    return [...new Set(value.hidden.map(digest))];
  }
  async hide(id, retireHead = false) {
    return this.visibility(id, true, retireHead);
  }
  async restore(id) {
    return this.visibility(id, false, false);
  }
  async visibility(id, hidden, retireHead) {
    digest(id);
    return withLock(this.directory, async () => {
      const state = await this.records(false, void 0, true), record = selectRecord(state.records, id);
      const ids = new Set(await this.hiddenIds());
      hidden ? ids.add(record.id) : ids.delete(record.id);
      if (retireHead) {
        const head = await readHead(this.directory);
        const retained = await readRetainedHeads(this.directory);
        const alreadyRetained = retained.some((old) => old.pointer.record === record.payload && old.pointer.bundle === record.bundle);
        const active = head?.pointer.record === record.payload && head?.pointer.bundle === record.bundle;
        if (!hidden || !active && !alreadyRetained) throw new Error("Only the active original head can be explicitly retired.");
        if (!active && (!equal(head?.pointer || null, record.previous || null) || (head?.sequence || 0) !== (record.sequence || 1) - 1)) throw new Error("The active head advanced after retirement; it will not be rolled back.");
        if (active) {
          if (!alreadyRetained) retained.push(head);
          await atomicWrite(this.directory, "retained-heads.json", canonical({
            schema: "math-workspace.archive-retained-heads/v1",
            heads: retained.map((old) => ({ sequence: old.sequence, ...old.pointer }))
          }));
          if (record.previous) await atomicWrite(this.directory, "HEAD.json", canonical({ schema: "math-workspace.archive-head/v1", sequence: head.sequence - 1, ...record.previous }));
          else await fs$1.unlink(await safePath(this.directory, "HEAD.json"));
        }
      }
      await atomicWrite(this.directory, "visibility.json", canonical({ schema: "math-workspace.archive-visibility/v1", hidden: [...ids].sort() }));
      return { record: record.id, payload: record.payload, hidden, retiredHead: retireHead, originalEvidencePreserved: true };
    });
  }
  async records(verify = false, progress, includeHidden = false) {
    const policy = await this.policy();
    const catalog = await readCatalog(this.directory, policy), object = cachedObjects(this.directory);
    const missingObjects = [];
    if (verify) for (const hash of catalog.objects) {
      try {
        await object(hash);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        missingObjects.push(hash);
      }
    }
    const hidden = new Set(await this.hiddenIds());
    const all = (await projectInputs(catalog.inputs, object, policy, this.verifier, verify, progress)).map((row) => ({ ...row, hidden: hidden.has(row.id) }));
    return { records: includeHidden ? all : all.filter((row) => !row.hidden), hiddenRecords: all.filter((row) => row.hidden), head: catalog.head, imports: catalog.imports, orphans: catalog.orphans, missingObjects };
  }
  async status() {
    if (!await this.configured()) return { configured: false, records: [], pending: [] };
    const policy = await this.policy(), state = await this.records();
    const files = hashFiles(await captureSource(this.projectRoot, policy.scope));
    const allRecords = [...state.records, ...state.hiddenRecords];
    const headRecord = allRecords.find((record) => record.payload === state.head?.record && record.bundle === state.head?.bundle);
    const pendingRoot = await safePath(this.directory, "pending");
    const pending = [];
    if (await exists(pendingRoot)) for (const name of (await fs$1.readdir(pendingRoot)).sort()) {
      if (!/^[a-f0-9]{64}$/.test(name)) continue;
      const plan = await exists(path__namespace.join(pendingRoot, name, "plan.json"));
      if (await exists(path__namespace.join(pendingRoot, name, "result.json"))) {
        const result = parseJson(await readFile(this.directory, `pending/${name}/result.json`), true);
        if (allRecords.some((row) => row.payload === result.head?.record && row.bundle === result.head?.bundle)) continue;
      }
      const data = await readFile(this.directory, `pending/${name}/${plan ? "plan" : "record"}.json`);
      if (sha256(data) !== name) throw new Error("A pending archive record has changed.");
      const record = parseJson(data, true);
      let details = {};
      if (plan) {
        const signedPolicy2 = validPolicy(parseJson(await readObject(this.directory, record.policy), true)), partition2 = partitionFiles(record.files, signedPolicy2);
        const receipts = await exists(path__namespace.join(pendingRoot, name, "receipts.json")) ? parseJson(await readFile(this.directory, `pending/${name}/receipts.json`), true).volumes : [];
        details = {
          scheme: "volume-total",
          outside: partition2.outside,
          outsideFiles: Object.keys(partition2.outside).length,
          totalSignaturePending: true,
          volumes: partition2.volumes.map((volume) => {
            const item = record.volumes.find((row) => row.id === volume.id), receipt = receipts.find((row) => row.id === volume.id && row.record === item?.record);
            const previous = headRecord?.volumes?.find((row) => row.id === volume.id);
            const old = allRecords.find((row) => row.payload === previous?.record && row.bundle === previous?.bundle);
            return {
              id: volume.id,
              title: volume.title,
              files: Object.keys(volume.files).length,
              fileMap: volume.files,
              changed: !item?.bundle,
              reused: !!item?.bundle,
              signed: !!item?.bundle || !!receipt,
              record: item?.record,
              bundle: item?.bundle || receipt?.bundle,
              changes: compareFiles(old?.files || {}, volume.files)
            };
          })
        };
      }
      pending.push({
        prepared: name,
        label: record.label,
        preparedAt: record.preparedAt,
        currentMatches: equal(record.files, files) && equal(record.previous, state.head) && (!plan || record.policy === sha256(canonical(policy))),
        files: Object.keys(record.files).length,
        scope: record.scope,
        changes: compareFiles(headRecord?.files || {}, record.files),
        ...details
      });
    }
    const partition = partitionFiles(files, policy);
    return {
      configured: true,
      policy,
      policyDigest: sha256(canonical(policy)),
      ...state,
      pending,
      current: {
        files: Object.keys(files).length,
        coveredByHead: !!headRecord && equal(headRecord.files, files),
        changes: compareFiles(headRecord?.files || {}, files),
        outside: partition.outside,
        outsideFiles: Object.keys(partition.outside).length,
        volumes: partition.volumes.map((volume) => {
          const receipt = headRecord?.volumes?.find((row) => row.id === volume.id), old = allRecords.find((row) => row.payload === receipt?.record && row.bundle === receipt?.bundle);
          const changed = !old || old.policyDigest !== sha256(canonical(policy)) || !equal(old.files, volume.files);
          return {
            id: volume.id,
            title: volume.title,
            files: Object.keys(volume.files).length,
            changed,
            reused: !changed,
            reuseRequiresVerification: true,
            changes: compareFiles(old?.files || {}, volume.files),
            ...receipt ? { record: receipt.record, bundle: receipt.bundle } : {}
          };
        })
      },
      cryptographicVerificationPerformed: false,
      mathematicalCorrectnessAssessed: false
    };
  }
  async verify(expectedHead, progress) {
    const state = await this.records(true, progress, true);
    if (expectedHead && state.head?.record !== digest(expectedHead)) throw new Error("The archive head differs from the independently known head.");
    if (state.orphans.length) throw new Error(`Completed records await publication; resume with archive sign --prepared ${state.orphans[0]}`);
    return {
      ...state,
      verified: true,
      contentComplete: state.records.every((record) => record.contentComplete) && !state.missingObjects.length,
      missingReferences: state.records.reduce((sum, record) => sum + record.missing.length, 0),
      externalHeadChecked: !!expectedHead,
      currentWorkingTreeChecked: false,
      mathematicalCorrectnessAssessed: false
    };
  }
  async import(exchange, progress) {
    return importExchange(this.directory, await this.policy(), exchange, this.verifier, progress);
  }
  async export(record) {
    return exportExchange(this.directory, await this.policy(), record);
  }
  async prepare(label) {
    return prepareArchive(this, label);
  }
  async sign(prepared, signer, onAuthentication, options = {}) {
    return signArchive(this, prepared, signer, onAuthentication, options);
  }
  async record(id, verify = false) {
    digest(id);
    const state = await this.records(verify, void 0, true);
    return selectRecord(state.records, id);
  }
  async source(id, name) {
    relative(name);
    const record = await this.record(id);
    if (!Object.hasOwn(record.files, name)) throw new Error("The file is not available in this archived snapshot.");
    const data = await readObject(this.directory, record.files[name]);
    if (data.length > 4 * 1024 * 1024 || data.includes(0)) throw new Error("This archived file is available through export, but is too large or binary for text preview.");
    const content = data.toString("utf8");
    if (!Buffer.from(content, "utf8").equals(data)) throw new Error("This file is not UTF-8 text; use the original-byte export.");
    return { record, filePath: name, sha256: record.files[name], content, source: "archived-original-bytes" };
  }
  async currentSource(name) {
    relative(name);
    const files = await captureSource(this.projectRoot, (await this.policy()).scope), data = files.get(name);
    if (!data) throw new Error("The file is not in the current declared archive scope.");
    const content = data.toString("utf8");
    if (data.length > 4 * 1024 * 1024 || data.includes(0) || !Buffer.from(content).equals(data)) throw new Error("This current file cannot be previewed as UTF-8 text.");
    return { filePath: name, sha256: sha256(data), content, source: "current-working-tree" };
  }
  async compare(left, right) {
    const state = await this.records(false, void 0, true);
    const files = async (id) => {
      if (id === "current") return hashFiles(await captureSource(this.projectRoot, (await this.policy()).scope));
      return selectRecord(state.records, id).files;
    };
    return { left, right, changes: compareFiles(await files(left), await files(right)) };
  }
  async history(query) {
    if (!query.filePath && !query.formalId) throw new Error("Specify a source path or stable formal identifier.");
    if (query.filePath) relative(query.filePath);
    if (query.formalId && !/^h-[a-f0-9]{16,32}$/.test(query.formalId)) throw new Error("Invalid stable formal identifier.");
    const { records } = await this.records();
    const matches = [];
    const object = cachedObjects(this.directory);
    for (const record of records) for (const [name, hash] of Object.entries(record.files)) {
      if (!name.endsWith(".md") || query.filePath && name !== query.filePath) continue;
      let line;
      if (query.formalId) {
        const content = (await object(hash)).toString("utf8");
        const expression = new RegExp("(?:^|\\s)#" + query.formalId + "(?=\\W|$)", "m");
        const found = expression.exec(content);
        if (!found) continue;
        line = content.slice(0, found.index).split("\n").length;
      }
      matches.push({
        recordId: record.id,
        filePath: name,
        hash,
        loggedAt: record.loggedAt,
        verification: record.verification,
        contentComplete: record.contentComplete,
        ...line ? { line } : {}
      });
    }
    return { matches, interpretation: "Earliest available archived occurrence is not a claim of original authorship or mathematical correctness." };
  }
}
const fs = require("node:fs/promises");
async function discoverOetArchives(projectRoot) {
  const candidates = [".signatures"];
  for (const entry of await fs.readdir(projectRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith(".") && !["node_modules", "out", "dist"].includes(entry.name)) candidates.push(entry.name + "/.signatures");
  }
  const found = [];
  for (const name of candidates) {
    if (!await exists(path__namespace.join(projectRoot, name, "policy.json"))) continue;
    try {
      const policy = parseJson(await readFile(projectRoot, name + "/policy.json"));
      if (policy.schema === "oet.sign-policy/v1" && await exists(path__namespace.join(projectRoot, name, "legacy/index.json"))) {
        found.push({ path: name, workId: String(policy.work_id), title: String(policy.work_title || policy.work_id) });
      }
    } catch (_) {
    }
  }
  return found;
}
async function convertOetArchive(projectRoot, source) {
  relative(source);
  const store = await safePath(projectRoot, source);
  const policy = parseJson(await readFile(store, "policy.json"));
  if (policy.schema !== "oet.sign-policy/v1") throw new Error("The selected source is not an OET archive.");
  const indexBytes = await readFile(store, "legacy/index.json"), index = parseJson(indexBytes, true);
  if (index.schema !== "oet.legacy-signatures/v1" || index.work_id !== policy.work_id || !Array.isArray(index.records)) throw new Error("OET historical evidence has not been archived in a supported format.");
  const objects = {};
  let total = 0;
  const add = (data) => {
    const hash = sha256(data);
    if (!Object.hasOwn(objects, hash)) {
      total += data.length;
      if (total > MAX_ARCHIVE_BYTES) throw new Error("OET archive exceeds the exchange byte limit.");
      objects[hash] = data.toString("base64");
    }
    return hash;
  };
  const indexHash = add(indexBytes);
  const legacy = path__namespace.join(store, "legacy");
  for (const hash of (await fs.readdir(await safePath(legacy, "objects"))).sort()) add(await readObject(legacy, digest(hash)));
  const records = index.records.map((record) => ({
    format: "oet.legacy-signatures/v1",
    payload: digest(record.manifest_sha256),
    bundle: digest(record.bundle_sha256),
    metadata: { index: indexHash }
  }));
  if (await exists(path__namespace.join(store, "HEAD.json"))) {
    const head = parseJson(await readFile(store, "HEAD.json"), true);
    if (head.schema !== "oet.sign-head/v1" || head.work_id !== policy.work_id || !Number.isSafeInteger(head.sequence)) throw new Error("Invalid OET chain head.");
    let pointer2 = { record_sha256: digest(head.record_sha256), bundle_sha256: digest(head.bundle_sha256) }, sequence = head.sequence;
    const seen = /* @__PURE__ */ new Set();
    while (pointer2) {
      if (seen.has(pointer2.record_sha256)) throw new Error("OET chain has a cycle.");
      seen.add(pointer2.record_sha256);
      const prefix = `entries/${pointer2.record_sha256}`;
      const data = await readFile(store, `${prefix}/record.json`), bundle = await readFile(store, `${prefix}/record.bundle`);
      if (add(data) !== pointer2.record_sha256 || add(bundle) !== pointer2.bundle_sha256) throw new Error("OET chain receipt bytes changed.");
      const record = parseJson(data, true);
      if (record.schema !== "oet.sign-record/v1" || record.work_id !== policy.work_id || record.sequence !== sequence) throw new Error("OET chain sequence differs.");
      for (const hash of Object.values(record.snapshot.files)) add(await readObject(path__namespace.join(store, prefix), digest(hash)));
      if (record.legacy_archive_sha256 !== null && record.legacy_archive_sha256 !== indexHash) throw new Error("OET chain no longer matches its original legacy archive.");
      records.push({ format: "oet.sign-record/v1", payload: pointer2.record_sha256, bundle: pointer2.bundle_sha256 });
      pointer2 = record.previous;
      sequence--;
    }
    if (sequence !== 0) throw new Error("OET chain ended prematurely.");
  }
  const sourceRoot = path__namespace.posix.dirname(source);
  if (sourceRoot === ".") throw new Error("Bind Math Workspace to the repository containing the OET work directory before conversion.");
  const identities = policy.legacy_identities.map(validIdentity);
  const suggestedPolicy = {
    schema: "math-workspace.archive-policy/v1",
    workId: policy.work_id,
    title: policy.work_title || policy.work_id,
    identities,
    signingIdentity: validIdentity(policy.signing_identity),
    scope: {
      paths: [sourceRoot],
      extensions: [".md"],
      maxDepth: 2,
      exclude: ["tools", "scripts", "release", "formal-oet"].map((name) => sourceRoot + "/" + name)
    }
  };
  return { exchange: { schema: "math-workspace.archive-exchange/v1", workId: policy.work_id, records, objects }, suggestedPolicy };
}
async function writeExchangeFile(file, exchange) {
  const data = canonical(exchange);
  await fs.writeFile(file, data, { flag: "wx" });
}
exports.AcademicArchive = AcademicArchive;
exports.MAX_ARCHIVE_BYTES = MAX_ARCHIVE_BYTES;
exports.SigstoreVerifier = SigstoreVerifier;
exports.archiveFormats = archiveFormats;
exports.canonical = canonical;
exports.captureSource = captureSource;
exports.compareFiles = compareFiles;
exports.convertOetArchive = convertOetArchive;
exports.defaultVerifier = defaultVerifier;
exports.deviceAuthentication = deviceAuthentication;
exports.discoverOetArchives = discoverOetArchives;
exports.normalAuthentication = normalAuthentication;
exports.parseJson = parseJson;
exports.partitionFiles = partitionFiles;
exports.projectArchiveRecord = projectArchiveRecord;
exports.recoverLock = recoverLock;
exports.sha256 = sha256;
exports.validPolicy = validPolicy;
exports.writeExchangeFile = writeExchangeFile;
