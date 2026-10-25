"use strict";
const path = require("node:path");
const crypto = require("node:crypto");
const fs$5 = require("node:fs/promises");
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
const crypto__namespace = /* @__PURE__ */ _interopNamespaceDefault(crypto);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs$5);
const WORK_METADATA_TEXT_FIELDS = ["title", "subtitle", "language", "description", "license", "licenseUrl", "website", "repository", "preferredCitation"];
const text$1 = (value, field, limit = 1e5) => {
  if (typeof value !== "string" || value.length > limit || value.includes("\0")) throw new Error(`Invalid metadata ${field}.`);
  return value.trim();
};
function metadataDoi(value) {
  if (value === void 0) return;
  const normalized = text$1(value, "DOI", 300).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  if (normalized && !/^10\.\d{4,9}\/[^\s<>]+$/i.test(normalized)) throw new Error("Enter a DOI such as 10.1234/example.");
  return normalized;
}
function url(value, field) {
  const result = text$1(value, field, 3e3);
  if (result && !/^https?:\/\/[^\s<>]+$/i.test(result)) throw new Error(`Metadata ${field} must be an HTTP or HTTPS URL.`);
  if (result) {
    let parsed;
    try {
      parsed = new globalThis.URL(result);
    } catch {
      throw new Error(`Invalid metadata ${field} URL.`);
    }
    if (!parsed.hostname || parsed.username || parsed.password) throw new Error(`Invalid metadata ${field} URL.`);
  }
  return result;
}
function strings(input, field, limit = 100) {
  if (!Array.isArray(input) || input.length > limit) throw new Error(`Invalid metadata ${field}.`);
  return [...new Set(input.map((value) => text$1(value, field, 3e3)).filter(Boolean))];
}
function normalizeWorkMetadata(input) {
  if (input === void 0) return {};
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Metadata must be an object.");
  const value = input, result = {};
  for (const field of WORK_METADATA_TEXT_FIELDS) if (value[field] !== void 0) {
    result[field] = ["website", "repository", "licenseUrl"].includes(field) ? url(value[field], field) : text$1(value[field], field);
  }
  if (value.authors !== void 0) {
    if (!Array.isArray(value.authors) || value.authors.length > 100) throw new Error("Invalid metadata authors.");
    result.authors = value.authors.map((author) => {
      if (!author || typeof author !== "object" || Array.isArray(author)) throw new Error("Invalid metadata author.");
      const name = text$1(author.name, "author name", 1e3);
      if (!name) throw new Error("Every publication author needs a name.");
      const result2 = { name };
      for (const field of ["nativeName", "affiliation"]) if (author[field] !== void 0) result2[field] = text$1(author[field], field, 3e3);
      if (author.aliases !== void 0) result2.aliases = strings(author.aliases, "author aliases");
      if (author.orcid !== void 0) {
        const orcid = text$1(author.orcid, "ORCID", 1e3).replace(/^https?:\/\/orcid\.org\//i, "");
        if (orcid && !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(orcid)) throw new Error("Enter an ORCID such as 0000-0002-1825-0097.");
        result2.orcid = orcid ? `https://orcid.org/${orcid.toUpperCase()}` : "";
      }
      return result2;
    });
  }
  if (value.keywords !== void 0) result.keywords = strings(value.keywords, "keywords");
  if (value.doi !== void 0) {
    if (!value.doi || typeof value.doi !== "object" || Array.isArray(value.doi)) throw new Error("Invalid metadata DOI.");
    result.doi = {};
    if (value.doi.conceptDoi !== void 0) result.doi.conceptDoi = metadataDoi(value.doi.conceptDoi);
    if (value.doi.provenance !== void 0) result.doi.provenance = text$1(value.doi.provenance, "DOI provenance", 3e3);
  }
  return result;
}
function mergeWorkMetadata(project, overrides) {
  return { ...project, ...overrides, ...project.doi || overrides.doi ? { doi: { ...project.doi, ...overrides.doi } } : {} };
}
function projectMetadata(config) {
  const pdf = config?.pdf || {}, legacy = {};
  for (const field of WORK_METADATA_TEXT_FIELDS) if (pdf[field]) legacy[field] = pdf[field];
  if (pdf.lang) legacy.language = pdf.lang;
  if (Array.isArray(pdf.authors) && pdf.authors.length) legacy.authors = pdf.authors;
  else if (pdf.author) legacy.authors = [{ name: pdf.author, ...pdf.authorNative ? { nativeName: pdf.authorNative } : {}, ...pdf.authorAliases?.length ? { aliases: pdf.authorAliases } : {}, ...pdf.orcid ? { orcid: pdf.orcid } : {} }];
  if (pdf.keywords) legacy.keywords = pdf.keywords;
  if (pdf.workDoi) legacy.doi = { conceptDoi: pdf.workDoi };
  return mergeWorkMetadata(normalizeWorkMetadata(legacy), normalizeWorkMetadata(config?.metadata));
}
class MarkdownFence {
  /** True for the opening/closing delimiter and every line inside the block. */
  consume(line) {
    const match = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (this.delimiter) {
      if (match && match[1][0] === this.delimiter[0] && match[1].length >= this.delimiter.length && !match[2].trim()) this.delimiter = void 0;
      return true;
    }
    if (!match || match[1][0] === "`" && match[2].includes("`")) return false;
    this.delimiter = match[1];
    return true;
  }
}
function maskFencedMarkdown(content) {
  const fence = new MarkdownFence();
  return content.split("\n").map((line) => fence.consume(line) ? line.replace(/[^\r\n]/g, " ") : line).join("\n");
}
const FORMAL_KIND_POLICIES = {
  prop: { aliases: ["命题", "Proposition", "Prop", "Prop."], zh: "命题", en: "Proposition", counter: "theorem", recall: true, dependency: "mainline", lean: true },
  lemma: { aliases: ["引理", "Lemma", "Lem", "Lem."], zh: "引理", en: "Lemma", counter: "theorem", recall: true, dependency: "mainline", lean: true },
  theorem: { aliases: ["定理", "Theorem", "Thm", "Thm."], zh: "定理", en: "Theorem", counter: "theorem", recall: true, dependency: "mainline", lean: true },
  cor: { aliases: ["推论", "Corollary", "Cor", "Cor."], zh: "推论", en: "Corollary", counter: "theorem", recall: true, dependency: "mainline", lean: true },
  def: { aliases: ["定义", "Definition", "Def", "Def."], zh: "定义", en: "Definition" },
  remark: { aliases: ["注", "Remark", "Rem", "Rem."], zh: "注", en: "Remark", recall: true, dependency: "supplemental", lean: true },
  example: { aliases: ["例", "Example", "Ex", "Ex."], zh: "例", en: "Example", counter: "example", recall: true },
  counterexample: { aliases: ["反例", "Counterexample"], zh: "反例", en: "Counterexample", counter: "example", recall: true },
  exercise: { aliases: ["习题", "练习", "Exercise"], zh: "习题", en: "Exercise", counter: "exercise", recall: true, dependency: "pedagogical", lean: true },
  solution: { aliases: ["解答", "答案", "Solution", "Answer"], zh: "解答", en: "Solution", recall: true, dependency: "pedagogical" },
  section: { aliases: [], zh: "§", en: "§", counter: "section" },
  equation: { aliases: ["公式", "方程", "Equation", "Eq", "Eq.", "Formula"], zh: "公式", en: "Equation", counter: "equation" },
  figure: { aliases: ["图", "图示", "Figure", "Fig", "Fig."], zh: "图", en: "Figure", counter: "figure" },
  table: { aliases: ["表", "表格", "Table", "Tab", "Tab."], zh: "表", en: "Table", counter: "table" }
};
const FORMAL_TYPES = Object.keys(FORMAL_KIND_POLICIES);
new Set(FORMAL_TYPES.filter((kind) => FORMAL_KIND_POLICIES[kind].counter === "theorem"));
const DEPENDENCY_NODE_TYPES = new Set(FORMAL_TYPES.filter((kind) => FORMAL_KIND_POLICIES[kind].dependency));
const RECALL_TYPES = new Set(FORMAL_TYPES.filter((kind) => FORMAL_KIND_POLICIES[kind].recall));
const DEFAULT_LEAN_COVERAGE_TYPES = FORMAL_TYPES.filter((kind) => FORMAL_KIND_POLICIES[kind].lean);
const HASH_ID_RE = /^h-[a-f0-9]{16,32}$/;
const TMP_ID_RE = /^tmp-[A-Za-z0-9_-]+$/;
const FORMAL_ID_PATTERN = "(?:h-[a-f0-9]{16,32}|tmp-[A-Za-z0-9_-]+)";
const aliases = new Map(FORMAL_TYPES.flatMap((kind) => FORMAL_KIND_POLICIES[kind].aliases.map((alias) => [alias.toLowerCase(), kind])));
const FORMAL_TYPE_PATTERN = [...aliases.keys()].sort((a, b) => b.length - a.length).map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
function normalizeFormalKind(alias) {
  return aliases.get(alias.toLowerCase());
}
function formalDictionary(language) {
  return Object.fromEntries(FORMAL_TYPES.map((kind) => [kind, FORMAL_KIND_POLICIES[kind][language]]));
}
function isPedagogicalKind(kind) {
  return FORMAL_KIND_POLICIES[kind]?.dependency === "pedagogical";
}
function isMainlineKind(kind) {
  return FORMAL_KIND_POLICIES[kind]?.dependency === "mainline";
}
function stripSolutionAssociation(text2) {
  return text2.replace(
    new RegExp(`\\s*[（(](?:对应|for)\\s+@${FORMAL_ID_PATTERN}(?:\\s*[；;]\\s*([^）)]*))?[）)]`, "i"),
    (_match, title) => title ? `（${title.trim()}）` : ""
  );
}
function exerciseSupportKind(line) {
  const text2 = line.trim().replace(/^>\s*/, "").replace(/^(?:\*\*|__)(.*?)(?:\*\*|__)/, "$1").trim();
  if (/^(?:提示|Hint)\s*(?:[：:.]|$)/i.test(text2)) return "hint";
  if (/^(?:解答|答案|Solution|Answer)\s*(?:[：:.]|$)/i.test(text2)) return "solution";
  return void 0;
}
function solutionTarget(title) {
  const match = title.match(new RegExp(`^(?:对应|for)\\s+@(${FORMAL_ID_PATTERN})(?:\\s*[；;]\\s*(.*))?$`, "i"));
  return match ? { id: match[1], title: (match[2] || "").trim() } : void 0;
}
function collectExerciseContent(lines, startLine, marker2, parseMarker) {
  let end = startLine;
  const bodyFence = new MarkdownFence();
  for (let i = startLine + 1; i < lines.length; i++) {
    if (!bodyFence.consume(lines[i]) && (/^#{1,6}\s+/.test(lines[i]) || parseMarker(lines[i]) || /^ {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(lines[i]))) break;
    end = i;
  }
  while (end > startLine && !lines[end].trim()) end--;
  const support = [];
  const supportFence = new MarkdownFence();
  if (marker2.type === "exercise") for (let i = startLine + 1; i <= end; i++) {
    const kind = !supportFence.consume(lines[i]) && exerciseSupportKind(lines[i]);
    if (!kind) continue;
    if (support.length) support[support.length - 1].endLine = i - 1;
    support.push({ kind, startLine: i, endLine: end });
  }
  let promptEnd = support.length ? support[0].startLine - 1 : end;
  while (promptEnd > startLine && !lines[promptEnd].trim()) promptEnd--;
  const contentLines = lines.slice(startLine, promptEnd + 1);
  contentLines[0] = contentLines[0].replace(marker2.markerText, marker2.markerText.replace(/\s+#[A-Za-z0-9_-]+\b$/, ""));
  return { contentLines, endLine: promptEnd, support, bodyEndLine: end };
}
function connectExerciseSolutions(definitions, labels) {
  const issues = [];
  for (const definition of definitions) {
    if (definition.type !== "solution" || !definition.id) continue;
    const targetId = definition.label.solutionOf;
    const target = targetId && labels[targetId];
    if (!target || target.type !== "exercise") {
      issues.push({
        severity: "error",
        code: "solution-target-invalid",
        file: definition.file,
        line: definition.line,
        message: targetId ? `Solution target @${targetId} must resolve to an exercise.` : "A solution needs an explicit target: 解答 #tmp-s（对应 @tmp-e） / Solution #tmp-s (for @tmp-e)."
      });
      continue;
    }
    if (target.bookKey !== definition.label.bookKey) {
      issues.push({
        severity: "error",
        code: "solution-target-cross-book",
        file: definition.file,
        line: definition.line,
        message: "An exercise and its solution must belong to the same book."
      });
      continue;
    }
    definition.label.number = target.number;
    definition.label.solutionExerciseNumber = target.unitLabel && target.number !== void 0 ? `${target.unitLabel}.${target.number}` : "";
    definition.label.solutionExerciseTitle = target.title;
    (target.solutions ||= []).push(definition.id);
  }
  for (const label of Object.values(labels)) if (label.solutions) label.solutions.sort();
  return issues;
}
function associatedProofContent(label, labels) {
  return JSON.stringify({
    question: label.solutionOf ? { id: label.solutionOf, content: labels[label.solutionOf]?.content || "" } : void 0,
    local: label.proofContent || "",
    support: label.supportContent || "",
    solutions: (label.solutions || []).map((id) => ({ id, content: labels[id]?.proofContent || "", target: labels[id]?.solutionOf || "" }))
  });
}
function isPageLabelType(type) {
  return typeof type === "string" && ["chapter", "appendix", "intro", "summary", "front-matter", "back-matter", "continued"].includes(type);
}
function isManuscriptMatterKind(kind) {
  return kind === "front-matter" || kind === "back-matter" || kind === "continued";
}
function unnumberedPageKind(filePath) {
  const parts = filePath.replace(/\\/g, "/").split("/");
  const basename = parts.pop() || "";
  if (!/\.md$/i.test(basename)) return;
  if (/^(?:\d+[-_\s]+)?to-be-continued\.md$/i.test(basename)) return "continued";
  const directory = [...parts].reverse().find((part) => /^(?:front|back)-matter$/i.test(part));
  if (directory) return directory.toLowerCase();
  if (/^(?:00[-_\s]?)?(?:intro|introduction)\.md$/i.test(basename)) return "intro";
  if (/^summary\.md$/i.test(basename)) return "summary";
}
function compareNumber(a, b, missing) {
  const left = Number.isFinite(a) ? a : missing;
  const right = Number.isFinite(b) ? b : missing;
  return left === right ? 0 : left - right;
}
function legacyPageOrder(page, context) {
  if (context === "reader") return page.order;
  if (page.kind === "intro") return -1e5;
  if (page.kind === "summary") return 9e4;
  if (page.kind === "appendix") return page.unitOrder ?? 1e5;
  return page.unitOrder ?? page.order;
}
function sortManuscriptPages(pages, context = "reader") {
  const missing = context === "reader" ? 0 : Number.MAX_SAFE_INTEGER;
  const compareLegacy = (a, b) => context === "workspace" ? a.filePath.localeCompare(b.filePath) : compareNumber(a.bookOrder, b.bookOrder, missing) || compareNumber(a.volumeOrder, b.volumeOrder, missing) || compareNumber(legacyPageOrder(a, context), legacyPageOrder(b, context), missing) || a.filePath.localeCompare(b.filePath);
  let ordered = [...pages].sort(compareLegacy);
  const scopes = /* @__PURE__ */ new Map();
  for (const page of ordered) {
    if (!isManuscriptMatterKind(page.kind)) continue;
    const key = JSON.stringify([page.bookKey, page.volumeKey]);
    if (!scopes.has(key)) scopes.set(key, []);
    scopes.get(key).push(page);
  }
  const groups = [...scopes.values()].sort((a, b) => Number(a[0].volumeKey === void 0) - Number(b[0].volumeKey === void 0));
  for (const matter of groups) {
    const scope = matter[0];
    const withinScope = (page) => page.bookKey === scope.bookKey && (scope.volumeKey === void 0 || page.volumeKey === scope.volumeKey);
    const group = new Set(matter);
    const remaining = ordered.filter((page) => !group.has(page));
    const first = remaining.findIndex(withinScope);
    let last = -1;
    for (let index = 0; index < remaining.length; index++) if (withinScope(remaining[index])) last = index;
    const rank = (page) => page.kind === "front-matter" ? 0 : page.kind === "back-matter" ? 1 : 2;
    const sortedMatter = [...matter].sort((a, b) => rank(a) - rank(b) || compareNumber(a.order, b.order, Number.MAX_SAFE_INTEGER) || a.filePath.localeCompare(b.filePath));
    if (first < 0) {
      const next = remaining.findIndex((page) => compareLegacy(scope, page) < 0);
      remaining.splice(next < 0 ? remaining.length : next, 0, ...sortedMatter);
      ordered = remaining;
      continue;
    }
    const front = sortedMatter.filter((page) => page.kind === "front-matter");
    const back = sortedMatter.filter((page) => page.kind !== "front-matter");
    ordered = [...remaining.slice(0, first), ...front, ...remaining.slice(first, last + 1), ...back, ...remaining.slice(last + 1)];
  }
  return ordered;
}
const GLOSSARY_NAME_RE = /(?:^|[^a-z])(?:glossary|terminology)(?:$|[^a-z])|术语/i;
const SUMMARY_NAME_RE = /(?:^|[-_])summary(?:$|[-_])|总结|小结/i;
const GENERIC_HEADING_RE = /^(?:附录\s*[A-Z0-9]*\s*[:：-]?\s*)?(?:概念|术语|定义|符号|记号|约定|目录|索引|说明|范围|总览|概览|引言|导言|参考文献|references?|introduction|overview|scope|notes?)$/i;
const APPENDIX_PREFIX_RE = /^(?:appendix(?=$|[\s_:：.、–—-])|附录)[\s_:：.、–—-]*/i;
const CONCEPT_TITLE_RE = /^(?:(?:core|key|basic|fundamental|main|common|project|mathematical)\s+)*(?:concepts?|definitions?)(?:\s+(?:index|table|list|overview|summary|reference))?$|^(?:(?:核心|基本|基础|关键|主要|常用|本书|全书|全卷|项目)\s*)*(?:概念|定义)(?:表|总表|一览表?|汇总|索引|总览|概览|速查表?|说明|清单)?$/i;
const NOTATION_TITLE_RE = /^(?:(?:core|key|basic|fundamental|main|common|project|mathematical)\s+)*(?:symbols?|notations?|conventions?)(?:\s+(?:index|table|list|overview|summary|reference|conventions))?$|^(?:table|list|index)\s+of\s+(?:symbols?|notation|conventions?)$|^(?:(?:核心|基本|基础|关键|主要|常用|本书|全书|全卷|项目)\s*)*(?:符号|记号|约定|符号约定|记号约定)(?:表|总表|一览表?|汇总|索引|总览|概览|速查表?|说明|清单)?$/i;
function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
}
function fileStem(filePath) {
  const basename = normalizePath(filePath).split("/").pop() || "";
  return basename.replace(/\.md$/i, "");
}
function normalizeTerm(value) {
  return String(value || "").replace(/#[-A-Za-z0-9_]+\b/g, "").replace(/\{#[^}]+\}/g, "").replace(/[`*_~]/g, "").replace(/^\s*(?:\d+(?:\.\d+)*|[A-Z])\s*[.、:：-]\s*/, "").replace(/^\s*(?:定义|Definition)\s*[（(]([^）)]+)[）)]\s*[:：]?\s*$/i, "$1").replace(/\s+/g, " ").trim();
}
function unfencedLines(content) {
  let fence;
  return String(content || "").split(/\r?\n/).map((line) => {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (match && match[1][0] === fence.marker && match[1].length >= fence.length && !match[2].trim()) fence = void 0;
      return "";
    }
    if (match) {
      fence = { marker: match[1][0], length: match[1].length };
      return "";
    }
    return line;
  });
}
function parseHeadings(content) {
  const headings = [];
  unfencedLines(content).forEach((line, index) => {
    const match = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*$/);
    if (!match) return;
    const title = normalizeTerm(match[2].replace(/\s+#+\s*$/, ""));
    if (title) headings.push({ level: match[1].length, line: index + 1, title });
  });
  return headings;
}
function knowledgeRoles(value) {
  const name = normalizeTerm(value.replace(/_/g, " "));
  const appendix = APPENDIX_PREFIX_RE.test(name);
  const descriptor = name.replace(APPENDIX_PREFIX_RE, "").replace(/[-_:：.–—]+/g, " ").replace(/^\d+\s+/, "").trim();
  const candidates = appendix ? [descriptor, descriptor.replace(/^[^\s、]+[\s、]+/, "")] : [descriptor];
  const roles = { concept: false, glossary: false, notation: false };
  for (const candidate of candidates) {
    const glossary = GLOSSARY_NAME_RE.test(candidate);
    const parts = candidate.split(/\s+(?:and|with)\s+|[&/+,、与和及暨]/i).map((part) => part.trim()).filter(Boolean);
    const partRoles = parts.map((part) => ({ concept: CONCEPT_TITLE_RE.test(part) || GLOSSARY_NAME_RE.test(part), notation: NOTATION_TITLE_RE.test(part) }));
    const dedicated = partRoles.length > 0 && partRoles.every((part) => part.concept || part.notation);
    roles.glossary ||= glossary;
    roles.concept ||= glossary || dedicated && partRoles.some((part) => part.concept);
    roles.notation ||= dedicated && partRoles.some((part) => part.notation);
  }
  return roles;
}
function sourceKind(document, headings) {
  if (isManuscriptMatterKind(unnumberedPageKind(document.filePath))) return;
  const stem = fileStem(document.filePath);
  const topTitle = headings.length > 0 ? headings.filter((heading) => heading.level === Math.min(...headings.map((item) => item.level)))[0]?.title || "" : "";
  const appendix = APPENDIX_PREFIX_RE.test(stem) || APPENDIX_PREFIX_RE.test(topTitle) || /(?:^|\/)附录/.test(normalizePath(document.filePath));
  const names = [knowledgeRoles(stem), knowledgeRoles(topTitle)];
  const concept = names.some((name) => name.concept);
  const glossary = names.some((name) => name.glossary);
  const notation = names.some((name) => name.notation);
  const summary = SUMMARY_NAME_RE.test(stem) || SUMMARY_NAME_RE.test(topTitle);
  const kinds = [];
  const historicalGlossary = /glossary|术语/i.test(`${stem} ${topTitle}`) || !appendix && (glossary || /概念表|核心概念/.test(`${stem} ${topTitle}`));
  if (concept) kinds.push(historicalGlossary ? "glossary" : "concept-appendix");
  if (notation) kinds.push("notation-appendix");
  if (summary) kinds.push("summary-page");
  if (!kinds.length) return void 0;
  if (summary && !appendix && !historicalGlossary) kinds.unshift(...kinds.splice(kinds.indexOf("summary-page"), 1));
  return { kind: kinds[0], kinds, filePath: normalizePath(document.filePath), title: topTitle || stem, confidence: appendix && (concept || notation) ? "high" : "medium" };
}
function conceptDocument(document) {
  const lines = unfencedLines(document.content);
  const headings = parseHeadings(document.content);
  const sections = [];
  headings.forEach((heading, index) => {
    while (sections.length && sections[sections.length - 1].level >= heading.level) sections.pop();
    const roles = knowledgeRoles(heading.title);
    const include = roles.concept || !roles.notation && (sections[sections.length - 1]?.include ?? true);
    sections.push({ level: heading.level, include });
    if (!include) lines.fill("", heading.line - 1, headings[index + 1] ? headings[index + 1].line - 1 : lines.length);
  });
  return { ...document, content: lines.join("\n") };
}
function tableCells(line) {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return [];
  const body = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let current = "";
  let escaped = false;
  for (const char of body) {
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === "\\") {
      current += char;
      escaped = true;
    } else if (char === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}
function isTableDivider(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, "")));
}
function isTermColumn(value) {
  return /^(?:术语|概念|名称|名词|term|concept|name)$/i.test(normalizeTerm(value));
}
function isDefinitionColumn(value) {
  return /^(?:定义|说明|释义|描述|definition|meaning|description|note)$/i.test(normalizeTerm(value));
}
function candidateContent(lines, heading, nextHeading) {
  const end = nextHeading ? nextHeading.line - 1 : lines.length;
  const content = lines.slice(heading.line, end).filter((line) => !/^\s{0,3}#{1,6}\s+/.test(line)).join("\n").trim();
  return content;
}
function headingDefinitions(document, source) {
  const lines = String(document.content || "").split(/\r?\n/);
  const headings = parseHeadings(document.content);
  if (headings.length < 2) return [];
  const pageLevel = Math.min(...headings.map((heading) => heading.level));
  const entryHeadings = headings.filter((heading) => {
    const roles = knowledgeRoles(heading.title);
    return heading.level > pageLevel && !GENERIC_HEADING_RE.test(heading.title) && !roles.concept && !roles.notation;
  });
  const itemLevel = Math.max(...entryHeadings.map((heading) => heading.level));
  if (!Number.isFinite(itemLevel)) return [];
  return entryHeadings.filter((heading) => heading.level === itemLevel).flatMap((heading) => {
    const title = normalizeTerm(heading.title);
    if (!title || GENERIC_HEADING_RE.test(title)) return [];
    const nextHeading = headings.find((candidate) => candidate.line > heading.line && candidate.level <= heading.level);
    const content = candidateContent(lines, heading, nextHeading);
    if (content.replace(/\s+/g, "").length < 16) return [];
    return [{
      title,
      filePath: source.filePath,
      line: heading.line,
      content,
      origin: source.kind === "glossary" ? "glossary" : "concept-appendix"
    }];
  });
}
function tableDefinitions(document, source) {
  const lines = unfencedLines(document.content);
  const definitions = [];
  for (let index = 0; index < lines.length - 2; index++) {
    const headers = tableCells(lines[index]);
    const divider = tableCells(lines[index + 1]);
    if (/^(?: {4}|\t)/.test(lines[index]) || !headers.length || headers.length !== divider.length || !isTableDivider(divider)) continue;
    const termIndex = headers.findIndex(isTermColumn);
    const definitionIndex = headers.findIndex(isDefinitionColumn);
    if (termIndex < 0 || definitionIndex < 0 || termIndex === definitionIndex) continue;
    for (let row = index + 2; row < lines.length; row++) {
      const cells = tableCells(lines[row]);
      if (cells.length !== headers.length) break;
      const title = normalizeTerm(cells[termIndex]);
      const content = cells[definitionIndex]?.trim() || "";
      if (!title || !content || isTableDivider(cells)) continue;
      definitions.push({
        title,
        filePath: source.filePath,
        line: row + 1,
        content,
        origin: source.kind === "glossary" ? "glossary" : "concept-appendix"
      });
    }
    index++;
  }
  return definitions;
}
function definitionKey(definition) {
  return `${normalizePath(definition.filePath)}:${normalizeTerm(definition.title).toLocaleLowerCase()}`;
}
function uniqueDefinitions(definitions, existing = []) {
  const existingKeys = new Set(existing.map((definition) => definitionKey({ filePath: definition.file || "", title: definition.title || "" })));
  const seen = /* @__PURE__ */ new Set();
  return definitions.filter((definition) => {
    const key = definitionKey(definition);
    if (!definition.title || existingKeys.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function analyzeProjectKnowledge(documents, existingDefinitions = []) {
  const sourceDocuments = documents.map((document) => ({ document, headings: parseHeadings(document.content) })).map(({ document, headings }) => ({ document, source: sourceKind(document, headings) })).filter((item) => !!item.source).sort((left, right) => left.source.filePath.localeCompare(right.source.filePath));
  const rawDefinitions = sourceDocuments.flatMap(({ document, source }) => {
    const completed = { ...source };
    if (!(completed.kinds || [completed.kind]).some((kind) => kind === "concept-appendix" || kind === "glossary")) return [];
    const concepts = conceptDocument(document);
    return [...tableDefinitions(concepts, completed), ...headingDefinitions(concepts, completed)];
  });
  const definitions = uniqueDefinitions(rawDefinitions, existingDefinitions);
  const definitionCountBySource = /* @__PURE__ */ new Map();
  definitions.forEach((definition) => definitionCountBySource.set(definition.filePath, (definitionCountBySource.get(definition.filePath) || 0) + 1));
  const sources = sourceDocuments.map(({ source }) => ({
    ...source,
    extractedDefinitions: definitionCountBySource.get(source.filePath) || 0
  }));
  const summary = {
    conceptSources: sources.filter((source) => (source.kinds || [source.kind]).some((kind) => kind === "concept-appendix" || kind === "glossary")).length,
    notationSources: sources.filter((source) => (source.kinds || [source.kind]).includes("notation-appendix")).length,
    summaryPages: sources.filter((source) => (source.kinds || [source.kind]).includes("summary-page")).length,
    extractedDefinitions: definitions.length
  };
  return {
    project: { schemaVersion: 1, generatedBy: "math-workspace", sources, summary },
    definitions
  };
}
const SYMBOL_PLACEHOLDER_RE = /\$\{([A-Za-z][A-Za-z0-9_]*)\}/g;
const SYMBOL_SAMPLE_VALUES = {
  operator: "T",
  ellipticOperator: "D",
  parameter: "\\lambda",
  param: "\\lambda",
  time: "t",
  index: "i",
  base: "U",
  object: "E",
  space: "X",
  radius: "R",
  mesh: "h",
  left: "x",
  right: "y"
};
const STRUCTURED_NUMBERED_TYPES = /* @__PURE__ */ new Set(["equation", "figure", "table"]);
const DEFAULT_CONFIG = {
  language: "zh",
  dictionary: {
    zh: formalDictionary("zh"),
    en: formalDictionary("en")
  },
  ui: {
    zh: {
      back: "返回",
      toc: "目录",
      emptyToc: "暂无目录数据",
      units: "章节",
      chapter: "第 {number} 章",
      appendix: "附录 {label}",
      intro: "导读",
      summary: "小结",
      introBadge: "导",
      summaryBadge: "结",
      unvolumed: "未分卷",
      volume: "第 {number} 卷",
      book: "第 {number} 本",
      workspace: "工作区"
    },
    en: {
      back: "Back",
      toc: "Contents",
      emptyToc: "No outline",
      units: "Sections",
      chapter: "Chapter {number}",
      appendix: "Appendix {label}",
      intro: "Intro",
      summary: "Summary",
      introBadge: "I",
      summaryBadge: "S",
      unvolumed: "Unvolumed",
      volume: "Volume {number}",
      book: "Book {number}",
      workspace: "Workspace"
    }
  },
  scan: {
    exclude: [
      ".git/**",
      ".math-workspace/**",
      "node_modules/**",
      "out/**",
      "dist/**"
    ]
  },
  lookup: {
    bookDependencies: {}
  },
  lean: {
    projects: [],
    coverageTypes: DEFAULT_LEAN_COVERAGE_TYPES
  },
  render: {
    pageHeadingStyle: "label-title"
  },
  metadata: {},
  pdf: {
    pdfEngine: "xelatex",
    paper: "a4",
    margin: "2.5cm",
    toc: true,
    tocDepth: 2,
    lang: "",
    tocTitle: "",
    title: "",
    subtitle: "",
    author: "",
    authorNative: "",
    authorAliases: [],
    orcid: "",
    repository: "",
    license: "",
    licenseUrl: "",
    preferredCitation: "",
    date: "",
    releaseVersion: "",
    releaseTag: "",
    releaseCommit: "",
    doi: "",
    showVersionOnCover: false,
    metadataPage: false,
    documentClass: "",
    titlePage: false,
    coverStyle: "simple",
    titleSize: "32pt",
    subtitleSize: "18pt",
    authorSize: "12pt",
    dateSize: "12pt",
    tocPageBreak: true,
    frontMatter: [],
    variables: []
  },
  debug: {
    markerTraceIds: []
  }
};
function toPosix(filePath) {
  return filePath.split(path__namespace.sep).join("/");
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function unique$1(values) {
  return [...new Set(values.filter(Boolean))];
}
function normalizePdfFrontMatter(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object").map((item) => ({
    title: typeof item.title === "string" ? item.title : "",
    source: typeof item.source === "string" ? item.source : "",
    content: typeof item.content === "string" ? item.content : "",
    toc: item.toc === true,
    pageBreakAfter: item.pageBreakAfter === false ? false : true
  })).filter((item) => item.title || item.source || item.content);
}
function mergeConfig(config) {
  const existing = config && typeof config === "object" ? config : {};
  const { preview: _legacyPreview, debug: rawDebug, ...baseConfig } = existing;
  const { previewLog: _legacyPreviewLog, ...debugConfig } = rawDebug && typeof rawDebug === "object" ? rawDebug : {};
  return {
    ...baseConfig,
    language: existing.language === "en" ? "en" : "zh",
    dictionary: {
      zh: { ...DEFAULT_CONFIG.dictionary.zh, ...existing.dictionary?.zh || {} },
      en: { ...DEFAULT_CONFIG.dictionary.en, ...existing.dictionary?.en || {} }
    },
    ui: {
      zh: { ...DEFAULT_CONFIG.ui.zh, ...existing.ui?.zh || {} },
      en: { ...DEFAULT_CONFIG.ui.en, ...existing.ui?.en || {} }
    },
    scan: {
      ...DEFAULT_CONFIG.scan,
      ...existing.scan || {},
      exclude: unique$1([
        ...DEFAULT_CONFIG.scan.exclude,
        ...Array.isArray(existing.scan?.exclude) ? existing.scan.exclude.filter((item) => typeof item === "string") : []
      ])
    },
    lookup: {
      ...DEFAULT_CONFIG.lookup,
      ...existing.lookup || {},
      bookDependencies: existing.lookup?.bookDependencies && typeof existing.lookup.bookDependencies === "object" ? existing.lookup.bookDependencies : {}
    },
    lean: {
      ...DEFAULT_CONFIG.lean,
      ...existing.lean || {},
      projects: (Array.isArray(existing.lean?.projects) ? existing.lean.projects : []).filter((project) => project && typeof project === "object").map((project) => ({
        ...project,
        key: typeof project.key === "string" ? project.key : "",
        root: typeof project.root === "string" ? project.root : "",
        sourceRoots: unique$1((Array.isArray(project.sourceRoots) ? project.sourceRoots : ["."]).filter((item) => typeof item === "string")),
        target: typeof project.target === "string" ? project.target : "",
        anchorPrefix: typeof project.anchorPrefix === "string" && project.anchorPrefix.trim() ? project.anchorPrefix.trim() : "Math Workspace anchor:"
      })),
      coverageTypes: unique$1((Array.isArray(existing.lean?.coverageTypes) ? existing.lean.coverageTypes : DEFAULT_CONFIG.lean.coverageTypes).filter((item) => typeof item === "string"))
    },
    render: {
      ...DEFAULT_CONFIG.render,
      ...existing.render || {},
      pageHeadingStyle: ["title", "number-title", "label-title"].includes(existing.render?.pageHeadingStyle) ? existing.render.pageHeadingStyle : DEFAULT_CONFIG.render.pageHeadingStyle
    },
    pdf: {
      ...DEFAULT_CONFIG.pdf,
      ...existing.pdf || {},
      pdfEngine: typeof existing.pdf?.pdfEngine === "string" && existing.pdf.pdfEngine ? existing.pdf.pdfEngine : DEFAULT_CONFIG.pdf.pdfEngine,
      paper: typeof existing.pdf?.paper === "string" && existing.pdf.paper ? existing.pdf.paper : DEFAULT_CONFIG.pdf.paper,
      margin: typeof existing.pdf?.margin === "string" && existing.pdf.margin ? existing.pdf.margin : DEFAULT_CONFIG.pdf.margin,
      toc: existing.pdf?.toc === false ? false : DEFAULT_CONFIG.pdf.toc,
      tocDepth: Number.isFinite(Number(existing.pdf?.tocDepth)) && Number(existing.pdf.tocDepth) >= 1 ? Math.floor(Number(existing.pdf.tocDepth)) : DEFAULT_CONFIG.pdf.tocDepth,
      lang: typeof existing.pdf?.lang === "string" ? existing.pdf.lang : DEFAULT_CONFIG.pdf.lang,
      tocTitle: typeof existing.pdf?.tocTitle === "string" ? existing.pdf.tocTitle : DEFAULT_CONFIG.pdf.tocTitle,
      title: typeof existing.pdf?.title === "string" ? existing.pdf.title : DEFAULT_CONFIG.pdf.title,
      subtitle: typeof existing.pdf?.subtitle === "string" ? existing.pdf.subtitle : DEFAULT_CONFIG.pdf.subtitle,
      author: typeof existing.pdf?.author === "string" ? existing.pdf.author : DEFAULT_CONFIG.pdf.author,
      authorNative: typeof existing.pdf?.authorNative === "string" ? existing.pdf.authorNative : DEFAULT_CONFIG.pdf.authorNative,
      authorAliases: unique$1(Array.isArray(existing.pdf?.authorAliases) ? existing.pdf.authorAliases.filter((item) => typeof item === "string") : []),
      orcid: typeof existing.pdf?.orcid === "string" ? existing.pdf.orcid : DEFAULT_CONFIG.pdf.orcid,
      repository: typeof existing.pdf?.repository === "string" ? existing.pdf.repository : DEFAULT_CONFIG.pdf.repository,
      license: typeof existing.pdf?.license === "string" ? existing.pdf.license : DEFAULT_CONFIG.pdf.license,
      licenseUrl: typeof existing.pdf?.licenseUrl === "string" ? existing.pdf.licenseUrl : DEFAULT_CONFIG.pdf.licenseUrl,
      preferredCitation: typeof existing.pdf?.preferredCitation === "string" ? existing.pdf.preferredCitation : DEFAULT_CONFIG.pdf.preferredCitation,
      date: typeof existing.pdf?.date === "string" ? existing.pdf.date : DEFAULT_CONFIG.pdf.date,
      releaseVersion: typeof existing.pdf?.releaseVersion === "string" ? existing.pdf.releaseVersion : DEFAULT_CONFIG.pdf.releaseVersion,
      releaseTag: typeof existing.pdf?.releaseTag === "string" ? existing.pdf.releaseTag : DEFAULT_CONFIG.pdf.releaseTag,
      releaseCommit: typeof existing.pdf?.releaseCommit === "string" ? existing.pdf.releaseCommit : DEFAULT_CONFIG.pdf.releaseCommit,
      doi: typeof existing.pdf?.doi === "string" ? existing.pdf.doi : DEFAULT_CONFIG.pdf.doi,
      showVersionOnCover: existing.pdf?.showVersionOnCover === true,
      metadataPage: existing.pdf?.metadataPage === true,
      documentClass: typeof existing.pdf?.documentClass === "string" ? existing.pdf.documentClass : DEFAULT_CONFIG.pdf.documentClass,
      titlePage: existing.pdf?.titlePage === true,
      coverStyle: typeof existing.pdf?.coverStyle === "string" && existing.pdf.coverStyle ? existing.pdf.coverStyle : DEFAULT_CONFIG.pdf.coverStyle,
      titleSize: typeof existing.pdf?.titleSize === "string" && existing.pdf.titleSize ? existing.pdf.titleSize : DEFAULT_CONFIG.pdf.titleSize,
      subtitleSize: typeof existing.pdf?.subtitleSize === "string" && existing.pdf.subtitleSize ? existing.pdf.subtitleSize : DEFAULT_CONFIG.pdf.subtitleSize,
      authorSize: typeof existing.pdf?.authorSize === "string" && existing.pdf.authorSize ? existing.pdf.authorSize : DEFAULT_CONFIG.pdf.authorSize,
      dateSize: typeof existing.pdf?.dateSize === "string" && existing.pdf.dateSize ? existing.pdf.dateSize : DEFAULT_CONFIG.pdf.dateSize,
      tocPageBreak: existing.pdf?.tocPageBreak === false ? false : DEFAULT_CONFIG.pdf.tocPageBreak,
      frontMatter: normalizePdfFrontMatter(existing.pdf?.frontMatter),
      variables: unique$1(Array.isArray(existing.pdf?.variables) ? existing.pdf.variables.filter((item) => typeof item === "string") : [])
    },
    debug: {
      ...DEFAULT_CONFIG.debug,
      ...debugConfig,
      markerTraceIds: unique$1(Array.isArray(existing.debug?.markerTraceIds) ? existing.debug.markerTraceIds.filter((item) => typeof item === "string") : [])
    }
  };
}
function normalizeScanPath(value) {
  return toPosix(String(value || "")).replace(/^\/+/, "").replace(/\/+$/, "");
}
function globPatternToRegExp(pattern) {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === "*") {
      if (pattern[i + 1] === "*") {
        source += ".*";
        i++;
      } else {
        source += "[^/]*";
      }
      continue;
    }
    if (char === "?") {
      source += "[^/]";
      continue;
    }
    source += escapeRegExp(char);
  }
  return new RegExp(`^${source}$`);
}
function scanPatternMatches(filePath, pattern) {
  const file = normalizeScanPath(filePath);
  const normalizedPattern = normalizeScanPath(pattern);
  if (!file || !normalizedPattern) return false;
  if (!/[*?]/.test(normalizedPattern)) {
    if (!normalizedPattern.includes("/")) {
      return file.split("/").includes(normalizedPattern);
    }
    return file === normalizedPattern || file.startsWith(`${normalizedPattern}/`);
  }
  if (normalizedPattern.endsWith("/**")) {
    const base = normalizeScanPath(normalizedPattern.slice(0, -3));
    if (file === base || file.startsWith(`${base}/`)) return true;
  }
  const direct = globPatternToRegExp(normalizedPattern);
  if (direct.test(file)) return true;
  if (!normalizedPattern.startsWith("**/") && !normalizedPattern.includes("/")) {
    return file.split("/").some((segment) => direct.test(segment));
  }
  return false;
}
function pathPatternMatches(filePath, pattern) {
  return scanPatternMatches(filePath, pattern);
}
function scanExcludePatterns(config) {
  const merged = mergeConfig(config);
  return Array.isArray(merged.scan?.exclude) ? merged.scan.exclude : [];
}
function shouldExcludeScanPath(filePath, config) {
  return scanExcludePatterns(config).some((pattern) => scanPatternMatches(filePath, pattern));
}
function getLanguage(config) {
  return config && config.language === "en" ? "en" : "zh";
}
function formatTemplate(template, values = {}) {
  return template.replace(/\{(\w+)\}/g, (_match, key) => values[key] || "");
}
function uiText(config, key, values = {}) {
  const language = getLanguage(config);
  const text2 = config?.ui?.[language]?.[key] || DEFAULT_CONFIG.ui[language]?.[key] || DEFAULT_CONFIG.ui.zh[key] || "";
  return formatTemplate(text2, values);
}
function typeName(config, type) {
  const language = getLanguage(config);
  return config?.dictionary?.[language]?.[type] || DEFAULT_CONFIG.dictionary[language]?.[type] || type;
}
function normalizeFormalPagePath(target, sourceFilePath = "") {
  let value = toPosix(String(target || "").trim()).replace(/^\/+/, "");
  if (!value) return "";
  if (/^\.\.?\//.test(value)) {
    const baseDir = sourceFilePath ? path__namespace.posix.dirname(toPosix(sourceFilePath)) : "";
    value = path__namespace.posix.join(baseDir, value);
  }
  return path__namespace.posix.normalize(value).replace(/^\.\/+/, "").replace(/^\/+/, "");
}
function formatPageReference(page, config, mode = "default") {
  const title = page.title || page.filePath;
  let label = title;
  if (page.kind === "chapter" && page.chapter !== void 0) {
    label = uiText(config, "chapter", { number: String(page.chapter) });
  } else if (page.kind === "appendix" && page.appendix) {
    label = uiText(config, "appendix", { label: page.appendix });
  } else if (page.kind === "intro") {
    label = uiText(config, "intro");
  } else if (page.kind === "summary") {
    label = uiText(config, "summary");
  }
  if (mode === "title") return title;
  if (mode === "full") {
    if (!title || title === label) return label;
    const colon = getLanguage(config) === "en" ? ": " : "：";
    return `${label}${colon}${title}`;
  }
  return label;
}
function pageHeadingStyle(config) {
  const style = config?.render?.pageHeadingStyle;
  return style === "title" || style === "number-title" || style === "label-title" ? style : "label-title";
}
function pageHeadingLabel(page, config, style) {
  if (page.kind === "chapter") {
    const number = page.unitLabel || (page.chapter !== void 0 ? String(page.chapter) : "");
    if (!number) return "";
    return style === "number-title" ? number : uiText(config, "chapter", { number });
  }
  if (page.kind === "appendix") {
    const label = page.unitLabel || page.appendix || "";
    if (!label) return "";
    return style === "number-title" ? label : uiText(config, "appendix", { label });
  }
  return "";
}
function startsWithPageHeadingLabel(title, label) {
  const normalizedTitle = title.replace(/\s+/g, " ").trim();
  const normalizedLabel = label.replace(/\s+/g, " ").trim();
  if (!normalizedTitle || !normalizedLabel) return false;
  if (normalizedTitle === normalizedLabel) return true;
  if (normalizedTitle.startsWith(normalizedLabel)) {
    const next2 = normalizedTitle.slice(normalizedLabel.length, normalizedLabel.length + 1);
    if (!next2 || /[\s:：,，.．、\-]/.test(next2)) return true;
  }
  const compactTitle = normalizedTitle.replace(/\s+/g, "");
  const compactLabel = normalizedLabel.replace(/\s+/g, "");
  if (!compactTitle || !compactLabel || !compactTitle.startsWith(compactLabel)) return false;
  const next = compactTitle.slice(compactLabel.length, compactLabel.length + 1);
  return !next || !/[A-Za-z0-9]/.test(next);
}
function formatPageHeadingPrefix(page, config) {
  const style = pageHeadingStyle(config);
  if (style === "title") return "";
  const label = pageHeadingLabel(page, config, style);
  if (!label) return "";
  const title = page.title || "";
  if (startsWithPageHeadingLabel(title, label)) return "";
  return label;
}
function formatPageHeading(page, config) {
  const title = page.title || page.filePath;
  const prefix = formatPageHeadingPrefix(page, config);
  return prefix ? `${prefix} ${title}` : title;
}
function normalizeLatexSymbol(value) {
  return String(value || "").trim().replace(/^\$+|\$+$/g, "").replace(/\\left\s*/g, "").replace(/\\right\s*/g, "").replace(/\\operatorname\s*\{([^{}]+)\}/g, "\\$1").replace(/\\([A-Za-z]+)\s+\{([^{}]+)\}/g, "\\$1{$2}").replace(/\s+/g, "").replace(/([_^])([A-Za-z0-9\\])(?![A-Za-z0-9{])/g, "$1{$2}");
}
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function compileSymbolPattern(pattern) {
  const normalizedPattern = normalizeLatexSymbol(pattern);
  const captures = [];
  let regex = "^";
  let cursor = 0;
  let match;
  SYMBOL_PLACEHOLDER_RE.lastIndex = 0;
  while (match = SYMBOL_PLACEHOLDER_RE.exec(normalizedPattern)) {
    regex += escapeRegex(normalizedPattern.slice(cursor, match.index));
    captures.push(match[1]);
    regex += "(.+?)";
    cursor = match.index + match[0].length;
  }
  regex += escapeRegex(normalizedPattern.slice(cursor));
  regex += "$";
  return { normalizedPattern, regex, captures };
}
function isEscapedMarkdownCharacter(value, index) {
  let slashes = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor--) slashes++;
  return slashes % 2 === 1;
}
function findInlineDollarEnd(value, start) {
  for (let cursor = start; cursor < value.length; cursor++) {
    if (value[cursor] === "$" && value[cursor + 1] !== "$" && !isEscapedMarkdownCharacter(value, cursor)) return cursor;
  }
  return -1;
}
function collectInlineLatex(value, formulas) {
  for (let cursor = 0; cursor < value.length; cursor++) {
    if (value[cursor] === "\\" && value[cursor + 1] === "(" && !isEscapedMarkdownCharacter(value, cursor)) {
      const end2 = value.indexOf("\\)", cursor + 2);
      if (end2 >= 0) {
        formulas.push({ latex: value.slice(cursor + 2, end2).trim(), display: false });
        cursor = end2 + 1;
      }
      continue;
    }
    if (value[cursor] !== "$" || value[cursor + 1] === "$" || isEscapedMarkdownCharacter(value, cursor)) continue;
    const end = findInlineDollarEnd(value, cursor + 1);
    if (end >= 0) {
      formulas.push({ latex: value.slice(cursor + 1, end).trim(), display: false });
      cursor = end;
    }
  }
}
function extractLatexFormulas(content) {
  const formulas = [];
  const codeFence = new MarkdownFence();
  let blockDelimiter = "";
  let blockBuffer = [];
  for (const line of String(content || "").split(/\r?\n/)) {
    if (codeFence.consume(line)) continue;
    if (blockDelimiter) {
      const close2 = line.indexOf(blockDelimiter);
      if (close2 < 0) {
        blockBuffer.push(line);
        continue;
      }
      const delimiter2 = blockDelimiter;
      blockBuffer.push(line.slice(0, close2));
      formulas.push({ latex: blockBuffer.join("\n").trim(), display: true });
      blockDelimiter = "";
      blockBuffer = [];
      collectInlineLatex(line.slice(close2 + delimiter2.length), formulas);
      continue;
    }
    const blockStart = line.search(/(?:\$\$|\\\[)/);
    if (blockStart < 0) {
      collectInlineLatex(line, formulas);
      continue;
    }
    const delimiter = line.slice(blockStart, blockStart + 2);
    const closeDelimiter = delimiter === "$$" ? "$$" : "\\]";
    const close = line.indexOf(closeDelimiter, blockStart + 2);
    collectInlineLatex(line.slice(0, blockStart), formulas);
    if (close >= 0) {
      formulas.push({ latex: line.slice(blockStart + 2, close).trim(), display: true });
      collectInlineLatex(line.slice(close + 2), formulas);
      continue;
    }
    blockDelimiter = closeDelimiter;
    blockBuffer = [line.slice(blockStart + 2)];
  }
  return formulas.filter((formula) => formula.latex);
}
function makeUnanchoredSymbolRegex(symbol) {
  const source = String(symbol.regex || "").replace(/^\^/, "").replace(/\$$/, "");
  if (!source || source === "(.+?)") return void 0;
  try {
    return new RegExp(source);
  } catch (_err) {
    return void 0;
  }
}
function symbolMatchesLatex(symbol, latex) {
  const normalized = normalizeLatexSymbol(latex);
  if (!normalized) return false;
  const regex = makeUnanchoredSymbolRegex(symbol);
  if (regex?.test(normalized)) return true;
  const pattern = normalizeLatexSymbol(symbol.pattern);
  if (pattern && !pattern.includes("${") && normalized.includes(pattern)) return true;
  const display = normalizeLatexSymbol(symbol.display);
  return Boolean(display && normalized.includes(display));
}
function findSymbolsInMarkdown(content, symbols) {
  const formulas = extractLatexFormulas(content);
  const matches = symbols.map((symbol, index) => ({
    index,
    symbol,
    formulaIndex: formulas.findIndex((formula) => symbolMatchesLatex(symbol, formula.latex))
  })).filter((match) => match.formulaIndex >= 0);
  return matches.sort((left, right) => left.formulaIndex - right.formulaIndex || `${left.symbol.sourceFilePath || ""}:${left.symbol.sourceLine || 0}`.localeCompare(`${right.symbol.sourceFilePath || ""}:${right.symbol.sourceLine || 0}`) || left.symbol.pattern.localeCompare(right.symbol.pattern));
}
function hasBalancedSymbolDelimiters(value) {
  const pairs = { ")": "(", "]": "[" };
  const stack = [];
  for (const char of value) {
    if (char === "(" || char === "[") {
      stack.push(char);
      continue;
    }
    if (char === ")" || char === "]") {
      if (stack.pop() !== pairs[char]) return false;
    }
  }
  return stack.length === 0;
}
function parseSourceLocation(source) {
  if (!source) return {};
  const match = String(source).match(/^(.+?)(?::(\d+))?$/);
  if (!match) return {};
  return {
    sourceFilePath: toPosix(match[1]).replace(/^\/+/, ""),
    sourceLine: match[2] ? Number(match[2]) : void 0
  };
}
function symbolSampleValue(name) {
  return SYMBOL_SAMPLE_VALUES[name] || "x";
}
function makeSymbolDisplay(pattern) {
  return `$${pattern.replace(/\$\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_match, name) => symbolSampleValue(name))}$`;
}
function normalizeSymbolDocuments(documents) {
  return documents.map(
    (document) => typeof document === "string" ? { filePath: document, content: "" } : document
  );
}
function parseFormalSymbols(input, documents = []) {
  const issues = [];
  const rawSymbols = Array.isArray(input) ? input : input && typeof input === "object" && Array.isArray(input.symbols) ? input.symbols : [];
  if (input !== void 0 && input !== null && !Array.isArray(input) && !(typeof input === "object" && Array.isArray(input.symbols))) {
    issues.push({
      severity: "error",
      code: "invalid-symbols-file",
      file: ".math-workspace/symbols.json",
      message: ".math-workspace/symbols.json must be an array, or an object with a symbols array."
    });
    return { symbols: [], issues };
  }
  const normalizedDocuments = normalizeSymbolDocuments(documents);
  const fileSet = new Set(normalizedDocuments.map((document) => toPosix(document.filePath).replace(/^\/+/, "")));
  const lineCounts = new Map(normalizedDocuments.map((document) => [
    toPosix(document.filePath).replace(/^\/+/, ""),
    document.content ? document.content.split(/\r\n|\r|\n/).length : 0
  ]));
  const seen = /* @__PURE__ */ new Map();
  const symbols = [];
  rawSymbols.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      issues.push({
        severity: "error",
        code: "invalid-symbol-entry",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: "Symbol entry must be an object."
      });
      return;
    }
    const pattern = typeof item.pattern === "string" ? item.pattern.trim() : "";
    const meaning = typeof item.meaning === "string" ? item.meaning.trim() : "";
    const source = typeof item.source === "string" && item.source.trim() ? item.source.trim() : "";
    if (!pattern || !meaning || !source) {
      issues.push({
        severity: "error",
        code: "invalid-symbol-entry",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: "Symbol entry requires non-empty source, pattern, and meaning."
      });
      return;
    }
    const compiled = compileSymbolPattern(pattern);
    const display = typeof item.display === "string" && item.display.trim() ? item.display.trim() : makeSymbolDisplay(pattern);
    const scope = typeof item.scope === "string" && item.scope.trim() ? item.scope.trim() : "book";
    const parsedSource = parseSourceLocation(source);
    if (!parsedSource.sourceFilePath || parsedSource.sourceLine === void 0) {
      issues.push({
        severity: "error",
        code: "symbol-source-invalid",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: `Symbol source ${source} must use path.md:line format.`
      });
      return;
    }
    if (fileSet.size > 0 && !fileSet.has(parsedSource.sourceFilePath)) {
      issues.push({
        severity: "error",
        code: "symbol-source-missing",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: `Symbol source ${source} does not point to a known Markdown file.`
      });
      return;
    }
    const lineCount = lineCounts.get(parsedSource.sourceFilePath) || 0;
    if (lineCount > 0 && (parsedSource.sourceLine < 1 || parsedSource.sourceLine > lineCount)) {
      issues.push({
        severity: "error",
        code: "symbol-source-line-missing",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: `Symbol source ${source} points outside the source file.`
      });
      return;
    }
    if (!new RegExp(compiled.regex).test(normalizeLatexSymbol(display))) {
      issues.push({
        severity: "warn",
        code: "symbol-display-mismatch",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: `Symbol display ${display} does not match pattern ${pattern}.`
      });
    }
    if (/^\$\{[A-Za-z][A-Za-z0-9_]*\}$/.test(compiled.normalizedPattern)) {
      issues.push({
        severity: "warn",
        code: "symbol-pattern-too-broad",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: `Symbol pattern ${pattern} is only a placeholder and may match unrelated formulas.`
      });
    }
    if (!hasBalancedSymbolDelimiters(compiled.normalizedPattern)) {
      issues.push({
        severity: "warn",
        code: "symbol-pattern-unbalanced-delimiter",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: `Symbol pattern ${pattern} has unbalanced parentheses or brackets and may match a surrounding formula instead of the notation itself.`
      });
    }
    const duplicateKey = `${scope}:${compiled.normalizedPattern}:${parsedSource.sourceFilePath}`;
    const previousIndex = seen.get(duplicateKey);
    if (previousIndex !== void 0) {
      issues.push({
        severity: "warn",
        code: "duplicate-symbol-pattern",
        file: ".math-workspace/symbols.json",
        line: index + 1,
        message: `Symbol pattern duplicates entry ${previousIndex + 1} in the same scope and source file.`
      });
    }
    seen.set(duplicateKey, index);
    symbols.push({
      pattern,
      normalizedPattern: compiled.normalizedPattern,
      regex: compiled.regex,
      captures: compiled.captures,
      display,
      meaning,
      scope,
      source,
      ...parsedSource
    });
  });
  return { symbols, issues };
}
function normalizeDefinitionAliases(value) {
  if (!Array.isArray(value)) return [];
  return unique$1(value.filter((alias) => typeof alias === "string").map((alias) => alias.trim()).filter(Boolean));
}
function normalizeDefinitionContentForMatch(value) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}
function parseFormalDefinitions(input, documents = [], configInput = DEFAULT_CONFIG) {
  const issues = [];
  const rawDefinitions = Array.isArray(input) ? input : input && typeof input === "object" && Array.isArray(input.definitions) ? input.definitions : [];
  if (input !== void 0 && input !== null && !Array.isArray(input) && !(typeof input === "object" && Array.isArray(input.definitions))) {
    issues.push({
      severity: "error",
      code: "invalid-definitions-file",
      file: ".math-workspace/definitions.json",
      message: ".math-workspace/definitions.json must be an array, or an object with a definitions array."
    });
    return { definitions: [], issues };
  }
  const config = mergeConfig(configInput);
  const normalizedDocuments = normalizeSymbolDocuments(documents);
  const documentMap = new Map(normalizedDocuments.map((document) => [
    toPosix(document.filePath).replace(/^\/+/, ""),
    document.content || ""
  ]));
  const seen = /* @__PURE__ */ new Map();
  const definitions = [];
  rawDefinitions.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      issues.push({
        severity: "error",
        code: "invalid-definition-entry",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: "Definition entry must be an object."
      });
      return;
    }
    const title = typeof item.term === "string" && item.term.trim() ? item.term.trim() : typeof item.title === "string" && item.title.trim() ? item.title.trim() : "";
    const source = typeof item.source === "string" && item.source.trim() ? item.source.trim() : "";
    const aliases2 = normalizeDefinitionAliases(item.aliases).filter((alias) => alias !== title);
    if (!title || !source) {
      issues.push({
        severity: "error",
        code: "invalid-definition-entry",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: "Definition entry requires non-empty term/title and source."
      });
      return;
    }
    const parsedSource = parseSourceLocation(source);
    if (!parsedSource.sourceFilePath || parsedSource.sourceLine === void 0) {
      issues.push({
        severity: "error",
        code: "definition-source-invalid",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: `Definition source ${source} must use path.md:line format.`
      });
      return;
    }
    const documentContent = documentMap.get(parsedSource.sourceFilePath);
    if (documentContent === void 0) {
      issues.push({
        severity: "error",
        code: "definition-source-missing",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: `Definition source ${source} does not point to a known Markdown file.`
      });
      return;
    }
    const lines = documentContent.split(/\r\n|\r|\n/);
    if (parsedSource.sourceLine < 1 || parsedSource.sourceLine > lines.length) {
      issues.push({
        severity: "error",
        code: "definition-source-line-missing",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: `Definition source ${source} points outside the source file.`
      });
      return;
    }
    const extracted = sourceLineRangeContent(lines, parsedSource.sourceLine);
    const explicitContent = typeof item.content === "string" && item.content.trim() ? item.content.trim() : "";
    if (!explicitContent) {
      issues.push({
        severity: "warn",
        code: "definition-content-missing",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: `Definition entry ${title} should include AI-maintained content; falling back to source extraction.`
      });
    } else if (!normalizeDefinitionContentForMatch(documentContent).includes(normalizeDefinitionContentForMatch(explicitContent))) {
      issues.push({
        severity: "warn",
        code: "definition-content-stale",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: `Definition entry ${title} content is not found in its source file near ${source}; update content after editing the source.`
      });
    }
    const content = explicitContent || extracted.content;
    const duplicateKey = `${title}:${parsedSource.sourceFilePath}:${parsedSource.sourceLine}`;
    const previousIndex = seen.get(duplicateKey);
    if (previousIndex !== void 0) {
      issues.push({
        severity: "warn",
        code: "duplicate-definition-entry",
        file: ".math-workspace/definitions.json",
        line: index + 1,
        message: `Definition entry duplicates entry ${previousIndex + 1}.`
      });
    }
    seen.set(duplicateKey, index);
    const book = inferBookInfo(parsedSource.sourceFilePath, config);
    const volume = inferVolumeInfo(parsedSource.sourceFilePath, config);
    const label = {
      type: "def",
      title,
      filePath: parsedSource.sourceFilePath,
      bookKey: book.key,
      bookTitle: book.title,
      bookOrder: book.order,
      content,
      startLine: extracted.startLine,
      endLine: extracted.endLine
    };
    if (volume) {
      label.volumeKey = volume.key;
      label.volumeTitle = volume.title;
      label.volumeOrder = volume.order;
    }
    definitions.push({
      type: "def",
      title,
      aliases: aliases2,
      file: parsedSource.sourceFilePath,
      line: parsedSource.sourceLine,
      label
    });
  });
  return { definitions, issues };
}
function stripIgnoredMarkdown(content) {
  const blank = (text2) => text2.replace(/[^\r\n]/g, " ");
  return maskFencedMarkdown(content).replace(/<!--[\s\S]*?-->/g, blank).replace(/`[^`\n]*`/g, blank);
}
function cleanMarkerTitle(title) {
  const trimmed = title.trim();
  const strong = trimmed.match(/^(\*\*|__)\s*([\s\S]+?)\s*\1$/);
  return strong ? strong[2].trim() : trimmed;
}
function unwrapLeadingStrong(text2) {
  const strong = text2.match(/^(\*\*|__)\s*([\s\S]+?)\s*\1([\s\S]*)$/);
  if (!strong) return void 0;
  return `${strong[2].trim()}${strong[3] || ""}`.trim();
}
function parseParenMarkerTitle(text2, requireSeparator) {
  const paren = text2.match(/^[（(]([^）)]+)[）)]\s*([：:]?)/);
  if (!paren) return "";
  if (requireSeparator && !paren[2]) return "";
  return cleanMarkerTitle(paren[1]);
}
function extractMarkerTitle(type, rest) {
  const trimmed = rest.trim();
  if (!trimmed) return "";
  const strongPrefix = unwrapLeadingStrong(trimmed);
  if (strongPrefix) {
    const strongTitle = parseParenMarkerTitle(strongPrefix, true);
    if (strongTitle) return strongTitle;
  }
  const parenTitle = parseParenMarkerTitle(trimmed, false);
  if (parenTitle) return parenTitle;
  if (type === "def") {
    const term = trimmed.match(/^([^：:\n，,。.;；]+)[：:]/);
    if (term) return term[1].trim();
  }
  return "";
}
function normalizeLeadingMarkerEmphasis(text2) {
  const trimmed = text2.trim().replace(/^(?:>\s*)+/, "").trim();
  return unwrapLeadingStrong(trimmed) || trimmed;
}
function parseFormalMarkerLine(line) {
  const heading = line.match(/^(#{1,6})\s+#([A-Za-z0-9_-]+)\s+(.+?)\s*$/);
  if (heading) {
    return {
      type: "section",
      id: heading[2],
      title: heading[3].trim(),
      markerText: `#${heading[2]}`,
      rest: heading[3].trim(),
      level: heading[1].length
    };
  }
  const text2 = normalizeLeadingMarkerEmphasis(line);
  const typePattern = FORMAL_TYPE_PATTERN;
  const typed = text2.match(new RegExp(`^(${typePattern})\\s*([\\s\\S]*)$`, "i"));
  if (!typed) return void 0;
  const type = normalizeFormalKind(typed[1]);
  if (!type) return void 0;
  if (type === "def") {
    const rest2 = typed[2] || "";
    if (!/^\s*[（(]/.test(rest2)) return void 0;
    const title = extractMarkerTitle(type, rest2);
    if (!title) return void 0;
    return {
      type,
      title,
      markerText: typed[1],
      rest: rest2
    };
  }
  const match = text2.match(new RegExp(`^(${typePattern})\\s+#([A-Za-z0-9_-]+)\\b\\s*([\\s\\S]*)$`, "i"));
  if (!match) return void 0;
  const rest = match[3] || "";
  const parsedTitle = extractMarkerTitle(type, rest);
  const solution = type === "solution" ? solutionTarget(parsedTitle) : void 0;
  return {
    type,
    id: match[2],
    title: solution ? solution.title : parsedTitle,
    solutionOf: solution?.id,
    markerText: `${match[1]} #${match[2]}`,
    rest
  };
}
function parseVolumeOrder(value) {
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  const roman = value.toUpperCase();
  if (!/^[IVXLCDM]+$/.test(roman)) return Number.MAX_SAFE_INTEGER;
  const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1e3 };
  let total = 0;
  let previous = 0;
  for (let i = roman.length - 1; i >= 0; i--) {
    const current = values[roman[i]] || 0;
    total += current < previous ? -current : current;
    previous = Math.max(previous, current);
  }
  return total || Number.MAX_SAFE_INTEGER;
}
function inferBookInfo(filePath, config) {
  const segment = filePath.split("/").slice(0, -1).find((part) => /^book[-_\s]?(?:\d+|[a-z0-9]+)(?:[-_\s].*)?$/i.test(part));
  if (!segment) {
    return { key: "__workspace__", title: uiText(config, "workspace"), order: 0 };
  }
  const match = segment.match(/^book[-_\s]?(\d+|[ivxlcdm]+)?(?:[-_\s].*)?$/i);
  const order = match && match[1] ? parseVolumeOrder(match[1]) : Number.MAX_SAFE_INTEGER;
  const title = order === Number.MAX_SAFE_INTEGER ? segment.replace(/[-_]+/g, " ") : uiText(config, "book", { number: String(order) });
  return { key: segment.toLowerCase(), title, order };
}
function inferVolumeInfo(filePath, config) {
  const segment = filePath.split("/").slice(0, -1).find((part) => /^(?:vol|volume)[-_\s]?(?:\d+|[ivxlcdm]+)(?:[-_\s].*)?$/i.test(part));
  if (!segment) return void 0;
  const match = segment.match(/^(?:vol|volume)[-_\s]?(\d+|[ivxlcdm]+)(?:[-_\s].*)?$/i);
  const order = match ? parseVolumeOrder(match[1]) : Number.MAX_SAFE_INTEGER;
  const title = order === Number.MAX_SAFE_INTEGER ? segment.replace(/[-_]+/g, " ") : uiText(config, "volume", { number: String(order) });
  return { key: segment.toLowerCase(), title, order };
}
function getAlphaOrder(value) {
  return value.toUpperCase().split("").reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
}
function parseNumberingUnit(basename) {
  const chapterMatch = basename.match(/^(\d+)-.*\.md$/i);
  if (chapterMatch) {
    const chapter = parseInt(chapterMatch[1], 10);
    if (chapter === 0) return void 0;
    return {
      kind: "chapter",
      key: `chapter-${chapter}`,
      label: String(chapter),
      order: chapter,
      chapter
    };
  }
  const appendixMatch = basename.match(/^appendix[-_\s]?([a-z]+|\d+)(?:[-_\s].*)?\.md$/i);
  if (!appendixMatch) return void 0;
  const raw = appendixMatch[1];
  const label = /^\d+$/.test(raw) ? raw : raw.toUpperCase();
  const appendixOrder = /^\d+$/.test(raw) ? parseInt(raw, 10) : getAlphaOrder(raw);
  return {
    kind: "appendix",
    key: `appendix-${label.toLowerCase()}`,
    label,
    order: 1e5 + appendixOrder,
    appendix: label
  };
}
function parseMarkdownHeadingLine(line) {
  const match = line.match(/^[ \t]{0,3}(#{1,6})[ \t]+(.+?)\s*$/);
  if (!match) return void 0;
  let title = match[2].replace(/[ \t]+#+[ \t]*$/, "").trim();
  if (!title) return void 0;
  const idMatch = title.match(/^#([A-Za-z0-9_-]+)\b\s*(.*)$/);
  if (idMatch) {
    title = idMatch[2].trim();
    if (!title) return void 0;
    return {
      level: match[1].length,
      id: idMatch[1],
      title
    };
  }
  return {
    level: match[1].length,
    title
  };
}
function getPageTitleHeading(content, fallback) {
  const headings = [];
  const codeFence = new MarkdownFence();
  let lineNumber = 0;
  for (const line of String(content || "").split(/\r?\n/)) {
    lineNumber++;
    if (codeFence.consume(line)) continue;
    const heading = parseMarkdownHeadingLine(line);
    if (!heading) continue;
    headings.push({ ...heading, line: lineNumber });
  }
  if (headings.length === 0) {
    return { title: fallback, line: 1, level: 1 };
  }
  const topLevel = Math.min(...headings.map((heading) => heading.level));
  const topHeadings = headings.filter((heading) => heading.level === topLevel);
  if (topHeadings.length !== 1) {
    return { title: fallback, line: 1, level: topLevel };
  }
  return topHeadings[0];
}
function fallbackPageTitle(filePath) {
  return path__namespace.posix.basename(filePath, ".md").replace(/^\d+-/, "").replace(/^appendix[-_\s]?[a-z0-9]+[-_\s]?/i, "").replace(/[-_]+/g, " ");
}
function getPageOrder(kind, unit, filePath = "") {
  if (kind === "intro") return -1e5;
  if (kind === "summary") return 2e5;
  if (isManuscriptMatterKind(kind)) return Math.min(Number(path__namespace.posix.basename(filePath).match(/^(\d+)[-_\s]+/)?.[1] ?? Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
  return unit ? unit.order : 0;
}
function markerLineContent(line, marker2) {
  if (marker2.type === "section") return marker2.title;
  return line.trim().replace(marker2.markerText, sourceMarkerLabel(marker2)).trim();
}
function sourceMarkerLabel(marker2) {
  return marker2.markerText.replace(/\s+#[A-Za-z0-9_-]+\b$/, "").trim();
}
function normalizeProofBoundaryLine(line) {
  return line.trim().replace(/^>\s*/, "").replace(/^\s*[-+*]\s+/, "").replace(/^\*\*(.+?)\*\*/, "$1").replace(/^__(.+?)__/, "$1").replace(/^\*(.+?)\*/, "$1").replace(/^_(.+?)_/, "$1").trim();
}
function isProofBoundaryLine(line) {
  const text2 = normalizeProofBoundaryLine(line);
  return /^(?:证明(?:概要|草图|思路|如下|在此略去)?|Proof(?:\s+sketch)?|Sketch of proof)\s*(?:[：:。.．.]|$|\s)/i.test(text2);
}
function isProofTerminatorLine(line) {
  const text2 = normalizeProofBoundaryLine(line);
  return /(?:证毕|Q\.?E\.?D\.?|∎|□)\s*[。.．.]?\s*$/i.test(text2) || /\$\s*\\square\s*\$\s*[。.．.]?\s*$/.test(text2) || /\\\[\s*\\square\s*\\\]\s*[。.．.]?\s*$/.test(text2);
}
function isMarkerBoundaryLine(line) {
  return /^#{1,6}\s+/.test(line) || !!parseFormalMarkerLine(line);
}
function isDisplayMathLine(line) {
  const text2 = line.trim();
  return text2.startsWith("$$") || text2.startsWith("\\[") || text2.startsWith("\\]") || /^\\(?:begin|end)\{(?:equation|align|alignat|gather|multline|flalign|split|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\}/.test(text2);
}
function isStructuredDefinitionContinuation(line) {
  const text2 = line.trim();
  return isDisplayMathLine(line) || /^>\s*/.test(text2) || /^\|.*\|$/.test(text2) || /^[-+*]\s+/.test(text2) || /^\d+[.)]\s+/.test(text2) || /^(\*\*|__)?\s*[（(]?(?:[ivxlcdm]+|[a-z]|\d+)[）).、]\s*/i.test(text2);
}
function isDisplayMathStartLine(line) {
  const text2 = line.trim();
  return text2.startsWith("$$") || text2.startsWith("\\[") || /^\\begin\{(?:equation|align|alignat|gather|multline|flalign|split|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\}/.test(text2);
}
function updateDisplayMathState(line, inDisplayMath) {
  const text2 = line.trim();
  const dollarCount = (text2.match(/\$\$/g) || []).length;
  if (dollarCount % 2 === 1) return !inDisplayMath;
  if (text2.startsWith("\\[")) return true;
  if (text2.startsWith("\\]")) return false;
  if (/^\\begin\{(?:equation|align|alignat|gather|multline|flalign|split|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\}/.test(text2)) return true;
  if (/^\\end\{(?:equation|align|alignat|gather|multline|flalign|split|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\}/.test(text2)) return false;
  return inDisplayMath;
}
function trimTrailingBlankLines(lines) {
  const trimmed = [...lines];
  while (trimmed.length > 0 && !trimmed[trimmed.length - 1].trim()) trimmed.pop();
  return trimmed;
}
function collectRecallMarkerContent(lines, startLine, marker2) {
  const contentLines = [markerLineContent(lines[startLine], marker2)];
  let endLine = startLine;
  if (FORMAL_KIND_POLICIES[marker2.type]?.counter === "example") {
    const codeFence = new MarkdownFence();
    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!codeFence.consume(line) && (isMarkerBoundaryLine(line) || /^ {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(line))) break;
      contentLines.push(line);
    }
    const trimmed = trimTrailingBlankLines(contentLines);
    return { contentLines: trimmed, endLine: startLine + trimmed.length - 1 };
  }
  let proofLine = -1;
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (isMarkerBoundaryLine(line)) break;
    if (isProofBoundaryLine(line)) {
      proofLine = i;
      break;
    }
  }
  if (proofLine >= 0) {
    for (let i = startLine + 1; i < proofLine; i++) {
      contentLines.push(lines[i]);
      endLine = i;
    }
    return { contentLines: trimTrailingBlankLines(contentLines), endLine };
  }
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) break;
    if (isMarkerBoundaryLine(line)) break;
    contentLines.push(line);
    endLine = i;
  }
  return { contentLines: trimTrailingBlankLines(contentLines), endLine };
}
function nextNonBlankLineIndex(lines, startIndex) {
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].trim()) return i;
  }
  return -1;
}
function collectDefinitionContent(lines, startLine, marker2) {
  const contentLines = [marker2 ? markerLineContent(lines[startLine], marker2) : lines[startLine].trim()];
  let endLine = startLine;
  let inDisplayMath = updateDisplayMathState(lines[startLine], false);
  let previousNonBlankWasDisplayMath = isDisplayMathLine(lines[startLine]);
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (isMarkerBoundaryLine(line)) break;
    if (!line.trim()) {
      const nextNonBlank = nextNonBlankLineIndex(lines, i + 1);
      if (nextNonBlank < 0 || isMarkerBoundaryLine(lines[nextNonBlank])) break;
      if (!inDisplayMath && !previousNonBlankWasDisplayMath && !isStructuredDefinitionContinuation(lines[nextNonBlank])) break;
      contentLines.push(line);
      endLine = i;
      previousNonBlankWasDisplayMath = false;
      continue;
    }
    const lineWasDisplayMath = inDisplayMath || isDisplayMathLine(line);
    contentLines.push(line);
    endLine = i;
    inDisplayMath = updateDisplayMathState(line, inDisplayMath);
    previousNonBlankWasDisplayMath = lineWasDisplayMath;
  }
  return { contentLines: trimTrailingBlankLines(contentLines), endLine };
}
function collectMarkerContent(lines, startLine, marker2) {
  if (RECALL_TYPES.has(marker2.type)) {
    return collectRecallMarkerContent(lines, startLine, marker2);
  }
  if (marker2.type === "def") {
    return collectDefinitionContent(lines, startLine, marker2);
  }
  const contentLines = [markerLineContent(lines[startLine], marker2)];
  let endLine = startLine;
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) break;
    if (isMarkerBoundaryLine(line)) break;
    contentLines.push(line);
    endLine = i;
  }
  return { contentLines: trimTrailingBlankLines(contentLines), endLine };
}
function sourceLineRangeContent(lines, sourceLine) {
  const sourceIndex = Math.max(0, Math.min(lines.length - 1, sourceLine - 1));
  const marker2 = parseFormalMarkerLine(lines[sourceIndex]);
  if (marker2) {
    const collected2 = collectMarkerContent(lines, sourceIndex, marker2);
    return {
      content: collected2.contentLines.join("\n"),
      startLine: sourceIndex,
      endLine: collected2.endLine
    };
  }
  const isBoundary = (line) => !line.trim() || /^#{1,6}\s+/.test(line) || !!parseFormalMarkerLine(line);
  let startLine = sourceIndex;
  while (startLine > 0 && !isBoundary(lines[startLine - 1])) startLine--;
  const collected = collectDefinitionContent(lines, startLine);
  return {
    content: collected.contentLines.join("\n").trim(),
    startLine,
    endLine: collected.endLine
  };
}
function makeLabelData(marker2, unitFile, startLine, contentLines, markerNumber, endLine) {
  const content = RECALL_TYPES.has(marker2.type) ? contentLines.join("\n") : void 0;
  const label = {
    type: marker2.type,
    title: marker2.title,
    filePath: unitFile.filePath,
    bookKey: unitFile.book.key,
    bookTitle: unitFile.book.title,
    bookOrder: unitFile.book.order,
    unitKind: unitFile.unit.kind,
    unitKey: unitFile.unit.key,
    unitLabel: unitFile.unit.label,
    unitOrder: unitFile.unit.order,
    startLine,
    endLine
  };
  if (content) label.content = content;
  if (unitFile.unit.chapter !== void 0) label.chapter = unitFile.unit.chapter;
  if (unitFile.unit.appendix !== void 0) label.appendix = unitFile.unit.appendix;
  if (markerNumber !== void 0) label.number = markerNumber;
  if (unitFile.volume) {
    label.volumeKey = unitFile.volume.key;
    label.volumeTitle = unitFile.volume.title;
    label.volumeOrder = unitFile.volume.order;
  }
  return label;
}
function makeDefinitionLabelData(marker2, document, book, volume, startLine, contentLines, endLine) {
  const content = contentLines.join("\n");
  const label = {
    type: marker2.type,
    title: marker2.title,
    filePath: document.filePath,
    bookKey: book.key,
    bookTitle: book.title,
    bookOrder: book.order,
    content,
    startLine,
    endLine
  };
  if (volume) {
    label.volumeKey = volume.key;
    label.volumeTitle = volume.title;
    label.volumeOrder = volume.order;
  }
  return label;
}
function makePageLabelData(page) {
  const label = {
    type: page.kind,
    title: page.title,
    filePath: page.filePath,
    bookKey: page.bookKey,
    bookTitle: page.bookTitle,
    bookOrder: page.bookOrder,
    volumeKey: page.volumeKey,
    volumeTitle: page.volumeTitle,
    volumeOrder: page.volumeOrder,
    unitKind: page.unitKind,
    unitKey: page.unitKey,
    unitLabel: page.unitLabel,
    unitOrder: page.unitOrder,
    chapter: page.chapter,
    appendix: page.appendix,
    startLine: page.line !== void 0 ? page.line - 1 : void 0,
    endLine: page.line !== void 0 ? page.line - 1 : void 0
  };
  return label;
}
function previousNonBlankLineIndex(lines, startIndex) {
  for (let i = startIndex; i >= 0; i--) {
    if (lines[i].trim()) return i;
  }
  return -1;
}
function isMarkdownImageLine(line) {
  return /!\[[^\]\n]*\]\([^)]+\)/.test(line.trim());
}
function isMarkdownTableRow(line) {
  const text2 = line.trim();
  return text2.includes("|") && text2.split("|").filter((part) => part.trim()).length >= 2;
}
function isMarkdownTableDelimiter(line) {
  const text2 = line.trim();
  if (!text2.includes("|")) return false;
  const cells = text2.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}
function isMarkdownTableStart(lines, lineIndex) {
  return lineIndex >= 0 && lineIndex + 1 < lines.length && isMarkdownTableRow(lines[lineIndex]) && isMarkdownTableDelimiter(lines[lineIndex + 1]);
}
function lintStructuredNumberedMarker(marker2, lines, lineIndex, filePath) {
  if (!STRUCTURED_NUMBERED_TYPES.has(marker2.type)) return [];
  const issues = [];
  const next = nextNonBlankLineIndex(lines, lineIndex + 1);
  const previous = previousNonBlankLineIndex(lines, lineIndex - 1);
  if (marker2.type === "equation") {
    if (next < 0 || !isDisplayMathStartLine(lines[next])) {
      issues.push({
        severity: "error",
        code: "equation-target-missing",
        file: filePath,
        line: lineIndex + 1,
        message: "Equation marker must be followed by a display math block."
      });
    }
    return issues;
  }
  if (!marker2.title) {
    issues.push({
      severity: "warn",
      code: `${marker2.type}-caption-missing`,
      file: filePath,
      line: lineIndex + 1,
      message: `${marker2.type === "figure" ? "Figure" : "Table"} marker should include a caption title.`
    });
  }
  if (marker2.type === "figure") {
    const hasNearbyImage = previous >= 0 && isMarkdownImageLine(lines[previous]) || next >= 0 && isMarkdownImageLine(lines[next]);
    if (!hasNearbyImage) {
      issues.push({
        severity: "error",
        code: "figure-target-missing",
        file: filePath,
        line: lineIndex + 1,
        message: "Figure marker should be adjacent to a Markdown image."
      });
    }
    return issues;
  }
  if (marker2.type === "table" && (next < 0 || !isMarkdownTableStart(lines, next))) {
    issues.push({
      severity: "error",
      code: "table-target-missing",
      file: filePath,
      line: lineIndex + 1,
      message: "Table marker must be followed by a Markdown table."
    });
  }
  return issues;
}
function scanFormalDocuments(documents, configInput, symbolsInput, definitionsInput) {
  const config = mergeConfig(configInput);
  const files = [...documents].sort((a, b) => a.filePath.localeCompare(b.filePath));
  const labels = {};
  const definitions = [];
  const references = [];
  const pageReferences = [];
  const pages = [];
  const issues = [];
  const unitFiles = /* @__PURE__ */ new Map();
  const anchorsByFile = /* @__PURE__ */ new Map();
  for (const document of files) {
    const filePath = toPosix(document.filePath);
    const basename = path__namespace.posix.basename(filePath);
    const content = document.content;
    const book = inferBookInfo(filePath, config);
    const volume = inferVolumeInfo(filePath, config);
    const specialKind = unnumberedPageKind(filePath);
    const unit = specialKind ? void 0 : parseNumberingUnit(basename);
    const pageAnchor = unit || specialKind ? getPageTitleHeading(content, fallbackPageTitle(filePath)) : void 0;
    if (unit || specialKind) {
      const kind = unit ? unit.kind : specialKind;
      const page = {
        id: pageAnchor?.id,
        kind,
        filePath,
        title: pageAnchor?.title || fallbackPageTitle(filePath),
        order: getPageOrder(kind, unit, filePath),
        bookKey: book.key,
        bookTitle: book.title,
        bookOrder: book.order,
        line: pageAnchor?.line,
        level: pageAnchor?.level
      };
      if (volume) {
        page.volumeKey = volume.key;
        page.volumeTitle = volume.title;
        page.volumeOrder = volume.order;
      }
      if (unit) {
        page.unitKind = unit.kind;
        page.unitKey = unit.key;
        page.unitLabel = unit.label;
        page.unitOrder = unit.order;
        if (unit.chapter !== void 0) page.chapter = unit.chapter;
        if (unit.appendix !== void 0) page.appendix = unit.appendix;
      }
      pages.push(page);
      if (page.id) {
        const label = makePageLabelData(page);
        labels[page.id] = label;
        definitions.push({
          id: page.id,
          type: page.kind,
          title: page.title,
          file: filePath,
          line: page.line || 1,
          label
        });
      }
    }
    collectReferences(content, filePath, references, pageReferences);
    const allMarkerStarts = collectMarkerStarts(content, filePath);
    anchorsByFile.set(filePath, {
      stable: allMarkerStarts.filter((marker2) => typeof marker2.id === "string" && marker2.id.startsWith("h-")).length,
      temporary: allMarkerStarts.filter((marker2) => typeof marker2.id === "string" && marker2.id.startsWith("tmp-")).length
    });
    const markerStarts = allMarkerStarts.filter((marker2) => !isPageAnchorMarker(marker2, pageAnchor));
    if (markerStarts.some((marker2) => marker2.type !== "def") && !unit) {
      issues.push({
        severity: "warn",
        code: "formal-marker-outside-numbered-file",
        file: filePath,
        message: "Numbered markers are only numbered in NN-title.md or appendix-a-title.md files."
      });
    }
    const lines = content.split(/\r?\n/);
    const codeFence = new MarkdownFence();
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (codeFence.consume(line)) continue;
      const marker2 = parseFormalMarkerLine(line);
      if (!marker2 || marker2.type !== "def") continue;
      const collected = collectMarkerContent(lines, lineIndex, marker2);
      const label = makeDefinitionLabelData(marker2, { filePath }, book, volume, lineIndex, collected.contentLines, collected.endLine);
      definitions.push({
        type: marker2.type,
        title: marker2.title,
        file: filePath,
        line: lineIndex + 1,
        label
      });
    }
    if (!unit) continue;
    const volumeKey = volume?.key || "__root__";
    const scopeKey = unit.kind === "appendix" ? `${book.key}:${volumeKey}:${unit.key}` : `${book.key}:${unit.key}`;
    if (!unitFiles.has(scopeKey)) unitFiles.set(scopeKey, []);
    unitFiles.get(scopeKey).push({ filePath, content, book, volume, unit, pageAnchor });
  }
  for (const groupFiles of unitFiles.values()) {
    groupFiles.sort((a, b) => a.filePath.localeCompare(b.filePath));
    const counters = {};
    for (const unitFile of groupFiles) {
      const lines = unitFile.content.split(/\r?\n/);
      const codeFence = new MarkdownFence();
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        if (codeFence.consume(line)) continue;
        const marker2 = parseFormalMarkerLine(line);
        if (!marker2) continue;
        if (isPageAnchorMarker({ ...marker2, line: lineIndex + 1 }, unitFile.pageAnchor)) continue;
        if (marker2.type === "def") continue;
        issues.push(...lintStructuredNumberedMarker(marker2, lines, lineIndex, unitFile.filePath));
        const counter = FORMAL_KIND_POLICIES[marker2.type]?.counter;
        const markerNumber = counter ? counters[counter] = (counters[counter] || 0) + 1 : void 0;
        const exerciseContent = isPedagogicalKind(marker2.type) ? collectExerciseContent(lines, lineIndex, marker2, parseFormalMarkerLine) : void 0;
        const content = exerciseContent || collectMarkerContent(lines, lineIndex, marker2);
        const label = makeLabelData(marker2, unitFile, lineIndex, content.contentLines, markerNumber, content.endLine);
        if (exerciseContent) {
          label.bodyEndLine = exerciseContent.bodyEndLine;
          label.supportRanges = exerciseContent.support;
          label.supportContent = exerciseContent.support.map((range) => lines.slice(range.startLine, range.endLine + 1).join("\n")).join("\n");
          label.solutionOf = marker2.solutionOf;
          if (marker2.type === "solution") label.proofContent = lines.slice(lineIndex, exerciseContent.bodyEndLine + 1).join("\n");
          else label.proofContent = exerciseContent.support.filter((range) => range.kind === "solution").map((range) => lines.slice(range.startLine, range.endLine + 1).join("\n")).join("\n");
        } else {
          const proof = findProofRange(lines, lineIndex + 1, content.endLine + 1);
          if (proof.proofStartLine !== void 0 && proof.proofEndLine !== void 0) {
            label.proofContent = lines.slice(proof.proofStartLine - 1, proof.proofEndLine).join("\n");
          }
        }
        labels[marker2.id] = label;
        definitions.push({
          id: marker2.id,
          type: marker2.type,
          title: marker2.title,
          file: unitFile.filePath,
          line: lineIndex + 1,
          label
        });
      }
    }
  }
  issues.push(...connectExerciseSolutions(definitions, labels));
  const customDefinitionResult = parseFormalDefinitions(definitionsInput, files, config);
  for (const customDefinition of customDefinitionResult.definitions) {
    customDefinition.origin = "manual";
    customDefinition.label.definitionOrigin = "manual";
    const existing = definitions.find((def) => def.type === "def" && def.file === customDefinition.file && def.line === customDefinition.line && def.title === customDefinition.title);
    if (existing) {
      existing.aliases = unique$1([...existing.aliases || [], ...customDefinition.aliases || []]);
      continue;
    }
    definitions.push(customDefinition);
  }
  issues.push(...customDefinitionResult.issues);
  const projectKnowledge = analyzeProjectKnowledge(files, definitions);
  const knowledgeOrigins = /* @__PURE__ */ new Map();
  for (const source of projectKnowledge.project.sources) {
    const conceptKind = (source.kinds || [source.kind]).find((kind) => kind === "concept-appendix" || kind === "glossary");
    if (conceptKind) knowledgeOrigins.set(source.filePath, conceptKind);
  }
  for (const definition of definitions) {
    if (definition.type !== "def" || definition.origin) continue;
    const origin = knowledgeOrigins.get(definition.file);
    definition.origin = origin || "standard";
    definition.label.definitionOrigin = definition.origin;
  }
  for (const candidate of projectKnowledge.definitions) {
    const book = inferBookInfo(candidate.filePath, config);
    const volume = inferVolumeInfo(candidate.filePath, config);
    const label = {
      type: "def",
      title: candidate.title,
      filePath: candidate.filePath,
      bookKey: book.key,
      bookTitle: book.title,
      bookOrder: book.order,
      content: candidate.content,
      startLine: candidate.line - 1,
      endLine: candidate.line - 1,
      definitionOrigin: candidate.origin
    };
    if (volume) {
      label.volumeKey = volume.key;
      label.volumeTitle = volume.title;
      label.volumeOrder = volume.order;
    }
    definitions.push({
      type: "def",
      title: candidate.title,
      file: candidate.filePath,
      line: candidate.line,
      label,
      origin: candidate.origin
    });
  }
  const symbolResult = parseFormalSymbols(symbolsInput, files);
  issues.push(...symbolResult.issues);
  issues.push(...lintDefinitions(definitions));
  issues.push(...lintReferences(references, labels, definitions, config));
  issues.push(...lintPageReferences(pageReferences, pages, config));
  issues.push(...lintPages(pages));
  for (const page of pages) {
    const anchors = anchorsByFile.get(page.filePath) || { stable: 0, temporary: 0 };
    const issueCount = issues.filter((issue) => issue.file === page.filePath).length;
    const hasStablePageAnchor = typeof page.id === "string" && page.id.startsWith("h-");
    page.integration = {
      status: anchors.temporary > 0 || issueCount > 0 ? "attention" : hasStablePageAnchor ? "managed" : anchors.stable > 0 ? "segmented" : "unmanaged",
      stableAnchorCount: anchors.stable,
      temporaryAnchorCount: anchors.temporary,
      issueCount
    };
  }
  definitions.sort(compareDefinitionRecords);
  pages.splice(0, pages.length, ...sortManuscriptPages(pages));
  const dependencyGraph = buildDependencyGraph({ config, labels, definitions, references }, files);
  return { config, files: files.map((file) => file.filePath), labels, pages, definitions, references, pageReferences, symbols: symbolResult.symbols, issues, dependencyGraph, projectAnalysis: projectKnowledge.project };
}
function collectMarkerStarts(content, filePath) {
  const starts = [];
  const lines = content.split(/\r?\n/);
  const codeFence = new MarkdownFence();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (codeFence.consume(line)) continue;
    const marker2 = parseFormalMarkerLine(line);
    if (marker2) starts.push({ ...marker2, file: filePath, line: i + 1 });
  }
  return starts;
}
function isPageAnchorMarker(marker2, pageAnchor) {
  return Boolean(
    pageAnchor?.id && marker2?.id === pageAnchor.id && marker2?.line === pageAnchor.line && marker2?.type === "section"
  );
}
function collectReferences(content, filePath, references, pageReferences) {
  const stripped = stripIgnoredMarkdown(content);
  const lineStarts = [0];
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === "\n") lineStarts.push(i + 1);
  }
  const pageRefRe = /(^|[^A-Za-z0-9_])@(chapter|page):([^\s<>"'`，。；;！？]+?\.md)(?:\.(title|full))?(?=$|[\s,，。；;:：.!！?？)\]}])/g;
  let pageMatch;
  while (pageMatch = pageRefRe.exec(stripped)) {
    const offset = pageMatch.index + pageMatch[1].length;
    const line = findLineForOffset(lineStarts, offset);
    pageReferences.push({
      kind: pageMatch[2],
      rawTarget: pageMatch[3],
      target: normalizeFormalPagePath(pageMatch[3], filePath),
      mode: pageMatch[4],
      file: filePath,
      line
    });
  }
  const refRe = /(^|[^A-Za-z0-9_])@([A-Za-z0-9_-]+)(?:\.(?:title|full))?\b(?!:)/g;
  let match;
  while (match = refRe.exec(stripped)) {
    const offset = match.index + match[1].length;
    const line = findLineForOffset(lineStarts, offset);
    references.push({ id: match[2], file: filePath, line });
  }
}
function findLineForOffset(lineStarts, offset) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= offset) low = mid + 1;
    else high = mid - 1;
  }
  return high + 1;
}
function lintDefinitions(definitions) {
  const issues = [];
  const byId = /* @__PURE__ */ new Map();
  for (const def of definitions) {
    if (!def.id) continue;
    if (!byId.has(def.id)) byId.set(def.id, []);
    byId.get(def.id).push(def);
    if (TMP_ID_RE.test(def.id)) {
      issues.push({
        severity: "error",
        code: "tmp-id-left",
        file: def.file,
        line: def.line,
        message: `Temporary marker #${def.id} remains. Run npm run workspace -- finish <file>.`
      });
    } else if (!HASH_ID_RE.test(def.id)) {
      issues.push({
        severity: "warn",
        code: "non-hash-id",
        file: def.file,
        line: def.line,
        message: `Marker id #${def.id} is not a pure hash id.`
      });
    }
  }
  for (const [id, defs] of byId) {
    if (defs.length <= 1) continue;
    defs.forEach((def) => {
      issues.push({
        severity: "error",
        code: "duplicate-id",
        file: def.file,
        line: def.line,
        message: `Duplicate marker id #${id}.`
      });
    });
  }
  return issues;
}
function normalizeBookDependencyKey(value) {
  return String(value || "").trim().toLowerCase();
}
function directBookDependencies(config, sourceBookKey) {
  const dependencies = config?.lookup?.bookDependencies;
  if (!dependencies || typeof dependencies !== "object") return [];
  const source = normalizeBookDependencyKey(sourceBookKey);
  for (const [key, value] of Object.entries(dependencies)) {
    if (normalizeBookDependencyKey(key) !== source) continue;
    return Array.isArray(value) ? value.filter((item) => typeof item === "string").map(normalizeBookDependencyKey).filter(Boolean) : [];
  }
  return [];
}
function canReferenceBook(sourceBookKey, targetBookKey, config, seen = /* @__PURE__ */ new Set()) {
  const source = normalizeBookDependencyKey(sourceBookKey);
  const target = normalizeBookDependencyKey(targetBookKey);
  if (!source || !target || source === target) return true;
  if (seen.has(source)) return false;
  seen.add(source);
  const dependencies = directBookDependencies(config, source);
  if (dependencies.includes(target)) return true;
  return dependencies.some((dependency) => canReferenceBook(dependency, target, config, seen));
}
function lintReferences(references, labels, definitions, config) {
  const issues = [];
  const definedIds = new Set(Object.keys(labels));
  const tmpDefs = new Set(definitions.filter((def) => def.id && TMP_ID_RE.test(def.id)).map((def) => def.id));
  for (const ref of references) {
    if (TMP_ID_RE.test(ref.id)) {
      issues.push({
        severity: tmpDefs.has(ref.id) ? "error" : "error",
        code: "tmp-ref-left",
        file: ref.file,
        line: ref.line,
        message: `Temporary reference @${ref.id} remains. Run finish before committing.`
      });
      continue;
    }
    if (!definedIds.has(ref.id)) {
      issues.push({
        severity: "error",
        code: "missing-ref",
        file: ref.file,
        line: ref.line,
        message: `Reference @${ref.id} has no matching marker.`
      });
      continue;
    }
    const target = labels[ref.id];
    const sourceBook = inferBookInfo(ref.file, config);
    const targetBookKey = target.bookKey || inferBookInfo(target.filePath || "", config).key;
    if (!canReferenceBook(sourceBook.key, targetBookKey, config)) {
      issues.push({
        severity: "error",
        code: "cross-book-ref-disallowed",
        file: ref.file,
        line: ref.line,
        message: `Reference @${ref.id} crosses from ${sourceBook.title} to ${target.bookTitle || targetBookKey}; add lookup.bookDependencies if this dependency is intentional.`
      });
    }
  }
  return issues;
}
function lintPageReferences(pageReferences, pages, config) {
  const issues = [];
  const pageByPath = new Map(pages.map((page) => [page.filePath, page]));
  for (const ref of pageReferences) {
    const target = pageByPath.get(ref.target);
    if (!target) {
      issues.push({
        severity: "error",
        code: "missing-page-ref",
        file: ref.file,
        line: ref.line,
        message: `Page reference @${ref.kind}:${ref.rawTarget} resolves to ${ref.target || "(empty)"}, but no scanned page matches that path.`
      });
      continue;
    }
    if (ref.kind === "chapter" && target.kind !== "chapter") {
      issues.push({
        severity: "error",
        code: "page-ref-kind-mismatch",
        file: ref.file,
        line: ref.line,
        message: `@chapter:${ref.rawTarget} points to a ${target.kind} page. Use @page:${target.filePath} for non-chapter pages.`
      });
    }
    const sourceBook = inferBookInfo(ref.file, config);
    const targetBookKey = target.bookKey || inferBookInfo(target.filePath || "", config).key;
    if (!canReferenceBook(sourceBook.key, targetBookKey, config)) {
      issues.push({
        severity: "error",
        code: "cross-book-page-ref-disallowed",
        file: ref.file,
        line: ref.line,
        message: `Page reference @${ref.kind}:${ref.rawTarget} crosses from ${sourceBook.title} to ${target.bookTitle || targetBookKey}; add lookup.bookDependencies if this dependency is intentional.`
      });
    }
  }
  return issues;
}
function lintPages(pages) {
  const issues = [];
  const chaptersByBook = /* @__PURE__ */ new Map();
  const specialByScope = /* @__PURE__ */ new Map();
  for (const page of pages) {
    if (page.kind === "chapter" && typeof page.chapter === "number") {
      if (!chaptersByBook.has(page.bookKey || "")) chaptersByBook.set(page.bookKey || "", []);
      chaptersByBook.get(page.bookKey || "").push(page);
    }
    if (page.kind === "intro" || page.kind === "summary") {
      const key = `${page.bookKey}:${page.volumeKey || "__root__"}:${page.kind}`;
      if (!specialByScope.has(key)) specialByScope.set(key, []);
      specialByScope.get(key).push(page);
    }
  }
  for (const chapterPages of chaptersByBook.values()) {
    const sorted2 = [...chapterPages].sort((a, b) => (a.chapter || 0) - (b.chapter || 0));
    for (let i = 1; i < sorted2.length; i++) {
      if (sorted2[i].chapter === sorted2[i - 1].chapter) {
        issues.push({
          severity: "error",
          code: "duplicate-chapter",
          file: sorted2[i].filePath,
          message: `Chapter ${sorted2[i].chapter} is duplicated in ${sorted2[i].bookTitle}.`
        });
      }
      if ((sorted2[i].chapter || 0) !== (sorted2[i - 1].chapter || 0) + 1) {
        issues.push({
          severity: "warn",
          code: "chapter-gap",
          file: sorted2[i].filePath,
          message: `${sorted2[i].bookTitle} jumps from chapter ${sorted2[i - 1].chapter} to ${sorted2[i].chapter}.`
        });
      }
    }
  }
  for (const entries of specialByScope.values()) {
    if (entries.length <= 1) continue;
    entries.slice(1).forEach((page) => {
      issues.push({
        severity: "warn",
        code: "duplicate-special-page",
        file: page.filePath,
        message: `Duplicate ${page.kind}.md in the same book/volume scope.`
      });
    });
  }
  return issues;
}
function compareDefinitionRecords(a, b) {
  const la = a.label;
  const lb = b.label;
  if ((la.bookOrder || 0) !== (lb.bookOrder || 0)) return (la.bookOrder || 0) - (lb.bookOrder || 0);
  if ((la.volumeOrder || 0) !== (lb.volumeOrder || 0)) return (la.volumeOrder || 0) - (lb.volumeOrder || 0);
  if ((la.unitOrder || 0) !== (lb.unitOrder || 0)) return (la.unitOrder || 0) - (lb.unitOrder || 0);
  return a.file.localeCompare(b.file) || a.line - b.line;
}
function formatLabelNumber(label) {
  if (label.type === "solution") return label.solutionExerciseNumber || "";
  if (label.type === "remark" || isPageLabelType(label.type)) return "";
  const prefix = label.unitLabel || (label.chapter !== void 0 ? String(label.chapter) : label.appendix || "");
  return prefix && label.number !== void 0 ? `${prefix}.${label.number}` : "";
}
function formatDisplayNumber(label) {
  const number = formatLabelNumber(label);
  return label.type === "equation" && number ? `(${number})` : number;
}
function displayLabel(def, config) {
  const name = typeName(config, def.type);
  if (def.type === "solution") {
    const number2 = formatLabelNumber(def.label);
    return getLanguage(config) === "en" ? `Solution to Exercise ${number2}`.trim() : `习题 ${number2} 的解答`;
  }
  if (def.type === "section") {
    const number2 = formatLabelNumber(def.label);
    return number2 ? `${name} ${number2}` : name;
  }
  const number = formatDisplayNumber(def.label);
  return number ? `${name} ${number}` : name;
}
function displayNumber(def) {
  return formatLabelNumber(def.label);
}
function renderReferenceMap(definitions, config, pages = []) {
  const lines = [
    "# Reference Map",
    "",
    "Generated by `npm run workspace -- prepare`. Read this file to map human display numbers and unnumbered anchors to stable hash IDs.",
    ""
  ];
  if (pages.length > 0) {
    lines.push("## Pages", "");
    lines.push("| Display | Ref | Path Ref | Title | Location |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const page of sortManuscriptPages(pages)) {
      const prefix = page.kind === "chapter" ? "chapter" : "page";
      const pathRef = `@${prefix}:${page.filePath}`;
      const ref = page.id ? `@${page.id}` : pathRef;
      lines.push(`| ${escapeTable(formatPageReference(page, config))} | \`${ref}\` | \`${pathRef}\` | ${escapeTable(page.title || "")} | \`${page.filePath}\` |`);
    }
    lines.push("");
  }
  const numberedDefinitions = definitions.filter((def) => def.id && displayNumber(def));
  let currentBook = "";
  for (const def of numberedDefinitions) {
    const book = def.label.bookTitle || "Workspace";
    if (book !== currentBook) {
      currentBook = book;
      lines.push(`## ${book}`, "");
      lines.push("| Display | ID | Title | Location |");
      lines.push("| --- | --- | --- | --- |");
    }
    const title = def.title || "";
    lines.push(`| ${displayLabel(def, config)} | \`${def.id}\` | ${escapeTable(title)} | \`${def.file}:${def.line}\` |`);
  }
  const unnumberedAnchors = definitions.filter((def) => def.id && !displayNumber(def) && def.type === "remark");
  if (unnumberedAnchors.length > 0) {
    lines.push("", "## Unnumbered Anchors", "");
    lines.push("| Display | ID | Title | Location |");
    lines.push("| --- | --- | --- | --- |");
    for (const def of unnumberedAnchors) {
      const title = def.title || "";
      lines.push(`| ${displayLabel(def, config)} | \`${def.id}\` | ${escapeTable(title)} | \`${def.file}:${def.line}\` |`);
    }
  }
  lines.push("");
  return `${lines.join("\n")}
`;
}
function buildRuntimeDefinitions(definitions) {
  return definitions.filter((def) => def.type === "def").map((def) => ({
    title: def.title,
    aliases: def.aliases && def.aliases.length > 0 ? def.aliases : void 0,
    filePath: def.file,
    line: def.line,
    content: def.label.content || "",
    bookKey: def.label.bookKey,
    bookTitle: def.label.bookTitle,
    bookOrder: def.label.bookOrder,
    volumeKey: def.label.volumeKey,
    volumeTitle: def.label.volumeTitle,
    volumeOrder: def.label.volumeOrder,
    origin: def.origin || def.label.definitionOrigin || "standard"
  }));
}
function buildReaderIndex(state) {
  return {
    entries: state.labels,
    pages: state.pages,
    definitions: buildRuntimeDefinitions(state.definitions || []),
    symbols: state.symbols || [],
    projectAnalysis: state.projectAnalysis || void 0
  };
}
function renderProjectAnalysis(analysis) {
  const project = analysis || {
    sources: [],
    summary: { conceptSources: 0, notationSources: 0, summaryPages: 0, extractedDefinitions: 0 }
  };
  const lines = [
    "# Project Knowledge Analysis",
    "",
    "Generated from file names, page structure, concept tables, and concept-entry headings. It is a derived reading aid, not source content.",
    "",
    `- Concept or glossary sources: ${project.summary.conceptSources}`,
    `- Notation sources: ${project.summary.notationSources}`,
    `- Summary pages: ${project.summary.summaryPages}`,
    `- Supplemental definitions extracted from concept sources: ${project.summary.extractedDefinitions}`,
    ""
  ];
  if (project.sources.length === 0) {
    lines.push("No dedicated knowledge pages were detected. Standard definition markers remain indexed automatically.", "");
    return `${lines.join("\n")}
`;
  }
  lines.push("## Detected Sources", "");
  lines.push("| Kinds | File | Title | Confidence | Derived definitions |");
  lines.push("| --- | --- | --- | --- | ---: |");
  project.sources.forEach((source) => lines.push(`| ${(source.kinds || [source.kind]).join(", ")} | \`${source.filePath}\` | ${escapeTable(source.title)} | ${source.confidence} | ${source.extractedDefinitions} |`));
  lines.push("", "## Maintenance Boundary", "");
  lines.push("- The scanner and Reader refresh this analysis when Markdown or the optional definition/symbol source tables change.", "- A detected page may supply multiple roles; each role is counted once per page.", "- Do not copy ordinary definitions into `.math-workspace/definitions.json` just to keep this index fresh.", "- Use `.math-workspace/definitions.json` only for deliberate lookup overrides: nonstandard wording, aliases, bilingual lookup, or a boundary the deterministic extractor cannot represent.", "- Detected notation pages are supplied as project context; symbol patterns and meanings still require an explicit reviewed source entry.", "");
  return `${lines.join("\n")}
`;
}
function buildDocumentMap(documents) {
  return new Map(documents.map((document) => [toPosix(document.filePath), document.content || ""]));
}
function findProofRange(lines, startLine, statementEndLine) {
  const startIndex = Math.max(0, startLine - 1);
  const statementEndIndex = Math.max(startIndex, statementEndLine - 1);
  let proofStartIndex = -1;
  for (let i = statementEndIndex + 1; i < lines.length; i++) {
    if (isMarkerBoundaryLine(lines[i])) break;
    if (isProofBoundaryLine(lines[i])) {
      proofStartIndex = i;
      break;
    }
  }
  if (proofStartIndex < 0) {
    return { endLine: statementEndLine };
  }
  let proofEndIndex = proofStartIndex;
  for (let i = proofStartIndex; i < lines.length; i++) {
    if (isMarkerBoundaryLine(lines[i])) break;
    proofEndIndex = i;
    if (isProofTerminatorLine(lines[i])) break;
  }
  return {
    proofStartLine: proofStartIndex + 1,
    proofEndLine: proofEndIndex + 1,
    endLine: proofEndIndex + 1
  };
}
function dependencySourceBlocks(definitions, documents) {
  const documentMap = buildDocumentMap(documents);
  const blocksByFile = /* @__PURE__ */ new Map();
  for (const def of definitions) {
    if (!def.id || !DEPENDENCY_NODE_TYPES.has(def.type)) continue;
    const content = documentMap.get(def.file);
    if (content === void 0) continue;
    const lines = content.split(/\r?\n/);
    const startLine = def.line;
    const labelEndLine = typeof def.label.endLine === "number" ? def.label.endLine + 1 : startLine;
    const statementEndLine = Math.max(startLine, labelEndLine);
    const pedagogical = isPedagogicalKind(def.type);
    const bodyEndLine = (def.label.bodyEndLine ?? def.label.endLine ?? startLine - 1) + 1;
    const proofRange = pedagogical ? {
      proofStartLine: def.type === "solution" ? startLine : statementEndLine + 1,
      proofEndLine: bodyEndLine,
      endLine: bodyEndLine
    } : findProofRange(lines, startLine, statementEndLine);
    const block = {
      id: def.id,
      file: def.file,
      startLine,
      statementEndLine: def.type === "solution" ? startLine - 1 : statementEndLine,
      proofStartLine: proofRange.proofStartLine,
      proofEndLine: proofRange.proofEndLine,
      endLine: Math.max(statementEndLine, proofRange.endLine)
    };
    if (!blocksByFile.has(def.file)) blocksByFile.set(def.file, []);
    blocksByFile.get(def.file).push(block);
  }
  for (const blocks of blocksByFile.values()) {
    blocks.sort((a, b) => a.startLine - b.startLine);
  }
  return blocksByFile;
}
function findDependencySourceBlock(blocks, line) {
  if (!blocks) return void 0;
  return blocks.find((block) => block.startLine <= line && line <= block.endLine);
}
function dependencyEdgeWhere(block, line) {
  if (line <= block.statementEndLine) return "statement";
  if (block.proofStartLine !== void 0 && block.proofEndLine !== void 0 && block.proofStartLine <= line && line <= block.proofEndLine) {
    return "proof";
  }
  return "body";
}
function dependencyEdgeRelation(line, id) {
  const reference = `@${escapeRegExp(id)}(?:\\.(?:title|full))?`;
  const explanatoryLead = "(?:见|参见|详见|参阅|请参见|另见|see(?:\\s+also)?|cf\\.?)";
  return new RegExp(`${explanatoryLead}\\s*${reference}`, "i").test(line) ? "explanatory" : "strict";
}
function dependencyGraphNode(def, config) {
  const label = def.label;
  const node = {
    id: def.id,
    kind: def.type,
    display: displayLabel(def, config),
    title: def.title || "",
    path: def.file,
    line: def.line,
    endLine: typeof label.endLine === "number" ? label.endLine + 1 : void 0,
    bookKey: label.bookKey,
    bookTitle: label.bookTitle,
    bookOrder: label.bookOrder,
    volumeKey: label.volumeKey,
    volumeTitle: label.volumeTitle,
    volumeOrder: label.volumeOrder,
    unitKind: label.unitKind,
    unitKey: label.unitKey,
    unitLabel: label.unitLabel,
    unitOrder: label.unitOrder,
    chapter: label.chapter,
    appendix: label.appendix,
    number: label.number
  };
  Object.keys(node).forEach((key) => {
    if (node[key] === void 0) delete node[key];
  });
  return node;
}
function dependencyGraphCycles(nodes, edges) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = /* @__PURE__ */ new Map();
  for (const node of nodes) adjacency.set(node.id, /* @__PURE__ */ new Set());
  for (const edge of edges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      adjacency.get(edge.from).add(edge.to);
    }
  }
  let index = 0;
  const indexes = /* @__PURE__ */ new Map();
  const lowlinks = /* @__PURE__ */ new Map();
  const stack = [];
  const onStack = /* @__PURE__ */ new Set();
  const cycles = [];
  const strongConnect = (id) => {
    indexes.set(id, index);
    lowlinks.set(id, index);
    index++;
    stack.push(id);
    onStack.add(id);
    for (const next of adjacency.get(id) || []) {
      if (!indexes.has(next)) {
        strongConnect(next);
        lowlinks.set(id, Math.min(lowlinks.get(id) || 0, lowlinks.get(next) || 0));
      } else if (onStack.has(next)) {
        lowlinks.set(id, Math.min(lowlinks.get(id) || 0, indexes.get(next) || 0));
      }
    }
    if (lowlinks.get(id) !== indexes.get(id)) return;
    const component = [];
    while (stack.length > 0) {
      const item = stack.pop();
      onStack.delete(item);
      component.push(item);
      if (item === id) break;
    }
    const hasSelfLoop = component.length === 1 && (adjacency.get(component[0]) || /* @__PURE__ */ new Set()).has(component[0]);
    if (component.length > 1 || hasSelfLoop) {
      const ids = component.sort((a, b) => (nodeById.get(a)?.display || a).localeCompare(nodeById.get(b)?.display || b));
      cycles.push({
        ids,
        displays: ids.map((item) => nodeById.get(item)?.display || item)
      });
    }
  };
  for (const node of nodes) {
    if (!indexes.has(node.id)) strongConnect(node.id);
  }
  return cycles.sort((a, b) => a.displays.join(" -> ").localeCompare(b.displays.join(" -> ")));
}
function buildDependencyGraph(state, documents) {
  const config = state.config || mergeConfig(DEFAULT_CONFIG);
  const definitions = state.definitions || [];
  const references = state.references || [];
  const dependencyDefinitions = definitions.filter((def) => def.id && DEPENDENCY_NODE_TYPES.has(def.type)).sort(compareDefinitionRecords);
  const nodeById = new Map(dependencyDefinitions.map((def) => [def.id, dependencyGraphNode(def, config)]));
  const blocksByFile = dependencySourceBlocks(dependencyDefinitions, documents);
  const linesByFile = new Map(documents.map((document) => [toPosix(document.filePath), (document.content || "").split(/\r?\n/)]));
  const sourceReferences = /* @__PURE__ */ new Map();
  const edges = [];
  const ambientReferences = [];
  const diagnostics = [];
  const pedagogicalLinks = dependencyDefinitions.filter((def) => def.type === "solution" && state.labels?.[def.label.solutionOf || ""]?.type === "exercise").map((def) => ({ solution: def.id, exercise: def.label.solutionOf }));
  for (const ref of references) {
    const sourceBlock = findDependencySourceBlock(blocksByFile.get(ref.file), ref.line);
    if (sourceBlock && ref.line === sourceBlock.startLine && pedagogicalLinks.some((link) => link.solution === sourceBlock.id && link.exercise === ref.id)) continue;
    if (sourceBlock) {
      const targets = sourceReferences.get(sourceBlock.id) || /* @__PURE__ */ new Set();
      targets.add(ref.id);
      sourceReferences.set(sourceBlock.id, targets);
    }
    const target = nodeById.get(ref.id);
    if (!target) continue;
    if (!sourceBlock) {
      ambientReferences.push({ to: ref.id, path: ref.file, line: ref.line });
      diagnostics.push({
        severity: "info",
        code: "ambient-dependency-ref",
        file: ref.file,
        line: ref.line,
        message: `Reference @${ref.id} targets a dependency node but is outside a dependency statement/proof block.`
      });
      continue;
    }
    const sourceNode = nodeById.get(sourceBlock.id);
    const pedagogical = isPedagogicalKind(sourceNode?.kind || "") || isPedagogicalKind(target.kind);
    if (isMainlineKind(sourceNode?.kind || "") && isPedagogicalKind(target.kind)) {
      diagnostics.push({
        severity: "warn",
        code: "mainline-references-exercise",
        file: ref.file,
        line: ref.line,
        message: "A mainline result references an exercise or solution. Keep any required claim and proof in the main text."
      });
    }
    const where = dependencyEdgeWhere(sourceBlock, ref.line);
    const sourceLine = linesByFile.get(ref.file)?.[ref.line - 1] || "";
    edges.push({
      from: sourceBlock.id,
      to: ref.id,
      kind: "explicit_ref",
      layer: pedagogical ? "pedagogical" : "mathematical",
      where,
      relation: where === "body" ? "explanatory" : dependencyEdgeRelation(sourceLine, ref.id),
      path: ref.file,
      line: ref.line
    });
  }
  for (const [id, targets] of sourceReferences) {
    const node = nodeById.get(id);
    if (node) node.sourceReferenceCount = targets.size;
  }
  const nodes = [...nodeById.values()].sort((a, b) => (a.bookOrder || 0) - (b.bookOrder || 0) || (a.volumeOrder || 0) - (b.volumeOrder || 0) || (a.unitOrder || 0) - (b.unitOrder || 0) || a.path.localeCompare(b.path) || a.line - b.line);
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    outgoing.set(edge.from, (outgoing.get(edge.from) || 0) + 1);
  }
  const cycles = dependencyGraphCycles(nodes, edges);
  const isCrossBook = (edge) => (nodeById.get(edge.from)?.bookKey || "") !== (nodeById.get(edge.to)?.bookKey || "");
  const isCrossVolume = (edge) => (nodeById.get(edge.from)?.volumeKey || "") !== (nodeById.get(edge.to)?.volumeKey || "");
  const isCrossChapter = (edge) => (nodeById.get(edge.from)?.unitKey || "") !== (nodeById.get(edge.to)?.unitKey || "");
  const isTheoremLikeEdge = (edge) => isMainlineKind(nodeById.get(edge.from)?.kind || "") && isMainlineKind(nodeById.get(edge.to)?.kind || "");
  return {
    schemaVersion: 1,
    generatedBy: "math-workspace",
    nodes,
    edges,
    pedagogicalLinks,
    ambientReferences,
    cycles,
    diagnostics,
    summary: {
      nodes: nodes.length,
      theoremLikeNodes: nodes.filter((node) => isMainlineKind(node.kind)).length,
      pedagogicalNodes: nodes.filter((node) => isPedagogicalKind(node.kind)).length,
      pedagogicalEdges: edges.filter((edge) => edge.layer === "pedagogical").length,
      supplementalRemarkNodes: nodes.filter((node) => node.kind === "remark").length,
      edges: edges.length,
      theoremLikeEdges: edges.filter(isTheoremLikeEdge).length,
      supplementalRemarkEdges: edges.filter((edge) => edge.layer !== "pedagogical" && !isTheoremLikeEdge(edge)).length,
      isolated: nodes.filter((node) => (incoming.get(node.id) || 0) === 0 && (outgoing.get(node.id) || 0) === 0).length,
      cycles: cycles.length,
      crossBookEdges: edges.filter(isCrossBook).length,
      crossVolumeEdges: edges.filter(isCrossVolume).length,
      crossChapterEdges: edges.filter(isCrossChapter).length,
      statementEdges: edges.filter((edge) => edge.where === "statement").length,
      proofEdges: edges.filter((edge) => edge.where === "proof").length,
      bodyEdges: edges.filter((edge) => edge.where === "body").length
    }
  };
}
function dependencyNodeById(graph) {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}
function dependencyDegreeRows(graph, direction, edges = graph.edges) {
  const nodeById = dependencyNodeById(graph);
  const counts = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    const id = direction === "incoming" ? edge.to : edge.from;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return [...counts.entries()].map(([id, count]) => ({ node: nodeById.get(id), count })).filter((row) => row.node && row.count > 0).sort((a, b) => b.count - a.count || a.node.display.localeCompare(b.node.display));
}
function dependencyNodeLocation(node) {
  return `${node.path}:${node.line}`;
}
function dependencyNodeTitle(node) {
  return `${node.display}${node.title ? ` ${node.title}` : ""}`;
}
function isSupplementalRemarkNode(node) {
  return node?.kind === "remark";
}
function dependencyNodeKindLabel(node) {
  return isPedagogicalKind(node.kind) ? node.kind === "exercise" ? "Exercise" : "Solution" : isSupplementalRemarkNode(node) ? "Supplemental remark" : "Theorem-like";
}
function pushLimitedRows(lines, rows, limit, render, moreRow) {
  rows.slice(0, limit).forEach((row) => lines.push(render(row)));
  if (rows.length > limit) {
    const remaining = rows.length - limit;
    lines.push(moreRow ? moreRow(remaining) : `| ... | ... | ${remaining} more |`);
  }
}
function renderDependencyReport(graph) {
  const nodeById = dependencyNodeById(graph);
  const lines = [
    "# Dependency Graph Report",
    "",
    "Generated by `npm run workspace -- prepare`. The canonical data is `.math-workspace/dependency-graph.json`.",
    "",
    "## Summary",
    "",
    `- Nodes: ${graph.summary.nodes}`,
    `- Theorem-like nodes: ${graph.summary.theoremLikeNodes}`,
    `- Supplemental fact remarks: ${graph.summary.supplementalRemarkNodes}`,
    `- Exercises and solutions: ${graph.summary.pedagogicalNodes || 0}`,
    `- Pedagogical reference edges: ${graph.summary.pedagogicalEdges || 0}`,
    `- Solution associations (excluded from proof cycles): ${graph.pedagogicalLinks?.length || 0}`,
    `- Explicit edges: ${graph.summary.edges}`,
    `- Mainline theorem-like edges: ${graph.summary.theoremLikeEdges}`,
    `- Edges involving supplemental remarks: ${graph.summary.supplementalRemarkEdges}`,
    `- Statement edges: ${graph.summary.statementEdges}`,
    `- Proof edges: ${graph.summary.proofEdges}`,
    `- Body edges: ${graph.summary.bodyEdges}`,
    `- Cross-chapter edges: ${graph.summary.crossChapterEdges}`,
    `- Cross-volume edges: ${graph.summary.crossVolumeEdges}`,
    `- Cross-book edges: ${graph.summary.crossBookEdges}`,
    `- Isolated nodes: ${graph.summary.isolated}`,
    `- Cycles: ${graph.summary.cycles}`,
    ""
  ];
  const mathematicalEdges = graph.edges.filter((edge) => edge.layer !== "pedagogical");
  const outgoing = dependencyDegreeRows(graph, "outgoing", mathematicalEdges);
  lines.push("## High Outgoing Dependencies", "");
  if (outgoing.length === 0) {
    lines.push("No outgoing dependencies.", "");
  } else {
    lines.push("| Count | Kind | Node | Location |");
    lines.push("| ---: | --- | --- | --- |");
    pushLimitedRows(lines, outgoing, 20, (row) => `| ${row.count} | ${dependencyNodeKindLabel(row.node)} | ${escapeTable(row.node.display)} ${escapeTable(row.node.title || "")} | \`${dependencyNodeLocation(row.node)}\` |`);
    lines.push("");
  }
  const incoming = dependencyDegreeRows(graph, "incoming", mathematicalEdges);
  lines.push("## High Incoming Dependencies", "");
  if (incoming.length === 0) {
    lines.push("No incoming dependencies.", "");
  } else {
    lines.push("| Count | Kind | Node | Location |");
    lines.push("| ---: | --- | --- | --- |");
    pushLimitedRows(lines, incoming, 20, (row) => `| ${row.count} | ${dependencyNodeKindLabel(row.node)} | ${escapeTable(row.node.display)} ${escapeTable(row.node.title || "")} | \`${dependencyNodeLocation(row.node)}\` |`);
    lines.push("");
  }
  const crossScopeEdges = graph.edges.filter((edge) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    return from && to && ((from.bookKey || "") !== (to.bookKey || "") || (from.volumeKey || "") !== (to.volumeKey || "") || (from.unitKey || "") !== (to.unitKey || ""));
  });
  lines.push("## Cross-Scope Edges", "");
  if (crossScopeEdges.length === 0) {
    lines.push("No cross-scope dependency edges.", "");
  } else {
    lines.push("| Where | From | To | Reference |");
    lines.push("| --- | --- | --- | --- |");
    pushLimitedRows(lines, crossScopeEdges, 50, (edge) => {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      return `| ${edge.where} | ${escapeTable(from?.display || edge.from)} ${escapeTable(from?.title || "")} | ${escapeTable(to?.display || edge.to)} ${escapeTable(to?.title || "")} | \`${edge.path}:${edge.line}\` |`;
    });
    lines.push("");
  }
  lines.push("## Cycles", "");
  if (graph.cycles.length === 0) {
    lines.push("No dependency cycles found.", "");
  } else {
    lines.push("| Cycle |");
    lines.push("| --- |");
    pushLimitedRows(lines, graph.cycles, 50, (cycle) => `| ${escapeTable(cycle.displays.join(" -> "))} |`, (remaining) => `| ... ${remaining} more |`);
    lines.push("");
  }
  const incomingCounts = new Map(graph.nodes.map((node) => [node.id, 0]));
  const outgoingCounts = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of graph.edges) {
    incomingCounts.set(edge.to, (incomingCounts.get(edge.to) || 0) + 1);
    outgoingCounts.set(edge.from, (outgoingCounts.get(edge.from) || 0) + 1);
  }
  const isolated = graph.nodes.filter((node) => (incomingCounts.get(node.id) || 0) === 0 && (outgoingCounts.get(node.id) || 0) === 0);
  const isolatedTheoremLike = isolated.filter((node) => isMainlineKind(node.kind));
  const isolatedRemarks = isolated.filter(isSupplementalRemarkNode);
  lines.push("## Isolated Nodes", "");
  lines.push(`- Mainline theorem-like: ${isolatedTheoremLike.length}`);
  lines.push(`- Supplemental remarks: ${isolatedRemarks.length}`, "");
  if (isolated.length === 0) {
    lines.push("No isolated dependency nodes.", "");
  } else {
    lines.push("| Kind | Node | Location |");
    lines.push("| --- | --- | --- |");
    pushLimitedRows(lines, isolated, 100, (node) => `| ${dependencyNodeKindLabel(node)} | ${escapeTable(node.display)} ${escapeTable(node.title || "")} | \`${dependencyNodeLocation(node)}\` |`);
    lines.push("");
  }
  if (graph.diagnostics.length > 0) {
    lines.push("## Diagnostics", "");
    lines.push("| Code | Location | Message |");
    lines.push("| --- | --- | --- |");
    pushLimitedRows(lines, graph.diagnostics, 100, (diagnostic) => {
      const location = diagnostic.file ? `${diagnostic.file}${diagnostic.line ? `:${diagnostic.line}` : ""}` : "workspace";
      return `| ${diagnostic.code} | \`${location}\` | ${escapeTable(diagnostic.message)} |`;
    });
    lines.push("");
  }
  return `${lines.join("\n")}
`;
}
function dependencyWhereMatches(edge, where = "all") {
  return where === "all" || edge.where === where;
}
function filteredDependencyEdges(graph, where = "all") {
  return graph.edges.filter((edge) => dependencyWhereMatches(edge, where));
}
function dependencyWhereSuffix(where = "all") {
  return where === "all" ? "" : ` (${where} edges only)`;
}
function dependencyFilteredSummary(graph, where = "all") {
  const edges = filteredDependencyEdges(graph, where);
  const incoming = new Map(graph.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(graph.nodes.map((node) => [node.id, 0]));
  const nodeById = dependencyNodeById(graph);
  for (const edge of edges) {
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    outgoing.set(edge.from, (outgoing.get(edge.from) || 0) + 1);
  }
  const isCrossBook = (edge) => (nodeById.get(edge.from)?.bookKey || "") !== (nodeById.get(edge.to)?.bookKey || "");
  const isCrossVolume = (edge) => (nodeById.get(edge.from)?.volumeKey || "") !== (nodeById.get(edge.to)?.volumeKey || "");
  const isCrossChapter = (edge) => (nodeById.get(edge.from)?.unitKey || "") !== (nodeById.get(edge.to)?.unitKey || "");
  const isTheoremLikeEdge = (edge) => isMainlineKind(nodeById.get(edge.from)?.kind || "") && isMainlineKind(nodeById.get(edge.to)?.kind || "");
  const cycles = dependencyGraphCycles(graph.nodes, edges);
  return {
    edges,
    incoming,
    outgoing,
    cycles,
    isolated: graph.nodes.filter((node) => (incoming.get(node.id) || 0) === 0 && (outgoing.get(node.id) || 0) === 0),
    theoremLikeEdges: edges.filter(isTheoremLikeEdge).length,
    supplementalRemarkEdges: edges.filter((edge) => edge.layer !== "pedagogical" && !isTheoremLikeEdge(edge)).length,
    crossBookEdges: edges.filter(isCrossBook).length,
    crossVolumeEdges: edges.filter(isCrossVolume).length,
    crossChapterEdges: edges.filter(isCrossChapter).length,
    statementEdges: edges.filter((edge) => edge.where === "statement").length,
    proofEdges: edges.filter((edge) => edge.where === "proof").length,
    bodyEdges: edges.filter((edge) => edge.where === "body").length
  };
}
function pushDependencyEdgeTable(lines, graph, edges, limit = 100) {
  const nodeById = dependencyNodeById(graph);
  if (edges.length === 0) {
    lines.push("No dependency edges.", "");
    return;
  }
  lines.push("| Where | From | To | Reference |");
  lines.push("| --- | --- | --- | --- |");
  const sorted2 = [...edges].sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || (nodeById.get(a.from)?.display || a.from).localeCompare(nodeById.get(b.from)?.display || b.from) || (nodeById.get(a.to)?.display || a.to).localeCompare(nodeById.get(b.to)?.display || b.to));
  pushLimitedRows(lines, sorted2, limit, (edge) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    return `| ${edge.where} | ${escapeTable(from ? dependencyNodeTitle(from) : edge.from)} | ${escapeTable(to ? dependencyNodeTitle(to) : edge.to)} | \`${edge.path}:${edge.line}\` |`;
  });
  lines.push("");
}
function renderDependencyGraphSummary(graph, where = "all") {
  const summary = dependencyFilteredSummary(graph, where);
  const lines = [
    `# Dependency Graph Summary${dependencyWhereSuffix(where)}`,
    "",
    `- Nodes: ${graph.nodes.length}`,
    `- Theorem-like nodes: ${graph.summary.theoremLikeNodes}`,
    `- Supplemental fact remarks: ${graph.summary.supplementalRemarkNodes}`,
    `- Exercises and solutions: ${graph.summary.pedagogicalNodes || 0}`,
    `- Pedagogical reference edges: ${graph.summary.pedagogicalEdges || 0}`,
    `- Solution associations (excluded from proof cycles): ${graph.pedagogicalLinks?.length || 0}`,
    `- Explicit edges: ${summary.edges.length}`,
    `- Mainline theorem-like edges: ${summary.theoremLikeEdges}`,
    `- Edges involving supplemental remarks: ${summary.supplementalRemarkEdges}`,
    `- Statement edges: ${summary.statementEdges}`,
    `- Proof edges: ${summary.proofEdges}`,
    `- Body edges: ${summary.bodyEdges}`,
    `- Cross-chapter edges: ${summary.crossChapterEdges}`,
    `- Cross-volume edges: ${summary.crossVolumeEdges}`,
    `- Cross-book edges: ${summary.crossBookEdges}`,
    `- Isolated nodes: ${summary.isolated.length}`,
    `- Cycles: ${summary.cycles.length}`,
    ""
  ];
  const outgoing = dependencyDegreeRows(graph, "outgoing", summary.edges);
  lines.push("## Top Outgoing", "");
  if (outgoing.length === 0) {
    lines.push("No outgoing dependencies.", "");
  } else {
    lines.push("| Count | Kind | Node | Location |");
    lines.push("| ---: | --- | --- | --- |");
    pushLimitedRows(
      lines,
      outgoing,
      10,
      (row) => `| ${row.count} | ${dependencyNodeKindLabel(row.node)} | ${escapeTable(dependencyNodeTitle(row.node))} | \`${dependencyNodeLocation(row.node)}\` |`,
      (remaining) => `| ... | ... | ... | ${remaining} more |`
    );
    lines.push("");
  }
  const incoming = dependencyDegreeRows(graph, "incoming", summary.edges);
  lines.push("## Top Incoming", "");
  if (incoming.length === 0) {
    lines.push("No incoming dependencies.", "");
  } else {
    lines.push("| Count | Kind | Node | Location |");
    lines.push("| ---: | --- | --- | --- |");
    pushLimitedRows(
      lines,
      incoming,
      10,
      (row) => `| ${row.count} | ${dependencyNodeKindLabel(row.node)} | ${escapeTable(dependencyNodeTitle(row.node))} | \`${dependencyNodeLocation(row.node)}\` |`,
      (remaining) => `| ... | ... | ... | ${remaining} more |`
    );
    lines.push("");
  }
  return `${lines.join("\n")}
`;
}
function dependencyReachable(graph, rootId, direction, where = "all", maxDepth = Number.POSITIVE_INFINITY) {
  const nodeById = dependencyNodeById(graph);
  if (!nodeById.has(rootId)) return [];
  const adjacency = /* @__PURE__ */ new Map();
  for (const node of graph.nodes) adjacency.set(node.id, /* @__PURE__ */ new Set());
  for (const edge of filteredDependencyEdges(graph, where)) {
    if (direction === "upstream") {
      adjacency.get(edge.from)?.add(edge.to);
    } else {
      adjacency.get(edge.to)?.add(edge.from);
    }
  }
  if (direction === "impact") for (const link of graph.pedagogicalLinks || []) {
    adjacency.get(link.exercise)?.add(link.solution);
    adjacency.get(link.solution)?.add(link.exercise);
  }
  const visited = /* @__PURE__ */ new Map([[rootId, 0]]);
  const queue = [rootId];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    const currentDepth = visited.get(current) || 0;
    if (currentDepth >= maxDepth) continue;
    for (const next of adjacency.get(current) || []) {
      if (visited.has(next)) continue;
      visited.set(next, currentDepth + 1);
      queue.push(next);
    }
  }
  return [...visited.entries()].filter(([id]) => id !== rootId).map(([id, depth]) => ({ node: nodeById.get(id), depth })).filter((row) => row.node).sort((a, b) => a.depth - b.depth || dependencyNodeLocation(a.node).localeCompare(dependencyNodeLocation(b.node)));
}
function renderDependencyNodeHeader(title, graph, id, where) {
  const node = dependencyNodeById(graph).get(id);
  const lines = [`# ${title}${dependencyWhereSuffix(where)}`, ""];
  if (!node) {
    lines.push(`Node \`${id}\` was not found in dependency graph.`, "");
    return lines;
  }
  lines.push(`- Node: ${dependencyNodeTitle(node)}`);
  lines.push(`- ID: \`${node.id}\``);
  lines.push(`- Location: \`${dependencyNodeLocation(node)}\``);
  lines.push("");
  return lines;
}
function pushDependencyNodeRows(lines, rows) {
  if (rows.length === 0) {
    lines.push("No nodes.", "");
    return;
  }
  lines.push("| Depth | Node | Location |");
  lines.push("| ---: | --- | --- |");
  pushLimitedRows(lines, rows, 200, (row) => `| ${row.depth} | ${escapeTable(dependencyNodeTitle(row.node))} | \`${dependencyNodeLocation(row.node)}\` |`);
  lines.push("");
}
function renderDependencyGraphImpact(graph, id, where = "all") {
  const lines = renderDependencyNodeHeader("Dependency Impact Closure", graph, id, where);
  if (!dependencyNodeById(graph).has(id)) return `${lines.join("\n")}
`;
  const rows = dependencyReachable(graph, id, "impact", where);
  lines.push(`Downstream impacted nodes: ${rows.length}`, "");
  pushDependencyNodeRows(lines, rows);
  return `${lines.join("\n")}
`;
}
function renderDependencyGraphUpstream(graph, id, where = "all") {
  const lines = renderDependencyNodeHeader("Dependency Upstream Closure", graph, id, where);
  if (!dependencyNodeById(graph).has(id)) return `${lines.join("\n")}
`;
  const rows = dependencyReachable(graph, id, "upstream", where);
  lines.push(`Upstream dependency nodes: ${rows.length}`, "");
  pushDependencyNodeRows(lines, rows);
  return `${lines.join("\n")}
`;
}
function renderDependencyGraphFocus(graph, id, depth = 2, where = "all") {
  const safeDepth = Math.max(1, Math.floor(depth || 2));
  const lines = renderDependencyNodeHeader(`Dependency Focus Depth ${safeDepth}`, graph, id, where);
  if (!dependencyNodeById(graph).has(id)) return `${lines.join("\n")}
`;
  const upstream = dependencyReachable(graph, id, "upstream", where, safeDepth);
  const impact = dependencyReachable(graph, id, "impact", where, safeDepth);
  lines.push("## Upstream", "");
  pushDependencyNodeRows(lines, upstream);
  lines.push("## Downstream Impact", "");
  pushDependencyNodeRows(lines, impact);
  const focusIds = /* @__PURE__ */ new Set([id, ...upstream.map((row) => row.node.id), ...impact.map((row) => row.node.id)]);
  const focusEdges = filteredDependencyEdges(graph, where).filter((edge) => focusIds.has(edge.from) && focusIds.has(edge.to));
  lines.push("## Local Edges", "");
  pushDependencyEdgeTable(lines, graph, focusEdges, 200);
  return `${lines.join("\n")}
`;
}
function renderDependencyGraphIsolated(graph, where = "all") {
  const summary = dependencyFilteredSummary(graph, where);
  const theoremLike = summary.isolated.filter((node) => isMainlineKind(node.kind));
  const remarks = summary.isolated.filter(isSupplementalRemarkNode);
  const lines = [
    `# Isolated Dependency Nodes${dependencyWhereSuffix(where)}`,
    "",
    `Isolated nodes: ${summary.isolated.length}`,
    `- Mainline theorem-like: ${theoremLike.length}`,
    `- Supplemental remarks: ${remarks.length}`,
    ""
  ];
  if (summary.isolated.length === 0) {
    lines.push("No isolated dependency nodes.", "");
    return `${lines.join("\n")}
`;
  }
  lines.push("| Kind | Node | Location |");
  lines.push("| --- | --- | --- |");
  pushLimitedRows(lines, summary.isolated, 500, (node) => `| ${dependencyNodeKindLabel(node)} | ${escapeTable(dependencyNodeTitle(node))} | \`${dependencyNodeLocation(node)}\` |`);
  lines.push("");
  return `${lines.join("\n")}
`;
}
function renderDependencyGraphCycles(graph, where = "all") {
  const cycles = dependencyGraphCycles(graph.nodes, filteredDependencyEdges(graph, where));
  const lines = [`# Dependency Cycles${dependencyWhereSuffix(where)}`, "", `Cycles: ${cycles.length}`, ""];
  if (cycles.length === 0) {
    lines.push("No dependency cycles found.", "");
    return `${lines.join("\n")}
`;
  }
  lines.push("| Cycle | IDs |");
  lines.push("| --- | --- |");
  pushLimitedRows(lines, cycles, 200, (cycle) => `| ${escapeTable(cycle.displays.join(" -> "))} | \`${cycle.ids.join(" -> ")}\` |`);
  lines.push("");
  return `${lines.join("\n")}
`;
}
function dependencyScopeLabel(node, scope) {
  const book = node.bookTitle || node.bookKey || "Workspace";
  if (scope === "book") return book;
  const volume = node.volumeTitle || node.volumeKey || "No volume";
  if (scope === "volume") return `${book} / ${volume}`;
  const unit = node.unitKind === "appendix" ? `Appendix ${node.unitLabel || node.appendix || "?"}` : node.unitLabel ? `Chapter ${node.unitLabel}` : node.unitKey || node.path;
  return `${book} / ${volume} / ${unit}`;
}
function renderDependencyGraphMatrix(graph, scope, where = "all") {
  const nodeById = dependencyNodeById(graph);
  const edges = filteredDependencyEdges(graph, where);
  const rowTotals = /* @__PURE__ */ new Map();
  const columnTotals = /* @__PURE__ */ new Map();
  const counts = /* @__PURE__ */ new Map();
  for (const edge of edges) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;
    const row = dependencyScopeLabel(from, scope);
    const column = dependencyScopeLabel(to, scope);
    rowTotals.set(row, (rowTotals.get(row) || 0) + 1);
    columnTotals.set(column, (columnTotals.get(column) || 0) + 1);
    counts.set(`${row}	${column}`, (counts.get(`${row}	${column}`) || 0) + 1);
  }
  const rows = [...rowTotals.keys()].sort((a, b) => a.localeCompare(b));
  const columns = [...columnTotals.keys()].sort((a, b) => a.localeCompare(b));
  const lines = [`# Dependency Matrix By ${scope}${dependencyWhereSuffix(where)}`, "", `Edges: ${edges.length}`, ""];
  if (rows.length === 0 || columns.length === 0) {
    lines.push("No dependency edges.", "");
    return `${lines.join("\n")}
`;
  }
  lines.push(`| From → To | ${columns.map(escapeTable).join(" | ")} | Total |`);
  lines.push(`| --- | ${columns.map(() => "---:").join(" | ")} | ---: |`);
  for (const row of rows) {
    const values = columns.map((column) => counts.get(`${row}	${column}`) || 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    lines.push(`| ${escapeTable(row)} | ${values.join(" | ")} | ${total} |`);
  }
  lines.push(`| Total | ${columns.map((column) => columnTotals.get(column) || 0).join(" | ")} | ${edges.length} |`);
  lines.push("");
  return `${lines.join("\n")}
`;
}
function renderDependencyGraphBridges(graph, where = "all") {
  const edges = filteredDependencyEdges(graph, where).filter((edge) => edge.layer !== "pedagogical");
  const nodeById = dependencyNodeById(graph);
  const incoming = new Map(graph.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(graph.nodes.map((node) => [node.id, 0]));
  const crossScope = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    outgoing.set(edge.from, (outgoing.get(edge.from) || 0) + 1);
    if (from && to && ((from.bookKey || "") !== (to.bookKey || "") || (from.volumeKey || "") !== (to.volumeKey || "") || (from.unitKey || "") !== (to.unitKey || ""))) {
      crossScope.set(edge.from, (crossScope.get(edge.from) || 0) + 1);
      crossScope.set(edge.to, (crossScope.get(edge.to) || 0) + 1);
    }
  }
  const rows = graph.nodes.map((node) => ({
    node,
    incoming: incoming.get(node.id) || 0,
    outgoing: outgoing.get(node.id) || 0,
    crossScope: crossScope.get(node.id) || 0
  })).filter((row) => row.incoming > 0 && row.outgoing > 0).sort((a, b) => b.crossScope - a.crossScope || b.incoming + b.outgoing - (a.incoming + a.outgoing) || dependencyNodeTitle(a.node).localeCompare(dependencyNodeTitle(b.node)));
  const theoremLikeRows = rows.filter((row) => isMainlineKind(row.node.kind));
  const remarkRows = rows.filter((row) => isSupplementalRemarkNode(row.node));
  const lines = [
    `# Bridge Candidates${dependencyWhereSuffix(where)}`,
    "",
    "A bridge candidate has both incoming and outgoing explicit dependencies. This is structural only, not a domain judgment.",
    "",
    `Candidates: ${rows.length}`,
    `- Mainline theorem-like: ${theoremLikeRows.length}`,
    `- Supplemental remarks: ${remarkRows.length}`,
    ""
  ];
  if (rows.length === 0) {
    lines.push("No bridge candidates.", "");
    return `${lines.join("\n")}
`;
  }
  lines.push("| Cross-scope | Incoming | Outgoing | Kind | Node | Location |");
  lines.push("| ---: | ---: | ---: | --- | --- | --- |");
  pushLimitedRows(lines, rows, 200, (row) => `| ${row.crossScope} | ${row.incoming} | ${row.outgoing} | ${dependencyNodeKindLabel(row.node)} | ${escapeTable(dependencyNodeTitle(row.node))} | \`${dependencyNodeLocation(row.node)}\` |`);
  lines.push("");
  return `${lines.join("\n")}
`;
}
function renderAgentGuide(state) {
  const errors = state.issues.filter((issue) => issue.severity === "error").length;
  const warnings = state.issues.filter((issue) => issue.severity !== "error").length;
  const lines = [
    "# Agent Guide",
    "",
    "Generated by `prepare`. This is the compact workflow card for AI agents.",
    "Choose one tool provider: projects installed through Codex use the installed plugin's CLI, Reader and generic skills; independent environments use their selected standalone CLI/npm installation. Keep project configuration, source, review/build evidence and project-specific rules in the project. Do not copy runtime or generic rules merely for Codex integration.",
    "Command examples use `math-workspace` as shorthand for that selected CLI. Prefer the exact Node/CLI entry and working directory supplied by the Reader, or a verified project wrapper; do not silently add another installation, rewrite scripts, or replace native AI rules.",
    "",
    `Current index: ${Object.keys(state.labels).length} formal entries, ${state.pages.length} pages, ${(state.symbols || []).length} symbols, ${errors} errors, ${warnings} warnings.`,
    "",
    "## Working Loop",
    "",
    "1. Read the target Markdown source. For an existing target outside current context, retrieve only its matching row from `.math-workspace/reference-map.md`.",
    "2. Declare new numbered objects with `#tmp-*`; reference existing objects and pages with `@h-...`, `@h-....title`, or `@h-....full`. Definitions never receive hashes or refs.",
    "3. Preserve Markdown and LaTeX. Do not write display numbers as references or hand-edit generated artifacts.",
    "4. Run `math-workspace finish <file-or-dir>` after editing. It finalizes temporary IDs and verifies the workspace. Use a separate `verify` only after direct `finalize`, migration, or as an explicit release gate.",
    "5. Read `project-analysis.md` only for terminology, concept appendices, or notation work. It is derived context, not a source to maintain.",
    "",
    "## Create a Manuscript Page",
    "",
    "- Read native project rules and check existing manuscripts. Choose `chapter`, `front-matter`, `back-matter`, or `continued` and an exact project-relative book/volume container (`.` for the project root); do not infer a path from a display title.",
    "- Use the same CLI entry for `create-page --kind <kind> --container <container> --title <title> --dry-run --json`. Inspect `filePath`, `exists`, and `stateToken`; create with the same options without `--dry-run`, adding `--expect-state <stateToken>`. Optional `--slug` sets the filename stem except for the fixed-name `continued` page. Refresh an outdated plan; if project, kind, title, container, and filePath are unchanged, continue with its new token. Review a changed destination or reuse an existing manuscript before proceeding.",
    "- The helper assigns the path, order, and stable page ID and refuses overwrites. Write content into the returned file, preserve its page ID, and run `finish <filePath>`. Do not handwrite chapter numbers or hashes, or create a duplicate to bypass an existing manuscript.",
    "- `front-matter/` and `back-matter/` hold multiple independent Markdown pages with any title or genre; their role comes from placement. An AI retirement note may remain titled that way in back matter. `to-be-continued.md` is an independent continued page. Legacy intro/summary pages remain supported.",
    "- The Reader's “＋” reviews a read-only plan and adds a request to the conversation input without sending it; without host support, copy the request. Creation does not select a page for publication. Keep one Markdown source, then explicitly reference it through `frontMatter[].file`, `backMatter[].file`, or `continued.file` when publishing.",
    "",
    "## Extended Reference",
    "",
    "- Sections: `## #h-... Title` renders as the current section number plus title, and links jump to the section without hover recall.",
    "- Numbered objects: `命题 #h-...（Title）：...`, `引理 #h-...`, `定理 #h-...`, `推论 #h-...` share the theorem counter per chapter or appendix.",
    "- Equations, figures, and tables: `公式 #h-...：` binds the next display formula as a numbered equation, `图 #h-...（Title）：...` captions an adjacent standalone image paragraph before or after it, and `表 #h-...（Title）：` captions the following table. Keep a blank line between image and caption; Reader/PDF group them in source order. Static and interactive versions of one figure share its number. They have separate counters per chapter or appendix; equations render as `(1.1)`, appendices as `(A.1)`.",
    "- Chapter/page anchors: put `#h-...` / `#tmp-*` on the file's unique highest-level heading when the page needs stable refs. The hash is hidden in preview and does not create a section number. Use `@h-...`, `@h-....title`, or `@h-....full` from `reference-map.md` to reference the page.",
    "- Compatibility chapter/page refs: `@chapter:book1/02-main.md`, `@chapter:book1/02-main.md.title`, or `@chapter:book1/02-main.md.full` still work; paths are relative to the formal root that owns `.math-workspace/`. `@page:path.md` is for unnumbered pages (including front matter, back matter, continued, intro, and summary) and appendix pages. Prefer page hashes when available. `finish` normalizes `./` and `../` input sugar to root-relative paths.",
    "- Theorem-like recall captures the statement before `证明` / `Proof`; keep proofs after an explicit proof marker.",
    "- Dependency graph: `.math-workspace/dependency-graph.json` is the canonical explicit reference graph. It uses only `@h-...` references between mainline claims, proof-backed hash remarks, exercises and solutions; pedagogical references carry `layer: pedagogical`, while `pedagogicalLinks` keeps solution ownership separate from proof cycles, and marks edges as `statement`, `proof`, or `body`. Edges introduced as explanatory navigation (`见 @h-...`, `参见 @h-...`, or `see @h-...`) are preserved with relation `explanatory`; the Reader relation map excludes them, body references, and self-references from its strict dependency view. `.math-workspace/dependency-report.md` separates mainline theorem-like and supplemental remark statistics. Use `math-workspace graph summary`, `graph impact <h-id>`, `graph upstream <h-id>`, `graph focus <h-id> --depth 2`, `graph bridges`, `graph isolated`, `graph cycles`, or `graph matrix chapter|volume|book` for Markdown analysis. Add `--where statement|proof|body` to filter edge placement. These are structural graph tools, not domain interpretation.",
    "- Definitions and project knowledge: lookup is a tool-first, AI-exception workflow. The tool scans standard `定义（Term）：...` / `Definition (Term): ...` definitions and dedicated concept/glossary pages named by filename or main title; `.math-workspace/project-analysis.md` records detected concept, notation, and summary roles, including combined pages. Prefer the book’s final appendix for concept and notation summaries; reuse existing dedicated pages and follow the book’s appendix order without reserving fixed letters. This placement guidance does not change lookup priority. Do not refresh `.math-workspace/definitions.json` after ordinary edits. Use it only for nonstandard phrases, aliases/bilingual lookup, stable multi-paragraph previews, or a boundary the deterministic extractor cannot represent; include Markdown `content` for those entries. Codex MCP queries return narrow source locators and previews, including all detected roles for a source. Full rendered lookup previews are only guaranteed for definitions in the currently previewed file; cross-file search is primarily for locating and jumping.",
    "- Exercises use `习题 #tmp-e（Title）：...` / `Exercise #tmp-e (Title): ...`, with an independent chapter counter. Solutions use a separate ID and `解答 #tmp-s（对应 @tmp-e）：...` / `Solution #tmp-s (for @tmp-e): ...`; they may live in an appendix near the end of the same book and retain the original exercise number. Order solutions and concept/notation summaries according to the book’s structure. Separate hint/answer paragraphs from the prompt with a blank line. Prompt recall excludes hints and answers; exports include them. Keep stable IDs and Lean declarations when converting existing results; required mainline claims and proofs stay in the main text.",
    "- Explanatory remarks stay plain: `注（Title）：...` / `Remark (Title): ...`, without hash. Non-mainline fact remarks that need a proof or later citation use `注 #tmp-*（Title）：...`; `> 注 #tmp-*（Title）：...` is also recognized inside standard blockquotes. A hash remark is an unnumbered supplemental dependency node and supports recall; a plain remark never enters the dependency graph or Reader dependency markers.",
    "- Independent examples and counterexamples may use `例 #tmp-*` / `Example #tmp-*` and `反例 #tmp-*` / `Counterexample #tmp-*` even without later citations. They share a separate chapter/appendix example counter and never consume theorem numbers. Incidental in-text examples stay plain. Their recall includes all paragraphs, calculations and proof text up to the next formal object, Markdown heading or thematic break; fenced code stays literal. Separate following ordinary prose with a thematic break when needed.",
    "- Symbols: maintain only project-specific `source`, `pattern`, and `meaning` entries in `.math-workspace/symbols.json` when explicit notation semantics change; patterns describe the notation itself with balanced delimiters, not whole equations or open-ended formula fragments. Dedicated notation pages are recognized by filename or main title and supply context only; they do not infer symbol meanings. The navigation symbol table lists symbols matched in the current preview file. Symbols are not inline formula refs and are not searched through the definition search box.",
    "- Appendices use the appendix file prefix, so markers in `appendix-a-*.md` render as `A.1`, `A.2`, etc. `00-introduction.md`, `intro.md`, and `introduction.md` are intro pages, not chapter 0.",
    "- Shared publication metadata belongs in `.math-workspace/config.json.metadata`: work title, structured authors with ORCID/affiliation, website, repository, license and work DOI. Read with `publication metadata`, save with `publication save-metadata <metadata.json> --expected-revision SHA256`, or edit in Reader. Edition profiles store only explicit overrides plus edition version/date/DOI; missing fields inherit, old PDF identity fields are a compatibility fallback. Review and rebuild after metadata changes; frozen PDF, citation and Zenodo values stay bound to that edition.",
    "- New Reader publication plans automatically include matching structural front/back matter and appendices; CLI profiles use `matter.automatic: true` and optional `matter.exclude` paths. Existing plans keep their selection until enabled. Keep volume matter in its volume, preserve appendix numbering and author titles, and review the resolved selection rather than guessing roles from arbitrary prose. Page creation does not rewrite a saved plan; automatic discovery runs during planning.",
    "- Export: do not compile formal source Markdown directly. Use `math-workspace export-md <file-or-dir> --out dist/book.md` to produce one portable Markdown file, `math-workspace export-md-split <file-or-dir> --out dist/public` to produce compiled Markdown files while preserving the source tree, `math-workspace export-pdf <file-or-dir> --out dist/book.pdf` to call local pandoc after Markdown export, or `math-workspace render-pdf dist/book.md --out dist/book.pdf` when a project release flow has already postprocessed the compiled Markdown. PDF rendering reads `.math-workspace/config.json` `pdf` defaults when present: A4, 2.5cm margins, TOC depth 2, language-aware TOC title, separate TOC page, optional title page metadata, optional publication metadata page, and optional front matter pages. `author` is the cover/PDF metadata author; fuller identity fields are `authorNative`, `authorAliases`, `orcid`, `repository`, `license`, `licenseUrl`, `preferredCitation`, `releaseTag`, `releaseCommit`, and `doi`. When `metadataPage` is true, the generated metadata page is unnumbered, unlisted, and placed after the title page but before the table of contents. Longer AI, license, citation, or provenance statements belong in `frontMatter`, placed after metadata and before the TOC; front matter entries use `source` or `content`, default to `toc: false`, and default to page breaks. Override with `--title`, `--subtitle`, `--author`, `--author-native`, `--author-alias`, `--orcid`, `--repository`, `--license`, `--license-url`, `--preferred-citation`, `--date`, `--release-version`, `--release-tag`, `--release-commit`, `--doi`, `--metadata-page`, `--front-matter`, `--front-matter-title`, `--front-matter-toc`, `--documentclass`, `--title-page`, `--margin`, `--no-toc`, `--toc-depth`, `--paper`, or Pandoc `-V key:value`. No PDF engine is bundled.",
    "",
    "## Generated Files",
    "",
    "- `.math-workspace/reference-map.md`: compact display-number, page-anchor, and unnumbered-anchor to hash-ID table.",
    "- `.math-workspace/workspace-index.json`: machine-readable formal entry, page, definition, and symbol snapshot for local reader tooling.",
    "- `.math-workspace/dependency-graph.json`: canonical graph for theorem-like objects and proof-backed hash remarks, from explicit `@h-...` references.",
    "- `.math-workspace/dependency-report.md`: human/AI dependency graph review report.",
    "- `.math-workspace/project-analysis.json` / `.math-workspace/project-analysis.md`: generated detection of concept/glossary, notation, and summary pages, plus supplemental concept entries. This is derived context, not a hand-maintained source table.",
    "- `.math-workspace/report.md`: lint/verify details.",
    "- `.math-workspace/audit.md`: advisory AI cleanup list generated by `audit`.",
    "- `.math-workspace/text-ref-migration.md`: generated only after text-reference migration.",
    "- `.math-workspace/definitions.json` / `.math-workspace/symbols.json`: optional reviewed source tables for definition lookup overrides and project-specific notation.",
    "- `.math-workspace/config.json`: explicit formal-project configuration. Use `scan.exclude` when project-root scans must ignore build, draft, context, or generated Markdown directories; use `lookup.bookDependencies` to permit intentional cross-book lookups and refs. The Reader scans project content in memory and remains opt-in through this config.",
    "",
    "## Migration",
    "",
    "- Use `math-workspace migrate-text-refs <file-or-dir>` before applying old numbered prose migration; migration commands are dry-run by default.",
    "- `migrate-text-refs` rewrites typed old references such as `定理 2.1`, `命题2.2`, `Theorem 2.1`, `公式 (2.1)`, `Figure 2.1`, `表 2.1`, `§2.1`, or `第 2.1 节`. It intentionally does not rewrite bare `2.1`, bare `(2.1)`, or handwritten chapter refs such as `第 2 章`; decide those by reading context and convert chapter refs to page hashes `@h-...` when available, otherwise to compatibility `@chapter:path.md`. Matching is bounded so `2.1` is not replaced inside `2.12`, `2.1.3`, or `22.1`.",
    "- Scoped migrations update target files plus incoming references by default. Use `--target-only` only when intentionally restricting rewrites to the target files.",
    ""
  ];
  return `${lines.join("\n")}
`;
}
function escapeTable(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}
function renderReport(state) {
  const errors = state.issues.filter((issue) => issue.severity === "error");
  const warnings = state.issues.filter((issue) => issue.severity !== "error");
  const lines = [
    "# math-workspace Report",
    "",
    `Labels: ${Object.keys(state.labels).length}`,
    `Pages: ${state.pages.length}`,
    `Symbols: ${(state.symbols || []).length}`,
    `Errors: ${errors.length}`,
    `Warnings: ${warnings.length}`,
    ""
  ];
  if (errors.length > 0) {
    lines.push("## Errors", "");
    errors.forEach((issue) => lines.push(formatIssue(issue)));
    lines.push("");
  }
  if (warnings.length > 0) {
    lines.push("## Warnings", "");
    warnings.forEach((issue) => lines.push(formatIssue(issue)));
    lines.push("");
  }
  if (errors.length === 0 && warnings.length === 0) {
    lines.push("No issues found.", "");
  }
  return `${lines.join("\n")}
`;
}
function formatIssue(issue) {
  const location = issue.line ? `${issue.file}:${issue.line}` : issue.file || "workspace";
  return `- [${issue.code}] ${location}: ${issue.message}`;
}
const { spawnSync: spawnSync$1 } = require("node:child_process");
const RECORD_PREFIX$1 = "MW_LEAN_DEPENDENCY	";
const NAME_SEPARATOR = "";
function fingerprint$2(value) {
  return crypto__namespace.createHash("sha256").update(value).digest("hex");
}
function dependencyPath(workspaceRoot) {
  return path__namespace.join(workspaceRoot, ".math-workspace", "lean-dependency-graph.json");
}
function reportPath(workspaceRoot) {
  return path__namespace.join(workspaceRoot, ".math-workspace", "lean-dependency-report.md");
}
function explicitStrictEdges(graph) {
  return (Array.isArray(graph?.edges) ? graph.edges : []).filter((edge) => edge && edge.relation !== "explanatory" && (edge.where === "statement" || edge.where === "proof") && typeof edge.from === "string" && typeof edge.to === "string" && edge.from !== edge.to).map((edge) => ({ from: edge.from, to: edge.to }));
}
function solutionDependencies(graph) {
  return explicitStrictEdges(graph).flatMap((edge) => (graph?.pedagogicalLinks || []).filter((link) => link.solution === edge.from && link.exercise !== edge.to).map((link) => ({ exercise: link.exercise, solution: link.solution, to: edge.to })));
}
function strictMarkdownEdges(graph, index) {
  const edges = explicitStrictEdges(graph).flatMap((edge) => {
    const owners = (graph?.pedagogicalLinks || []).filter((link) => link.solution === edge.from);
    if (!owners.length) return [edge];
    return [
      ...index.anchors[edge.from] ? [edge] : [],
      ...owners.filter((link) => link.exercise !== edge.to).map((link) => ({ from: link.exercise, to: edge.to }))
    ];
  });
  const projected = graph?.pedagogicalLinks?.length ? [...new Map(edges.map((edge) => [`${edge.from}:${edge.to}`, edge])).values()] : edges;
  return projected.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to));
}
function leanDependencyInputFingerprint(index, graph) {
  return fingerprint$2(JSON.stringify({
    projects: Object.entries(index.projectSources).map(([key, source]) => ({ key, fingerprint: source.fingerprint, module: source.module || "" })).sort((left, right) => left.key.localeCompare(right.key)),
    markdownEdges: strictMarkdownEdges(graph, index)
  }));
}
async function readLeanDependencyArtifact(workspaceRoot) {
  try {
    const value = JSON.parse(await fs__namespace.readFile(dependencyPath(workspaceRoot), "utf8"));
    return value?.schemaVersion === 1 && Array.isArray(value.edges) && value.comparisons ? value : void 0;
  } catch (error) {
    if (error?.code === "ENOENT") return void 0;
    return void 0;
  }
}
function leanModule(project) {
  const value = project.module || project.target;
  return typeof value === "string" && /^[A-Za-z_][A-Za-z0-9_'.]*$/.test(value) ? value : void 0;
}
function generatedDependencyProbe(module2, names) {
  const requested = names.map((name) => `  \`${name},`).join("\n");
  return `import Lean
import ${module2}

open Lean Elab Command

def math_workspace_requested_names : Array Lean.Name := #[
${requested}
]

def math_workspace_names_text (names : Array Lean.Name) : String :=
  String.intercalate "${NAME_SEPARATOR}" (names.toList.map Lean.Name.toString)

elab "math_workspace_emit_dependencies" : command => do
  let env ← getEnv
  for source in math_workspace_requested_names do
    match env.find? source with
    | none =>
      logWarning m!"Math Workspace dependency query could not resolve {source}"
    | some info =>
      let type_dependencies := (info.type.getUsedConstants).filter fun name =>
        name != source && math_workspace_requested_names.contains name
      let proof_dependencies : Array Lean.Name := match info.value? true with
        | some value => (value.getUsedConstants).filter fun name =>
          name != source && math_workspace_requested_names.contains name
        | none => #[]
      logInfo m!"${RECORD_PREFIX$1}{source}\\ttype\\t{math_workspace_names_text type_dependencies}"
      logInfo m!"${RECORD_PREFIX$1}{source}\\tproof\\t{math_workspace_names_text proof_dependencies}"

math_workspace_emit_dependencies
`;
}
function queryProjectDependencies(workspaceRoot, project, names) {
  const module2 = leanModule(project);
  if (!module2) return { records: [], diagnostic: `Lean project ${project.key} needs a valid module or target name to inspect declaration dependencies.` };
  if (names.length === 0) return { records: [] };
  const token = crypto__namespace.randomBytes(8).toString("hex");
  const probePath = path__namespace.join(workspaceRoot, ".math-workspace", `lean-dependencies-${token}.lean`);
  const projectRoot = path__namespace.resolve(workspaceRoot, project.root);
  const source = generatedDependencyProbe(module2, names);
  const parse = (output) => output.split(/\r?\n/).filter((line) => line.includes(RECORD_PREFIX$1)).map((line) => line.slice(line.indexOf(RECORD_PREFIX$1) + RECORD_PREFIX$1.length).split("	")).filter((parts) => parts.length >= 3 && (parts[1] === "type" || parts[1] === "proof")).map(([sourceName, where, targets]) => ({
    source: sourceName,
    where,
    targets: targets ? targets.split(NAME_SEPARATOR).filter(Boolean) : []
  }));
  try {
    require("node:fs").mkdirSync(path__namespace.dirname(probePath), { recursive: true });
    require("node:fs").writeFileSync(probePath, source, "utf8");
    const result = spawnSync$1("lake", ["env", "lean", probePath], {
      cwd: projectRoot,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024
    });
    const output = `${result.stdout || ""}${result.stderr || ""}`;
    const records = parse(output);
    if (result.error || result.status !== 0) {
      const tail = output.trim().slice(-4e3);
      return { records, diagnostic: tail || String(result.error?.message || `Lake exited with ${result.status}`) };
    }
    return { records };
  } finally {
    try {
      require("node:fs").rmSync(probePath, { force: true });
    } catch (_error) {
    }
  }
}
function setFor(map, id) {
  const existing = map.get(id);
  if (existing) return existing;
  const created = /* @__PURE__ */ new Set();
  map.set(id, created);
  return created;
}
function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}
function renderLeanDependencyReport(artifact) {
  const lines = [
    "# Lean dependency comparison",
    "",
    "> This report compares explicit strict Markdown dependencies with direct references in elaborated Lean declaration types and proof values. Markdown-only edges merit direct review; Lean-only edges often record implementation detail or reusable support and are shown as supplemental context. Neither difference by itself establishes a mathematical conflict.",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Strict Markdown edges | ${artifact.summary.markdownEdges} |`,
    `| Comparable Markdown edges | ${artifact.summary.comparableMarkdownEdges} |`,
    `| Lean edges | ${artifact.summary.leanEdges} |`,
    `| Shared edges | ${artifact.summary.sharedEdges} |`,
    `| Markdown-only review candidates | ${artifact.summary.markdownOnlyEdges} |`,
    `| Additional Lean support edges | ${artifact.summary.leanOnlyEdges} |`,
    `| Unmapped Markdown edges | ${artifact.summary.unmappedMarkdownEdges} |`,
    ""
  ];
  if (artifact.solutionDependencies?.length) {
    lines.push("## Premises in linked solutions", "", "Explicit references in a linked solution are compared as premises of its exercise; the ownership link itself is not a premise.", "");
    artifact.solutionDependencies.forEach((item) => lines.push(`- \`${item.exercise}\` → \`${item.to}\` via solution \`${item.solution}\``));
    lines.push("");
  }
  if (artifact.diagnostics.length > 0) {
    lines.push("## Query diagnostics", "");
    artifact.diagnostics.forEach((diagnostic) => lines.push(`- **${diagnostic.projectKey}**: ${diagnostic.message}`));
    lines.push("");
  }
  const candidates = Object.entries(artifact.comparisons).filter(([, comparison]) => comparison.markdownOnly.length > 0 || comparison.leanOnly.length > 0).sort(([left], [right]) => left.localeCompare(right));
  if (candidates.length > 0) {
    lines.push("## Per-anchor comparison", "");
    for (const [id, comparison] of candidates) {
      lines.push(`### \`${id}\``, "");
      if (comparison.markdownOnly.length > 0) lines.push(`- Markdown-only review: ${comparison.markdownOnly.map((value) => `\`${value}\``).join(", ")}`);
      if (comparison.leanOnly.length > 0) lines.push(`- Additional Lean support: ${comparison.leanOnly.map((value) => `\`${value}\``).join(", ")}`);
      lines.push("");
    }
  }
  if (artifact.unmappedMarkdownEdges.length > 0) {
    lines.push("## Markdown edges not comparable yet", "");
    artifact.unmappedMarkdownEdges.forEach((edge) => lines.push(`- \`${edge.from}\` → \`${edge.to}\``));
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}
`;
}
async function collectLeanDependencies(workspaceRoot, index, graph) {
  const nameToAnchors = /* @__PURE__ */ new Map();
  const declarationsByProject = /* @__PURE__ */ new Map();
  for (const [id, anchor] of Object.entries(index.anchors)) {
    for (const declaration of anchor.declarations) {
      const name = declaration.qualifiedName || declaration.name;
      if (!name) continue;
      setFor(nameToAnchors, name).add(id);
      const names = declarationsByProject.get(declaration.projectKey) || [];
      names.push(name);
      declarationsByProject.set(declaration.projectKey, names);
    }
  }
  const edges = /* @__PURE__ */ new Map();
  const diagnostics = [];
  for (const project of index.projects) {
    const names = sorted(new Set(declarationsByProject.get(project.key) || []));
    const query = queryProjectDependencies(workspaceRoot, project, names);
    if (query.diagnostic) diagnostics.push({ projectKey: project.key, message: query.diagnostic });
    for (const record of query.records) {
      const fromIds = nameToAnchors.get(record.source) || /* @__PURE__ */ new Set();
      for (const targetName of record.targets) {
        const toIds = nameToAnchors.get(targetName) || /* @__PURE__ */ new Set();
        for (const from of fromIds) for (const to of toIds) {
          if (from === to) continue;
          const edge = {
            from,
            to,
            projectKey: project.key,
            declaration: record.source,
            where: record.where
          };
          edges.set([edge.from, edge.to, edge.projectKey, edge.declaration, edge.where].join("\0"), edge);
        }
      }
    }
  }
  const markdownEdges = strictMarkdownEdges(graph, index);
  const anchoredIds = new Set(Object.keys(index.anchors));
  const comparableMarkdownEdges = markdownEdges.filter((edge) => anchoredIds.has(edge.from) && anchoredIds.has(edge.to));
  const unmappedMarkdownEdges = markdownEdges.filter((edge) => !anchoredIds.has(edge.from) || !anchoredIds.has(edge.to));
  const markdownBySource = /* @__PURE__ */ new Map();
  comparableMarkdownEdges.forEach((edge) => setFor(markdownBySource, edge.from).add(edge.to));
  const leanBySource = /* @__PURE__ */ new Map();
  edges.forEach((edge) => setFor(leanBySource, edge.from).add(edge.to));
  const comparisons = {};
  let sharedEdges = 0;
  let markdownOnlyEdges = 0;
  let leanOnlyEdges = 0;
  const candidateIds = /* @__PURE__ */ new Set([...markdownBySource.keys(), ...leanBySource.keys()]);
  for (const id of sorted(candidateIds)) {
    const markdown = markdownBySource.get(id) || /* @__PURE__ */ new Set();
    const lean = leanBySource.get(id) || /* @__PURE__ */ new Set();
    const shared = sorted([...markdown].filter((target) => lean.has(target)));
    const markdownOnly = sorted([...markdown].filter((target) => !lean.has(target)));
    const leanOnly = sorted([...lean].filter((target) => !markdown.has(target)));
    sharedEdges += shared.length;
    markdownOnlyEdges += markdownOnly.length;
    leanOnlyEdges += leanOnly.length;
    comparisons[id] = { markdownOnly, leanOnly, shared };
  }
  const artifact = {
    schemaVersion: 1,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    inputFingerprint: leanDependencyInputFingerprint(index, graph),
    edges: [...edges.values()].sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to) || left.projectKey.localeCompare(right.projectKey) || left.declaration.localeCompare(right.declaration) || left.where.localeCompare(right.where)),
    comparisons,
    ...solutionDependencies(graph).length ? { solutionDependencies: solutionDependencies(graph) } : {},
    unmappedMarkdownEdges,
    diagnostics,
    summary: {
      markdownEdges: markdownEdges.length,
      comparableMarkdownEdges: comparableMarkdownEdges.length,
      leanEdges: new Set([...edges.values()].map((edge) => `${edge.from}\0${edge.to}`)).size,
      sharedEdges,
      markdownOnlyEdges,
      leanOnlyEdges,
      unmappedMarkdownEdges: unmappedMarkdownEdges.length
    }
  };
  await fs__namespace.mkdir(path__namespace.join(workspaceRoot, ".math-workspace"), { recursive: true });
  await fs__namespace.writeFile(dependencyPath(workspaceRoot), `${JSON.stringify(artifact, null, 2)}
`, "utf8");
  await fs__namespace.writeFile(reportPath(workspaceRoot), renderLeanDependencyReport(artifact), "utf8");
  return artifact;
}
const { spawnSync } = require("node:child_process");
const LEAN_CONTRACTS_FILE = "lean-contracts.json";
const LEAN_BUILD_FILE = "lean-build.json";
function fingerprint$1(value) {
  return crypto__namespace.createHash("sha256").update(value).digest("hex");
}
function normalizeContractContent(value) {
  return String(value || "").normalize("NFKC").replace(/<!--[\s\S]*?-->/g, " ").replace(/#(?:h-[0-9a-f]{16,32}|tmp-[A-Za-z0-9_-]+)/gi, "#id").replace(/\s+/g, " ").trim();
}
function formalFingerprint(label) {
  return fingerprint$1(JSON.stringify({
    type: label.type,
    title: normalizeContractContent(label.title),
    content: normalizeContractContent(label.content || label.title)
  }));
}
function declarationFingerprint(index, id) {
  const declarations = index.anchors[id]?.declarations || [];
  return fingerprint$1(JSON.stringify(declarations.map((declaration) => ({
    projectKey: declaration.projectKey,
    qualifiedName: declaration.qualifiedName || declaration.name,
    kind: declaration.kind,
    signatureFingerprint: declaration.signatureFingerprint
  })).sort((left, right) => left.projectKey.localeCompare(right.projectKey) || left.qualifiedName.localeCompare(right.qualifiedName) || left.signatureFingerprint.localeCompare(right.signatureFingerprint))));
}
function contractsPath(workspaceRoot) {
  return path__namespace.join(workspaceRoot, ".math-workspace", LEAN_CONTRACTS_FILE);
}
function buildPath(workspaceRoot) {
  return path__namespace.join(workspaceRoot, ".math-workspace", LEAN_BUILD_FILE);
}
async function readJson$1(filePath) {
  try {
    return JSON.parse(await fs__namespace.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return void 0;
    return void 0;
  }
}
function isContractsArtifact(value) {
  return value?.schemaVersion === 1 && !!value.anchors && typeof value.anchors === "object";
}
function isBuildArtifact(value) {
  return value?.schemaVersion === 1 && !!value.projects && typeof value.projects === "object";
}
async function readLeanContracts(workspaceRoot) {
  const artifact = await readJson$1(contractsPath(workspaceRoot));
  return isContractsArtifact(artifact) ? artifact : void 0;
}
async function readLeanBuild(workspaceRoot) {
  const artifact = await readJson$1(buildPath(workspaceRoot));
  return isBuildArtifact(artifact) ? artifact : void 0;
}
function captureLeanContracts(index, labels) {
  const anchors = {};
  for (const id of Object.keys(index.anchors).sort()) {
    const label = labels[id];
    if (!label) continue;
    anchors[id] = {
      formalFingerprint: formalFingerprint(label),
      proofFingerprint: fingerprint$1(normalizeContractContent(associatedProofContent(label, labels))),
      declarationFingerprint: declarationFingerprint(index, id)
    };
  }
  return { schemaVersion: 1, capturedAt: (/* @__PURE__ */ new Date()).toISOString(), anchors };
}
async function writeLeanContracts(workspaceRoot, contracts) {
  await fs__namespace.mkdir(path__namespace.join(workspaceRoot, ".math-workspace"), { recursive: true });
  await fs__namespace.writeFile(contractsPath(workspaceRoot), `${JSON.stringify(contracts, null, 2)}
`, "utf8");
}
async function applyLeanWorkspaceStatus(workspaceRoot, index, labels, dependencyGraph) {
  const [contracts, build, dependencies] = await Promise.all([
    readLeanContracts(workspaceRoot),
    readLeanBuild(workspaceRoot),
    readLeanDependencyArtifact(workspaceRoot)
  ]);
  const dependenciesCurrent = !!dependencies && dependencies.inputFingerprint === leanDependencyInputFingerprint(index, dependencyGraph);
  const contractsSummary = {
    current: 0,
    untracked: 0,
    "markdown-drifted": 0,
    "declaration-drifted": 0,
    drifted: 0
  };
  const buildsSummary = {
    passed: 0,
    failed: 0,
    stale: 0,
    unverified: 0
  };
  const dependenciesSummary = {
    matched: 0,
    "markdown-gap": 0,
    supplemental: 0,
    unavailable: 0,
    stale: 0
  };
  const projectBuildStates = {};
  for (const project of index.projects) {
    const result = build?.projects?.[project.key];
    const current = index.projectSources[project.key]?.fingerprint;
    projectBuildStates[project.key] = !result ? "unverified" : !current || result.sourceFingerprint !== current ? "stale" : result.passed ? "passed" : "failed";
  }
  for (const [id, anchor] of Object.entries(index.anchors)) {
    const label = labels[id];
    const baseline = contracts?.anchors?.[id];
    const statementChanged = !!baseline && !!label && baseline.formalFingerprint !== formalFingerprint(label);
    const proofChanged = !!baseline?.proofFingerprint && !!label && baseline.proofFingerprint !== fingerprint$1(normalizeContractContent(associatedProofContent(label, labels)));
    const markdownChanged = statementChanged || proofChanged;
    const declarationChanged = !!baseline && baseline.declarationFingerprint !== declarationFingerprint(index, id);
    const contract = !baseline || baseline.proofFingerprint === void 0 ? "untracked" : markdownChanged && declarationChanged ? "drifted" : markdownChanged ? "markdown-drifted" : declarationChanged ? "declaration-drifted" : "current";
    const projects = [...new Set(anchor.declarations.map((declaration) => declaration.projectKey))];
    const buildStates = projects.map((projectKey) => projectBuildStates[projectKey] || "unverified");
    const buildState = buildStates.includes("failed") ? "failed" : buildStates.includes("stale") ? "stale" : buildStates.length > 0 && buildStates.every((state) => state === "passed") ? "passed" : "unverified";
    const comparison = dependencies?.comparisons?.[id];
    const dependencyState = !dependencies ? "unavailable" : !dependenciesCurrent ? "stale" : comparison?.markdownOnly.length ? "markdown-gap" : comparison?.leanOnly.length ? "supplemental" : "matched";
    anchor.status = {
      contract,
      build: buildState,
      dependencies: dependencyState,
      ...markdownChanged ? { markdownChanges: [...statementChanged ? ["statement"] : [], ...proofChanged ? ["proof"] : []] } : {}
    };
    contractsSummary[contract]++;
    buildsSummary[buildState]++;
    dependenciesSummary[dependencyState]++;
  }
  index.statusSummary = { contracts: contractsSummary, builds: buildsSummary, dependencies: dependenciesSummary, projects: projectBuildStates };
}
function boundedOutput(result) {
  const output = `${result?.stdout || ""}${result?.stderr || ""}`.trim();
  return output.length <= 12e3 ? output : output.slice(-12e3);
}
async function buildLeanWorkspace(workspaceRoot, index, projectKey) {
  const selected = index.projects.filter((project) => !projectKey || project.key === projectKey);
  if (projectKey && selected.length === 0) throw new Error(`Unknown Lean project: ${projectKey}`);
  const previous = await readLeanBuild(workspaceRoot);
  const projects = { ...previous?.projects || {} };
  for (const project of selected) {
    const root = path__namespace.resolve(workspaceRoot, project.root);
    const sourceFingerprint = index.projectSources[project.key]?.fingerprint || "";
    const command = ["lake", "build", ...project.target ? [project.target] : []];
    const started = /* @__PURE__ */ new Date();
    const result = spawnSync(command[0], command.slice(1), {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024
    });
    const finished = /* @__PURE__ */ new Date();
    projects[project.key] = {
      command,
      ...project.target ? { target: project.target } : {},
      sourceFingerprint,
      startedAt: started.toISOString(),
      finishedAt: finished.toISOString(),
      durationMs: Math.max(0, finished.getTime() - started.getTime()),
      exitCode: typeof result.status === "number" ? result.status : null,
      passed: !result.error && result.status === 0,
      output: result.error ? String(result.error.message || result.error) : boundedOutput(result)
    };
  }
  const artifact = { schemaVersion: 1, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), projects };
  await fs__namespace.mkdir(path__namespace.join(workspaceRoot, ".math-workspace"), { recursive: true });
  await fs__namespace.writeFile(buildPath(workspaceRoot), `${JSON.stringify(artifact, null, 2)}
`, "utf8");
  return artifact;
}
const LEAN_ID_RE = /\bh-[0-9a-f]{16,32}\b/gi;
const LEAN_DECLARATION_RE = /^\s*(?:@\[[^\]]*\]\s*)*(?:(?:private|protected|noncomputable|unsafe|opaque|partial)\s+)*(def|abbrev|theorem|lemma|structure|class|inductive|instance|axiom)\s+([A-Za-z_][A-Za-z0-9_'.]*)/;
const DEFAULT_ANCHOR_PREFIX = "Math Workspace anchor:";
const DEFAULT_COVERAGE_TYPES = DEFAULT_LEAN_COVERAGE_TYPES;
function fingerprint(value) {
  return crypto__namespace.createHash("sha256").update(value).digest("hex");
}
function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
function normalizedRelativePath$1(value) {
  return toPosix(String(value || "").trim()).replace(/^\.\/+/, "").replace(/^\/+/, "").replace(/\/+$/, "");
}
function pathInside(rootPath, candidatePath) {
  const relative = path__namespace.relative(rootPath, candidatePath);
  return relative === "" || !!relative && !relative.startsWith("..") && !path__namespace.isAbsolute(relative);
}
function leanProjects(config) {
  const projects = Array.isArray(config?.lean?.projects) ? config.lean.projects : [];
  return projects.filter((project) => project && typeof project === "object").map((project, index) => {
    const root = normalizedRelativePath$1(project.root);
    const sourceRoots = unique((Array.isArray(project.sourceRoots) ? project.sourceRoots : ["."]).map(normalizedRelativePath$1).map((value) => value || "."));
    return {
      key: String(project.key || root || `lean-${index + 1}`),
      root,
      sourceRoots: sourceRoots.length > 0 ? sourceRoots : ["."],
      target: typeof project.target === "string" && project.target.trim() ? project.target.trim() : void 0,
      module: typeof project.module === "string" && project.module.trim() ? project.module.trim() : void 0,
      anchorPrefix: typeof project.anchorPrefix === "string" && project.anchorPrefix.trim() ? project.anchorPrefix.trim() : DEFAULT_ANCHOR_PREFIX
    };
  });
}
function namespaceForOffset(source, offset) {
  const scopes = [];
  const before = source.slice(0, offset).split(/\r?\n/);
  for (const line of before) {
    const namespace = line.match(/^\s*namespace\s+([A-Za-z_][A-Za-z0-9_'.]*)\b/);
    if (namespace) {
      scopes.push({ kind: "namespace", name: namespace[1] });
      continue;
    }
    if (/^\s*(?:noncomputable\s+)?section(?:\s+[A-Za-z_][A-Za-z0-9_'.]*)?\s*(?:--.*)?$/.test(line)) {
      scopes.push({ kind: "section" });
      continue;
    }
    if (/^\s*end(?:\s+[A-Za-z_][A-Za-z0-9_'.]*)?\s*(?:--.*)?$/.test(line)) {
      scopes.pop();
    }
  }
  return scopes.filter((scope) => scope.kind === "namespace" && !!scope.name).map((scope) => scope.name).join(".");
}
function declarationSignature(source, offset) {
  const head = source.slice(offset, offset + 16e3);
  const terminator = head.search(/\s(?::=|where)\b/);
  const signature = (terminator >= 0 ? head.slice(0, terminator) : head).replace(/\/--[\s\S]*?-\//g, " ").replace(/--[^\n]*/g, " ").replace(/\s+/g, " ").trim();
  return fingerprint(signature);
}
function isLeanSourcePath(config, filePath) {
  const normalized = normalizedRelativePath$1(filePath);
  if (!normalized) return false;
  return leanProjects(config).some((project) => {
    const projectRoot = project.root === "." ? "" : project.root;
    if (projectRoot && normalized !== projectRoot && !normalized.startsWith(`${projectRoot}/`)) return false;
    if (normalized === path__namespace.posix.join(projectRoot, "lakefile.toml") || normalized === path__namespace.posix.join(projectRoot, "lean-toolchain")) return true;
    if (!normalized.toLowerCase().endsWith(".lean")) return false;
    return project.sourceRoots.some((sourceRoot) => {
      const base = normalizedRelativePath$1(path__namespace.posix.join(projectRoot, sourceRoot));
      if (!base || base === ".") return true;
      return normalized === base || normalized.startsWith(`${base}/`);
    });
  });
}
async function collectLeanFiles(directory, files = []) {
  const entries = await fs__namespace.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".lake") continue;
    const absolutePath = path__namespace.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectLeanFiles(absolutePath, files);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".lean")) {
      files.push(absolutePath);
    }
  }
  return files.sort((left, right) => toPosix(left).localeCompare(toPosix(right)));
}
function lineAt(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index++) {
    if (source.charCodeAt(index) === 10) line++;
  }
  return line;
}
function anchorsInDocstring(content, prefix) {
  const ids = [];
  for (const line of content.split(/\r?\n/)) {
    const prefixIndex = line.indexOf(prefix);
    if (prefixIndex < 0) continue;
    const matches = line.slice(prefixIndex + prefix.length).match(LEAN_ID_RE) || [];
    matches.forEach((id) => ids.push(id.toLowerCase()));
  }
  return unique(ids);
}
function declarationsFromLeanSource(source, project, filePath, diagnostics) {
  const declarations = [];
  const docstring = /\/--([\s\S]*?)-\//g;
  let match;
  while (match = docstring.exec(source)) {
    const ids = anchorsInDocstring(match[1], project.anchorPrefix);
    if (ids.length === 0) continue;
    const declarationSource2 = source.slice(docstring.lastIndex, docstring.lastIndex + 2e3);
    const declaration = declarationSource2.match(LEAN_DECLARATION_RE);
    if (!declaration) {
      const line = lineAt(source, match.index);
      diagnostics.push({
        severity: "error",
        code: "lean-anchor-declaration-missing",
        file: filePath,
        line,
        message: `Lean docstring anchor is not followed by a supported named declaration (${ids.join(", ")}).`
      });
      continue;
    }
    const declarationOffset = docstring.lastIndex + (declaration.index || 0) + declaration[0].indexOf(declaration[1]);
    const anchoredDeclaration = {
      projectKey: project.key,
      filePath,
      line: lineAt(source, declarationOffset),
      kind: declaration[1],
      name: declaration[2],
      qualifiedName: [namespaceForOffset(source, declarationOffset), declaration[2]].filter(Boolean).join("."),
      signatureFingerprint: declarationSignature(source, declarationOffset)
    };
    ids.forEach((id) => declarations.push({ id, declaration: anchoredDeclaration }));
  }
  return declarations;
}
async function scanLeanWorkspace(workspaceRoot, config, labels = {}, dependencyGraph) {
  const projects = leanProjects(config);
  const diagnostics = [];
  const anchors = /* @__PURE__ */ new Map();
  const projectSources = {};
  const scannedFiles = /* @__PURE__ */ new Set();
  const anchoredFiles = /* @__PURE__ */ new Set();
  for (const project of projects) {
    const projectSourceParts = [];
    if (!project.root) {
      diagnostics.push({
        severity: "error",
        code: "lean-project-root-missing",
        message: `Lean project ${project.key} must declare a workspace-relative root.`
      });
      continue;
    }
    const projectRoot = path__namespace.resolve(workspaceRoot, project.root);
    if (!pathInside(workspaceRoot, projectRoot)) {
      diagnostics.push({
        severity: "error",
        code: "lean-project-root-outside-workspace",
        message: `Lean project ${project.key} resolves outside the Math Workspace root.`
      });
      continue;
    }
    for (const sourceRoot of project.sourceRoots) {
      const absoluteSourceRoot = path__namespace.resolve(projectRoot, sourceRoot);
      const sourceDisplay = toPosix(path__namespace.relative(workspaceRoot, absoluteSourceRoot));
      if (!pathInside(projectRoot, absoluteSourceRoot)) {
        diagnostics.push({
          severity: "error",
          code: "lean-source-root-outside-project",
          file: sourceDisplay,
          message: `Lean source root for ${project.key} resolves outside its project root.`
        });
        continue;
      }
      let files;
      try {
        files = await collectLeanFiles(absoluteSourceRoot);
      } catch (error) {
        diagnostics.push({
          severity: "error",
          code: "lean-source-root-unreadable",
          file: sourceDisplay,
          message: `Cannot scan Lean source root for ${project.key}: ${error?.message || error}`
        });
        continue;
      }
      for (const absoluteFile of files) {
        const filePath = toPosix(path__namespace.relative(workspaceRoot, absoluteFile));
        if (scannedFiles.has(filePath)) continue;
        scannedFiles.add(filePath);
        const source = await fs__namespace.readFile(absoluteFile, "utf8");
        projectSourceParts.push(`${filePath}\0${source}`);
        const declarations = declarationsFromLeanSource(source, project, filePath, diagnostics);
        if (declarations.length > 0) anchoredFiles.add(filePath);
        for (const item of declarations) {
          const entry = anchors.get(item.id) || { id: item.id, declarations: [] };
          entry.declarations.push(item.declaration);
          anchors.set(item.id, entry);
        }
      }
    }
    projectSources[project.key] = {
      fingerprint: fingerprint(projectSourceParts.sort().join("\0")),
      module: project.module || project.target
    };
  }
  for (const [id, entry] of anchors) {
    const label = labels[id];
    if (!label) {
      const first = entry.declarations[0];
      diagnostics.push({
        severity: "error",
        code: "lean-anchor-unknown",
        file: first?.filePath,
        line: first?.line,
        message: `Lean anchor ${id} does not resolve to a Math Workspace formal object.`
      });
      continue;
    }
    entry.formal = {
      type: label.type,
      title: label.title,
      filePath: label.filePath,
      line: label.startLine === void 0 ? void 0 : label.startLine + 1
    };
    entry.declarations.sort((left, right) => left.filePath.localeCompare(right.filePath) || left.line - right.line || left.name.localeCompare(right.name));
  }
  const coverageTypes = new Set(Array.isArray(config?.lean?.coverageTypes) ? config.lean.coverageTypes.filter((value) => typeof value === "string") : DEFAULT_COVERAGE_TYPES);
  const eligible = projects.length === 0 ? [] : Object.entries(labels).filter(([id, label]) => HASH_ID_RE.test(id) && (coverageTypes.has(label.type) || label.type === "exercise" && anchors.has(id))).map(([id, label]) => ({
    id,
    type: label.type,
    title: label.title,
    filePath: label.filePath,
    line: label.startLine === void 0 ? void 0 : label.startLine + 1
  })).sort((left, right) => left.filePath.localeCompare(right.filePath) || (left.line || 0) - (right.line || 0) || left.id.localeCompare(right.id));
  const unanchoredFormalObjects = eligible.filter((item) => !anchors.has(item.id));
  const anchorObject = Object.fromEntries([...anchors.entries()].sort(([left], [right]) => left.localeCompare(right)));
  const declarationCount = [...anchors.values()].reduce((total, entry) => total + entry.declarations.length, 0);
  const unknownAnchors = [...anchors.values()].filter((entry) => !entry.formal).length;
  const index = {
    schemaVersion: 2,
    generatedBy: "math-workspace",
    projects,
    projectSources,
    anchors: anchorObject,
    unanchoredFormalObjects,
    diagnostics,
    summary: {
      projects: projects.length,
      leanFiles: scannedFiles.size,
      anchoredLeanFiles: anchoredFiles.size,
      anchors: anchors.size,
      declarations: declarationCount,
      matchedAnchors: anchors.size - unknownAnchors,
      unknownAnchors,
      eligibleFormalObjects: eligible.length,
      anchoredEligibleFormalObjects: eligible.length - unanchoredFormalObjects.length
    }
  };
  await applyLeanWorkspaceStatus(workspaceRoot, index, labels, dependencyGraph);
  return index;
}
function renderLeanReport(index) {
  const contracts = index.statusSummary?.contracts;
  const builds = index.statusSummary?.builds;
  const dependencies = index.statusSummary?.dependencies;
  const lines = [
    "# Lean anchor report",
    "",
    "> An anchor records a deterministic link to one or more Lean declarations. It does not by itself claim complete formalization or proof coverage.",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Projects | ${index.summary.projects} |`,
    `| Lean files | ${index.summary.leanFiles} |`,
    `| Anchored Lean files | ${index.summary.anchoredLeanFiles} |`,
    `| Unique anchors | ${index.summary.anchors} |`,
    `| Lean declarations | ${index.summary.declarations} |`,
    `| Matched formal anchors | ${index.summary.matchedAnchors} |`,
    `| Unknown anchors | ${index.summary.unknownAnchors} |`,
    `| Eligible formal objects | ${index.summary.eligibleFormalObjects} |`,
    `| Eligible objects with anchors | ${index.summary.anchoredEligibleFormalObjects} |`,
    ""
  ];
  if (contracts && builds && dependencies) {
    lines.push(
      "## Review status",
      "",
      "> `current` means that the captured Markdown statement, associated proof/solution content and anchored Lean declaration signatures are unchanged. It is a drift check, not a semantic-equivalence proof.",
      "",
      "| Contract state | Anchors |",
      "| --- | ---: |",
      `| Current | ${contracts.current} |`,
      `| Untracked | ${contracts.untracked} |`,
      `| Markdown drifted | ${contracts["markdown-drifted"]} |`,
      `| Declaration drifted | ${contracts["declaration-drifted"]} |`,
      `| Both drifted | ${contracts.drifted} |`,
      "",
      "| Build state | Anchors |",
      "| --- | ---: |",
      `| Passed | ${builds.passed} |`,
      `| Failed | ${builds.failed} |`,
      `| Stale | ${builds.stale} |`,
      `| Unverified | ${builds.unverified} |`,
      "",
      "| Dependency state | Anchors |",
      "| --- | ---: |",
      `| Matched | ${dependencies.matched} |`,
      `| Markdown-only review | ${dependencies["markdown-gap"]} |`,
      `| Additional Lean support | ${dependencies.supplemental} |`,
      `| Stale comparison | ${dependencies.stale} |`,
      `| Comparison unavailable | ${dependencies.unavailable} |`,
      ""
    );
  }
  if (index.projects.length > 0) {
    lines.push("## Projects", "");
    index.projects.forEach((project) => {
      const target = project.target ? `; build target \`${project.target}\`` : "";
      lines.push(`- **${project.key}**: \`${project.root}\`; sources ${project.sourceRoots.map((root) => `\`${root}\``).join(", ")}${target}`);
    });
    lines.push("");
  }
  if (index.diagnostics.length > 0) {
    lines.push("## Diagnostics", "");
    index.diagnostics.forEach((diagnostic) => {
      const location = diagnostic.file ? ` (${diagnostic.file}${diagnostic.line ? `:${diagnostic.line}` : ""})` : "";
      lines.push(`- **${diagnostic.severity.toUpperCase()} ${diagnostic.code}**${location}: ${diagnostic.message}`);
    });
    lines.push("");
  }
  if (index.unanchoredFormalObjects.length > 0) {
    lines.push("## Eligible formal objects without a Lean anchor", "");
    index.unanchoredFormalObjects.forEach((item) => {
      lines.push(`- \`${item.id}\` ${item.type} — ${item.title || "(untitled)"} (${item.filePath}${item.line ? `:${item.line}` : ""})`);
    });
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}
`;
}
const STATE_FILE = ".math-workspace/documents.json";
const STAGES = /* @__PURE__ */ new Set(["draft", "revising", "stable"]);
const HARD_IGNORED_DIRECTORIES = /* @__PURE__ */ new Set([
  ".git",
  ".lake",
  ".math-workspace",
  "node_modules",
  "out",
  "dist",
  ".vscode-test"
]);
function normalizedRelativePath(value) {
  if (typeof value !== "string") return "";
  const normalized = toPosix(value).replace(/^\/+/, "").replace(/\/+$/, "");
  if (!normalized || normalized.startsWith("../") || normalized.includes("/../") || path__namespace.posix.isAbsolute(normalized)) return "";
  return normalized;
}
function normalizedStage(value) {
  return typeof value === "string" && STAGES.has(value) ? value : void 0;
}
function normalizedCheckpoint(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const raw = value;
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  const contentHash = typeof raw.contentHash === "string" ? raw.contentHash.trim() : "";
  const recordedAt = typeof raw.recordedAt === "string" ? raw.recordedAt.trim() : "";
  if (!label || label.length > 80 || !/^[a-f0-9]{64}$/i.test(contentHash) || !recordedAt || recordedAt.length > 80) return void 0;
  return { label, contentHash: contentHash.toLowerCase(), recordedAt };
}
function normalizedRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const raw = value;
  const stage = normalizedStage(raw.stage);
  const stableContentHash = typeof raw.stableContentHash === "string" && /^[a-f0-9]{64}$/i.test(raw.stableContentHash) ? raw.stableContentHash.toLowerCase() : void 0;
  const checkpoint = normalizedCheckpoint(raw.checkpoint);
  const updatedAt = typeof raw.updatedAt === "string" && raw.updatedAt.length <= 80 ? raw.updatedAt : void 0;
  if (!stage && !checkpoint) return void 0;
  return {
    ...stage ? { stage } : {},
    ...stage === "stable" && stableContentHash ? { stableContentHash } : {},
    ...checkpoint ? { checkpoint } : {},
    ...updatedAt ? { updatedAt } : {}
  };
}
function sourceHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}
function configuredCollections(config) {
  const raw = Array.isArray(config?.documents?.collections) ? config.documents.collections : [];
  const used = /* @__PURE__ */ new Set();
  const collections = [];
  for (const candidate of raw) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const item = candidate;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const mode = item.mode;
    const include = Array.isArray(item.include) ? item.include.map(normalizedRelativePath).filter(Boolean) : [];
    if (!id || id.length > 80 || used.has(id) || mode !== "draft" || include.length === 0) continue;
    used.add(id);
    const title = typeof item.title === "string" && item.title.trim() ? item.title.trim().slice(0, 120) : id;
    collections.push({ id, title, mode, include: [...new Set(include)] });
  }
  return collections;
}
function documentCollectionForPath(filePath, config) {
  const normalized = normalizedRelativePath(filePath);
  if (!normalized) return void 0;
  return configuredCollections(config).find((collection) => collection.include.some((pattern) => pathPatternMatches(normalized, pattern)));
}
function collectionMayContainPath(directoryPath, collection) {
  const directory = normalizedRelativePath(directoryPath);
  if (!directory) return true;
  return collection.include.some((pattern) => {
    const prefix = normalizedRelativePath(pattern.split(/[?*]/, 1)[0]);
    if (!prefix) return true;
    return prefix === directory || prefix.startsWith(`${directory}/`) || directory.startsWith(`${prefix}/`);
  });
}
function isHardIgnoredDirectory(name) {
  return HARD_IGNORED_DIRECTORIES.has(name);
}
function documentStateRelativePath(config) {
  const configured = normalizedRelativePath(config?.documents?.stateFile);
  return configured || STATE_FILE;
}
function emptyState(stateFile) {
  return { schemaVersion: 1, stateFile, records: {}, lifecycles: {}, orphaned: [] };
}
async function readRecords(rootPath, config) {
  const stateFile = documentStateRelativePath(config);
  const absolute = path__namespace.join(rootPath, stateFile);
  let parsed;
  try {
    parsed = JSON.parse(await fs__namespace.readFile(absolute, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return { stateFile, records: {} };
    throw new Error(`Could not read ${stateFile}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${stateFile} must contain an object.`);
  }
  const rawRecords = parsed.documents;
  if (!rawRecords || typeof rawRecords !== "object" || Array.isArray(rawRecords)) return { stateFile, records: {} };
  const records = {};
  for (const [filePath, value] of Object.entries(rawRecords)) {
    const normalized = normalizedRelativePath(filePath);
    const record = normalizedRecord(value);
    if (normalized && record) records[normalized] = record;
  }
  return { stateFile, records };
}
async function readDocumentState(rootPath, config, documents) {
  const { stateFile, records } = await readRecords(rootPath, config);
  const state = emptyState(stateFile);
  state.records = records;
  documents.forEach((content, filePath) => {
    const collection = documentCollectionForPath(filePath, config);
    const record = collection ? void 0 : records[filePath];
    const checkpoint = record?.checkpoint;
    const contentHash = sourceHash(content);
    const changedSinceStable = record?.stage === "stable" && !!record.stableContentHash && record.stableContentHash !== contentHash;
    state.lifecycles[filePath] = {
      mode: collection ? "draft" : "formal",
      ...collection ? { collectionId: collection.id, collectionTitle: collection.title } : {},
      ...collection ? {} : { stage: changedSinceStable ? "revising" : record?.stage || "draft", changedSinceStable },
      ...checkpoint ? { checkpoint } : {},
      changedSinceCheckpoint: !!checkpoint && checkpoint.contentHash !== contentHash
    };
  });
  state.orphaned = Object.keys(records).filter((filePath) => !documents.has(filePath)).sort();
  return state;
}
function validCheckpointLabel(value) {
  if (typeof value !== "string") return void 0;
  const label = value.trim();
  if (!label || label.length > 80 || /[\r\n]/.test(label)) return void 0;
  return label;
}
async function updateDocumentState(rootPath, config, documents, update) {
  const filePath = normalizedRelativePath(update.filePath);
  const content = documents.get(filePath);
  if (!filePath || content === void 0) throw new Error("The document is not part of the bound Math Workspace project.");
  const stage = update.stage === void 0 ? void 0 : normalizedStage(update.stage);
  if (documentCollectionForPath(filePath, config)) throw new Error("Draft collections do not use formal document stages or milestones.");
  const checkpointLabel = update.checkpointLabel === void 0 ? void 0 : validCheckpointLabel(update.checkpointLabel);
  if (update.stage !== void 0 && !stage) throw new Error("The document stage is invalid.");
  if (update.checkpointLabel !== void 0 && !checkpointLabel) throw new Error("The version label is invalid.");
  if (!stage && checkpointLabel === void 0 && !update.clearCheckpoint) throw new Error("Choose a stage or a version label.");
  const { stateFile, records } = await readRecords(rootPath, config);
  const previous = records[filePath] || {};
  const next = {
    ...previous,
    ...stage ? { stage } : {},
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (stage === "stable") next.stableContentHash = sourceHash(content);
  else if (stage) delete next.stableContentHash;
  if (checkpointLabel) {
    next.checkpoint = {
      label: checkpointLabel,
      contentHash: sourceHash(content),
      recordedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  if (update.clearCheckpoint) delete next.checkpoint;
  records[filePath] = next;
  const sorted2 = Object.fromEntries(Object.entries(records).sort(([left], [right]) => left.localeCompare(right)));
  const target = path__namespace.join(rootPath, stateFile);
  await fs__namespace.mkdir(path__namespace.dirname(target), { recursive: true });
  await fs__namespace.writeFile(target, `${JSON.stringify({ schemaVersion: 1, documents: sorted2 }, null, 2)}
`, "utf8");
  return readDocumentState(rootPath, config, documents);
}
const nodeFs = require("node:fs");
const REFRESH_DELAY_MS = 160;
const SOURCE_EVENT_MAX_ENTRIES = 4096;
const SOURCE_EVENT_MAX_BYTES = 8 * 1024 * 1024;
function isLeanReviewMetadataPath(filePath) {
  return /^\.math-workspace\/(?:lean-audits|lean-reviews|lean-review-evidence|lean-assistance)\/h-[0-9a-f]{16,32}\.json$/i.test(toPosix(filePath));
}
function pathExists(filePath) {
  return fs__namespace.access(filePath).then(() => true, () => false);
}
async function readConfig(rootPath) {
  const configPath2 = path__namespace.join(rootPath, ".math-workspace", "config.json");
  if (!await pathExists(configPath2)) {
    throw new Error("Math Workspace requires .math-workspace/config.json in the project root. Run `math-workspace init` first.");
  }
  return mergeConfig(JSON.parse(await fs__namespace.readFile(configPath2, "utf8")));
}
async function collectMarkdownFiles(rootPath, config, directory = rootPath, files = [], budget) {
  const entries = await fs__namespace.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (budget && --budget.entries < 0) throw new Error("Source watcher inspection limit reached.");
    const absolutePath = path__namespace.join(directory, entry.name);
    const relativePath = toPosix(path__namespace.relative(rootPath, absolutePath));
    if (entry.isDirectory()) {
      if (entry.name !== ".lake" && !shouldExcludeScanPath(relativePath, config)) {
        await collectMarkdownFiles(rootPath, config, absolutePath, files, budget);
      }
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md") && !shouldExcludeScanPath(relativePath, config)) {
      files.push(absolutePath);
    }
  }
  return files.sort((left, right) => toPosix(path__namespace.relative(rootPath, left)).localeCompare(toPosix(path__namespace.relative(rootPath, right))));
}
async function collectDraftMarkdownFiles(rootPath, config, directory = rootPath, files = [], budget) {
  const collections = Array.isArray(config?.documents?.collections) ? config.documents.collections : [];
  if (!collections.length) return files;
  const entries = await fs__namespace.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (budget && --budget.entries < 0) throw new Error("Source watcher inspection limit reached.");
    if (entry.isDirectory() && isHardIgnoredDirectory(entry.name)) continue;
    const absolutePath = path__namespace.join(directory, entry.name);
    const relativePath = toPosix(path__namespace.relative(rootPath, absolutePath));
    if (entry.isDirectory()) {
      const collectionCouldContain = collections.some((collection) => collectionMayContainPath(relativePath, collection));
      if (collectionCouldContain) {
        await collectDraftMarkdownFiles(rootPath, config, absolutePath, files, budget);
      }
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md") && documentCollectionForPath(relativePath, config)) {
      files.push(absolutePath);
    }
  }
  return files.sort((left, right) => toPosix(path__namespace.relative(rootPath, left)).localeCompare(toPosix(path__namespace.relative(rootPath, right))));
}
function draftTitle(content, filePath) {
  const heading = content.split(/\r?\n/).find((line) => /^\s{0,3}#\s+/.test(line));
  if (heading) return heading.replace(/^\s{0,3}#\s+/, "").trim();
  return path__namespace.posix.basename(filePath).replace(/\.md$/i, "").replace(/[-_]+/g, " ").trim() || filePath;
}
async function readIndex(rootPath, name) {
  try {
    return JSON.parse(await fs__namespace.readFile(path__namespace.join(rootPath, ".math-workspace", `${name}.json`), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return void 0;
    throw error;
  }
}
async function loadWorkspaceSnapshot(rootPath, revision = 1, options = {}) {
  const resolvedRoot = path__namespace.resolve(rootPath);
  const config = await readConfig(resolvedRoot);
  const [formalFiles, draftFiles] = await Promise.all([
    collectMarkdownFiles(resolvedRoot, config),
    collectDraftMarkdownFiles(resolvedRoot, config)
  ]);
  const formalDocuments = await Promise.all(formalFiles.map(async (absolutePath) => ({
    filePath: toPosix(path__namespace.relative(resolvedRoot, absolutePath)),
    content: await fs__namespace.readFile(absolutePath, "utf8")
  })));
  const draftDocuments = await Promise.all(draftFiles.map(async (absolutePath) => ({
    filePath: toPosix(path__namespace.relative(resolvedRoot, absolutePath)),
    content: await fs__namespace.readFile(absolutePath, "utf8")
  })));
  const documents = [...formalDocuments, ...draftDocuments].sort((left, right) => left.filePath.localeCompare(right.filePath));
  const [definitions, symbols] = await Promise.all([
    readIndex(resolvedRoot, "definitions"),
    readIndex(resolvedRoot, "symbols")
  ]);
  const formalState = scanFormalDocuments(formalDocuments, config, symbols, definitions);
  formalState.pages.forEach((page) => {
    page.documentMode = "formal";
  });
  const draftPages = draftDocuments.map((document, order) => {
    const collection = documentCollectionForPath(document.filePath, config);
    return {
      kind: "draft",
      filePath: document.filePath,
      title: draftTitle(document.content, document.filePath),
      order,
      documentMode: "draft",
      documentCollectionId: collection?.id,
      documentCollectionTitle: collection?.title
    };
  });
  formalState.pages = sortManuscriptPages([...formalState.pages, ...draftPages], "workspace");
  const analysisPending = options.deferLean && config.lean?.projects?.length > 0;
  const leanIndex = analysisPending ? void 0 : await scanLeanWorkspace(resolvedRoot, config, formalState.labels, formalState.dependencyGraph);
  formalState.issues.push(...(leanIndex?.diagnostics || []).map((diagnostic) => ({
    severity: diagnostic.severity,
    code: diagnostic.code,
    file: diagnostic.file,
    line: diagnostic.line,
    message: diagnostic.message
  })));
  return {
    revision,
    refreshedAt: (/* @__PURE__ */ new Date()).toISOString(),
    state: {
      ...formalState,
      analysisPending: !!analysisPending,
      leanIndex,
      documentState: await readDocumentState(resolvedRoot, config, new Map(documents.map((document) => [document.filePath, document.content])))
    },
    documents: new Map(documents.map((document) => [document.filePath, document.content]))
  };
}
class ReaderWorkspace {
  constructor(rootPath, options = {}) {
    this.rootPath = rootPath;
    this.options = options;
    this.refreshing = false;
    this.closed = false;
    this.refreshQueued = false;
    this.listeners = /* @__PURE__ */ new Set();
    this.pendingChangedPaths = /* @__PURE__ */ new Set();
    this.pendingMetadataPaths = /* @__PURE__ */ new Set();
  }
  async start() {
    this.closed = false;
    await this.refresh();
    this.watcher = nodeFs.watch(this.rootPath, { recursive: true }, (_event, fileName) => {
      const relativePath = typeof fileName === "string" ? toPosix(fileName) : "";
      if (isLeanReviewMetadataPath(relativePath)) {
        if (this.pendingMetadataPaths.size < 256) this.pendingMetadataPaths.add(relativePath);
        if (this.metadataTimer) clearTimeout(this.metadataTimer);
        this.metadataTimer = setTimeout(() => {
          this.metadataTimer = void 0;
          const changedPaths = [...this.pendingMetadataPaths].sort();
          this.pendingMetadataPaths.clear();
          this.notifyMetadataChange(changedPaths);
        }, REFRESH_DELAY_MS);
        return;
      }
      const stateFile = documentStateRelativePath(this.snapshot?.state.config || mergeConfig({}));
      if (relativePath && relativePath === stateFile) {
        void this.refreshDocumentState(relativePath).catch((error) => console.error(`[math-workspace] Document state refresh failed: ${error.message || error}`));
        return;
      }
      if (relativePath && !this.shouldRefresh(relativePath)) return;
      void this.sourcePathChanged(relativePath).then((changed) => {
        if (changed && !this.closed) this.scheduleRefresh(relativePath);
      }).catch(() => {
        if (!this.closed) this.scheduleRefresh(relativePath);
      });
    });
    this.watcher.on?.("error", (error) => {
      console.warn(`[math-workspace] Math Workspace watcher error: ${error.message}`);
    });
  }
  async close() {
    this.closed = true;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (this.metadataTimer) clearTimeout(this.metadataTimer);
    this.refreshTimer = void 0;
    this.metadataTimer = void 0;
    this.pendingMetadataPaths.clear();
    this.watcher?.close?.();
    this.listeners.clear();
  }
  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  current() {
    if (!this.snapshot) throw new Error("Math Workspace is not ready.");
    return this.snapshot;
  }
  /** Optional Lean facts share the source snapshot, without delaying the first readable page.
   * A source refresh owns a new document map; an older analysis can never replace it. */
  async completeLeanAnalysis() {
    const source = this.current();
    if (this.closed || !source.state.analysisPending) return source;
    if (this.leanAnalysis?.documents === source.documents) return this.leanAnalysis.promise;
    const job = { documents: source.documents, promise: void 0 };
    job.promise = (async () => {
      const leanIndex = await scanLeanWorkspace(this.rootPath, source.state.config, source.state.labels, source.state.dependencyGraph);
      const current = this.current();
      if (!this.closed && current.documents === source.documents) {
        this.snapshot = { ...current, state: {
          ...current.state,
          leanIndex,
          analysisPending: false,
          issues: [...current.state.issues, ...leanIndex.diagnostics.map((diagnostic) => ({
            severity: diagnostic.severity,
            code: diagnostic.code,
            file: diagnostic.file,
            line: diagnostic.line,
            message: diagnostic.message
          }))]
        } };
      }
      return this.current();
    })().finally(() => {
      if (this.leanAnalysis === job) this.leanAnalysis = void 0;
    });
    this.leanAnalysis = job;
    return job.promise;
  }
  async reload() {
    await this.refresh();
    return this.current();
  }
  applyDocumentState(documentState, changedPaths = []) {
    const current = this.current();
    const snapshot = {
      ...current,
      revision: current.revision + 1,
      refreshedAt: (/* @__PURE__ */ new Date()).toISOString(),
      state: { ...current.state, documentState }
    };
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener({ snapshot, changedPaths }));
    return snapshot;
  }
  /** Review and assistance metadata live in their own stores. Notify controllers to reload them while
   * retaining the scanned source, document maps and Lean index byte-for-byte. */
  notifyMetadataChange(changedPaths) {
    const paths = [...new Set(changedPaths.filter(isLeanReviewMetadataPath))].slice(0, 256).sort();
    const current = this.current();
    if (!paths.length) return current;
    const snapshot = { ...current, revision: current.revision + 1, refreshedAt: (/* @__PURE__ */ new Date()).toISOString() };
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener({ snapshot, changedPaths: paths }));
    return snapshot;
  }
  async refreshDocumentState(filePath) {
    const current = this.current();
    const documentState = await readDocumentState(this.rootPath, current.state.config, current.documents);
    this.applyDocumentState(documentState, [filePath]);
  }
  scheduleRefresh(filePath = "") {
    if (filePath) this.pendingChangedPaths.add(filePath.replace(/^\/+/, ""));
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = void 0;
      void this.refresh().catch((error) => console.error(`[math-workspace] Math Workspace refresh failed: ${error.message || error}`));
    }, REFRESH_DELAY_MS);
  }
  /** FSEvents may deliver pre-watch source creation events together with a later metadata
   * write. Compare the affected inputs to the current snapshot before parsing them again.
   * Unknown, oversized and genuine source changes keep the conservative refresh path. */
  async sourcePathChanged(filePath) {
    const normalized = toPosix(filePath).replace(/^\/+/, "");
    if (!normalized || !this.snapshot) return true;
    if (isLeanSourcePath(this.snapshot.state.config, normalized)) return true;
    const candidate = path__namespace.resolve(this.rootPath, normalized);
    if (normalized === ".math-workspace/config.json") {
      const stat2 = await fs__namespace.stat(candidate);
      if (stat2.size > SOURCE_EVENT_MAX_BYTES) return true;
      const config2 = mergeConfig(JSON.parse(await fs__namespace.readFile(candidate, "utf8")));
      return JSON.stringify(config2) !== JSON.stringify(this.current().state.config);
    }
    if (this.snapshot.documents.has(normalized)) {
      const stat2 = await require("node:fs/promises").lstat(candidate);
      if (!stat2.isFile() || stat2.size > SOURCE_EVENT_MAX_BYTES) return true;
      const content = await fs__namespace.readFile(candidate, "utf8");
      return content !== this.current().documents.get(normalized);
    }
    let stat, directory = candidate, prefix = normalized + "/";
    if (normalized === path__namespace.basename(this.rootPath)) {
      if (this.current().state.config?.lean?.projects?.length) return true;
      if (await this.sourcePathChanged(".math-workspace/config.json")) return true;
      directory = this.rootPath;
      prefix = "";
      stat = await require("node:fs/promises").lstat(directory);
    } else {
      try {
        stat = await require("node:fs/promises").lstat(candidate);
      } catch (_error) {
        return true;
      }
    }
    if (!stat.isDirectory() || isLeanSourcePath(this.snapshot.state.config, normalized + "/source.lean")) return true;
    const config = this.snapshot.state.config, budget = { entries: SOURCE_EVENT_MAX_ENTRIES };
    const files = [.../* @__PURE__ */ new Set([
      ...await collectMarkdownFiles(this.rootPath, config, directory, [], budget),
      ...await collectDraftMarkdownFiles(this.rootPath, config, directory, [], budget)
    ])];
    const current = this.current();
    const expected = [...current.documents.keys()].filter((key) => key.startsWith(prefix));
    if (files.length !== expected.length) return true;
    let bytes = 0;
    for (const file of files) {
      const relative = toPosix(path__namespace.relative(this.rootPath, file));
      if (!this.current().documents.has(relative)) return true;
      bytes += (await fs__namespace.stat(file)).size;
      if (bytes > SOURCE_EVENT_MAX_BYTES) return true;
      if (await fs__namespace.readFile(file, "utf8") !== this.current().documents.get(relative)) return true;
    }
    return config !== this.current().state.config;
  }
  shouldRefresh(filePath) {
    const normalized = toPosix(filePath).replace(/^\/+/, "");
    if (!normalized) return true;
    if (normalized === ".math-workspace/config.json") return true;
    if (normalized === ".math-workspace/definitions.json") return true;
    if (normalized === ".math-workspace/symbols.json") return true;
    if (normalized === ".math-workspace/lean-build.json") return true;
    if (normalized === ".math-workspace/lean-contracts.json") return true;
    if (normalized === ".math-workspace/lean-dependency-graph.json") return true;
    if (normalized === documentStateRelativePath(this.snapshot?.state.config || mergeConfig({}))) return true;
    if (normalized === ".math-workspace" || normalized.startsWith(".math-workspace/")) return false;
    if (isLeanSourcePath(this.snapshot?.state.config || mergeConfig({}), normalized)) return true;
    return !shouldExcludeScanPath(normalized, this.snapshot?.state.config || mergeConfig({}));
  }
  async refresh() {
    if (this.refreshing) {
      this.refreshQueued = true;
      return;
    }
    this.refreshing = true;
    try {
      do {
        this.refreshQueued = false;
        const changedPaths = Array.from(this.pendingChangedPaths).sort();
        this.pendingChangedPaths.clear();
        const refreshed = await loadWorkspaceSnapshot(this.rootPath, (this.snapshot?.revision || 0) + 1, this.options);
        refreshed.revision = (this.snapshot?.revision || 0) + 1;
        this.snapshot = refreshed;
        this.listeners.forEach((listener) => listener({ snapshot: this.snapshot, changedPaths }));
      } while (this.refreshQueued);
    } finally {
      this.refreshing = false;
    }
  }
}
const fs$4 = require("node:fs/promises");
const sha256 = (value) => crypto__namespace.createHash("sha256").update(value).digest("hex");
function canonical(value) {
  const sort = (item) => Array.isArray(item) ? item.map(sort) : item && typeof item === "object" ? Object.fromEntries(Object.keys(item).sort().filter((key) => item[key] !== void 0).map((key) => [key, sort(item[key])])) : item;
  return `${JSON.stringify(sort(value), null, 2)}
`;
}
function publicationId(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value)) throw new Error("Invalid publication identity.");
  return value;
}
function buildId(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{32}$/.test(value)) throw new Error("Invalid publication build identity.");
  return value;
}
function relativeInput(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || /[\u0000-\u001f]/.test(value) || path__namespace.isAbsolute(value) || value.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Publication paths must be normalized files inside the project.");
  return value;
}
async function safePath(root, relative) {
  relativeInput(relative);
  let current = root;
  for (const component of relative.split("/")) {
    current = path__namespace.join(current, component);
    try {
      if ((await fs$4.lstat(current)).isSymbolicLink()) throw new Error("Publication paths cannot follow symbolic links.");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return current;
}
async function optionalJson(file) {
  try {
    return JSON.parse(await fs$4.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
async function atomicJson$1(root, relative, value) {
  const destination = await safePath(root, relative);
  await fs$4.mkdir(path__namespace.dirname(destination), { recursive: true });
  await safePath(root, relative);
  const temporary2 = `${destination}.tmp-${crypto__namespace.randomBytes(12).toString("hex")}`;
  try {
    await fs$4.writeFile(temporary2, canonical(value), { flag: "wx", mode: 384 });
    await fs$4.rename(temporary2, destination);
  } finally {
    await fs$4.rm(temporary2, { force: true });
  }
}
class PublicationStore {
  constructor(root) {
    this.relativeDirectory = ".math-workspace/publications";
    this.root = path__namespace.resolve(root);
  }
  async directory(relative = "") {
    return safePath(this.root, `${this.relativeDirectory}${relative ? `/${relative}` : ""}`);
  }
  async locked(id, action, namespace = "profile") {
    publicationId(id);
    const parent = await this.directory(`locks/${namespace}`);
    await fs$4.mkdir(parent, { recursive: true });
    const lock = await this.directory(`locks/${namespace}/${id}`);
    try {
      await fs$4.mkdir(lock);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const recovery = await this.directory(`lock-recovery/${namespace}/${id}`);
      await fs$4.mkdir(path__namespace.dirname(recovery), { recursive: true });
      try {
        await fs$4.mkdir(recovery);
      } catch {
        throw new Error("This publication has an active operation or lock recovery. Retry after it finishes.");
      }
      let stale;
      try {
        const owner = await optionalJson(await safePath(lock, "owner.json"));
        if (!Number.isInteger(owner?.pid) || owner.pid < 1) throw new Error("The publication lock has no valid owner. Inspect the interrupted local operation before recovering its lock.");
        try {
          process.kill(owner.pid, 0);
          throw new Error("This publication has an active operation. Retry after it finishes.");
        } catch (probe) {
          if (probe.code !== "ESRCH") throw probe;
        }
        stale = `${lock}.stale-${crypto__namespace.randomBytes(12).toString("hex")}`;
        await fs$4.rename(lock, stale);
        try {
          await fs$4.mkdir(lock);
        } catch {
          throw new Error("Another publication operation acquired the recovered lock. Retry after it finishes.");
        }
      } finally {
        if (stale) await fs$4.rm(stale, { recursive: true, force: true });
        await fs$4.rm(recovery, { recursive: true, force: true });
      }
    }
    try {
      await fs$4.writeFile(path__namespace.join(lock, "owner.json"), canonical({ pid: process.pid, startedAt: (/* @__PURE__ */ new Date()).toISOString() }), { flag: "wx", mode: 384 });
      return await action();
    } finally {
      await fs$4.rm(lock, { recursive: true, force: true });
    }
  }
  async profile(id) {
    const value = await optionalJson(await this.directory(`profiles/${publicationId(id)}.json`));
    if (value && (value.profile?.id !== id || !Number.isInteger(value.revision) || value.revision < 1)) throw new Error("Invalid publication profile record.");
    return value;
  }
  async profiles() {
    const directory = await this.directory("profiles");
    let names;
    try {
      names = await fs$4.readdir(directory);
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
    const records = [];
    for (const name of names.sort()) if (/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}\.json$/.test(name)) records.push(await this.profile(name.slice(0, -5)));
    return records.filter(Boolean);
  }
  async expectProfile(id, revision) {
    const value = await this.profile(id);
    if (!value || value.revision !== revision) throw new Error("The publication profile changed. Reload and review it again.");
    return value;
  }
  async save(profile, expectedRevision) {
    return this.locked(profile.id, async () => {
      const previous = await this.profile(profile.id);
      if ((previous?.revision ?? null) !== expectedRevision) throw new Error("The publication profile changed. Reload and review it again.");
      if (previous && previous.profile.workId !== profile.workId) throw new Error("A publication profile must retain the stable work identity.");
      const remote = await this.remote(profile.id);
      if (remote && remote.environment !== (profile.zenodo?.environment || "sandbox")) throw new Error("The existing work is bound to another Zenodo environment. Keep this profile on its established work entry.");
      const record = { profile, revision: (previous?.revision || 0) + 1, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await atomicJson$1(this.root, `${this.relativeDirectory}/profiles/${profile.id}.json`, record);
      return record;
    });
  }
  async remote(id) {
    const value = await optionalJson(await this.directory(`remote/${publicationId(id)}.json`));
    if (value && (value.schema !== "math-workspace.publication-zenodo/v1" || !Number.isInteger(value.revision) || value.revision < 1)) throw new Error("Invalid publication provider record.");
    return value;
  }
  async writeRemote(id, value) {
    const previous = await this.remote(id);
    const next = { ...value, revision: (previous?.revision || 0) + 1, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await atomicJson$1(this.root, `${this.relativeDirectory}/remote/${publicationId(id)}.json`, next);
    return next;
  }
  async verifications(id) {
    const directory = await this.directory(`verifications/${publicationId(id)}`);
    let names;
    try {
      names = await fs$4.readdir(directory);
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
    const values = [];
    for (const name of names.sort()) if (/^[a-f0-9]{32}\.json$/.test(name)) {
      const value = await optionalJson(await safePath(directory, name));
      if (value?.schema !== "math-workspace.publication-verification/v1" || value.profileId !== id || value.buildId !== name.slice(0, -5)) throw new Error("Invalid publication verification record.");
      values.push(value);
    }
    return values.sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  }
  async writeVerification(value) {
    await atomicJson$1(this.root, `${this.relativeDirectory}/verifications/${publicationId(value.profileId)}/${buildId(value.buildId)}.json`, value);
  }
  async builds(id) {
    const directory = await this.directory(`builds/${publicationId(id)}`);
    let names;
    try {
      names = await fs$4.readdir(directory);
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
    const values = [];
    for (const name of names.sort()) if (/^[a-f0-9]{32}$/.test(name)) values.push(await this.build(id, name));
    return values.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async build(id, release) {
    const file = await this.directory(`builds/${publicationId(id)}/${buildId(release)}/build.json`);
    const value = await optionalJson(file);
    if (!value || value.schema !== "math-workspace.publication-build/v1" || value.id !== release || value.profileId !== id) throw new Error("Publication build not found.");
    return value;
  }
  async artifact(id, release, name) {
    const build = await this.build(id, release);
    if (!["publication.pdf", "compiled.md", "manifest.json", "citation.json"].includes(name) && !build.publicArtifacts?.includes(name)) throw new Error("Unknown publication artifact.");
    const bytes = await fs$4.readFile(await this.directory(`builds/${publicationId(id)}/${buildId(release)}/${name}`));
    const expected = name === "publication.pdf" ? build.pdfSha256 : name === "compiled.md" ? build.markdownSha256 : name === "manifest.json" ? build.manifestSha256 : name === "checksums.sha256" ? build.checksumsSha256 : void 0;
    if (expected && sha256(bytes) !== expected) throw new Error("The immutable publication artifact changed.");
    if (!expected) {
      const manifest = JSON.parse((await this.artifact(id, release, "manifest.json")).toString("utf8"));
      if (sha256(bytes) !== manifest.artifacts[name]?.sha256) throw new Error("The immutable publication artifact changed.");
    }
    return bytes;
  }
  async repository(id, release) {
    const value = await optionalJson(await this.directory(`repositories/${publicationId(id)}/${buildId(release)}.json`));
    if (value && (value.schema !== "math-workspace.publication-repository/v1" || value.profileId !== id || value.buildId !== release)) throw new Error("Invalid repository publication state.");
    return value;
  }
  async writeRepository(value) {
    await atomicJson$1(this.root, `${this.relativeDirectory}/repositories/${publicationId(value.profileId)}/${buildId(value.buildId)}.json`, value);
  }
}
const fs$3 = require("node:fs/promises");
const configPath = ".math-workspace/config.json";
async function readPublicationMetadata(root) {
  let bytes;
  try {
    bytes = await fs$3.readFile(await safePath(root, configPath));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const config = bytes ? JSON.parse(bytes.toString("utf8")) : {};
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("Invalid project configuration.");
  return { config, record: { value: projectMetadata(config), revision: sha256(bytes || "") } };
}
function resolvePublicationMetadata(profile, config) {
  const value = mergeWorkMetadata(projectMetadata(config), normalizeWorkMetadata(profile));
  if (!value.title) throw new Error("Publication title is required in project metadata or this edition.");
  return { ...profile, ...value, authors: value.authors || [], language: value.language || (config.language === "en" ? "en-US" : "zh-CN"), license: value.license || "cc-by-4.0", doi: { ...value.doi, ...profile.doi } };
}
async function savePublicationMetadata(store, input, expectedRevision) {
  const value = normalizeWorkMetadata(input);
  return store.locked("project-metadata", async () => {
    const { config, record } = await readPublicationMetadata(store.root);
    if (record.revision !== expectedRevision) throw new Error("Project metadata changed. Reload it before saving.");
    await atomicJson$1(store.root, configPath, { ...config, metadata: value });
    return (await readPublicationMetadata(store.root)).record;
  }, "metadata");
}
function discoverPublicationMatter(profile, pages) {
  const chosen = pages.filter((page) => profile.chapters.includes(page.path) && page.kind !== "appendix");
  const anchors = chosen.length ? chosen : pages.filter((page) => profile.chapters.includes(page.path));
  const excluded = new Set(profile.matter?.exclude || []);
  const manual = profile.matter?.automatic ? [] : [...profile.frontMatter || [], ...profile.backMatter || []];
  const explicit = new Set(manual.map((entry) => entry.file).filter(Boolean));
  if (!profile.matter?.automatic && profile.continued?.file) explicit.add(profile.continued.file);
  const inScope = (page) => {
    if (!anchors.length || explicit.has(page.path) || excluded.has(page.path)) return false;
    const scope = profile.scope;
    if (scope && (scope.books?.length || scope.volumes?.length || scope.paths?.length)) {
      if (!(scope.books?.includes(page.book) || scope.volumes?.includes(page.volume) || scope.paths?.some((name) => page.path === name || page.path.startsWith(`${name}/`)))) return false;
    }
    return anchors.some((anchor) => page.book === anchor.book && (page.volume === void 0 || page.volume === anchor.volume));
  };
  const found = pages.filter(inScope);
  return {
    frontMatter: found.filter((page) => page.volume === void 0 && ["front-matter", "intro"].includes(page.kind)),
    backMatter: found.filter((page) => page.volume === void 0 && ["back-matter", "summary", "continued"].includes(page.kind)),
    volumeMatter: found.filter((page) => page.volume !== void 0 && ["front-matter", "intro", "back-matter", "summary", "continued"].includes(page.kind)),
    appendices: found.filter((page) => page.kind === "appendix"),
    continued: found.filter((page) => page.kind === "continued")
  };
}
function hasPublicationContinuedManuscript(profile, pages) {
  if (profile.matter?.automatic) return discoverPublicationMatter({ ...profile, matter: { ...profile.matter, exclude: [] } }, pages).continued.length > 0;
  const manuscripts = /* @__PURE__ */ new Set([...profile.chapters, ...(profile.backMatter || []).map((entry) => entry.file)]);
  return !profile.continued?.file && pages.some((page) => page.kind === "continued" && manuscripts.has(page.path));
}
function resolvePublicationMatter(profile, pages) {
  if (!profile.matter?.automatic) return profile;
  const found = discoverPublicationMatter(profile, pages);
  const entry = (page) => ({ file: page.path, includeInToc: true });
  const available = profile.matter.exclude?.length ? discoverPublicationMatter({ ...profile, matter: { ...profile.matter, exclude: [] } }, pages) : found;
  const included = (page) => page.kind !== "continued" || profile.continued?.enabled !== false;
  const assigned = new Set([...available.frontMatter, ...available.backMatter, ...available.volumeMatter].map((page) => page.path));
  const continued = { enabled: profile.continued?.enabled };
  return { ...profile, frontMatter: found.frontMatter.map(entry), backMatter: found.backMatter.filter(included).map(entry), chapters: [.../* @__PURE__ */ new Set([...profile.chapters.filter((file) => !assigned.has(file)), ...found.volumeMatter.filter(included).map((page) => page.path), ...found.appendices.map((page) => page.path)])], continued };
}
require("node:fs/promises");
const { spawn } = require("node:child_process");
const { homedir } = require("node:os");
const MAX_TEXT = 24e3;
const MAX_INPUT_FILES = 3e4;
const MAX_INPUT_BYTES = 512 * 1024 * 1024;
const RECORD_PREFIX = "MW_LEAN_REVIEW	";
const LEAN_NAME = /^[A-Za-z_][A-Za-z0-9_']*(?:\.[A-Za-z_][A-Za-z0-9_']*)*$/;
function reviewHash(value) {
  return crypto__namespace.createHash("sha256").update(value).digest("hex");
}
function formalReviewId(value) {
  const id = String(value || "").replace(/^[@#]/, "").trim().toLowerCase();
  if (!HASH_ID_RE.test(id)) throw new LeanReviewError(400, "A stable formal h-* ID is required.");
  return id;
}
class LeanReviewError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function reviewPathInside(root, candidate) {
  const relative = path__namespace.relative(root, candidate);
  return !path__namespace.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path__namespace.sep}`);
}
async function reviewSafePath(root, relative, optional = false) {
  if (typeof relative !== "string" || path__namespace.isAbsolute(relative) || relative.includes("\0")) {
    throw new LeanReviewError(400, "Review paths must be project-relative.");
  }
  const candidate = path__namespace.resolve(root, relative);
  if (!reviewPathInside(root, candidate)) throw new LeanReviewError(400, "Review path is outside the prepared project.");
  try {
    const resolved = await fs__namespace.realpath(candidate);
    if (!reviewPathInside(root, resolved)) throw new LeanReviewError(400, "Review path escapes the project through a symlink.");
    return resolved;
  } catch (error) {
    if (optional && error?.code === "ENOENT") return void 0;
    throw error;
  }
}
async function validateReviewWorkspace(root) {
  const canonical2 = await fs__namespace.realpath(root);
  const configPath2 = await reviewSafePath(canonical2, ".math-workspace/config.json");
  const config = JSON.parse(await fs__namespace.readFile(configPath2, "utf8"));
  for (const project of leanProjects(config)) {
    const projectRoot = await reviewSafePath(canonical2, project.root);
    if (!projectRoot) continue;
    for (const source of project.sourceRoots) await reviewSafePath(projectRoot, source);
  }
  return canonical2;
}
function bounded(value) {
  return value.length > MAX_TEXT ? { content: value.slice(0, MAX_TEXT), truncated: true } : { content: value };
}
function snippet(filePath, lines, start, end, role, context = false) {
  const startLine = Math.max(1, Math.min(lines.length, start));
  const endLine = Math.max(startLine, Math.min(lines.length, end));
  const source = lines.slice(startLine - 1, endLine).join("\n");
  return {
    filePath,
    startLine,
    endLine,
    ...bounded(source),
    fingerprint: reviewHash(source),
    role,
    ...context ? { rangeKind: "context" } : { rangeKind: "source" }
  };
}
function matchingSnippet(snapshot, label, text2, role) {
  const source = snapshot.documents.get(label.filePath);
  if (source === void 0 || !text2) return void 0;
  const lines = source.split(/\r?\n/);
  const contentLines = text2.split(/\r?\n/);
  const from = Math.max(0, label.startLine || 0);
  for (let index = from; index < lines.length; index++) {
    if (lines.slice(index, index + contentLines.length).join("\n") === contentLines.join("\n")) {
      return snippet(label.filePath, lines, index + 1, index + contentLines.length, role);
    }
  }
  return void 0;
}
async function readReviewSourceLines(root, filePath, inputs) {
  const read = async () => (await fs__namespace.readFile(await reviewSafePath(root, filePath), "utf8")).split(/\r?\n/);
  if (!inputs) return read();
  if (!inputs.has(filePath)) inputs.set(filePath, read());
  return inputs.get(filePath);
}
function declarationReviewKey(projectKey, qualifiedName) {
  return `${projectKey}:${qualifiedName}`;
}
async function declarationSource(root, declaration, inputs) {
  const lines = await readReviewSourceLines(root, declaration.filePath, inputs);
  const start = Math.max(1, declaration.line);
  let end = lines.length;
  for (let index = start; index < lines.length; index++) {
    if (/^\s*(?:\/--|(?:private |protected |noncomputable |unsafe |opaque |partial )*(?:def|abbrev|theorem|lemma|structure|class|inductive|instance|axiom)\s|namespace\s|section\b|end\b)/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return snippet(declaration.filePath, lines, start, end, "declaration", true);
}
async function manifestDependencies(root, projectRoot) {
  const manifestPath = await reviewSafePath(root, toPosix(path__namespace.relative(root, path__namespace.join(projectRoot, "lake-manifest.json"))), true);
  if (!manifestPath) return [];
  const manifest = JSON.parse(await fs__namespace.readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.packages)) throw new Error("Lake manifest package entries are unavailable.");
  const packagesDir = typeof manifest.packagesDir === "string" ? manifest.packagesDir : ".lake/packages";
  const dependencies = [];
  for (const entry of manifest.packages) {
    let dependency;
    if (entry.type === "path" && typeof entry.dir === "string") dependency = path__namespace.resolve(projectRoot, entry.dir);
    else if (entry.type === "git" && typeof entry.name === "string" && /^[A-Za-z0-9_.-]+$/.test(entry.name)) {
      dependency = path__namespace.resolve(projectRoot, packagesDir, entry.name, typeof entry.subDir === "string" ? entry.subDir : ".");
    } else throw new Error("Unsupported Lake manifest dependency format; initialize dependencies deliberately outside the Reader.");
    if (!reviewPathInside(root, dependency)) throw new Error("A Lake dependency is outside the prepared Math Workspace; its input boundary cannot be tracked.");
    const resolved = await reviewSafePath(root, toPosix(path__namespace.relative(root, dependency)), true);
    if (!resolved) throw new Error(`Lake dependency is not installed locally: ${toPosix(path__namespace.relative(root, dependency))}.`);
    dependencies.push({ directory: resolved, ...entry.type === "git" ? { gitRevision: entry.rev } : {} });
  }
  return dependencies;
}
async function inputFingerprint(root, project) {
  const projectRoot = await reviewSafePath(root, project.root);
  const files = /* @__PURE__ */ new Map();
  const visited = /* @__PURE__ */ new Set();
  let diagnostic;
  let bytes = 0;
  const visit = async (directory, packages = false) => {
    if (visited.has(directory)) return;
    visited.add(directory);
    const entries = await fs__namespace.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if ([".git", "node_modules", ".math-workspace"].includes(entry.name)) continue;
      const candidate = path__namespace.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new LeanReviewError(400, `Lean input symlink is not supported for review evidence: ${toPosix(path__namespace.relative(root, candidate))}`);
      }
      if (entry.isDirectory()) {
        if (entry.name !== ".lake") await visit(candidate, packages);
      } else if (entry.isFile() && (entry.name.endsWith(".lean") || ["lakefile.toml", "lake-manifest.json", "lean-toolchain"].includes(entry.name))) {
        const text2 = await fs__namespace.readFile(candidate, "utf8");
        bytes += text2.length;
        if (files.size >= MAX_INPUT_FILES || bytes > MAX_INPUT_BYTES) throw new LeanReviewError(413, "Lean project inputs exceed the bounded review evidence limit.");
        files.set(toPosix(path__namespace.relative(root, candidate)), reviewHash(text2));
      }
    }
  };
  await visit(projectRoot);
  try {
    for (const dependency of await manifestDependencies(root, projectRoot)) await visit(dependency.directory, true);
    const manifestFile = await reviewSafePath(root, toPosix(path__namespace.relative(root, path__namespace.join(projectRoot, "lake-manifest.json"))), true);
    const manifest = manifestFile ? JSON.parse(await fs__namespace.readFile(manifestFile, "utf8")) : {};
    const lakeDir = typeof manifest.lakeDir === "string" ? manifest.lakeDir : ".lake";
    const override = await reviewSafePath(root, toPosix(path__namespace.relative(root, path__namespace.resolve(projectRoot, lakeDir, "package-overrides.json"))), true);
    if (override) {
      files.set(toPosix(path__namespace.relative(root, override)), reviewHash(await fs__namespace.readFile(override, "utf8")));
      diagnostic = "Lake package overrides require deliberate external resolution; override dependencies are not admitted by the Reader.";
    }
  } catch (error) {
    diagnostic = error.message || String(error);
  }
  const toolchainFile = await reviewSafePath(projectRoot, "lean-toolchain", true);
  const toolchain = toolchainFile ? (await fs__namespace.readFile(toolchainFile, "utf8")).trim() : "";
  const toolchainRoot = installedToolchainRoot(toolchain);
  let binaryIdentity = "unavailable";
  if (toolchainRoot) {
    try {
      const stat = await fs__namespace.stat(path__namespace.join(toolchainRoot, "bin", "lean"));
      binaryIdentity = { path: toolchainRoot, size: stat.size, mtimeMs: stat.mtimeMs };
    } catch (_error) {
    }
  }
  return { toolchain, diagnostic, fingerprint: reviewHash(JSON.stringify({
    project,
    binaryIdentity,
    diagnostic,
    inputs: [...files.entries()].sort(([left], [right]) => left.localeCompare(right))
  })) };
}
function installedToolchainRoot(toolchain) {
  if (!/^[A-Za-z0-9_.:/-]+$/.test(toolchain) || toolchain.includes("..")) return void 0;
  const directory = toolchain.replace(/\//g, "--").replace(/:/g, "---");
  return path__namespace.join(process.env.ELAN_HOME || path__namespace.join(homedir(), ".elan"), "toolchains", directory);
}
async function readReviewContext(rootInput, idInput, reusableSnapshot, projectInputs = /* @__PURE__ */ new Map(), validated = false, sourceInputs) {
  const root = validated ? rootInput : await validateReviewWorkspace(rootInput);
  const id = formalReviewId(idInput);
  const snapshot = reusableSnapshot || await loadWorkspaceSnapshot(root);
  const labels = snapshot.state.labels || {};
  const label = labels[id];
  if (!label) throw new LeanReviewError(404, "Formal object not found in the prepared project.");
  await reviewSafePath(root, label.filePath);
  const lines = snapshot.documents.get(label.filePath)?.split(/\r?\n/) || [];
  const statement = snippet(label.filePath, lines, (label.startLine || 0) + 1, (label.endLine ?? label.startLine ?? 0) + 1, "statement");
  const proofs = [];
  const localProof = matchingSnippet(snapshot, label, label.proofContent || "", "proof");
  if (localProof) proofs.push(localProof);
  for (const range of label.supportRanges || []) proofs.push(snippet(label.filePath, lines, range.startLine + 1, range.endLine + 1, "support"));
  for (const solution of label.solutions || []) {
    const linked = labels[solution];
    if (!linked) continue;
    await reviewSafePath(root, linked.filePath);
    const proof = matchingSnippet(snapshot, linked, linked.proofContent || linked.content || "", "proof");
    if (proof) proofs.push(proof);
  }
  if (label.solutionOf && labels[label.solutionOf]) {
    const question = labels[label.solutionOf];
    await reviewSafePath(root, question.filePath);
    const questionLines = snapshot.documents.get(question.filePath)?.split(/\r?\n/) || [];
    proofs.push(snippet(question.filePath, questionLines, (question.startLine || 0) + 1, (question.endLine ?? question.startLine ?? 0) + 1, "question"));
  }
  const contexts = [];
  const start = label.startLine || 0;
  let heading = start - 1;
  while (heading >= 0 && !/^\s{0,3}#{1,6}\s/.test(lines[heading])) heading--;
  if (start > 0) contexts.push(snippet(label.filePath, lines, Math.max(heading + 1, start - 80, 1), start, "context"));
  const visitedReferences = /* @__PURE__ */ new Set([id]);
  const referenceQueue = [statement.content, ...proofs.map((item) => item.content), ...contexts.map((item) => item.content)];
  let contextOverflow = [statement, ...proofs, ...contexts].some((item) => item.truncated);
  while (referenceQueue.length) {
    const text2 = referenceQueue.shift();
    for (const reference of text2.match(/@h-[0-9a-f]{16,32}\b/gi) || []) {
      const targetId = reference.slice(1).toLowerCase();
      if (visitedReferences.has(targetId)) continue;
      visitedReferences.add(targetId);
      if (visitedReferences.size > 25) {
        contextOverflow = true;
        continue;
      }
      const target = labels[targetId];
      if (!target) {
        contextOverflow = true;
        continue;
      }
      await reviewSafePath(root, target.filePath);
      const targetLines = snapshot.documents.get(target.filePath)?.split(/\r?\n/) || [];
      const targetStart = target.startLine || 0;
      let targetEnd = target.endLine ?? targetStart;
      if (/^\s{0,3}#{1,6}\s/.test(targetLines[targetStart] || "")) {
        const depth = targetLines[targetStart].match(/^\s{0,3}(#{1,6})\s/)[1].length;
        targetEnd = targetLines.length - 1;
        for (let lineIndex = targetStart + 1; lineIndex < targetLines.length; lineIndex++) {
          const boundary = targetLines[lineIndex].match(/^\s{0,3}(#{1,6})\s/);
          if (boundary && boundary[1].length <= depth) {
            targetEnd = lineIndex - 1;
            break;
          }
        }
      }
      const source = snippet(target.filePath, targetLines, targetStart + 1, targetEnd + 1, "context");
      contexts.push(source);
      referenceQueue.push(source.content);
      if (source.truncated) contextOverflow = true;
    }
  }
  const anchors = snapshot.state.leanIndex?.anchors?.[id]?.declarations || [];
  const declarations = [];
  for (const anchor of anchors) declarations.push({
    key: declarationReviewKey(anchor.projectKey, anchor.qualifiedName || anchor.name),
    projectKey: anchor.projectKey,
    name: anchor.name,
    qualifiedName: anchor.qualifiedName || anchor.name,
    kind: anchor.kind,
    source: await declarationSource(root, anchor, sourceInputs),
    typeDependencies: [],
    proofDependencies: [],
    axioms: [],
    evidenceState: "unavailable",
    diagnostic: "Elaborated evidence has not been refreshed for this declaration."
  });
  const keys = new Set(anchors.map((anchor) => anchor.projectKey));
  const projectConfigs = leanProjects(snapshot.state.config).filter((project) => keys.has(project.key));
  const projects = [];
  for (const project of projectConfigs) {
    if (!projectInputs.has(project.key)) projectInputs.set(project.key, inputFingerprint(root, project));
    const input = await projectInputs.get(project.key);
    projects.push({
      projectKey: project.key,
      inputFingerprint: input.fingerprint,
      toolchain: input.toolchain,
      target: project.target,
      module: project.module,
      diagnostic: input.diagnostic,
      freshnessPolicy: "project-inputs",
      build: { state: "unverified" }
    });
  }
  const displayNumber2 = formatDisplayNumber(label);
  const evidence = {
    fingerprint: "",
    statement,
    proofs: [...new Map(proofs.map((proof) => [`${proof.filePath}:${proof.startLine}:${proof.endLine}`, proof])).values()],
    contexts,
    contextPolicy: contextOverflow ? "workspace-markdown" : "explicit-references",
    ...contextOverflow ? { contextInputFingerprint: reviewHash(JSON.stringify([...snapshot.documents.entries()].map(([file, content]) => [file, reviewHash(content)]))) } : {},
    declarations,
    definitions: [],
    projects,
    state: "unavailable",
    diagnostics: contextOverflow ? ["Explicit reference context exceeds the bounded snapshot; review freshness conservatively tracks all workspace Markdown inputs."] : []
  };
  evidence.fingerprint = evidenceFingerprint(evidence);
  const displayName = typeName(snapshot.state.config, label.type);
  return { root, id, snapshot, projectConfigs, formal: {
    id,
    type: label.type,
    title: label.title,
    display: displayNumber2 ? `${displayName} ${displayNumber2}` : displayName,
    filePath: label.filePath,
    line: statement.startLine
  }, evidence };
}
function evidenceFingerprint(evidence) {
  const snippets = (items) => items.map((item) => [item.filePath, item.startLine, item.endLine, item.fingerprint]);
  const declarations = (items) => items.map((item) => ({
    key: item.key,
    source: item.source?.fingerprint,
    type: item.elaboratedType,
    value: item.value,
    axioms: item.axioms,
    typeDependencies: item.typeDependencies,
    proofDependencies: item.proofDependencies,
    compiledSource: item.compiledSource,
    state: item.evidenceState,
    truncated: item.truncated
  }));
  return reviewHash(JSON.stringify({
    statement: snippets([evidence.statement]),
    proofs: snippets(evidence.proofs),
    contexts: snippets(evidence.contexts),
    contextInputFingerprint: evidence.contextInputFingerprint,
    contextPolicy: evidence.contextPolicy,
    declarations: declarations(evidence.declarations),
    definitions: declarations(evidence.definitions),
    projects: evidence.projects.map((item) => [item.projectKey, item.inputFingerprint, item.build.state, item.build.inputFingerprint]),
    state: evidence.state
  }));
}
async function runBounded(command, args, cwd, control) {
  if (control.cancelled()) throw new Error("Review evidence refresh cancelled.");
  return new Promise((resolve, reject) => {
    const toolchainRoot = ["lake", "lean"].includes(path__namespace.basename(command)) ? path__namespace.dirname(path__namespace.dirname(command)) : void 0;
    const child = spawn(command, args, { cwd, env: {
      ...process.env,
      ELAN_TOOLCHAIN: void 0,
      LEAN: toolchainRoot ? path__namespace.join(toolchainRoot, "bin", "lean") : void 0,
      LAKE: toolchainRoot ? path__namespace.join(toolchainRoot, "bin", "lake") : void 0,
      PATH: toolchainRoot ? `${path__namespace.join(toolchainRoot, "bin")}${process.platform === "win32" ? ";" : ":"}${process.env.PATH || ""}` : process.env.PATH,
      LAKE_HOME: void 0,
      LEAN_PATH: void 0,
      LEAN_SRC_PATH: void 0,
      LEAN_SYSROOT: toolchainRoot,
      LEAN_GITHASH: void 0,
      LAKE_NO_CACHE: "true",
      LAKE_ARTIFACT_CACHE: "false",
      LAKE_RESTORE_ARTIFACTS: "false"
    }, stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32" });
    control.onProcess(child);
    let output = "";
    let bytes = 0;
    let failure = "";
    const kill = () => {
      try {
        if (process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch (_error) {
        child.kill("SIGKILL");
      }
    };
    const timer = setTimeout(() => {
      failure = "Lean evidence command exceeded its 120-second limit.";
      kill();
    }, 12e4);
    const receive = (chunk) => {
      const text2 = String(chunk);
      bytes += Buffer.byteLength(text2);
      if (bytes > 8 * 1024 * 1024) {
        failure = "Lean evidence command output exceeded 8 MiB.";
        kill();
        return;
      }
      output += text2;
    };
    child.stdout.on("data", receive);
    child.stderr.on("data", receive);
    child.once("error", (error) => {
      clearTimeout(timer);
      control.onProcess(void 0);
      reject(error);
    });
    child.once("close", (exitCode) => {
      clearTimeout(timer);
      control.onProcess(void 0);
      if (failure) reject(new Error(failure));
      else if (control.cancelled()) reject(new Error("Review evidence refresh cancelled."));
      else resolve({ exitCode, output });
    });
  });
}
function generatedReviewProbe(module2, names) {
  if (!LEAN_NAME.test(module2) || names.some((name) => !LEAN_NAME.test(name))) throw new LeanReviewError(400, "Unsupported Lean module or declaration identifier.");
  return `import Lean
import ${module2}

open Lean Elab Command Meta
set_option pp.explicit true
set_option pp.universes true
set_option pp.fullNames true
set_option format.width 120

def mw_review_names : Array Name := #[${names.map((name) => `\`${name}`).join(", ")}]
def mw_review_strings (names : Array Name) : Json := toJson (names.toList.map Name.toString)

elab "mw_review_emit" : command => do
  let env ← getEnv
  let mut requested := mw_review_names
  for name in mw_review_names do
    if let some info := env.find? name then
      for dependency in info.type.getUsedConstants do
        if !requested.contains dependency && requested.size < 80 then
          requested := requested.push dependency
  for name in requested do
    match env.find? name with
    | none => logWarning m!"Unresolved review declaration: {name}"
    | some info =>
      let typeText ← liftTermElabM do return (← ppExpr info.type).pretty
      let valueText ← liftTermElabM do
        match info with
        | .defnInfo _ | .opaqueInfo _ =>
          match info.value? true with
          | some value => return (← ppExpr value).pretty
          | none => return ""
        | _ => return ""
      let typeDeps := info.type.getUsedConstants
      let proofDeps := match info.value? true with
        | some value => value.getUsedConstants
        | none => #[]
      let axioms ← collectAxioms name
      let moduleName ← findModuleOf? name
      let sourcePath ← liftIO do
        match moduleName with
        | none => pure ""
        | some mod =>
          try pure (← findLean (← getSrcSearchPath) mod).toString
          catch _ => pure ""
      let oleanPath ← liftIO do
        match moduleName with
        | none => pure ""
        | some mod =>
          try pure (← findOLean mod).toString
          catch _ => pure ""
      let ranges ← findDeclarationRanges? name
      let startLine := ranges.map (·.range.pos.line) |>.getD 0
      let endLine := ranges.map (·.range.endPos.line) |>.getD 0
      let kind := match info with
        | .axiomInfo _ => "axiom"
        | .thmInfo _ => "theorem"
        | .defnInfo _ => "def"
        | .opaqueInfo _ => "opaque"
        | .inductInfo _ => "inductive"
        | .ctorInfo _ => "constructor"
        | .recInfo _ => "recursor"
        | .quotInfo _ => "quotient"
      let result := Json.mkObj [
        ("name", toJson name.toString), ("type", toJson typeText), ("value", toJson valueText),
        ("kind", toJson kind), ("module", toJson (moduleName.map Name.toString |>.getD "")),
        ("sourcePath", toJson sourcePath), ("oleanPath", toJson oleanPath),
        ("startLine", toJson startLine), ("endLine", toJson endLine),
        ("typeDependencies", mw_review_strings typeDeps), ("proofDependencies", mw_review_strings proofDeps),
        ("axioms", mw_review_strings axioms)]
      logInfo m!"${RECORD_PREFIX}{result.compress}"

mw_review_emit
`;
}
async function refreshReviewEvidence(context, control, expansion) {
  const evidence = JSON.parse(JSON.stringify(context.evidence));
  evidence.generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const compiledFingerprints = /* @__PURE__ */ new Map();
  for (const project of context.projectConfigs) {
    if (expansion && expansion.projectKey !== project.key) continue;
    const current = evidence.projects.find((item) => item.projectKey === project.key);
    const module2 = project.module || project.target || "";
    if (!LEAN_NAME.test(module2)) {
      current.diagnostic = "A valid configured Lean module or target is required to inspect the environment.";
      continue;
    }
    const toolchainRoot = installedToolchainRoot(current.toolchain);
    const lake = toolchainRoot && path__namespace.join(toolchainRoot, "bin", "lake");
    const lean = toolchainRoot && path__namespace.join(toolchainRoot, "bin", "lean");
    try {
      if (!lake || !lean) throw new Error("The configured Lean toolchain is unavailable. Install it deliberately outside the Reader.");
      await fs__namespace.access(lake);
      await fs__namespace.access(lean);
      const cwd = await reviewSafePath(context.root, project.root);
      if (current.diagnostic) throw new Error(current.diagnostic);
      const manifest = await reviewSafePath(context.root, toPosix(path__namespace.relative(context.root, path__namespace.join(cwd, "lake-manifest.json"))), true);
      if (!manifest) throw new Error("Lake manifest is missing. Initialize dependencies deliberately outside the Reader before refreshing evidence.");
      const dependencies = await manifestDependencies(context.root, cwd);
      for (const dependency of dependencies) if (dependency.gitRevision) {
        const revision = await runBounded("git", ["-C", dependency.directory, "rev-parse", "HEAD"], cwd, control);
        if (revision.exitCode !== 0 || revision.output.trim() !== dependency.gitRevision) {
          throw new Error("A local Lake dependency is not at its locked Git revision. Resolve it deliberately outside the Reader; no fetch or checkout was attempted.");
        }
      }
      control.phase(`Building ${project.key} with installed toolchain (offline)`);
      const startedAt = (/* @__PURE__ */ new Date()).toISOString();
      const args = ["--offline", "--no-cache", "--rehash", "build", ...project.target ? [project.target] : [module2]];
      if (project.target?.startsWith("-")) throw new Error("A Lean build target cannot be an option.");
      const result = await runBounded(lake, args, cwd, control);
      current.build = {
        state: result.exitCode === 0 ? "passed" : "failed",
        command: [lake, ...args],
        startedAt,
        finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
        exitCode: result.exitCode,
        output: result.output.slice(-12e3),
        inputFingerprint: current.inputFingerprint
      };
      if (result.exitCode !== 0) throw new Error(`Local Lean build failed. ${result.output.trim().slice(-2e3)}`);
      control.phase(`Reading elaborated types and recursive axioms for ${project.key}`);
      const names = evidence.declarations.filter((item) => item.projectKey === project.key).map((item) => item.qualifiedName);
      if (expansion) names.push(expansion.name);
      const probePath = path__namespace.join(context.root, ".math-workspace", `lean-review-probe-${crypto__namespace.randomBytes(8).toString("hex")}.lean`);
      try {
        await fs__namespace.writeFile(probePath, generatedReviewProbe(module2, [...new Set(names)]), "utf8");
        const probe = await runBounded(lake, ["--offline", "--no-cache", "env", lean, probePath], cwd, control);
        if (probe.exitCode !== 0) throw new Error(`Lean evidence probe failed. ${probe.output.trim().slice(-3e3)}`);
        const seen = /* @__PURE__ */ new Set();
        for (const line of probe.output.split(/\r?\n/)) {
          const index = line.indexOf(RECORD_PREFIX);
          if (index < 0) continue;
          const row = JSON.parse(line.slice(index + RECORD_PREFIX.length));
          if (!LEAN_NAME.test(row.name) || typeof row.type !== "string" || !Array.isArray(row.axioms)) continue;
          const key = declarationReviewKey(project.key, row.name);
          if (seen.has(key)) continue;
          seen.add(key);
          const anchor = evidence.declarations.find((item) => item.key === key);
          let source = anchor?.source;
          let actualFile;
          if (typeof row.sourcePath === "string" && row.sourcePath) {
            const candidate = path__namespace.resolve(cwd, row.sourcePath);
            const tracked = [cwd, ...dependencies.map((item) => item.directory)].some((directory) => reviewPathInside(directory, candidate));
            if (tracked && reviewPathInside(context.root, candidate)) {
              const sourceFile = await reviewSafePath(context.root, toPosix(path__namespace.relative(context.root, candidate)), true);
              if (sourceFile) {
                actualFile = toPosix(path__namespace.relative(context.root, sourceFile));
                if (row.startLine > 0 && row.endLine >= row.startLine) {
                  source = snippet(actualFile, (await fs__namespace.readFile(sourceFile, "utf8")).split(/\r?\n/), row.startLine, row.endLine, "declaration");
                }
              }
            }
          }
          if (anchor && (!actualFile || actualFile !== anchor.source?.filePath)) {
            anchor.diagnostic = `The environment defines ${row.name} in ${row.module || "an unknown module"}, which cannot be verified as the anchored source ${anchor.source?.filePath || ""}.`;
            continue;
          }
          const definition = {
            key,
            projectKey: project.key,
            name: row.name.split(".").pop(),
            qualifiedName: row.name,
            kind: row.kind,
            source,
            module: row.module,
            elaboratedType: bounded(row.type).content,
            ...row.value ? { value: bounded(row.value).content } : {},
            typeDependencies: row.typeDependencies || [],
            proofDependencies: row.proofDependencies || [],
            axioms: row.axioms,
            evidenceState: "available",
            ...row.type.length > MAX_TEXT || row.value?.length > MAX_TEXT ? { truncated: true } : {}
          };
          if (!source) definition.diagnostic = "The elaborated type is available; definition source/fields could not be read inside the tracked project boundary.";
          if (typeof row.oleanPath === "string" && row.oleanPath) {
            const compiled = path__namespace.resolve(cwd, row.oleanPath);
            if (reviewPathInside(context.root, compiled)) {
              const compiledFile = await reviewSafePath(context.root, toPosix(path__namespace.relative(context.root, compiled)), true);
              if (compiledFile) {
                if (!compiledFingerprints.has(compiledFile)) compiledFingerprints.set(compiledFile, fs__namespace.readFile(compiledFile).then(reviewHash));
                definition.compiledSource = {
                  filePath: toPosix(path__namespace.relative(context.root, compiledFile)),
                  fingerprint: await compiledFingerprints.get(compiledFile)
                };
              }
            }
          }
          if (anchor) Object.assign(anchor, definition, { diagnostic: void 0 });
          else evidence.definitions.push(definition);
        }
        const missing = names.filter((name) => !seen.has(declarationReviewKey(project.key, name)));
        if (missing.length) throw new Error(`Lean did not return evidence for ${missing.join(", ")}.`);
      } finally {
        await fs__namespace.rm(probePath, { force: true });
      }
      const after = await inputFingerprint(context.root, project);
      if (after.fingerprint !== current.inputFingerprint) throw new Error("Lean inputs changed during refresh; refresh again before relying on this evidence.");
    } catch (error) {
      if (control.cancelled()) throw error;
      current.diagnostic = error.message || String(error);
      evidence.diagnostics.push(`${project.key}: ${current.diagnostic}`);
      for (const declaration of evidence.declarations.filter((item) => item.projectKey === project.key)) {
        declaration.evidenceState = "unavailable";
        declaration.diagnostic = current.diagnostic;
      }
    }
  }
  const available = evidence.declarations.filter((item) => item.evidenceState === "available").length;
  evidence.state = available === evidence.declarations.length && available > 0 ? "current" : available > 0 ? "partial" : "unavailable";
  if (!evidence.declarations.length) evidence.diagnostics.push("This formal object has no anchored Lean declarations.");
  evidence.fingerprint = evidenceFingerprint(evidence);
  return evidence;
}
const fileSystem$1 = require("node:fs/promises");
const VERDICTS = ["aligned", "partial", "difference", "undecided"];
const MAX_SNAPSHOT_BYTES = 4 * 1024 * 1024;
async function metadataDirectory(root, name, create = false) {
  const parent = await reviewSafePath(root, ".math-workspace");
  const directory = path__namespace.join(parent, name);
  if (create) await fs__namespace.mkdir(directory, { recursive: true });
  const resolved = await reviewSafePath(root, path__namespace.relative(root, directory), true);
  if (resolved && !reviewPathInside(parent, resolved)) throw new LeanReviewError(400, "Lean review metadata cannot escape .math-workspace.");
  return resolved;
}
async function readJson(root, directoryName, id) {
  const directory = await metadataDirectory(root, directoryName);
  if (!directory) return void 0;
  const file = await reviewSafePath(root, path__namespace.relative(root, path__namespace.join(directory, `${formalReviewId(id)}.json`)), true);
  if (!file) return void 0;
  const stat = await fs__namespace.stat(file);
  if (stat.size > MAX_SNAPSHOT_BYTES) throw new LeanReviewError(413, "Lean review metadata exceeds its bounded size.");
  try {
    return JSON.parse(await fs__namespace.readFile(file, "utf8"));
  } catch (_error) {
    throw new LeanReviewError(409, "Lean review metadata is unreadable; preserve it and repair it before saving.");
  }
}
async function atomicJson(directory, id, value) {
  const content = JSON.stringify(value, null, 2) + "\n";
  if (Buffer.byteLength(content) > MAX_SNAPSHOT_BYTES) throw new LeanReviewError(413, "This review snapshot exceeds 4 MiB.");
  const temporary2 = path__namespace.join(directory, `.${id}-${crypto__namespace.randomBytes(8).toString("hex")}.tmp`);
  try {
    const file = await fileSystem$1.open(temporary2, "wx", 384);
    try {
      await file.writeFile(content, "utf8");
      await file.sync();
    } finally {
      await file.close();
    }
    await fileSystem$1.rename(temporary2, path__namespace.join(directory, `${id}.json`));
  } finally {
    await fs__namespace.rm(temporary2, { force: true });
  }
}
async function readReviewRecord(root, id) {
  const value = await readJson(root, "lean-reviews", id);
  if (value === void 0) return void 0;
  if (value.schemaVersion !== 1 || value.formalId !== formalReviewId(id) || !Number.isInteger(value.revision) || value.revision < 1 || !reviewEvidenceShape(value.snapshot) || !decisionShape(value) || value.evidenceFingerprint !== value.snapshot.fingerprint || value.history !== void 0 && (!Array.isArray(value.history) || value.history.length > 50 || value.history.length === 0 || value.history.some((item, index) => !decisionShape(item) || item.revision > value.revision || index > 0 && item.revision <= value.history[index - 1].revision) || JSON.stringify(decision(value.history[value.history.length - 1])) !== JSON.stringify(decision(value))) || value.historyDropped !== void 0 && (!Number.isSafeInteger(value.historyDropped) || value.historyDropped < 0)) {
    throw new LeanReviewError(409, "Lean review record has an unsupported format; it was preserved.");
  }
  return value;
}
function decisionShape(value) {
  const claims = value?.subclaims;
  return !!value && Number.isSafeInteger(value.revision) && value.revision > 0 && VERDICTS.includes(value.verdict) && typeof value.scope === "string" && !!value.scope.trim() && value.scope.length <= 8e3 && typeof value.note === "string" && value.note.length <= 16e3 && typeof value.reviewer === "string" && value.reviewer.length <= 300 && typeof value.reviewedAt === "string" && Number.isFinite(Date.parse(value.reviewedAt)) && /^[0-9a-f]{64}$/.test(value.evidenceFingerprint) && Array.isArray(claims) && claims.length <= 80 && new Set(claims.map((claim) => claim?.id)).size === claims.length && claims.every((claim) => !!claim && typeof claim.id === "string" && !!claim.id.trim() && claim.id.length <= 100 && typeof claim.text === "string" && !!claim.text.trim() && claim.text.length <= 8e3 && typeof claim.note === "string" && claim.note.length <= 8e3 && VERDICTS.includes(claim.verdict) && Array.isArray(claim.declarationKeys) && claim.declarationKeys.length <= 100 && claim.declarationKeys.every((key) => typeof key === "string" && key.length <= 500));
}
function decision(record) {
  return {
    revision: record.revision,
    verdict: record.verdict,
    scope: record.scope,
    note: record.note,
    reviewer: record.reviewer,
    reviewedAt: record.reviewedAt,
    subclaims: record.subclaims,
    evidenceFingerprint: record.evidenceFingerprint
  };
}
function appendDecision(record, previous) {
  const history = [...previous?.history || (previous ? [decision(previous)] : []), decision(record)];
  let dropped = previous?.historyDropped || 0;
  while (history.length > 1 && (history.length > 50 || Buffer.byteLength(JSON.stringify(history)) > 1572864)) {
    history.shift();
    dropped++;
  }
  record.history = history;
  record.historyDropped = dropped;
}
function reviewEvidenceShape(value) {
  return !!value && typeof value.fingerprint === "string" && !!value.statement && typeof value.statement.content === "string" && Array.isArray(value.proofs) && Array.isArray(value.contexts) && Array.isArray(value.projects) && Array.isArray(value.declarations) && Array.isArray(value.definitions) && Array.isArray(value.diagnostics);
}
async function readReviewEvidenceCache(root, id) {
  const value = await readJson(root, "lean-review-evidence", id);
  if (value === void 0) return void 0;
  if (value.schemaVersion !== 1 || value.formalId !== formalReviewId(id) || !reviewEvidenceShape(value.evidence)) {
    throw new LeanReviewError(409, "Lean evidence cache has an unsupported format; refresh it deliberately.");
  }
  return value.evidence;
}
async function writeReviewEvidenceCache(root, id, evidence) {
  const directory = await metadataDirectory(root, "lean-review-evidence", true);
  await atomicJson(directory, formalReviewId(id), { schemaVersion: 1, formalId: formalReviewId(id), evidence });
}
function text(value, label, maximum, required = false) {
  if (typeof value !== "string" || value.length > maximum || required && !value.trim()) {
    throw new LeanReviewError(400, `${label} must be ${required ? "non-empty " : ""}text of at most ${maximum} characters.`);
  }
  return value;
}
function reviewSaveInput(value) {
  const id = formalReviewId(value?.id);
  if (!Number.isInteger(value?.expectedRevision) || value.expectedRevision < 0) throw new LeanReviewError(400, "An expected review revision is required.");
  if (typeof value?.evidenceFingerprint !== "string" || !/^[0-9a-f]{64}$/.test(value.evidenceFingerprint)) throw new LeanReviewError(400, "The displayed evidence fingerprint is required.");
  if (!VERDICTS.includes(value?.verdict)) throw new LeanReviewError(400, "Choose a valid human verdict.");
  if (!Array.isArray(value?.subclaims) || value.subclaims.length > 80) throw new LeanReviewError(400, "Provide at most 80 human-defined subclaims.");
  const ids = /* @__PURE__ */ new Set();
  const subclaims = value.subclaims.map((claim) => {
    const claimId = text(claim?.id, "Subclaim ID", 100, true);
    if (ids.has(claimId)) throw new LeanReviewError(400, "Subclaim IDs must be unique within an object.");
    ids.add(claimId);
    if (!VERDICTS.includes(claim?.verdict) || !Array.isArray(claim?.declarationKeys) || claim.declarationKeys.length > 100 || claim.declarationKeys.some((key) => typeof key !== "string" || key.length > 500)) throw new LeanReviewError(400, "A subclaim needs a verdict and bounded declaration mappings.");
    return {
      id: claimId,
      text: text(claim.text, "Subclaim text", 8e3, true),
      declarationKeys: [...new Set(claim.declarationKeys)],
      verdict: claim.verdict,
      note: text(claim.note ?? "", "Subclaim note", 8e3)
    };
  });
  return {
    id,
    expectedRevision: value.expectedRevision,
    evidenceFingerprint: value.evidenceFingerprint,
    verdict: value.verdict,
    scope: text(value.scope, "Review scope", 8e3, true),
    note: text(value.note ?? "", "Review note", 16e3),
    reviewer: text(value.reviewer ?? "", "Reviewer", 300),
    subclaims
  };
}
async function saveReviewRecord(root, input, freshEvidence) {
  const directory = await metadataDirectory(root, "lean-reviews", true);
  const lockPath = path__namespace.join(directory, `${input.id}.lock`);
  let lock;
  try {
    lock = await fileSystem$1.open(lockPath, "wx", 384);
  } catch (error) {
    if (error?.code === "EEXIST") throw new LeanReviewError(409, "Another save owns this object. Reload before retrying; a crashed save may leave a local .lock file.");
    throw error;
  }
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, createdAt: (/* @__PURE__ */ new Date()).toISOString() }));
    const previous = await readReviewRecord(root, input.id);
    if ((previous?.revision || 0) !== input.expectedRevision) throw new LeanReviewError(409, "The review changed in another window. Reload it before saving.");
    const evidence = await freshEvidence();
    if (evidence.fingerprint !== input.evidenceFingerprint) throw new LeanReviewError(409, "The displayed evidence changed. Reload and review the current source before saving.");
    const declarations = new Set(evidence.declarations.map((declaration) => declaration.key));
    for (const claim of input.subclaims) for (const key of claim.declarationKeys) {
      if (!declarations.has(key)) throw new LeanReviewError(400, "Subclaim mapping references a declaration outside this formal object.");
    }
    const record = {
      schemaVersion: 1,
      formalId: input.id,
      revision: (previous?.revision || 0) + 1,
      verdict: input.verdict,
      scope: input.scope,
      note: input.note,
      reviewer: input.reviewer,
      reviewedAt: (/* @__PURE__ */ new Date()).toISOString(),
      subclaims: input.subclaims,
      evidenceFingerprint: evidence.fingerprint,
      snapshot: evidence
    };
    appendDecision(record, previous);
    await atomicJson(directory, input.id, record);
    return record;
  } finally {
    await lock.close();
    await fs__namespace.rm(lockPath, { force: true });
  }
}
const fileSystem = require("node:fs/promises");
function projectCurrent(context, cached, projectKey) {
  const current = context.evidence.projects.find((item) => item.projectKey === projectKey);
  const previous = cached.projects.find((item) => item.projectKey === projectKey);
  return !!current && !!previous && current.inputFingerprint === previous.inputFingerprint;
}
function projectReviewEvidence(context, cached) {
  if (!cached) return context.evidence;
  const evidence = {
    ...context.evidence,
    generatedAt: cached.generatedAt,
    diagnostics: [.../* @__PURE__ */ new Set([...context.evidence.diagnostics, ...cached.diagnostics])],
    definitions: cached.definitions.map((item) => ({
      ...item,
      evidenceState: projectCurrent(context, cached, item.projectKey) ? item.evidenceState : "stale"
    }))
  };
  evidence.projects = context.evidence.projects.map((current) => {
    const previous = cached.projects.find((item) => item.projectKey === current.projectKey);
    if (!previous) return current;
    const fresh = projectCurrent(context, cached, current.projectKey);
    return { ...current, diagnostic: current.diagnostic || previous.diagnostic, build: {
      ...previous.build,
      state: fresh ? previous.build.state : "stale"
    } };
  });
  evidence.declarations = context.evidence.declarations.map((current) => {
    const previous = cached.declarations.find((item) => item.key === current.key);
    if (!previous) return current;
    const fresh = projectCurrent(context, cached, current.projectKey);
    return {
      ...previous,
      source: fresh && previous.source?.filePath === current.source?.filePath ? previous.source : current.source,
      evidenceState: fresh ? previous.evidenceState : "stale",
      diagnostic: fresh ? previous.diagnostic : "Project Lean or build-environment inputs changed since this evidence was collected."
    };
  });
  const available = evidence.declarations.filter((item) => item.evidenceState === "available").length;
  const stale = evidence.declarations.some((item) => item.evidenceState === "stale");
  evidence.state = stale ? "stale" : available === evidence.declarations.length && available > 0 ? "current" : available > 0 ? "partial" : "unavailable";
  evidence.fingerprint = evidenceFingerprint(evidence);
  return evidence;
}
function change(kind, key, label, previous, current) {
  const maximum = 24e3;
  return {
    kind,
    key,
    label,
    previous: previous?.slice(0, maximum),
    current: current?.slice(0, maximum),
    ...(previous?.length || 0) > maximum || (current?.length || 0) > maximum ? { truncated: true } : {}
  };
}
function reviewChanges(previous, current) {
  const changes = [];
  const snippets = (kind, before, after) => {
    if (JSON.stringify(before.map((item) => [item.filePath, item.fingerprint])) !== JSON.stringify(after.map((item) => [item.filePath, item.fingerprint]))) {
      changes.push(change(
        kind,
        kind,
        `${kind} source`,
        before.map((item) => `${item.filePath}:${item.startLine}
${item.content}`).join("\n\n"),
        after.map((item) => `${item.filePath}:${item.startLine}
${item.content}`).join("\n\n")
      ));
    }
  };
  snippets("statement", [previous.statement], [current.statement]);
  snippets("proof", previous.proofs, current.proofs);
  snippets("context", previous.contexts || [], current.contexts || []);
  if (previous.contextInputFingerprint !== current.contextInputFingerprint) changes.push(change(
    "context",
    "markdown-context",
    "Conservative workspace Markdown context",
    previous.contextInputFingerprint,
    current.contextInputFingerprint
  ));
  const declarations = (kind, before, after) => {
    const keys = /* @__PURE__ */ new Set([...before.map((item) => item.key), ...after.map((item) => item.key)]);
    for (const key of keys) {
      const a = before.find((item) => item.key === key);
      const b = after.find((item) => item.key === key);
      if (!a || !b || a.source?.fingerprint !== b.source?.fingerprint) changes.push(change(kind, key, key, a?.source?.content, b?.source?.content));
      if (a?.elaboratedType !== b?.elaboratedType) changes.push(change(kind === "definition" ? "definition" : "type", `${key}:type`, `${key} elaborated type`, a?.elaboratedType, b?.elaboratedType));
      if (a?.value !== b?.value) changes.push(change(kind, `${key}:value`, `${key} elaborated value`, a?.value, b?.value));
      if (JSON.stringify(a?.compiledSource) !== JSON.stringify(b?.compiledSource)) changes.push(change(
        "environment",
        `${key}:compiled`,
        `${key} compiled module`,
        a?.compiledSource?.currentFingerprint || a?.compiledSource?.fingerprint,
        b?.compiledSource?.currentFingerprint || b?.compiledSource?.fingerprint
      ));
    }
  };
  declarations("declaration", previous.declarations, current.declarations);
  declarations("definition", previous.definitions || [], current.definitions || []);
  for (const project of current.projects) {
    const before = previous.projects.find((item) => item.projectKey === project.projectKey);
    if (before?.inputFingerprint !== project.inputFingerprint) changes.push(change(
      "environment",
      project.projectKey,
      `${project.projectKey}: conservative project input invalidation`,
      before?.inputFingerprint,
      project.inputFingerprint
    ));
  }
  if (!changes.length && previous.fingerprint !== current.fingerprint) changes.push(change("evidence", "evidence", "Evidence collection or freshness changed", previous.fingerprint, current.fingerprint));
  return changes;
}
function reviewProjection(record, evidence) {
  return {
    ...record ? { record } : {},
    freshness: !record ? "unreviewed" : record.evidenceFingerprint === evidence.fingerprint ? "current" : "stale",
    expectedRevision: record?.revision || 0,
    changes: record && record.evidenceFingerprint !== evidence.fingerprint ? reviewChanges(record.snapshot, evidence) : []
  };
}
class LeanReviewService {
  constructor(onChange) {
    this.onChange = onChange;
    this.jobs = /* @__PURE__ */ new Map();
    this.preparingReads = /* @__PURE__ */ new Map();
    this.closed = false;
  }
  async readBatch(rootInput) {
    const root = await fs__namespace.realpath(rootInput);
    let pending = this.preparingReads.get(root);
    if (!pending) {
      pending = (async () => {
        await validateReviewWorkspace(root);
        return {
          root,
          snapshot: await loadWorkspaceSnapshot(root),
          projectInputs: /* @__PURE__ */ new Map(),
          compiledInputs: /* @__PURE__ */ new Map(),
          sourceInputs: /* @__PURE__ */ new Map(),
          objects: /* @__PURE__ */ new Map()
        };
      })();
      this.preparingReads.set(root, pending);
    }
    try {
      return await pending;
    } finally {
      if (this.preparingReads.get(root) === pending) this.preparingReads.delete(root);
    }
  }
  async readObject(batch, idInput) {
    const id = formalReviewId(idInput);
    if (!batch.objects.has(id)) batch.objects.set(id, (async () => {
      const context = await readReviewContext(batch.root, id, batch.snapshot, batch.projectInputs, true, batch.sourceInputs);
      return this.response(context, batch.compiledInputs, batch.sourceInputs);
    })());
    const pending = batch.objects.get(id);
    try {
      return await pending;
    } finally {
      if (batch.objects.get(id) === pending) batch.objects.delete(id);
    }
  }
  async get(root, id, fresh = false) {
    if (fresh) return this.response(await readReviewContext(root, id));
    return this.readObject(await this.readBatch(root), id);
  }
  async response(context, compiledInputs, sourceInputs) {
    const [evidence, record] = await Promise.all([this.currentEvidence(context, compiledInputs, sourceInputs), readReviewRecord(context.root, context.id)]);
    const active = [...this.jobs.values()].reverse().find((item) => item.root === context.root && item.job.formalId === context.id);
    return {
      id: context.id,
      projectToken: reviewHash(context.root),
      formal: context.formal,
      evidence,
      review: reviewProjection(record, evidence),
      ...active ? { job: { ...active.job } } : {}
    };
  }
  async currentEvidence(context, compiledInputs = /* @__PURE__ */ new Map(), sourceInputs) {
    const evidence = projectReviewEvidence(context, await readReviewEvidenceCache(context.root, context.id));
    for (const declaration of [...evidence.declarations, ...evidence.definitions]) {
      if (!declaration.compiledSource) continue;
      const compiled = declaration.compiledSource;
      if (!compiledInputs.has(compiled.filePath)) compiledInputs.set(compiled.filePath, (async () => {
        const file = await reviewSafePath(context.root, compiled.filePath, true);
        return file ? reviewHash(await fs__namespace.readFile(file)) : void 0;
      })());
      const current = await compiledInputs.get(compiled.filePath);
      if (current !== compiled.fingerprint) {
        declaration.evidenceState = "stale";
        declaration.diagnostic = "The compiled defining module changed since this evidence was collected.";
        declaration.compiledSource = { ...compiled, currentFingerprint: current || "missing" };
        const project = evidence.projects.find((item) => item.projectKey === declaration.projectKey);
        if (project) project.build.state = "stale";
      }
    }
    for (const definition of evidence.definitions) {
      if (!definition.source) continue;
      const sourceFile = await reviewSafePath(context.root, definition.source.filePath, true);
      if (!sourceFile) {
        definition.evidenceState = "stale";
        definition.diagnostic = "The previously located definition source is no longer available.";
        continue;
      }
      const lines = await readReviewSourceLines(context.root, definition.source.filePath, sourceInputs);
      const previous = definition.source;
      const content = lines.slice(previous.startLine - 1, previous.endLine).join("\n");
      const fingerprint2 = reviewHash(content);
      definition.source = {
        ...previous,
        content: content.slice(0, 24e3),
        fingerprint: fingerprint2,
        ...content.length > 24e3 ? { truncated: true } : {},
        ...fingerprint2 !== previous.fingerprint ? { rangeKind: "context" } : {}
      };
    }
    if ([...evidence.declarations, ...evidence.definitions].some((item) => item.evidenceState === "stale")) evidence.state = "stale";
    evidence.fingerprint = evidenceFingerprint(evidence);
    return evidence;
  }
  async queue(rootInput, filePath, wholeProject = false) {
    const batch = await this.readBatch(rootInput);
    const { root, snapshot } = batch;
    if (!wholeProject && !snapshot.state.pages.some((page2) => page2.filePath === filePath)) throw new LeanReviewError(404, "Review queue requires a current Markdown page.");
    const page = snapshot.state.pages.find((item) => item.filePath === filePath);
    const paths = new Set(snapshot.state.pages.filter((item) => wholeProject || item.filePath === filePath || page.unitKey && item.bookKey === page.bookKey && item.volumeKey === page.volumeKey && item.unitKey === page.unitKey).map((item) => item.filePath));
    const coverageTypes = new Set(snapshot.state.config?.lean?.coverageTypes || DEFAULT_LEAN_COVERAGE_TYPES);
    const ids = Object.entries(snapshot.state.labels || {}).filter(([id, label]) => HASH_ID_RE.test(id) && paths.has(label.filePath) && (coverageTypes.has(label.type) || !!snapshot.state.leanIndex?.anchors?.[id])).sort(([, a], [, b]) => a.filePath.localeCompare(b.filePath) || (a.startLine || 0) - (b.startLine || 0)).map(([id]) => id);
    if (ids.length > (wholeProject ? 3e3 : 1e3)) throw new LeanReviewError(413, wholeProject ? "Project review overview is limited to 3000 objects; no partial completeness is claimed." : "Review queue is limited to 1000 objects in a chapter.");
    const items = [];
    for (const id of ids) {
      const object = await this.readObject(batch, id);
      const record = object.review.record;
      items.push({
        ...object.formal,
        anchored: object.evidence.declarations.length > 0,
        declarationCount: object.evidence.declarations.length,
        reviewFreshness: object.review.freshness,
        evidenceFingerprint: object.evidence.fingerprint,
        ...record ? { verdict: record.verdict, reviewer: record.reviewer, reviewedAt: record.reviewedAt } : {}
      });
    }
    const counts = { total: items.length, unreviewed: 0, current: 0, stale: 0, unanchored: 0 };
    for (const item of items) {
      counts[item.reviewFreshness]++;
      if (!item.anchored) counts.unanchored++;
    }
    return { projectToken: reviewHash(root), items, counts };
  }
  async definition(root, id, projectKey, name) {
    const response = await this.get(root, id);
    const key = declarationReviewKey(projectKey, name);
    const definition = [...response.evidence.declarations, ...response.evidence.definitions].find((item) => item.key === key);
    return definition ? { definition, state: definition.evidenceState, diagnostic: definition.diagnostic } : { state: "unavailable", diagnostic: "This definition has no cached elaborated evidence. Expand it explicitly after refreshing the object." };
  }
  async job(rootInput, id) {
    const active = this.jobs.get(id);
    if (!active || await fs__namespace.realpath(rootInput) !== active.root) throw new LeanReviewError(404, "Lean review job not found in this project.");
    return { job: { ...active.job } };
  }
  async action(rootInput, body) {
    const root = await validateReviewWorkspace(rootInput);
    if (body?.action === "save") {
      const input = reviewSaveInput(body);
      const running2 = [...this.jobs.values()].some((item) => item.root === root && item.job.formalId === input.id && ["queued", "running"].includes(item.job.status));
      if (running2) throw new LeanReviewError(409, "Evidence is refreshing. Wait and review the refreshed evidence before saving.");
      await saveReviewRecord(root, input, async () => {
        const context2 = await readReviewContext(root, input.id);
        return this.currentEvidence(context2);
      });
      this.onChange?.(root, input.id);
      return { status: 200, value: await this.get(root, input.id) };
    }
    if (body?.action === "cancel") {
      const active2 = this.jobs.get(body.jobId);
      if (!active2 || active2.root !== root) throw new LeanReviewError(404, "Lean review job not found in this project.");
      if (["queued", "running"].includes(active2.job.status)) {
        active2.cancelled = true;
        this.kill(active2.child);
      }
      return { status: 200, value: { job: { ...active2.job } } };
    }
    if (!["refresh", "expand"].includes(body?.action)) throw new LeanReviewError(400, "Lean review action must be refresh, expand, cancel, or save.");
    if (this.closed) throw new LeanReviewError(409, "The Reader is closing.");
    const context = await readReviewContext(root, body.id);
    let previous;
    try {
      previous = await readReviewEvidenceCache(root, context.id);
    } catch (error) {
      if (body.action !== "refresh") throw error;
      const directory = await reviewSafePath(root, ".math-workspace/lean-review-evidence", true);
      const bad = directory && await reviewSafePath(root, path__namespace.relative(root, path__namespace.join(directory, `${context.id}.json`)), true);
      if (bad) await fs__namespace.copyFile(bad, path__namespace.join(directory, `.${context.id}-invalid-${crypto__namespace.randomBytes(8).toString("hex")}.json`));
    }
    let expansion;
    if (body.action === "expand") {
      if (typeof body.projectKey !== "string" || typeof body.name !== "string") throw new LeanReviewError(400, "Definition expansion requires a project key and declaration name.");
      const current = projectReviewEvidence(context, previous);
      const allowed = current.declarations.concat(current.definitions).filter((item) => item.projectKey === body.projectKey).flatMap((item) => [item.qualifiedName, ...item.typeDependencies, ...item.proofDependencies]);
      if (!allowed.includes(body.name) || current.state === "stale") throw new LeanReviewError(400, "Refresh the object and choose a declaration from its actual dependency evidence.");
      expansion = { projectKey: body.projectKey, name: body.name };
    }
    const running = [...this.jobs.values()].find((item) => item.root === root && ["queued", "running"].includes(item.job.status));
    if (running) throw new LeanReviewError(409, "Another Lean evidence job is running in this project.");
    if (this.jobs.size >= 32) {
      const old = [...this.jobs.entries()].find(([, item]) => !["queued", "running"].includes(item.job.status));
      if (old) this.jobs.delete(old[0]);
      else throw new LeanReviewError(409, "Too many Lean review jobs are active.");
    }
    const job = {
      id: crypto__namespace.randomBytes(16).toString("hex"),
      formalId: context.id,
      status: "queued",
      phase: "Preparing local Lean evidence",
      startedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const active = { root, job, cancelled: false };
    this.jobs.set(job.id, active);
    active.promise = new Promise((resolve) => setTimeout(() => {
      void this.run(active, context, previous, expansion).finally(resolve);
    }, 0));
    return { status: 202, value: { job: { ...job } } };
  }
  async run(active, context, previous, expansion) {
    let lock;
    const lockPath = path__namespace.join(context.root, ".math-workspace", "lean-review-refresh.lock");
    try {
      lock = await fileSystem.open(lockPath, "wx", 384);
      await lock.writeFile(JSON.stringify({ pid: process.pid, jobId: active.job.id }));
      if (active.cancelled) throw new Error("Review evidence refresh cancelled.");
      active.job.status = "running";
      const evidence = await refreshReviewEvidence(context, {
        cancelled: () => active.cancelled,
        onProcess: (child) => {
          active.child = child;
        },
        phase: (phase) => {
          active.job.phase = phase;
        }
      }, expansion);
      if (expansion && previous) {
        for (const project of evidence.projects.filter((item) => item.projectKey !== expansion.projectKey)) {
          const saved = previous.projects.find((item) => item.projectKey === project.projectKey);
          if (saved && projectCurrent(context, previous, project.projectKey)) Object.assign(project, saved);
        }
        for (const declaration of evidence.declarations.filter((item) => item.projectKey !== expansion.projectKey)) {
          const saved = previous.declarations.find((item) => item.key === declaration.key);
          if (saved && projectCurrent(context, previous, declaration.projectKey)) Object.assign(declaration, saved);
        }
        evidence.definitions = [...new Map([...previous.definitions, ...evidence.definitions].map((item) => [item.key, item])).values()];
        const available = evidence.declarations.filter((item) => item.evidenceState === "available").length;
        evidence.state = evidence.declarations.some((item) => item.evidenceState === "stale") ? "stale" : available > 0 && available === evidence.declarations.length ? "current" : available > 0 ? "partial" : "unavailable";
        evidence.fingerprint = evidenceFingerprint(evidence);
      }
      if (active.cancelled) throw new Error("Review evidence refresh cancelled.");
      await writeReviewEvidenceCache(context.root, context.id, evidence);
      active.job.status = evidence.state === "current" ? "completed" : "failed";
      active.job.phase = evidence.state === "current" ? "Evidence ready for human review" : "Evidence incomplete";
      if (active.job.status === "failed") active.job.error = evidence.diagnostics.join("\n") || "No complete elaborated evidence was obtained.";
      this.onChange?.(context.root, context.id);
    } catch (error) {
      active.job.status = active.cancelled ? "cancelled" : "failed";
      active.job.phase = active.cancelled ? "Cancelled" : "Evidence refresh failed";
      active.job.error = error?.code === "EEXIST" ? "Another Reader owns the local evidence refresh lock; wait for it, or inspect a lock left by a crashed process." : error.message || String(error);
    } finally {
      active.job.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      active.child = void 0;
      if (lock) {
        await lock.close();
        await fs__namespace.rm(lockPath, { force: true });
      }
    }
  }
  kill(child) {
    if (!child) return;
    try {
      if (process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
      else child.kill("SIGKILL");
    } catch (_error) {
      child.kill("SIGKILL");
    }
  }
  async close() {
    this.closed = true;
    for (const active of this.jobs.values()) if (["queued", "running"].includes(active.job.status)) {
      active.cancelled = true;
      this.kill(active.child);
    }
    await Promise.all([...this.jobs.values()].map((active) => active.promise));
  }
}
const version = "0.10.0";
const MAX_BYTES$1 = 200 * 1024 * 1024;
function publicationZip(files, modes = /* @__PURE__ */ new Map()) {
  if (files.size > 1e4) throw new Error("The publication package exceeds 10,000 files.");
  const table = Array.from({ length: 256 }, (_, value) => {
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 3988292384 ^ value >>> 1 : value >>> 1;
    return value >>> 0;
  });
  const local = [], central = [];
  let offset = 0, total = 0;
  for (const [name, value] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    if (!name || name.startsWith("/") || /[\\\u0000-\u001f]/.test(name) || name.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Invalid publication package path.");
    const bytes = Buffer.from(value), encoded = Buffer.from(name, "utf8");
    total += bytes.length;
    if (total > MAX_BYTES$1 || encoded.length > 65535) throw new Error("The publication package exceeds its size limit.");
    let checksum = 4294967295;
    for (const byte of bytes) checksum = table[(checksum ^ byte) & 255] ^ checksum >>> 8;
    checksum = (checksum ^ 4294967295) >>> 0;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(67324752);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(2048, 6);
    header.writeUInt16LE(33, 12);
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(bytes.length, 18);
    header.writeUInt32LE(bytes.length, 22);
    header.writeUInt16LE(encoded.length, 26);
    local.push(header, encoded, bytes);
    const directory2 = Buffer.alloc(46);
    directory2.writeUInt32LE(33639248);
    directory2.writeUInt16LE(788, 4);
    directory2.writeUInt16LE(20, 6);
    directory2.writeUInt16LE(2048, 8);
    directory2.writeUInt32LE((32768 | (modes.get(name) || 420)) << 16 >>> 0, 38);
    directory2.writeUInt16LE(33, 14);
    directory2.writeUInt32LE(checksum, 16);
    directory2.writeUInt32LE(bytes.length, 20);
    directory2.writeUInt32LE(bytes.length, 24);
    directory2.writeUInt16LE(encoded.length, 28);
    directory2.writeUInt32LE(offset, 42);
    central.push(directory2, encoded);
    offset += header.length + encoded.length + bytes.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(101010256);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
function publicationZipFiles(bytes) {
  const files = /* @__PURE__ */ new Map();
  let offset = 0, total = 0;
  while (offset + 30 <= bytes.length && bytes.readUInt32LE(offset) === 67324752) {
    if (bytes.readUInt16LE(offset + 6) !== 2048 || bytes.readUInt16LE(offset + 8) !== 0) throw new Error("Unsupported publication ZIP entry.");
    const size = bytes.readUInt32LE(offset + 18), nameSize = bytes.readUInt16LE(offset + 26), extraSize = bytes.readUInt16LE(offset + 28);
    const start = offset + 30 + nameSize + extraSize, end = start + size;
    if (end > bytes.length || total + size > MAX_BYTES$1 || files.size >= 1e4) throw new Error("Invalid publication ZIP bounds.");
    const name = bytes.subarray(offset + 30, offset + 30 + nameSize).toString("utf8");
    if (!name || name.startsWith("/") || /[\\\u0000-\u001f]/.test(name) || name.split("/").some((part) => !part || part === "." || part === "..") || files.has(name)) throw new Error("Invalid publication ZIP path.");
    files.set(name, bytes.subarray(start, end));
    total += size;
    offset = end;
  }
  if (!files.size || offset + 4 > bytes.length || bytes.readUInt32LE(offset) !== 33639248) throw new Error("Invalid publication ZIP directory.");
  return files;
}
const fs$2 = require("node:fs/promises");
const childProcess$2 = require("node:child_process");
const MAX_BYTES = 160 * 1024 * 1024;
const PUBLIC_ARTIFACTS = ["publication.pdf", "compiled.md", "source.zip", "verification.json", "CITATION.cff", "citation.json", "release.json", "checksums.sha256"];
function publicPath(value) {
  relativeInput(value);
  if (value.split("/").some((part) => [".git", ".dev-mesh", ".codex", ".agents", ".lake", "node_modules"].includes(part) || /^\.env(?:\.|$)/i.test(part)) || value.startsWith(".math-workspace/") || /\.(?:pem|key|p12|pfx)$/i.test(value)) throw new Error(`This file is not eligible for public delivery: ${value}`);
  return value;
}
function repositoryTarget(input) {
  if (!input || typeof input !== "object") throw new Error("A repository publication target is required.");
  const url2 = String(input.url || "").trim();
  if (!url2 || url2.length > 2e3 || /[\s\u0000-\u001f]/.test(url2) || url2.startsWith("-")) throw new Error("Invalid publication repository URL.");
  const provider = input.provider || "git";
  if (!["github", "gitlab", "git"].includes(provider)) throw new Error("Unknown repository publication provider.");
  const https = /^https:\/\/([^/@?#]+)\/([^?#]+)$/.exec(url2), ssh = /^git@([^:]+):(.+)$/.exec(url2);
  if (!https && !ssh && !/^file:\/\/\//.test(url2)) throw new Error("Use an HTTPS, git@host:path, or local file repository URL.");
  if (provider !== "git" && (!https && !ssh || (https?.[1] || ssh?.[1]) !== (provider === "github" ? "github.com" : "gitlab.com"))) throw new Error("The hosted publication provider must match its repository host.");
  const ref = (value, name) => {
    if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,180}$/.test(value) || /\.\.|@\{|\/\//.test(value) || value.endsWith("/") || value.endsWith(".") || value.split("/").some((part) => part.startsWith(".") || part.endsWith(".lock"))) throw new Error(`Invalid publication ${name}.`);
    return value;
  };
  const tokenEnv = input.tokenEnv || (provider === "github" ? "GITHUB_TOKEN" : "GITLAB_TOKEN");
  if (!/^[A-Z_][A-Z0-9_]{0,100}$/.test(tokenEnv)) throw new Error("Invalid repository credential environment variable name.");
  return { url: url2, provider, branch: ref(input.branch || "main", "branch"), tag: ref(input.tag, "tag"), directory: publicPath(input.directory), ...provider !== "git" ? { tokenEnv } : {} };
}
function normalizeDelivery(input) {
  if (input === void 0) return void 0;
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid publication delivery configuration.");
  const strings2 = (value) => {
    if (value === void 0) return [];
    if (!Array.isArray(value) || value.length > 1e3 || value.some((item) => typeof item !== "string" || !item.trim() || item.length > 1e3)) throw new Error("Invalid publication delivery selection.");
    return [...new Set(value)];
  };
  return { extraFiles: strings2(input.extraFiles).map(publicPath), leanProjects: strings2(input.leanProjects), ...input.repository ? { repository: repositoryTarget(input.repository) } : {} };
}
async function prepareDelivery(root, profile, config, context) {
  const files = /* @__PURE__ */ new Map(), roles = /* @__PURE__ */ new Map(), modes = /* @__PURE__ */ new Map();
  let total = 0;
  const add = async (name, role) => {
    publicPath(name);
    if (files.has(name)) {
      if (role === "lean") roles.set(name, role);
      return;
    }
    const file = await safePath(root, name), stat = await fs$2.stat(file);
    if (!stat.isFile() || stat.size > MAX_BYTES || total + stat.size > MAX_BYTES || files.size >= 1e4) throw new Error("Public sources exceed the file or byte limit.");
    const bytes = context.files.get(name) ?? await fs$2.readFile(file);
    total += bytes.length;
    files.set(name, bytes);
    roles.set(name, role);
    modes.set(name, stat.mode & 73 ? 493 : 420);
  };
  const manuscripts = /* @__PURE__ */ new Set([...context.selected.map((page) => page.path), ...context.matter.map((entry) => entry.file).filter(Boolean)]);
  for (const name of manuscripts) await add(name, "manuscript");
  for (const name of context.assets) if (!/\.md$/i.test(name) || manuscripts.has(name)) await add(name, "resource");
  for (const name of profile.delivery.extraFiles || []) await add(name, "extra");
  const projects = leanProjects(config), selectedKeys = new Set(profile.delivery.leanProjects || []);
  if ([...selectedKeys].some((key) => !projects.some((project) => project.key === key))) throw new Error("A selected Lean project is not configured in this workspace.");
  const lean = [], visited = /* @__PURE__ */ new Set();
  const inside = (base, value) => {
    const relative = path__namespace.relative(root, path__namespace.resolve(root, base, value)).split(path__namespace.sep).join("/");
    if (relative === "") return "";
    return publicPath(relative);
  };
  const collect = async (directory, dependencies) => {
    if (visited.has(directory)) return;
    visited.add(directory);
    const join = (name) => directory ? `${directory}/${name}` : name;
    const walk = async (name) => {
      const entries = await fs$2.readdir(name ? await safePath(root, name) : root, { withFileTypes: true });
      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.name.startsWith(".") || ["node_modules", "out", "dist", "build"].includes(entry.name)) continue;
        const child = name ? `${name}/${entry.name}` : entry.name;
        if (entry.isSymbolicLink()) throw new Error("Lean publication sources cannot follow symbolic links.");
        if (entry.isDirectory()) await walk(child);
        else if (entry.isFile() && (/\.lean$/i.test(entry.name) || ["lean-toolchain", "lakefile.toml", "lake-manifest.json", "LICENSE", "LICENSE.md", "LICENSE.txt"].includes(entry.name))) await add(child, "lean");
      }
    };
    await walk(directory);
    const toolchain = join("lean-toolchain"), manifestFile = join("lake-manifest.json");
    if (!files.has(toolchain) || !files.has(manifestFile) || !files.has(join("lakefile.lean")) && !files.has(join("lakefile.toml"))) throw new Error(`Lean project ${directory || "."} needs lean-toolchain, lakefile and lake-manifest.json.`);
    const manifest = JSON.parse(files.get(manifestFile).toString("utf8"));
    if (!Array.isArray(manifest.packages)) throw new Error("A Lean publication requires an existing dependency lock manifest.");
    for (const dependency of manifest.packages) {
      if (dependency.type === "path" && typeof dependency.dir === "string") {
        const target = inside(directory, dependency.dir);
        dependencies.push(target || ".");
        await collect(target, dependencies);
      } else if (dependency.type === "git" && typeof dependency.url === "string" && /^[a-f0-9]{40,64}$/i.test(dependency.rev || "") && /^(?:https:\/\/[^/@\s]+\/|git@[^:\s]+:)/.test(dependency.url)) ;
      else throw new Error("Lean dependencies must use workspace-local paths or public Git URLs pinned to exact commits.");
    }
  };
  for (const project of projects.filter((item) => selectedKeys.has(item.key))) {
    const dependencies = [];
    await collect(project.root, dependencies);
    const toolchainPath = project.root ? `${project.root}/lean-toolchain` : "lean-toolchain";
    const toolchain = files.get(toolchainPath).toString("utf8").trim();
    if (toolchain.includes("..") || !/^[A-Za-z0-9._/-]+:(?:v\d+\.\d+\.\d+(?:[-+][A-Za-z0-9._-]+)?|nightly-\d{4}-\d{2}-\d{2}|[a-f0-9]{40,64})$/.test(toolchain)) throw new Error("Pin the Lean toolchain to an exact release, dated nightly or commit.");
    if (project.target && (/^\s*-/.test(project.target) || /[\u0000-\u001f]/.test(project.target))) throw new Error("A Lean publication target cannot be a command-line option.");
    lean.push({ key: project.key, root: project.root || ".", toolchain, target: project.target, localDependencies: [...new Set(dependencies)].sort() });
  }
  const reserved = ["compiled.md", "build-pdf.mjs", "rebuild-lean.mjs", "PUBLICATION.json", "PUBLICATION-README.md", "verification.json", "CITATION.cff", "release.json", "SOURCE-CHECKSUMS.sha256"];
  if (reserved.some((name) => files.has(name))) throw new Error("A public source path conflicts with a generated publication file.");
  const reviews = new LeanReviewService(), objects = [], builds = /* @__PURE__ */ new Map();
  const coverageTypes = new Set(config.lean?.coverageTypes || DEFAULT_LEAN_COVERAGE_TYPES);
  for (const [id, label] of Object.entries(context.labels)) {
    if (!manuscripts.has(label.filePath) || !coverageTypes.has(label.type)) continue;
    if (!selectedKeys.size) {
      objects.push({ id, coverage: "not-included", declarations: [], humanReview: "unreviewed" });
      continue;
    }
    try {
      const response = await reviews.get(root, id), evidence = response.evidence;
      const declarations = evidence.declarations.filter((item) => selectedKeys.has(item.projectKey)).map((item) => ({ project: item.projectKey, name: item.qualifiedName, state: item.evidenceState, axioms: item.evidenceState === "available" ? item.axioms : void 0 }));
      objects.push({ id, coverage: declarations.length ? "anchored" : "unanchored", declarations, humanReview: response.review.freshness, verdict: response.review.freshness === "current" ? response.review.record?.verdict : void 0 });
      for (const project of evidence.projects.filter((item) => selectedKeys.has(item.projectKey))) builds.set(project.projectKey, { key: project.projectKey, inputFingerprint: project.inputFingerprint, toolchain: project.toolchain, target: project.target, state: project.build.state, finishedAt: project.build.finishedAt });
    } catch {
      objects.push({ id, coverage: "unavailable", declarations: [], humanReview: "unreviewed" });
    }
  }
  const report = {
    schema: "math-workspace.publication-evidence/v1",
    mathematicalCorrectnessAssessed: false,
    coverageTypes: [...coverageTypes],
    packageRebuild: { state: "unverified", command: "node rebuild-lean.mjs", meaning: "Saved project build evidence is distinct from a fresh rebuild of the distributed package." },
    buildPolicy: "Current saved project-input-bound build evidence is reused; preparation never executes Lean or installs dependencies.",
    projects: lean.map((project) => builds.get(project.key) || { key: project.key, state: "unverified" }),
    objects
  };
  let source;
  try {
    const git2 = (args, input) => childProcess$2.spawnSync("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "-C", root, ...args], { input, timeout: 3e3, maxBuffer: MAX_BYTES, env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))), GIT_OPTIONAL_LOCKS: "0", GIT_NO_LAZY_FETCH: "1" } });
    const head = git2(["rev-parse", "--verify", "HEAD"]);
    if (head.status === 0 && /^[a-f0-9]{40,64}$/.test(head.stdout.toString().trim())) {
      let matches = true;
      for (const [name, bytes] of files) {
        const blob = git2(["show", `HEAD:./${name}`]);
        if (blob.status !== 0 || !blob.stdout.equals(bytes)) {
          matches = false;
          break;
        }
      }
      source = { commit: head.stdout.toString().trim(), matchesPublicInputs: matches };
    }
  } catch {
  }
  return { plan: { files: [...files].map(([name, bytes]) => ({ path: name, sha256: sha256(bytes), bytes: bytes.length, mode: modes.get(name), role: roles.get(name) })), lean, report, ...source ? { source } : {} }, files };
}
async function writeDelivery(directory, frozen, plan, renderArgs, createdAt, buildId2) {
  if (!plan.delivery) return [];
  const source = /* @__PURE__ */ new Map(), lean = /* @__PURE__ */ new Map();
  const modes = new Map(plan.delivery.files.map((file) => [file.path, file.mode]));
  for (const file of plan.delivery.files) {
    const bytes = await fs$2.readFile(await safePath(frozen, file.path));
    if (sha256(bytes) !== file.sha256) throw new Error("A frozen public source changed.");
    source.set(file.path, bytes);
    if (file.role === "lean") lean.set(file.path, bytes);
  }
  const compiled = await fs$2.readFile(path__namespace.join(directory, "compiled.md"));
  if (source.has("compiled.md") || source.has("build-pdf.mjs") || source.has("rebuild-lean.mjs") || source.has("PUBLICATION.json")) throw new Error("A public source path conflicts with a generated publication file.");
  source.set("compiled.md", compiled);
  const args = renderArgs.map((arg) => arg === "../compiled.md" ? "compiled.md" : arg === "--out=../publication.pdf" ? "--out=publication.pdf" : arg);
  for (const arg of args.filter((item) => item.startsWith("--front-matter="))) {
    const name = arg.slice("--front-matter=".length);
    source.set(name, await fs$2.readFile(await safePath(frozen, name)));
  }
  source.set(".math-workspace/config.json", Buffer.from(canonical({ language: plan.profile.language, lean: { projects: [] } })));
  const credentialNames = [...new Set(["ZENODO_TOKEN", "GITHUB_TOKEN", "GH_TOKEN", "GITLAB_TOKEN", plan.profile.zenodo?.tokenEnv, plan.profile.delivery?.repository?.tokenEnv].filter(Boolean))];
  const cleanEnv = `const env={...process.env};for(const key of ${JSON.stringify(credentialNames)})delete env[key];
`;
  source.set("build-pdf.mjs", Buffer.from(`import {spawnSync} from 'node:child_process';
${cleanEnv}const result=spawnSync(process.env.MATH_WORKSPACE_COMMAND||'math-workspace',${JSON.stringify(args)},{cwd:new URL('.',import.meta.url),stdio:'inherit',env});
if(result.error)throw result.error;process.exit(result.status??1);
`));
  const rebuild = `import {spawnSync} from 'node:child_process';
${cleanEnv}const projects=${JSON.stringify(plan.delivery.lean)};
for(const p of projects){const r=spawnSync('elan',['run',p.toolchain,'lake','build',...(p.target?[p.target]:[])],{cwd:new URL(p.root.replace(/\\/$/,'')+'/',import.meta.url),stdio:'inherit',env});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1);}
`;
  const identity = {
    schema: "math-workspace.publication-source/v1",
    buildId: buildId2,
    workId: plan.profile.workId,
    version: plan.profile.version,
    title: plan.profile.title,
    doi: plan.doi.versionDoi,
    selected: plan.selected.map((page) => page.path),
    lean: plan.delivery.lean,
    source: plan.delivery.source,
    tools: { ...plan.tools, mathWorkspace: version },
    numbering: "compiled.md retains the reviewed edition numbering. Rebuild the PDF from compiled.md rather than rescanning a partial manuscript."
  };
  source.set("PUBLICATION.json", Buffer.from(canonical(identity)));
  const readme = Buffer.from(`# ${plan.profile.title} — ${plan.profile.version}

Public sources for this edition only. See PUBLICATION.json and checksums.sha256.

PDF: install the Math Workspace CLI version recorded in PUBLICATION.json and the recorded Pandoc/TeX tools, then run node build-pdf.mjs. compiled.md retains this edition's numbering.

Lean: install the pinned toolchain deliberately, then run node rebuild-lean.mjs. Lake may fetch Git dependencies at the exact commits in lake-manifest.json. Local path dependencies are included. Build caches are omitted.

verification.json reports saved build evidence, formal anchors and human review separately. Unverified, stale or missing evidence does not assert proof coverage or mathematical correctness.
`);
  source.set("PUBLICATION-README.md", readme);
  if (!source.has("README.md")) source.set("README.md", readme);
  source.set("rebuild-lean.mjs", Buffer.from(rebuild));
  const result = ["source.zip", "verification.json", "CITATION.cff"];
  if (lean.size) {
    lean.set("rebuild-lean.mjs", Buffer.from(rebuild));
    lean.set("PUBLICATION.json", Buffer.from(canonical(identity)));
    lean.set("README.md", readme);
    await fs$2.writeFile(path__namespace.join(directory, "lean.zip"), publicationZip(lean, modes), { flag: "wx" });
    result.push("lean.zip");
  }
  source.set("verification.json", Buffer.from(canonical(plan.delivery.report)));
  await fs$2.writeFile(path__namespace.join(directory, "source.zip"), publicationZip(source, modes), { flag: "wx" });
  await fs$2.writeFile(path__namespace.join(directory, "verification.json"), canonical(plan.delivery.report), { flag: "wx" });
  const q = (value) => JSON.stringify(String(value || ""));
  const citation = `cff-version: 1.2.0
message: ${q(plan.profile.preferredCitation || "Please cite this edition.")}
type: dataset
title: ${q(plan.profile.title)}
version: ${q(plan.profile.version)}
date-released: ${q(plan.profile.publicationDate || createdAt.slice(0, 10))}
authors:
${(plan.profile.authors || []).map((author) => `  - name: ${q(author.name)}${author.orcid ? `
    orcid: ${q(author.orcid.startsWith("http") ? author.orcid : "https://orcid.org/" + author.orcid)}` : ""}`).join("\n")}
${plan.doi.versionDoi ? `doi: ${q(plan.doi.versionDoi)}
` : ""}${plan.profile.license ? `license: ${q(/^cc[-0]/i.test(plan.profile.license) ? plan.profile.license.toUpperCase() : plan.profile.license)}
` : ""}`;
  const preferred = `preferred-citation:
  type: book
  title: ${q(plan.profile.title)}
  authors:
${(plan.profile.authors || []).map((author) => `    - name: ${q(author.name)}${author.orcid ? `
      orcid: ${q(author.orcid.startsWith("http") ? author.orcid : "https://orcid.org/" + author.orcid)}` : ""}`).join("\n")}
  year: ${q((plan.profile.publicationDate || createdAt).slice(0, 4))}
${plan.doi.versionDoi ? `  doi: ${q(plan.doi.versionDoi)}
` : ""}`;
  await fs$2.writeFile(path__namespace.join(directory, "CITATION.cff"), citation + preferred, { flag: "wx" });
  return result;
}
const fs$1 = require("node:fs/promises");
const childProcess$1 = require("node:child_process");
const optionalText = (value, name, limit = 2e4) => {
  if (value === void 0 || value === "") return void 0;
  if (typeof value !== "string" || value.length > limit || value.includes("\0")) throw new Error(`Invalid publication ${name}.`);
  return value.trim() || void 0;
};
const list = (value, name, limit = 1e3) => {
  if (value === void 0) return [];
  if (!Array.isArray(value) || value.length > limit) throw new Error(`Invalid publication ${name}.`);
  return value;
};
function normalizeDoi(value) {
  return metadataDoi(value) || void 0;
}
function normalizeProfile(input) {
  if (!input || typeof input !== "object") throw new Error("A publication profile is required.");
  const automatic = input.matter?.automatic === true;
  const matter = (items, role) => list(items, role, 100).map((item) => {
    if (!item || typeof item !== "object") throw new Error(`Invalid ${role} entry.`);
    const value = { title: optionalText(item.title, `${role} title`, 1e3), file: item.file === void 0 ? void 0 : relativeInput(item.file), content: optionalText(item.content, `${role} content`, 1e6), includeInToc: item.includeInToc === true };
    if (value.file && !/\.md$/i.test(value.file)) throw new Error("Publication matter files must be Markdown files.");
    if (!automatic && !value.file && !value.content && !value.title) throw new Error(`An empty ${role} entry cannot be published.`);
    return value;
  });
  const metadata = normalizeWorkMetadata(input);
  const chapters = [...new Set(list(input.chapters, "chapter selection", 1e4).map(relativeInput))];
  if (!chapters.length) throw new Error("Select at least one chapter or page.");
  if (chapters.some((file) => !/\.md$/i.test(file))) throw new Error("Publication chapters must be Markdown files.");
  const version2 = optionalText(input.version, "version", 200);
  if (!version2) throw new Error("Publication version is required.");
  const engine = input.pdf?.engine || "xelatex";
  if (!["xelatex", "lualatex", "pdflatex", "tectonic"].includes(engine)) throw new Error("Unsupported publication PDF engine.");
  const paper = input.pdf?.paper || "a4", margin = input.pdf?.margin || "2.5cm";
  if (!/^[a-zA-Z0-9-]{1,30}$/.test(paper) || !/^\d+(?:\.\d+)?(?:cm|mm|in|pt)$/.test(margin)) throw new Error("Invalid publication paper or margin.");
  const documentClass = optionalText(input.pdf?.documentClass, "document class", 80);
  if (documentClass && !/^[a-zA-Z0-9_-]+$/.test(documentClass)) throw new Error("Invalid publication document class.");
  const depth = input.toc?.depth ?? 2;
  if (!Number.isInteger(depth) || depth < 1 || depth > 6) throw new Error("Contents depth must be between 1 and 6.");
  const tokenEnv = input.zenodo?.tokenEnv || "ZENODO_TOKEN";
  if (!/^[A-Z_][A-Z0-9_]{0,100}$/.test(tokenEnv)) throw new Error("Invalid Zenodo token environment variable name.");
  const environment = input.zenodo?.environment || "sandbox";
  if (!["sandbox", "production"].includes(environment)) throw new Error("Invalid Zenodo environment.");
  const scope = input.scope ? {
    books: list(input.scope.books, "book scope", 100).map((value) => optionalText(value, "book key", 200) || ""),
    volumes: list(input.scope.volumes, "volume scope", 100).map((value) => optionalText(value, "volume key", 200) || ""),
    paths: list(input.scope.paths, "work scope", 1e4).map(relativeInput)
  } : void 0;
  const continuedFile = input.continued?.file ? relativeInput(input.continued.file) : void 0;
  if (continuedFile && !/\.md$/i.test(continuedFile)) throw new Error("Publication continued notice files must be Markdown files.");
  const frontMatter = matter(input.frontMatter, "front matter"), backMatter = matter(input.backMatter, "back matter");
  const matterFiles = [...automatic ? [] : [...frontMatter, ...backMatter], ...input.continued?.enabled === false || !continuedFile ? [] : [{ file: continuedFile }]].map((entry) => entry.file).filter(Boolean);
  if (new Set(matterFiles).size !== matterFiles.length) throw new Error("A publication file can only fill one matter role.");
  return JSON.parse(canonical({
    ...metadata,
    id: publicationId(input.id),
    workId: publicationId(input.workId),
    version: version2,
    chapters,
    scope,
    delivery: normalizeDelivery(input.delivery),
    edition: optionalText(input.edition, "edition", 300),
    publicationDate: optionalText(input.publicationDate, "publication date", 100),
    releaseTag: optionalText(input.releaseTag, "release tag", 300),
    releaseCommit: optionalText(input.releaseCommit, "release commit", 300),
    cover: { image: input.cover?.image ? relativeInput(input.cover.image) : void 0, showVersion: input.cover?.showVersion !== false },
    frontMatter,
    backMatter,
    matter: input.matter ? { automatic: input.matter.automatic === true, exclude: [...new Set(list(input.matter.exclude, "excluded matter", 1e4).map(relativeInput))] } : void 0,
    toc: { enabled: input.toc?.enabled !== false, depth, title: optionalText(input.toc?.title, "contents title", 500) },
    continued: { enabled: typeof input.continued?.enabled === "boolean" ? input.continued.enabled : void 0, file: continuedFile, title: optionalText(input.continued?.title, "continued title", 1e3), text: optionalText(input.continued?.text, "continued notice", 1e5) },
    pdf: { engine, paper, margin, documentClass },
    doi: { ...metadata.doi, versionDoi: input.doi?.versionDoi === "" ? "" : normalizeDoi(input.doi?.versionDoi) },
    zenodo: { environment, tokenEnv }
  }));
}
async function probeTool(command) {
  return new Promise((resolve) => {
    let child, output = "", done = false;
    const finish = (available) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ available, ...available ? { identity: output.trim().split("\n").slice(0, 2).join("\n") } : {} });
    };
    const timer = setTimeout(() => {
      child?.kill("SIGTERM");
      finish(false);
    }, 5e3);
    try {
      child = childProcess$1.spawn(command, ["--version"], { stdio: ["ignore", "pipe", "pipe"] });
      const collect = (bytes) => {
        output = (output + bytes.toString()).slice(0, 65536);
      };
      child.stdout.on("data", collect);
      child.stderr.on("data", collect);
      child.on("error", () => finish(false));
      child.on("close", (code) => finish(code === 0));
    } catch {
      finish(false);
    }
  });
}
async function publicationTools(profile, options = {}) {
  const probe = options.toolProbe || probeTool, engineName = profile?.pdf?.engine || "xelatex";
  const [pandoc, engine] = await Promise.all([probe("pandoc"), probe(engineName)]);
  const tools = { pandoc, engine, engineName };
  if (process.platform === "darwin" && profile?.language?.toLowerCase().startsWith("zh") && !profile.pdf?.documentClass) {
    const file = "/System/Library/Fonts/Supplemental/Songti.ttc";
    try {
      await fs$1.access(file, require("node:fs").constants.R_OK);
      const stat = await fs$1.stat(file);
      if (stat.isFile()) tools.chineseFonts = { family: "Songti SC", source: "macos", bytes: stat.size, modifiedAt: stat.mtime.toISOString() };
    } catch {
    }
  }
  return tools;
}
async function readSnapshot(root) {
  const files = /* @__PURE__ */ new Map(), inputs = [];
  const capture = async (name, role, required = false) => {
    try {
      const bytes = await fs$1.readFile(await safePath(root, name));
      files.set(name, bytes);
      inputs.push({ path: name, sha256: sha256(bytes), role });
      return bytes;
    } catch (error) {
      if (!required && error.code === "ENOENT") return void 0;
      throw error;
    }
  };
  const rawConfig = await capture(".math-workspace/config.json", "config");
  const config = mergeConfig(rawConfig ? JSON.parse(rawConfig.toString("utf8")) : {});
  const documents = [];
  const walk = async (directory, relative = "") => {
    const entries = await fs$1.readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (shouldExcludeScanPath(name, config)) continue;
      if (entry.isSymbolicLink()) {
        if (/\.md$/i.test(entry.name) || entry.isDirectory()) throw new Error(`Publication input cannot be a symbolic link: ${name}`);
        continue;
      }
      if (entry.isDirectory()) await walk(await safePath(root, name), name);
      else if (entry.isFile() && /\.md$/i.test(name)) documents.push({ filePath: name, content: (await capture(name, "source", true)).toString("utf8") });
    }
  };
  await walk(root);
  const symbols = await capture(".math-workspace/symbols.json", "metadata"), definitions = await capture(".math-workspace/definitions.json", "metadata");
  const state = scanFormalDocuments(documents, config, symbols ? JSON.parse(symbols.toString("utf8")) : void 0, definitions ? JSON.parse(definitions.toString("utf8")) : void 0);
  const pages = sortManuscriptPages(state.pages, "export").map((page) => ({ path: page.filePath, title: formatPageHeading(page, config), kind: page.kind, number: formatPageReference(page, config), book: page.bookKey, bookTitle: page.bookTitle, volume: page.volumeKey, volumeTitle: page.volumeTitle }));
  for (const document of documents) if (!pages.some((page) => page.path === document.filePath)) pages.push({ path: document.filePath, title: /^#\s+(.+)$/m.exec(document.content)?.[1] || path__namespace.basename(document.filePath), kind: "page", number: void 0, book: void 0, bookTitle: void 0, volume: void 0, volumeTitle: void 0 });
  return { state, pages, files, inputs, config };
}
async function publicationCatalog(root) {
  const snapshot = await readSnapshot(root);
  return { pages: snapshot.pages, language: snapshot.config.language === "en" ? "en-US" : "zh-CN" };
}
function resourceTargets(content) {
  const targets = [], definitions = /* @__PURE__ */ new Map();
  const key = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();
  for (const match of content.matchAll(/!?\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))/g)) if ((match[1] || match[2]) && !/\.md(?:[?#]|$)/i.test(match[1] || match[2])) targets.push({ target: match[1] || match[2], image: false });
  for (const match of content.matchAll(/!\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))/g)) targets.push({ target: match[1] || match[2], image: true });
  for (const match of content.matchAll(/^\s*\[([^\]]+)\]:\s*(?:<([^>]+)>|([^\s]+))/gm)) {
    definitions.set(key(match[1]), match[2] || match[3]);
    if (!/\.md(?:[?#]|$)/i.test(match[2] || match[3])) targets.push({ target: match[2] || match[3], image: false });
  }
  for (const match of content.matchAll(/!\[([^\]\n]*)\](?:\[([^\]\n]*)\])?/g)) {
    if (content[match.index + match[0].length] === "(") continue;
    const target = definitions.get(key(match[2] || match[1]));
    if (target) targets.push({ target, image: true });
  }
  for (const match of content.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) targets.push({ target: match[1], image: true });
  return targets;
}
async function makePublicationPlan(root, input, doiInput, options = {}) {
  const profileOverrides = normalizeProfile(input), snapshot = await readSnapshot(root);
  const profile = normalizeProfile(resolvePublicationMatter(resolvePublicationMetadata(profileOverrides, snapshot.config), snapshot.pages)), selectedPaths = new Set(profile.chapters);
  if (profile.delivery && !profile.authors?.length) throw new Error("Complete publication files require at least one named author in the work or edition metadata.");
  const doi = typeof doiInput === "function" ? await doiInput(profile) : doiInput;
  for (const name of selectedPaths) if (!snapshot.files.has(name) || !snapshot.pages.some((page) => page.path === name)) throw new Error(`Selected publication page is unavailable or excluded: ${name}`);
  const matters = /* @__PURE__ */ new Set();
  const resolveMatter = async (entry, role) => {
    let content2 = entry.content || "";
    if (entry.file) {
      await safePath(root, entry.file);
      if (!/\.md$/i.test(entry.file)) throw new Error("Publication matter files must be Markdown files.");
      if (!snapshot.files.has(entry.file) || !snapshot.pages.some((page) => page.path === entry.file)) throw new Error(`Publication matter file is unavailable or excluded: ${entry.file}`);
      if (matters.has(entry.file)) throw new Error(`A publication file can only fill one matter role: ${entry.file}`);
      matters.add(entry.file);
      selectedPaths.delete(entry.file);
      snapshot.inputs.find((item) => item.path === entry.file).role = role;
      content2 = snapshot.files.get(entry.file).toString("utf8");
    }
    const pageTitle = entry.file ? snapshot.state.pages.find((page) => page.filePath === entry.file)?.title : void 0;
    return { file: entry.file, title: entry.title || (entry.file ? pageTitle || firstHeadingTitle(content2) : void 0), content: content2, includeInToc: entry.includeInToc === true };
  };
  const frontMatter = [], backMatter = [];
  for (const entry of profile.frontMatter) frontMatter.push(await resolveMatter(entry, "front-matter"));
  for (const entry of profile.backMatter) backMatter.push(await resolveMatter(entry, "back-matter"));
  const continuedFile = profile.continued.file && profile.continued.enabled !== false ? await resolveMatter({ file: profile.continued.file }, "continued") : void 0;
  const selected = snapshot.pages.filter((page) => selectedPaths.has(page.path));
  if (!selected.length) throw new Error("Select at least one chapter or page outside the referenced front matter, back matter, and continued notice.");
  const selectedBooks = new Set(selected.map((page) => page.book).filter(Boolean));
  const scope = profile.scope;
  const inWork = (page) => {
    if (scope && (scope.books?.length || scope.volumes?.length || scope.paths?.length)) return !!(scope.books?.includes(page.book) || scope.volumes?.includes(page.volume) || scope.paths?.some((item) => page.path === item || page.path.startsWith(`${item}/`)));
    return selectedBooks.size ? selectedBooks.has(page.book) : true;
  };
  if (selected.some((page) => !inWork(page))) throw new Error("Selected pages must belong to the declared work scope.");
  const omitted = snapshot.pages.filter((page) => inWork(page) && !selectedPaths.has(page.path) && !matters.has(page.path));
  const externalReferences = [];
  const inspectReferences = (state, onlySelected = false) => {
    for (const reference of state.references) {
      if (onlySelected && !selectedPaths.has(reference.file)) continue;
      const label = snapshot.state.labels[reference.id];
      if (!label) throw new Error(`Unresolved publication reference in ${reference.file}:${reference.line}: @${reference.id}`);
      if (!selectedPaths.has(label.filePath) && !matters.has(label.filePath)) externalReferences.push({ source: reference.file, line: reference.line, target: label.filePath, label: reference.id, kind: "formal" });
    }
    for (const reference of state.pageReferences) {
      if (onlySelected && !selectedPaths.has(reference.file)) continue;
      if (!snapshot.pages.some((page) => page.path === reference.target)) throw new Error(`Unresolved publication page reference in ${reference.file}:${reference.line}: ${reference.target}`);
      if (!selectedPaths.has(reference.target) && !matters.has(reference.target)) externalReferences.push({ source: reference.file, line: reference.line, target: reference.target, label: reference.rawTarget, kind: "page" });
    }
  };
  inspectReferences(snapshot.state, true);
  const addInput = async (name, role) => {
    if (snapshot.files.has(name)) return;
    const bytes = await fs$1.readFile(await safePath(root, name));
    snapshot.files.set(name, bytes);
    snapshot.inputs.push({ path: name, sha256: sha256(bytes), role });
  };
  const scannedResources = /* @__PURE__ */ new Set();
  const addResources = async (content2, source) => {
    if (/\.md$/i.test(source)) content2 = stripIgnoredMarkdown(content2);
    for (const { target, image } of resourceTargets(content2)) {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) {
        if (image && !target.startsWith("#")) throw new Error("Publication images must be local frozen resources.");
        continue;
      }
      const clean = decodeURIComponent(target.split(/[?#]/)[0]);
      if (path__namespace.posix.isAbsolute(clean)) throw new Error("Publication resources must stay inside the project.");
      const name = toPosix(path__namespace.posix.normalize(path__namespace.posix.join(path__namespace.posix.dirname(source), clean)));
      relativeInput(name);
      await addInput(name, "asset");
    }
    for (const match of content2.matchAll(/\\(includegraphics|input|include|bibliography|addbibresource)(?:\[[^\]]*\])?\{([^}]+)\}/g)) {
      if (/[\\#$]/.test(match[2])) throw new Error("Publication resources must use explicit local paths; dynamic LaTeX resource paths cannot be frozen.");
      let name = relativeInput(match[2]);
      if (!path__namespace.extname(name)) {
        const extensions = match[1] === "includegraphics" ? [".pdf", ".png", ".jpg", ".jpeg", ".svg"] : match[1] === "bibliography" || match[1] === "addbibresource" ? [".bib"] : [".tex"];
        let resolved;
        for (const extension of extensions) {
          try {
            await fs$1.access(await safePath(root, `${name}${extension}`));
            resolved = `${name}${extension}`;
            break;
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
          }
        }
        if (!resolved) throw new Error(`Publication resource is unavailable: ${name}`);
        name = resolved;
      }
      await addInput(name, "asset");
      if (/\.tex$/i.test(name) && !scannedResources.has(name)) {
        scannedResources.add(name);
        await addResources(snapshot.files.get(name).toString("utf8"), name);
      }
    }
  };
  for (const page of selected) {
    const content2 = snapshot.files.get(page.path).toString("utf8");
    await addResources(content2, page.path);
    for (const match of content2.matchAll(/\[[^\]\n]*\]\(\s*(?:<([^>]+\.md(?:#[^>]*)?)>|([^\s)]+\.md(?:#[^\s)]*)?))/g)) {
      const target = match[1] || match[2];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const name = toPosix(path__namespace.posix.normalize(path__namespace.posix.join(path__namespace.posix.dirname(page.path), target.split("#")[0])));
      if (!selectedPaths.has(name) && !matters.has(name)) externalReferences.push({ source: page.path, line: content2.slice(0, match.index).split("\n").length, target: name, kind: "link" });
    }
  }
  for (const [entries, role] of [[frontMatter, "front-matter"], [backMatter, "back-matter"], [continuedFile ? [continuedFile] : [], "continued"]]) for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const content2 = entry.content;
    inspectReferences(scanFormalDocuments([{ filePath: entry.file || `${role}-${index + 1}.md`, content: content2 }], snapshot.config));
    await addResources(content2, entry.file || "inline.md");
    for (const match of stripIgnoredMarkdown(content2).matchAll(/\[[^\]\n]*\]\(\s*(?:<([^>]+\.md(?:#[^>]*)?)>|([^\s)]+\.md(?:#[^\s)]*)?))/g)) {
      const target = match[1] || match[2];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const name = toPosix(path__namespace.posix.normalize(path__namespace.posix.join(path__namespace.posix.dirname(entry.file || "inline.md"), target.split("#")[0])));
      relativeInput(name);
      if (!selectedPaths.has(name) && !matters.has(name)) externalReferences.push({ source: entry.file || `${role}-${index + 1}.md`, line: 0, target: name, kind: "link" });
    }
  }
  if (profile.cover.image) await addInput(profile.cover.image, "asset");
  const english = (profile.language || snapshot.config.language).startsWith("en");
  const continuedNotice = { enabled: !hasPublicationContinuedManuscript(profile, snapshot.pages) && (profile.continued.enabled ?? (!!continuedFile || omitted.length > 0)), file: continuedFile?.file, title: continuedFile?.title || profile.continued.title || (english ? "To be continued" : "未完待续"), text: continuedFile?.content ?? (profile.continued.text || (english ? "This is a partial edition of a continuing work. Further chapters and revisions will appear in later versions of the same work." : "本版为持续更新作品的部分内容。后续章节与修订将在同一作品的后续版本中继续发布。")) };
  const warnings = externalReferences.length ? [`${externalReferences.length} reference(s) point outside this edition; omitted pages are not added automatically.`] : [];
  const tools = await publicationTools(profile, options);
  const delivery = profile.delivery ? await prepareDelivery(root, profile, snapshot.config, {
    selected,
    matter: [...frontMatter, ...backMatter, ...continuedFile ? [continuedFile] : []],
    assets: snapshot.inputs.filter((item) => item.role === "asset").map((item) => item.path),
    files: snapshot.files,
    labels: snapshot.state.labels
  }) : void 0;
  if (delivery) {
    for (const [name, bytes] of delivery.files) if (!snapshot.files.has(name)) {
      snapshot.files.set(name, bytes);
      snapshot.inputs.push({ path: name, sha256: sha256(bytes), role: "delivery" });
    }
  }
  const content = { schema: "math-workspace.publication-plan/v1", profile, profileOverrides, projectMetadata: projectMetadata(snapshot.config), selected, omitted, externalReferences, partial: omitted.length > 0, frontMatter, backMatter, continuedNotice, doi, inputs: snapshot.inputs.sort((a, b) => a.path.localeCompare(b.path)), tools, warnings, ...delivery ? { delivery: delivery.plan } : {} };
  return { plan: { ...content, fingerprint: sha256(canonical(content)) }, snapshot };
}
function firstHeadingTitle(content) {
  return /^#\s+(.+?)\s*$/m.exec(stripIgnoredMarkdown(content))?.[1].replace(/[ \t]+#+[ \t]*$/, "").replace(/^#h-[a-f0-9]{16}\s+/i, "").replace(/\s+\{[^}]*\}\s*$/, "").trim();
}
function unnumbered(content, listed, clearTitleMarks = false) {
  let fence = false, clearedTitleMarks = false;
  return content.split(/\r?\n/).map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
      return line;
    }
    if (fence) return line;
    const heading = line.replace(/^(#{1,6}\s+)(.+?)\s*$/, (_match, prefix, title) => {
      const attributes = /\s*\{([^}]*)\}\s*$/.exec(title), body = attributes ? title.slice(0, attributes.index) : title;
      const kept = (attributes?.[1] || "").split(/\s+/).filter((item) => item && item !== ".unnumbered" && item !== ".unlisted" && item !== "-");
      return `${prefix}${body} {${[...kept, ".unnumbered", ...!listed ? [".unlisted"] : []].join(" ")}}`;
    });
    if (clearTitleMarks && !clearedTitleMarks && /^#\s+/.test(line)) {
      clearedTitleMarks = true;
      return `${heading}

\\markboth{}{}
`;
    }
    return heading;
  }).join("\n");
}
async function runPublicationCli(cliPath, args, options) {
  return new Promise((resolve, reject) => {
    const environment = { ...process.env };
    for (const key of ["ZENODO_TOKEN", "GITHUB_TOKEN", "GH_TOKEN", "GITLAB_TOKEN", options.credentialEnv, ...options.credentialEnvs || []].filter(Boolean)) delete environment[key];
    const child = childProcess$1.spawn(process.execPath, [cliPath, ...args], { cwd: options.cwd, stdio: ["ignore", "pipe", "pipe"], env: environment });
    let stdout = "", stderr = "", done = false;
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, 10 * 60 * 1e3);
    const collect = (channel, value) => {
      if (channel === "stdout") stdout = (stdout + value.toString()).slice(-1024 * 1024);
      else stderr = (stderr + value.toString()).slice(-1024 * 1024);
    };
    child.stdout.on("data", (value) => collect("stdout", value));
    child.stderr.on("data", (value) => collect("stderr", value));
    child.on("error", () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      reject(new Error("Unable to start the bundled PDF export runtime."));
    });
    child.on("close", (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`Publication export failed: ${(stderr || stdout || `process exit ${code}`).trim().slice(-12e3)}`));
      else resolve({ stdout, stderr });
    });
  });
}
async function renderPublication(store, plan, snapshot, recheck, options, progress = {}) {
  return store.locked(plan.profile.id, async () => {
    if ((await recheck().catch(() => null))?.fingerprint !== plan.fingerprint) throw new Error("Publication sources changed. Review a fresh plan before building.");
    const id = crypto__namespace.randomBytes(16).toString("hex"), profile = plan.profile, createdAt = (/* @__PURE__ */ new Date()).toISOString();
    const temporary2 = await store.directory(`pending/${profile.id}-${id}`);
    await fs$1.mkdir(temporary2, { recursive: true });
    const frozen = path__namespace.join(temporary2, "inputs");
    await fs$1.mkdir(frozen);
    try {
      progress.onProgress?.("Freezing selected sources, formal numbering inputs, and local resources");
      const configName = ".math-workspace/config.json";
      for (const [name, bytes] of snapshot.files) {
        if (name === configName) continue;
        const destination2 = await safePath(frozen, name);
        await fs$1.mkdir(path__namespace.dirname(destination2), { recursive: true });
        await fs$1.writeFile(destination2, bytes, { flag: "wx" });
      }
      const sourceConfig = snapshot.files.has(configName) ? JSON.parse(snapshot.files.get(configName).toString("utf8")) : snapshot.config;
      const exportConfig = { ...sourceConfig, lean: { ...sourceConfig?.lean, projects: [] } };
      await fs$1.mkdir(path__namespace.join(frozen, ".math-workspace"), { recursive: true });
      await fs$1.writeFile(path__namespace.join(frozen, configName), canonical(exportConfig), { flag: "wx" });
      const invoke = options.runCli || ((args2, runtimeOptions) => runPublicationCli(options.cliPath || path__namespace.resolve(__dirname, "math-workspace.js"), args2, { ...runtimeOptions, credentialEnvs: [profile.zenodo.tokenEnv, profile.delivery?.repository?.tokenEnv].filter(Boolean) }));
      progress.onProgress?.("Compiling selected chapters with their original formal numbering");
      await invoke(["export-md", ...plan.selected.map((page) => page.path), "--out=../compiled.md", "--read-only"], { cwd: frozen, onProgress: progress.onProgress });
      const markdownPath = path__namespace.join(temporary2, "compiled.md");
      let markdown = await fs$1.readFile(markdownPath, "utf8");
      const matterContent = async (entry, key, fallbackTitle, clearTitleMarks = false) => {
        const raw = entry.file ? snapshot.files.get(entry.file).toString("utf8") : entry.content || "";
        const inputName = `.math-workspace/publication-${key}-raw.md`, outputName = `.math-workspace/publication-${key}.md`;
        await fs$1.writeFile(await safePath(frozen, inputName), raw, { flag: "wx" });
        await invoke(["_publication-fragment", inputName, entry.file || "inline.md", outputName], { cwd: frozen, onProgress: progress.onProgress });
        let compiled = await fs$1.readFile(await safePath(frozen, outputName), "utf8");
        if (entry.file) {
          let found = false, fence = false;
          const pageId = snapshot.state.pages.find((page) => page.filePath === entry.file)?.id;
          compiled = compiled.split(/\r?\n/).map((line) => {
            if (/^\s*(```|~~~)/.test(line)) {
              fence = !fence;
              return line;
            }
            if (fence || found || !/^#\s+/.test(line)) return line;
            found = true;
            const attributes = /\s*\{([^}]*)\}\s*$/.exec(line);
            const heading = (attributes ? line.slice(0, attributes.index) : line).replace(/^#\s+/, "");
            let kept = attributes?.[1] || "";
            if (pageId && !/(?:^|\s)#[^\s]+/.test(kept)) kept = `${kept} #${pageId}`.trim();
            return `# ${entry.title || heading}${kept ? ` {${kept}}` : ""}`;
          }).join("\n");
          if (!found && (entry.title || fallbackTitle)) compiled = `# ${entry.title || fallbackTitle}

${compiled}`;
        }
        return unnumbered(compiled, entry.includeInToc, clearTitleMarks);
      };
      for (let index = 0; index < profile.backMatter.length; index++) {
        const entry = profile.backMatter[index];
        const title = !entry.file && entry.title ? `# ${entry.title} {.unnumbered${entry.includeInToc ? "" : " .unlisted"}}

\\markboth{}{}

` : "";
        markdown += `

\\clearpage
\\markboth{}{}

${title}${await matterContent(entry, `back-${index}`, void 0, !title)}
`;
      }
      if (plan.continuedNotice.enabled) {
        const notice = plan.continuedNotice;
        const content = notice.file ? await matterContent({ file: notice.file, includeInToc: false }, "continued", notice.title) : `# ${notice.title} {.unnumbered .unlisted}

${notice.text}`;
        markdown += `

\\clearpage
\\markboth{}{}

${content}
`;
      }
      await fs$1.writeFile(markdownPath, markdown, "utf8");
      const language = profile.language || (snapshot.config.language === "en" ? "en-US" : "zh-CN");
      const defaultChineseClass = !profile.pdf.documentClass && language.toLowerCase().startsWith("zh");
      const documentClass = profile.pdf.documentClass || (defaultChineseClass ? "ctexart" : void 0);
      const args = ["render-pdf", "../compiled.md", "--out=../publication.pdf", "--no-project-pdf-defaults", "--title-page", "--metadata-page", "--toc-page-break", `--title=${profile.title}`, `--release-version=${profile.version}`, `--author=${profile.authors.map((author) => author.name).join("; ")}`, `--pdf-engine=${profile.pdf.engine}`, `--paper=${profile.pdf.paper}`, `--margin=${profile.pdf.margin}`, `--lang=${language}`, `--toc-depth=${profile.toc.depth}`, `--toc-title=${profile.toc.title || (snapshot.config.language === "en" ? "Contents" : "目录")}`];
      args.push(`--authors-json=${JSON.stringify(profile.authors)}`);
      args.push(profile.toc.enabled ? "--toc" : "--no-toc", profile.cover.showVersion ? "--show-version-on-cover" : "--no-show-version-on-cover");
      if (profile.subtitle || profile.edition) args.push(`--subtitle=${[profile.subtitle, profile.edition].filter(Boolean).join(" · ")}`);
      if (profile.cover.image) args.push(`--cover-image=${profile.cover.image}`);
      if (documentClass) args.push(`--documentclass=${documentClass}`);
      if (defaultChineseClass) {
        const family = plan.tools.chineseFonts?.family;
        if (family) args.push("--variable=classoption:fontset=none", `--variable=CJKmainfont:${family}`, `--variable=CJKsansfont:${family}`, `--variable=CJKmonofont:${family}`);
        else args.push("--variable=classoption:fontset=fandol");
      }
      if (profile.license) args.push(`--license=${profile.license}`);
      if (profile.repository) args.push(`--repository=${profile.repository}`);
      if (profile.website) args.push(`--website=${profile.website}`);
      if (profile.licenseUrl) args.push(`--license-url=${profile.licenseUrl}`);
      if (profile.preferredCitation) args.push(`--preferred-citation=${profile.preferredCitation}`);
      if (profile.releaseTag) args.push(`--release-tag=${profile.releaseTag}`);
      if (profile.releaseCommit) args.push(`--release-commit=${profile.releaseCommit}`);
      if (profile.description) args.push(`--description=${profile.description}`);
      for (const keyword of profile.keywords || []) args.push(`--keyword=${keyword}`);
      const publicationDate = profile.publicationDate || createdAt.slice(0, 10);
      args.push(`--date=${publicationDate}`);
      if (plan.doi.versionDoi) args.push(`--doi=${plan.doi.versionDoi}`);
      if (plan.doi.conceptDoi) args.push(`--work-doi=${plan.doi.conceptDoi}`);
      if (plan.doi.versionDoi || plan.doi.conceptDoi) {
        const chinese = (profile.language || snapshot.config.language).toLowerCase().startsWith("zh");
        const note = plan.doi.source === "manual" ? chinese ? "DOI 由作者提供；注册信息以 DOI 服务平台记录为准。" : "DOI supplied by the author; registration details follow the DOI provider record." : plan.doi.source === "zenodo" ? chinese ? "DOI 由 Zenodo 分配；注册信息以 DOI 服务平台记录为准。" : "DOI assigned through Zenodo; registration details follow the DOI provider record." : chinese ? "DOI 信息以 DOI 服务平台记录为准。" : "DOI information follows the DOI provider record.";
        args.push(`--doi-state=${[note, profile.doi?.provenance].filter(Boolean).join(" ")}`);
      }
      for (let index = 0; index < profile.frontMatter.length; index++) {
        const entry = profile.frontMatter[index], name = `.math-workspace/publication-front-${index}.md`;
        const normalized = await matterContent(entry, `front-${index}`);
        await fs$1.writeFile(await safePath(frozen, name), normalized, "utf8");
        args.push(`--front-matter=${name}`);
        if (!entry.file && entry.title) args.push(`--front-matter-title=${entry.title}`);
        if (entry.includeInToc) args.push("--front-matter-toc");
      }
      progress.onProgress?.("Rendering cover, publication pages, contents, chapters, and conclusion");
      await invoke(args, { cwd: frozen, onProgress: progress.onProgress });
      const pdf = await fs$1.readFile(path__namespace.join(temporary2, "publication.pdf"));
      if (!pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("The PDF renderer did not produce a valid PDF file.");
      if ((await recheck().catch(() => null))?.fingerprint !== plan.fingerprint) throw new Error("Publication sources changed during PDF rendering. This build was not saved.");
      const pdfSha256 = sha256(pdf), markdownBytes = Buffer.from(markdown);
      const citation = {
        type: "book",
        title: profile.title,
        subtitle: profile.subtitle,
        author: profile.authors.map((author) => ({ literal: author.name, ORCID: author.orcid, affiliation: author.affiliation, nativeName: author.nativeName, aliases: author.aliases })),
        language: profile.language,
        abstract: profile.description,
        URL: profile.website || profile.repository,
        website: profile.website,
        repository: profile.repository,
        license: profile.license,
        licenseUrl: profile.licenseUrl,
        keyword: profile.keywords?.join(", "),
        note: profile.preferredCitation,
        .../^\d{4}-\d{2}-\d{2}$/.test(publicationDate) ? { issued: { "date-parts": [publicationDate.split("-").map(Number)] } } : {},
        version: profile.version,
        edition: profile.edition,
        sourceTag: profile.releaseTag,
        sourceCommit: profile.releaseCommit,
        DOI: plan.doi.versionDoi,
        conceptDOI: plan.doi.conceptDoi,
        doiProvenance: plan.doi,
        workId: profile.workId,
        partial: plan.partial,
        selectedPages: plan.selected.map((page) => page.path)
      };
      await fs$1.writeFile(path__namespace.join(temporary2, "citation.json"), canonical(citation), { flag: "wx" });
      const citationBytes = await fs$1.readFile(path__namespace.join(temporary2, "citation.json"));
      const extra = await writeDelivery(temporary2, frozen, plan, args, createdAt, id);
      const extraHashes = {};
      for (const name of extra) {
        const bytes = await fs$1.readFile(path__namespace.join(temporary2, name));
        extraHashes[name] = { sha256: sha256(bytes), bytes: bytes.length };
      }
      const publicArtifacts = plan.delivery ? [...PUBLIC_ARTIFACTS, ...extra.includes("lean.zip") ? ["lean.zip"] : []] : void 0;
      if (plan.delivery) {
        const release = {
          schema: "math-workspace.publication-release/v1",
          buildId: id,
          workId: profile.workId,
          version: profile.version,
          title: profile.title,
          createdAt,
          doi: plan.doi,
          source: plan.delivery.source,
          selected: plan.selected,
          partial: plan.partial,
          metadata: {
            title: profile.title,
            subtitle: profile.subtitle,
            authors: profile.authors,
            language: profile.language,
            license: profile.license,
            licenseUrl: profile.licenseUrl,
            description: profile.description,
            keywords: profile.keywords,
            website: profile.website,
            repository: profile.repository,
            publicationDate,
            edition: profile.edition
          },
          sources: plan.delivery.files,
          tools: { ...plan.tools, mathWorkspace: version },
          artifacts: { "publication.pdf": { sha256: pdfSha256, bytes: pdf.length }, "compiled.md": { sha256: sha256(markdownBytes), bytes: markdownBytes.length }, "citation.json": { sha256: sha256(citationBytes), bytes: citationBytes.length }, ...extraHashes }
        };
        const bytes = Buffer.from(canonical(release));
        await fs$1.writeFile(path__namespace.join(temporary2, "release.json"), bytes, { flag: "wx" });
        extraHashes["release.json"] = { sha256: sha256(bytes), bytes: bytes.length };
      }
      const manifest = { schema: "math-workspace.publication-manifest/v1", buildId: id, createdAt, plan, artifacts: { "publication.pdf": { sha256: pdfSha256, bytes: pdf.length }, "compiled.md": { sha256: sha256(markdownBytes), bytes: markdownBytes.length }, "citation.json": { sha256: sha256(citationBytes), bytes: citationBytes.length } }, layout: ["cover", "publication metadata", "front matter", ...profile.toc.enabled ? ["generated table of contents"] : [], "selected chapters in original order and numbering", "back matter", ...plan.continuedNotice.enabled ? ["to be continued"] : []], mathematicalCorrectnessAssessed: false, sourceArchiveSignatureAsserted: false };
      Object.assign(manifest.artifacts, extraHashes);
      const manifestBytes = canonical(manifest);
      await fs$1.writeFile(path__namespace.join(temporary2, "manifest.json"), manifestBytes, { flag: "wx" });
      const build = { schema: "math-workspace.publication-build/v1", id, profileId: profile.id, workId: profile.workId, version: profile.version, fingerprint: plan.fingerprint, createdAt, pdfSha256, markdownSha256: sha256(markdownBytes), manifestSha256: sha256(manifestBytes), files: { pdf: "publication.pdf", markdown: "compiled.md", manifest: "manifest.json", citation: "citation.json" } };
      const checksums = `${Object.entries(publicArtifacts ? manifest.artifacts : { ...manifest.artifacts, "manifest.json": { sha256: build.manifestSha256 } }).map(([name, value]) => `${value.sha256}  ${name}`).join("\n")}
`;
      await fs$1.writeFile(path__namespace.join(temporary2, "checksums.sha256"), checksums, { flag: "wx" });
      if (publicArtifacts) {
        build.publicArtifacts = publicArtifacts;
        build.checksumsSha256 = sha256(checksums);
      }
      await fs$1.writeFile(path__namespace.join(temporary2, "build.json"), canonical(build), { flag: "wx" });
      const destination = await store.directory(`builds/${profile.id}/${id}`);
      await fs$1.mkdir(path__namespace.dirname(destination), { recursive: true });
      await fs$1.rename(temporary2, destination);
      progress.onProgress?.("Immutable PDF edition saved");
      return build;
    } finally {
      await fs$1.rm(temporary2, { recursive: true, force: true });
    }
  });
}
async function publicArtifactBytes(store, build) {
  const names = build.publicArtifacts || ["publication.pdf"];
  if (new Set(names).size !== names.length || names.includes("manifest.json") || !names.includes("publication.pdf")) throw new Error("Invalid public artifact set.");
  const files = [];
  for (const artifact of names) {
    const bytes = await store.artifact(build.profileId, build.id, artifact);
    files.push({ artifact, bytes, sha256: sha256(bytes) });
  }
  return files;
}
const numericId = (value) => {
  const id = String(value ?? "");
  if (!/^[1-9][0-9]{0,24}$/.test(id)) throw new Error("Invalid Zenodo record or draft identity.");
  return id;
};
const submitted = (record) => record?.submitted === true || record?.state === "done";
const md5 = (bytes) => crypto__namespace.createHash("md5").update(bytes).digest("hex");
const checksumIdentity = (value) => {
  const text2 = String(value || "").toLowerCase();
  if (/^(?:md5:)?[a-f0-9]{32}$/.test(text2)) return `md5:${text2.replace(/^md5:/, "")}`;
  if (/^(?:sha256:)?[a-f0-9]{64}$/.test(text2)) return `sha256:${text2.replace(/^sha256:/, "")}`;
  return void 0;
};
const sameChecksum = (left, right) => !!checksumIdentity(left) && checksumIdentity(left) === checksumIdentity(right);
const checksumMatches = (value, bytes) => {
  const text2 = String(value || "").toLowerCase();
  return text2 === `md5:${md5(bytes)}` || text2 === md5(bytes) || text2 === `sha256:${sha256(bytes)}` || text2 === sha256(bytes);
};
function zenodoFileName(profile) {
  return `${profile.id}-${profile.version.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;
}
function zenodoArtifactName(profile, artifact) {
  return profile.delivery ? artifact : zenodoFileName(profile);
}
function zenodoLanguage(value) {
  if (!value) return void 0;
  const language = value.toLowerCase();
  if (/^[a-z]{3}$/.test(language)) return language;
  const known = { zh: "zho", en: "eng", de: "deu", fr: "fra", es: "spa", ja: "jpn", ko: "kor", ru: "rus", it: "ita", pt: "por", ar: "ara" };
  const result = known[language.split("-")[0]];
  if (!result) throw new Error("Zenodo language must be a supported language tag or an ISO 639-2/639-3 three-letter code.");
  return result;
}
function zenodoPublicationMetadata(profile, build) {
  if (!profile.authors?.length) throw new Error("Zenodo publication requires at least one named author.");
  if (!profile.description) throw new Error("Zenodo publication requires a description in the saved profile.");
  const date = profile.publicationDate || build?.createdAt.slice(0, 10) || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Zenodo publication date must use YYYY-MM-DD.");
  const language = zenodoLanguage(profile.language);
  const related = [profile.website ? { identifier: profile.website, relation: "isDescribedBy", scheme: "url" } : void 0, profile.repository ? { identifier: profile.repository, relation: "isDerivedFrom", scheme: "url" } : void 0].filter(Boolean);
  const notes = [
    profile.subtitle ? `Subtitle: ${profile.subtitle}` : "",
    profile.edition ? `Edition: ${profile.edition}` : "",
    profile.licenseUrl ? `License URL: ${profile.licenseUrl}` : "",
    profile.preferredCitation ? `Preferred citation: ${profile.preferredCitation}` : "",
    profile.releaseTag ? `Source tag: ${profile.releaseTag}` : "",
    profile.releaseCommit ? `Source commit: ${profile.releaseCommit}` : "",
    profile.doi?.provenance ? `DOI source note: ${profile.doi.provenance}` : "",
    ...profile.authors.flatMap((author) => [author.nativeName ? `${author.name} — native name: ${author.nativeName}` : "", author.aliases?.length ? `${author.name} — aliases: ${author.aliases.join("; ")}` : ""])
  ].filter(Boolean);
  const escape = (value) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  return { upload_type: "publication", publication_type: "book", title: profile.title, creators: profile.authors.map((author) => ({ name: author.name, ...author.orcid ? { orcid: author.orcid.replace(/^https?:\/\/orcid.org\//i, "") } : {}, ...author.affiliation ? { affiliation: author.affiliation } : {} })), description: profile.description, version: profile.version, publication_date: date, access_right: "open", license: profile.license || "cc-by-4.0", ...language ? { language } : {}, keywords: profile.keywords || [], related_identifiers: related, notes: notes.map((note) => `<p>${escape(note)}</p>`).join(""), ...profile.doi?.versionDoi ? { doi: profile.doi.versionDoi } : {} };
}
function zenodoMetadataMatches(record, expected) {
  const metadata = record?.metadata || {}, native = !!metadata.resource_type || metadata.creators?.some((author) => author.person_or_org);
  const actual = {
    ...metadata,
    license: typeof metadata.license === "string" ? metadata.license : metadata.license?.id || metadata.rights?.[0]?.id,
    creators: (metadata.creators || []).map((author) => native ? { name: author.person_or_org?.name, orcid: author.person_or_org?.identifiers?.find((item) => item.scheme === "orcid")?.identifier, affiliation: author.affiliations?.map((item) => item.name).join("; ") || void 0 } : author),
    keywords: metadata.keywords || metadata.subjects?.map((item) => item.subject) || [],
    related_identifiers: (metadata.related_identifiers || []).map((item) => ({ identifier: item.identifier, scheme: item.scheme, relation: (item.relation || item.relation_type?.id || "").toLowerCase() })),
    notes: metadata.notes || metadata.additional_descriptions?.filter((item) => item.type?.id === "notes").map((item) => item.description).join("") || "",
    ...native ? {
      upload_type: "publication",
      publication_type: metadata.resource_type?.id === "publication-book" ? "book" : void 0,
      access_right: record.access?.record === "public" || record.access?.status === "open" ? "open" : void 0,
      language: metadata.languages?.[0]?.id,
      license: metadata.rights?.[0]?.id
    } : {}
  };
  const value = (input) => Array.isArray(input) ? input.map(value) : input && typeof input === "object" ? Object.fromEntries(Object.entries(input).filter(([, item]) => item !== null && item !== void 0).map(([key, item]) => [key, value(item)])) : input;
  const ordered = (key, input) => key === "keywords" || key === "related_identifiers" ? (input || []).map((item) => key === "related_identifiers" ? { identifier: item.identifier, scheme: item.scheme, relation: (item.relation || item.relation_type?.id || "").toLowerCase() } : item).sort((a, b) => canonical(a).localeCompare(canonical(b))) : input;
  return Object.entries(expected).every(([key, item]) => canonical(value(ordered(key, actual[key]))) === canonical(value(ordered(key, item))));
}
class ZenodoHttpError extends Error {
  constructor(status) {
    super(`Zenodo request failed (HTTP ${status}); no response body or credential is retained.`);
    this.status = status;
  }
}
class ZenodoPublication {
  constructor(store, options, plan) {
    this.store = store;
    this.options = options;
    this.plan = plan;
  }
  credential(profile) {
    const tokenEnv = profile.zenodo?.tokenEnv || "ZENODO_TOKEN";
    return { tokenEnv, configured: !!(this.options.environment || process.env)[tokenEnv] };
  }
  client(profile) {
    const environment = profile.zenodo?.environment || "sandbox", origin = environment === "production" ? "https://zenodo.org" : "https://sandbox.zenodo.org";
    const token = (this.options.environment || process.env)[profile.zenodo?.tokenEnv || "ZENODO_TOKEN"];
    if (!token) throw new Error(`Zenodo credential is unavailable in the server process environment (${profile.zenodo?.tokenEnv || "ZENODO_TOKEN"}).`);
    const secureUrl = (input) => {
      const URLConstructor2 = require("node:url").URL, url2 = new URLConstructor2(input, origin);
      if (url2.origin !== origin || url2.protocol !== "https:" || url2.username || url2.password || url2.search || url2.hash || !url2.pathname.startsWith("/api/")) throw new Error("Zenodo returned an untrusted API URL.");
      return url2.toString();
    };
    const request = async (input, method = "GET", body, binary = false, native = false) => {
      const url2 = secureUrl(input), fetcher = this.options.fetch || globalThis.fetch;
      if (!fetcher) throw new Error("This Node.js runtime does not provide fetch for Zenodo.");
      let response;
      try {
        response = await fetcher(url2, { method, redirect: "error", headers: { Authorization: `Bearer ${token}`, ...native ? { Accept: "application/vnd.inveniordm.v1+json" } : {}, ...body !== void 0 ? { "Content-Type": binary ? "application/octet-stream" : "application/json" } : {} }, ...body !== void 0 ? { body: binary ? body : JSON.stringify(body) } : {} });
      } catch {
        throw new Error("Zenodo request result is unknown. Reconcile the existing draft or record before retrying a creation or publication.");
      }
      if (!response.ok) throw new ZenodoHttpError(response.status);
      if (response.status === 204) return null;
      try {
        return await response.json();
      } catch {
        throw new Error("Zenodo returned an invalid JSON acknowledgement. Reconcile its existing draft before retrying.");
      }
    };
    return { environment, origin, secureUrl, request };
  }
  async nativeDraft(client2, id) {
    const draft = await client2.request(`/api/records/${numericId(id)}/draft`, "GET", void 0, false, true);
    if (String(draft?.id) !== id || draft.is_published === true || draft.is_draft !== true) throw new Error("Zenodo did not return the expected editable native draft.");
    return draft;
  }
  authoritativeDraft(record, native) {
    const doi = normalizeDoi(native.pids?.doi?.identifier);
    return { ...record, doi, metadata: { ...record.metadata, doi, prereserve_doi: doi ? { doi, recid: String(record.id) } : void 0 } };
  }
  nextState(profile, record, previous) {
    const id = numericId(record.id), published = submitted(record), doi = normalizeDoi(record.doi || record.metadata?.doi || (published ? record.metadata?.prereserve_doi?.doi : previous?.versionDoi)), conceptDoi = normalizeDoi(record.conceptdoi || record.concept_doi || previous?.conceptDoi);
    const conceptRecordId = record.conceptrecid ? numericId(record.conceptrecid) : previous?.conceptRecordId;
    if (previous?.conceptRecordId && conceptRecordId && previous.conceptRecordId !== conceptRecordId) throw new Error("Zenodo returned a different work record identity. The existing binding is retained.");
    if (previous?.conceptDoi && conceptDoi && previous.conceptDoi !== conceptDoi) throw new Error("Zenodo returned a different work DOI. The existing work binding is retained.");
    if (profile.doi?.versionDoi && doi && profile.doi.versionDoi !== doi) throw new Error("The manually entered version DOI differs from this Zenodo draft. Reconcile the DOI before proceeding.");
    if (profile.doi?.conceptDoi && conceptDoi && profile.doi.conceptDoi !== conceptDoi) throw new Error("The manually entered work DOI differs from the bound Zenodo work.");
    const origin = profile.zenodo?.environment === "production" ? "https://zenodo.org" : "https://sandbox.zenodo.org";
    const ownedFiles = (previous?.ownedFiles || []).filter((file) => file.draftId === id);
    const owned = [previous?.upload, ...previous?.upload?.files || [], ...previous?.history || [], ...(previous?.history || []).flatMap((item) => item.files || []), ...ownedFiles].filter(Boolean);
    const draftFiles = (record.files || []).map((file) => ({ name: String(file.filename || file.key || ""), checksum: String(file.checksum || ""), bytes: Number(file.filesize || file.size) || void 0, owned: owned.some((item) => item.fileName === (file.filename || file.key) && sameChecksum(item.remoteChecksum, file.checksum)) }));
    const expected = previous?.upload?.files || (previous?.upload ? [previous.upload] : []);
    const uploadMatches = previous?.upload && (previous.draftId === id || previous.recordId === id) && draftFiles.length === expected.length && expected.every((item) => draftFiles.some((file) => file.name === item.fileName && sameChecksum(file.checksum, item.remoteChecksum)));
    return { schema: "math-workspace.publication-zenodo/v1", environment: profile.zenodo?.environment || "sandbox", status: published ? "published" : "draft", ...published ? { recordId: id } : { draftId: id }, conceptRecordId, versionDoi: doi, conceptDoi, recordUrl: `${origin}/${published ? "records" : "deposit"}/${id}`, history: previous?.history || [], draftFiles, ownedFiles, ...uploadMatches ? { upload: previous.upload } : {} };
  }
  metadata(profile, build) {
    return zenodoPublicationMetadata(profile, build);
  }
  metadataMatches(record, expected) {
    return zenodoMetadataMatches(record, expected);
  }
  nativeMetadata(native, expected) {
    const creators = expected.creators.map((author) => {
      const [family, ...given] = author.name.split(",");
      return { person_or_org: { type: "personal", name: author.name, family_name: family.trim(), ...given.length ? { given_name: given.join(",").trim() } : {}, ...author.orcid ? { identifiers: [{ scheme: "orcid", identifier: author.orcid }] } : {} }, ...author.affiliation ? { affiliations: [{ name: author.affiliation }] } : {} };
    });
    return {
      metadata: {
        ...native.metadata,
        resource_type: { id: "publication-book" },
        title: expected.title,
        creators,
        description: expected.description,
        version: expected.version,
        publication_date: expected.publication_date,
        publisher: native.metadata?.publisher || "Zenodo",
        rights: [{ id: expected.license }],
        subjects: (expected.keywords || []).map((subject) => ({ subject })),
        related_identifiers: (expected.related_identifiers || []).map((item) => ({ identifier: item.identifier, scheme: item.scheme, relation_type: { id: item.relation.toLowerCase() } })),
        languages: expected.language ? [{ id: expected.language }] : [],
        additional_descriptions: [...(native.metadata?.additional_descriptions || []).filter((item) => item.type?.id !== "notes"), ...expected.notes ? [{ description: expected.notes, type: { id: "notes" } }] : []]
      },
      pids: native.pids,
      access: { record: "public", files: "public" },
      ...native.custom_fields ? { custom_fields: native.custom_fields } : {}
    };
  }
  checkBinding(profile, remote) {
    if (remote && remote.environment !== (profile.zenodo?.environment || "sandbox")) throw new Error("This publication is already bound to a different Zenodo environment.");
  }
  bucket(client2, record) {
    if (!record.links?.bucket) throw new Error("Zenodo did not provide an editable draft upload bucket.");
    const bucket = client2.secureUrl(record.links.bucket).replace(/\/$/, "");
    if (!/^\/api\/files\/[a-zA-Z0-9-]+$/.test(new (require("node:url")).URL(bucket).pathname)) throw new Error("Zenodo returned an untrusted upload bucket.");
    return bucket;
  }
  async checkOtherWorkBinding(profile) {
    for (const saved of await this.store.profiles()) if (saved.profile.id !== profile.id && saved.profile.workId === profile.workId && (saved.profile.zenodo?.environment || "sandbox") === profile.zenodo.environment && await this.store.remote(saved.profile.id)) throw new Error(`This work already has a Zenodo binding in publication profile ${saved.profile.id}. Continue its existing profile instead of creating a disconnected record.`);
  }
  async reserve(profileId, expectedRevision, options) {
    return this.store.locked(profileId, async () => {
      const { profile: raw } = await this.store.expectProfile(profileId, expectedRevision), profile = resolvePublicationMetadata(normalizeProfile(raw), (await readPublicationMetadata(this.store.root)).config), client2 = this.client(profile);
      let remote = await this.store.remote(profileId);
      this.checkBinding(profile, remote);
      if (remote?.pending) throw new Error("A previous Zenodo operation has an unresolved result. Attach its existing draft or record to reconcile it before continuing.");
      if (options.mode === "new-version") {
        if (remote?.status !== "published" || remote.recordId !== numericId(options.expectedRecordId)) throw new Error("Creating a new version requires the reviewed latest published record identity.");
        if (profile.doi?.versionDoi) throw new Error("Remove the manually entered version DOI before reserving a new Zenodo version DOI. The stable work DOI can be retained.");
        const record = await client2.request(`/api/deposit/depositions/${remote.recordId}`);
        if (!submitted(record)) throw new Error("The bound Zenodo record is not published. Reconcile its status first.");
        const prior = remote;
        remote = await this.store.writeRemote(profileId, { ...remote, status: "unknown", pending: { action: "new-version", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: remote.recordId } });
        const result = await client2.request(`/api/deposit/depositions/${prior.recordId}/actions/newversion`, "POST");
        const latest = result?.links?.latest_draft;
        if (!latest) throw new Error("Zenodo did not acknowledge a latest draft. Attach the existing new-version draft explicitly.");
        const verified = client2.secureUrl(latest), idMatch = /\/api\/deposit\/depositions\/([1-9][0-9]*)\/?$/.exec(verified);
        if (!idMatch) throw new Error("Zenodo returned an invalid latest draft identity.");
        remote = await this.store.writeRemote(profileId, { ...prior, status: "unknown", pending: { action: "new-version", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: idMatch[1] }, recordId: void 0, draftId: idMatch[1], versionDoi: void 0, upload: void 0, history: [...prior.history || [], { recordId: prior.recordId, versionDoi: prior.versionDoi, buildId: prior.upload?.buildId, pdfSha256: prior.upload?.pdfSha256, fileName: prior.upload?.fileName, remoteChecksum: prior.upload?.remoteChecksum, ...prior.upload?.files ? { files: prior.upload.files } : {} }] });
        const draft2 = await client2.request(verified);
        if (submitted(draft2)) throw new Error("Zenodo returned a published record instead of an editable new-version draft.");
        remote = await this.store.writeRemote(profileId, this.nextState(profile, draft2, remote));
      } else if (options.mode !== "reuse-or-create") throw new Error("Choose draft reuse or an explicit new version.");
      else if (remote?.status === "published") throw new Error("This edition is published and immutable. Use the explicit new-version action to continue the same work.");
      if (!remote) {
        if (profile.doi?.versionDoi || profile.doi?.conceptDoi) throw new Error("A manual version or work DOI is already present. Attach its existing Zenodo record before continuing the same work, or remove the manual DOI before creating a new Zenodo work.");
        this.metadata(profile);
        const marker2 = await this.store.locked("zenodo-work-bindings", async () => {
          await this.checkOtherWorkBinding(profile);
          return this.store.writeRemote(profileId, { schema: "math-workspace.publication-zenodo/v1", environment: client2.environment, status: "unknown", pending: { action: "create", startedAt: (/* @__PURE__ */ new Date()).toISOString() } });
        }, "provider");
        let created;
        try {
          created = await client2.request("/api/deposit/depositions", "POST", {});
        } catch (error) {
          if (error instanceof ZenodoHttpError && [401, 403].includes(error.status)) {
            const current = await this.store.remote(profileId);
            if (current?.revision === marker2.revision && current.pending?.action === "create" && !current.draftId && !current.recordId && !current.conceptRecordId && !current.versionDoi && !current.conceptDoi && !current.pending.recordId && !current.pending.buildId) {
              await require("node:fs/promises").unlink(await this.store.directory(`remote/${profileId}.json`));
            }
          }
          throw error;
        }
        if (submitted(created)) throw new Error("Zenodo returned an unexpected published record.");
        await this.store.writeRemote(profileId, { schema: "math-workspace.publication-zenodo/v1", environment: client2.environment, status: "unknown", draftId: numericId(created.id), pending: { action: "create", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: numericId(created.id) } });
        remote = await this.store.writeRemote(profileId, this.nextState(profile, created));
      }
      if (!remote.draftId || remote.status !== "draft") throw new Error("Attach a known editable Zenodo draft before reserving a DOI.");
      const draft = await client2.request(`/api/deposit/depositions/${numericId(remote.draftId)}`);
      if (submitted(draft)) throw new Error("Published Zenodo files and metadata cannot be overwritten. Reconcile the record and create a new version.");
      let native = await this.nativeDraft(client2, remote.draftId);
      if (!native.pids?.doi?.identifier) {
        if (profile.doi?.versionDoi) throw new Error("The existing Zenodo draft has no native DOI binding matching the manually supplied DOI. Reconcile it in Zenodo before continuing.");
        await this.store.writeRemote(profileId, { ...remote, status: "unknown", pending: { action: "reserve-doi", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: remote.draftId } });
        await client2.request(`/api/records/${remote.draftId}/draft/pids/doi`, "POST", void 0, false, true);
        native = await this.nativeDraft(client2, remote.draftId);
      }
      remote = await this.store.writeRemote(profileId, this.nextState(profile, this.authoritativeDraft(draft, native), remote));
      if (!remote.versionDoi) throw new Error("Zenodo has not acknowledged a reserved version DOI. The draft is retained for reconciliation.");
      return remote;
    });
  }
  async attach(profileId, expectedRevision, options) {
    return this.store.locked(profileId, async () => {
      const { profile: raw } = await this.store.expectProfile(profileId, expectedRevision), profile = resolvePublicationMetadata(normalizeProfile(raw), (await readPublicationMetadata(this.store.root)).config), client2 = this.client(profile), previous = await this.store.remote(profileId);
      this.checkBinding(profile, previous);
      if (!["draft", "record"].includes(options.kind)) throw new Error("Choose draft or published record.");
      let record = await client2.request(`/api/deposit/depositions/${numericId(options.id)}`);
      if (submitted(record) !== (options.kind === "record")) throw new Error("The selected Zenodo identity has a different publication status.");
      if (!submitted(record)) record = this.authoritativeDraft(record, await this.nativeDraft(client2, String(record.id)));
      const sameKnownRecord = previous && [previous.draftId, previous.recordId, ...(previous.history || []).map((item) => item.recordId)].includes(String(record.id));
      if (previous && !sameKnownRecord && (previous.conceptRecordId || previous.conceptDoi) && !record.conceptrecid && !record.conceptdoi && !record.concept_doi) throw new Error("Zenodo did not provide the work identity needed to reconcile this different record.");
      let recovered = previous;
      if (!submitted(record) && previous?.pending?.action === "upload" && previous.pending.buildId && (previous.draftId || previous.pending.recordId) === String(record.id)) {
        const build = await this.store.build(profileId, previous.pending.buildId);
        await this.store.artifact(profileId, build.id, "publication.pdf");
        const manifest = JSON.parse((await this.store.artifact(profileId, build.id, "manifest.json")).toString("utf8"));
        const builtProfile = normalizeProfile(manifest.plan.profile);
        if (build.workId !== profile.workId || builtProfile.id !== profile.id || builtProfile.workId !== profile.workId) throw new Error("The interrupted upload build belongs to a different work.");
        const ownedFiles = [...previous.ownedFiles || []];
        for (const expected of await publicArtifactBytes(this.store, build)) {
          const name = zenodoArtifactName(builtProfile, expected.artifact), file = (record.files || []).find((file2) => (file2.filename || file2.key) === name && checksumMatches(file2.checksum, expected.bytes) && (!(file2.filesize || file2.size) || Number(file2.filesize || file2.size) === expected.bytes.length));
          if (file) {
            const old = ownedFiles.findIndex((item) => item.draftId === String(record.id) && item.fileName === name);
            if (old >= 0) ownedFiles.splice(old, 1);
            ownedFiles.push({ draftId: String(record.id), buildId: build.id, pdfSha256: build.pdfSha256, fileName: name, remoteChecksum: String(file.checksum) });
          }
        }
        recovered = { ...previous, ownedFiles };
      }
      const next = this.nextState(profile, record, recovered);
      if (previous && previous.draftId !== next.draftId && previous.recordId !== next.recordId && previous.conceptRecordId && next.conceptRecordId !== previous.conceptRecordId) throw new Error("The selected Zenodo record belongs to a different work.");
      return this.store.locked("zenodo-work-bindings", async () => {
        await this.checkOtherWorkBinding(profile);
        return this.store.writeRemote(profileId, next);
      }, "provider");
    });
  }
  async reviewed(profileId, buildId2, review) {
    const saved = await this.store.profile(profileId);
    if (!saved) throw new Error("Save the publication profile first.");
    const currentPlan = await this.plan(saved.profile).catch(() => null);
    if (!currentPlan) throw new Error("The selected sources, profile, or DOI binding changed. Build and review a fresh edition before uploading or publishing.");
    const profile = currentPlan.profile, build = await this.store.build(profileId, buildId2), remote = await this.store.remote(profileId);
    this.checkBinding(profile, remote);
    if (!remote || remote.revision !== review.remoteRevision) throw new Error("The Zenodo draft state changed. Reload and review it again.");
    if (remote.pending) throw new Error("Reconcile the unresolved Zenodo operation before continuing.");
    if (remote.status !== "draft" || !remote.draftId) throw new Error("Only an editable Zenodo draft can receive this edition; published records are immutable.");
    if (build.pdfSha256 !== review.pdfSha256) throw new Error("The reviewed PDF digest does not match this build.");
    if (build.publicArtifacts && review.manifestSha256 !== build.manifestSha256) throw new Error("Review the complete edition manifest before delivering its files.");
    const manifest = JSON.parse((await this.store.artifact(profileId, buildId2, "manifest.json")).toString("utf8"));
    if (canonical(normalizeProfile(manifest.plan.profile)) !== canonical(profile) || currentPlan.fingerprint !== build.fingerprint) throw new Error("The selected sources, profile, or DOI binding changed. Build and review a fresh edition before uploading or publishing.");
    const client2 = this.client(profile), native = await this.nativeDraft(client2, remote.draftId);
    if (!native.pids?.doi?.identifier || normalizeDoi(native.pids.doi.identifier) !== manifest.plan.doi.versionDoi || manifest.plan.doi.source === "zenodo" && native.pids.doi.provider !== "datacite") throw new Error("The native Zenodo DOI reservation differs from this PDF or lost its registration provider. Reconcile the actual DOI before uploading or publishing.");
    const bytes = await this.store.artifact(profileId, buildId2, "publication.pdf");
    return { profile, profileInput: saved.profile, build, remote, bytes, files: await publicArtifactBytes(this.store, build), client: client2, native, metadata: this.metadata(profile, build) };
  }
  exactFiles(record, profile, expected) {
    return Array.isArray(record?.files) && record.files.length === expected.length && expected.every((item) => record.files.filter((file) => (file.filename || file.key) === zenodoArtifactName(profile, item.artifact) && checksumMatches(file.checksum, item.bytes) && Number(file.filesize ?? file.size) === item.bytes.length).length === 1);
  }
  uploadPlan(profile, build, remote, record, metadata) {
    if (submitted(record)) throw new Error("The Zenodo draft was already published. Its files cannot be overwritten.");
    const names = (build.publicArtifacts || ["publication.pdf"]).map((artifact) => zenodoArtifactName(profile, artifact)), owned = [remote.upload, ...remote.upload?.files || [], ...remote.history || [], ...(remote.history || []).flatMap((item) => item.files || []), ...(remote.ownedFiles || []).filter((file) => file.draftId === remote.draftId)].filter(Boolean);
    const files = (record.files || []).map((file) => ({ id: String(file.id || ""), name: String(file.filename || file.key || ""), checksum: String(file.checksum || ""), bytes: Number(file.filesize || file.size) || void 0, owned: owned.some((item) => item.fileName === (file.filename || file.key) && sameChecksum(item.remoteChecksum, file.checksum)) })).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    const content = { profileId: profile.id, buildId: build.id, draftId: remote.draftId, remoteRevision: remote.revision, pdfSha256: build.pdfSha256, files, metadataSha256: sha256(canonical(metadata)), target: names, manifestSha256: build.manifestSha256, bucket: String(record.links?.bucket || "") };
    return { profileId: profile.id, buildId: build.id, draftId: remote.draftId, remoteRevision: remote.revision, pdfSha256: build.pdfSha256, fingerprint: sha256(canonical(content)), files: files.map(({ id, ...file }) => file), add: names.filter((name) => !files.some((file) => file.name === name)), replace: files.filter((file) => names.includes(file.name) && file.owned).map((file) => file.name), remove: files.filter((file) => !names.includes(file.name) && file.owned).map((file) => file.name), blocked: files.filter((file) => !file.owned).map((file) => file.name) };
  }
  async reviewUpload(profileId, buildId2, review) {
    const { profile, build, remote, client: client2, metadata } = await this.reviewed(profileId, buildId2, review);
    const draft = await client2.request(`/api/deposit/depositions/${remote.draftId}`);
    this.bucket(client2, draft);
    return this.uploadPlan(profile, build, remote, draft, metadata);
  }
  async upload(profileId, buildId2, review) {
    return this.store.locked(profileId, async () => {
      const { profile, profileInput, build, remote, files, client: client2, native, metadata } = await this.reviewed(profileId, buildId2, review), name = zenodoArtifactName(profile, "publication.pdf");
      const draft = await client2.request(`/api/deposit/depositions/${remote.draftId}`);
      const bucket = this.bucket(client2, draft);
      const preflight = this.uploadPlan(profile, build, remote, draft, metadata);
      if (!review.uploadFingerprint || review.uploadFingerprint !== preflight.fingerprint) throw new Error("The Zenodo upload file plan changed or was not reviewed. Review its exact file changes before uploading.");
      if (preflight.blocked.length) throw new Error(`The Zenodo draft contains files not owned by this publication workflow (${preflight.blocked.join(", ")}). Review them in Zenodo before uploading this edition.`);
      await this.store.writeRemote(profileId, { ...remote, pending: { action: "upload", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: remote.draftId, buildId: buildId2 } });
      for (const file of draft.files || []) {
        const id = String(file.id || "");
        if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("Zenodo returned an invalid draft file identity.");
        await client2.request(`/api/deposit/depositions/${remote.draftId}/files/${id}`, "DELETE");
      }
      const delivered = [];
      for (const file of files) {
        const fileName = zenodoArtifactName(profile, file.artifact), acknowledgement = await client2.request(`${bucket}/${encodeURIComponent(fileName)}`, "PUT", file.bytes, true);
        if (!checksumMatches(acknowledgement?.checksum, file.bytes)) throw new Error("Zenodo did not acknowledge an exact artifact checksum. Reconcile the draft before publishing.");
        delivered.push({ artifact: file.artifact, fileName, sha256: file.sha256, bytes: file.bytes.length, remoteChecksum: String(acknowledgement.checksum) });
      }
      await client2.request(`/api/records/${remote.draftId}/draft`, "PUT", this.nativeMetadata(native, metadata), false, true);
      const observed = await client2.request(`/api/deposit/depositions/${remote.draftId}`);
      if (submitted(observed) || !this.exactFiles(observed, profile, files)) throw new Error("The Zenodo draft file set differs from this exact edition.");
      if ((await this.plan(profileInput)).fingerprint !== build.fingerprint) throw new Error("Publication inputs changed during upload. The draft remains unpublished; build and review a fresh edition.");
      const upload = { buildId: buildId2, pdfSha256: build.pdfSha256, metadataSha256: sha256(canonical(metadata)), fileName: name, remoteChecksum: delivered.find((file) => file.artifact === "publication.pdf").remoteChecksum, uploadedAt: (/* @__PURE__ */ new Date()).toISOString(), ...build.publicArtifacts ? { files: delivered, manifestSha256: build.manifestSha256 } : {} };
      return this.store.writeRemote(profileId, this.nextState(profile, observed, { ...remote, upload }));
    });
  }
  async publish(profileId, buildId2, review) {
    return this.store.locked(profileId, async () => {
      const { profile, profileInput, build, remote, files, client: client2, metadata } = await this.reviewed(profileId, buildId2, review);
      if (remote.draftId !== numericId(review.recordId) || remote.upload?.buildId !== buildId2 || remote.upload?.pdfSha256 !== build.pdfSha256 || remote.upload?.metadataSha256 !== sha256(canonical(metadata))) throw new Error("Publication requires the reviewed record identity and the exact uploaded edition.");
      const draft = await client2.request(`/api/deposit/depositions/${remote.draftId}`);
      if (submitted(draft) || !this.exactFiles(draft, profile, files)) throw new Error("The Zenodo draft changed after upload. Review and upload the exact edition again.");
      if (!this.metadataMatches(draft, metadata)) throw new Error("The Zenodo publication metadata changed after review. Upload the reviewed edition again.");
      if ((await this.plan(profileInput).catch(() => null))?.fingerprint !== build.fingerprint) throw new Error("Publication inputs changed before publication. Build and review a fresh edition; the draft remains unpublished.");
      await this.store.writeRemote(profileId, { ...remote, status: "unknown", pending: { action: "publish", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: remote.draftId, buildId: buildId2 } });
      const result = await client2.request(`/api/deposit/depositions/${remote.draftId}/actions/publish`, "POST");
      if (!submitted(result)) throw new Error("Zenodo has not confirmed publication. Attach the existing record to reconcile the result.");
      const returnedDoi = normalizeDoi(result.doi || result.metadata?.doi || result.metadata?.prereserve_doi?.doi);
      const metadataMatches = this.metadataMatches(result, metadata);
      if (String(result.id) !== remote.draftId || !this.exactFiles(result, profile, files) || !metadataMatches || returnedDoi !== remote.versionDoi) throw new Error("Zenodo publication acknowledgement differs from the reviewed edition. The remote result requires reconciliation before claiming publication success.");
      return this.store.writeRemote(profileId, this.nextState(profile, result, remote));
    });
  }
}
const URLConstructor = require("node:url").URL;
class VerificationProblem extends Error {
  constructor(status, message, httpStatus) {
    super(message);
    this.status = status;
    this.httpStatus = httpStatus;
  }
}
const problem = (message) => {
  throw new VerificationProblem("failed", message);
};
const observation = (error, url2) => error instanceof VerificationProblem ? { status: error.status, detail: error.message, url: url2, ...error.httpStatus ? { httpStatus: error.httpStatus } : {} } : { status: "pending", detail: "The public request could not be completed. Retry verification; publication is not repeated.", url: url2 };
class PublicReader {
  constructor(options, origin) {
    this.options = options;
    this.origin = origin;
  }
  url(value, kind) {
    let url2;
    try {
      url2 = new URLConstructor(value);
    } catch {
      return problem("The public service returned an invalid URL.");
    }
    const resolver = kind === "doi" && ["https://doi.org", "https://handle.test.datacite.org"].includes(url2.origin);
    if (url2.protocol !== "https:" || url2.username || url2.password || url2.hash || url2.origin !== this.origin && !resolver) problem("The public service returned an untrusted URL.");
    if (url2.search && !(kind === "file" && url2.search === "?download=1")) problem("The public service returned an untrusted URL query.");
    if (kind === "record" && !/^\/api\/records\/[1-9][0-9]*$/.test(url2.pathname)) problem("Invalid public record URL.");
    if (kind === "file" && !/^\/(?:api\/files\/[a-zA-Z0-9-]+\/[^/]+|api\/records\/[1-9][0-9]*\/files\/[^/]+\/content|records?\/[1-9][0-9]*\/files\/[^/]+)$/.test(url2.pathname)) problem("Invalid public file URL.");
    return url2;
  }
  async open(value, kind) {
    const url2 = this.url(value, kind).toString(), controller = new globalThis.AbortController();
    const timer = setTimeout(() => controller.abort(), 3e4), close = () => clearTimeout(timer);
    try {
      const response = await (this.options.fetch || globalThis.fetch)(url2, {
        method: "GET",
        redirect: "manual",
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
        headers: { Accept: kind === "record" ? "application/json" : kind === "file" ? "*/*" : "text/html", "User-Agent": "math-workspace publication verification (https://github.com/glenzli/math-workspace)" }
      });
      return { response, url: url2, close };
    } catch {
      close();
      throw new VerificationProblem("pending", "The public request could not be completed. Retry verification; publication is not repeated.");
    }
  }
  async bytes(response, limit, consume) {
    const length = response.headers.get("content-length");
    if (length && (!/^\d+$/.test(length) || Number(length) > limit)) problem("The public response exceeded the expected size.");
    const reader = response.body?.getReader();
    if (!reader) problem("The public response did not provide a readable body.");
    let size = 0;
    try {
      for (; ; ) {
        const item = await reader.read();
        if (item.done) break;
        const bytes = Buffer.from(item.value);
        size += bytes.length;
        if (size > limit) problem("The public response exceeded the expected size.");
        consume(bytes);
      }
    } finally {
      await reader.cancel().catch(() => void 0);
      reader.releaseLock();
    }
    return size;
  }
  checkHttp(response) {
    if (response.status !== 200) throw new VerificationProblem([404, 408, 409, 425, 429].includes(response.status) || response.status >= 500 ? "pending" : "failed", "The public endpoint is not available with HTTP 200. Retry after checking its public availability.", response.status);
  }
  async record(id) {
    const opened = await this.open(`${this.origin}/api/records/${id}`, "record");
    try {
      this.checkHttp(opened.response);
      const parts = [];
      await this.bytes(opened.response, 2 * 1024 * 1024, (bytes) => parts.push(bytes));
      try {
        return JSON.parse(Buffer.concat(parts).toString("utf8"));
      } catch {
        return problem("The public record response is not valid JSON.");
      }
    } finally {
      await opened.response.body?.cancel().catch(() => void 0);
      opened.close();
    }
  }
  async download(value, expectedBytes) {
    for (let hop = 0; hop < 6; hop++) {
      const opened = await this.open(value, "file");
      try {
        if ([301, 302, 303, 307, 308].includes(opened.response.status)) {
          const next = opened.response.headers.get("location");
          if (!next) problem("The public file redirect has no destination.");
          value = this.url(new URLConstructor(next, opened.url).toString(), "file").toString();
          continue;
        }
        this.checkHttp(opened.response);
        const digest = crypto__namespace.createHash("sha256");
        const bytes = await this.bytes(opened.response, expectedBytes, (part) => digest.update(part));
        return { bytes, sha256: digest.digest("hex"), url: opened.url };
      } finally {
        await opened.response.body?.cancel().catch(() => void 0);
        opened.close();
      }
    }
    return problem("The public file has too many redirects.");
  }
  async resolve(value, recordId) {
    for (let hop = 0; hop < 6; hop++) {
      const opened = await this.open(value, "doi");
      try {
        if ([301, 302, 303, 307, 308].includes(opened.response.status)) {
          const next = opened.response.headers.get("location");
          if (!next) problem("The DOI redirect has no destination.");
          value = this.url(new URLConstructor(next, opened.url).toString(), "doi").toString();
          continue;
        }
        this.checkHttp(opened.response);
        const url2 = this.url(opened.url, "doi");
        if (url2.origin !== this.origin || !new RegExp(`^/records?/${recordId}/?$`).test(url2.pathname)) problem("The DOI does not resolve to this exact published edition.");
        return opened.url;
      } finally {
        await opened.response.body?.cancel().catch(() => void 0);
        opened.close();
      }
    }
    return problem("The DOI has too many redirects.");
  }
}
function publicRecord(record, profile, id, doi, conceptDoi, name, bytes, expectedMetadata, expectedFiles) {
  if (String(record?.id) !== id || record.is_published === false || ["draft", "unsubmitted"].includes(record.status || record.state)) problem("The public record identity or publication status differs from this edition.");
  const metadata = record.metadata || {};
  const recordDoi = (value) => {
    try {
      return normalizeDoi(value);
    } catch {
      return problem("The public record contains an invalid DOI.");
    }
  };
  const actualDoi = recordDoi(record.doi || record.pids?.doi?.identifier || metadata.doi);
  let parentDoi;
  if (record.links?.parent_doi) {
    let link;
    try {
      link = new URLConstructor(record.links.parent_doi);
    } catch {
      return problem("The public work DOI link is invalid.");
    }
    if (!["https://doi.org", "https://handle.test.datacite.org"].includes(link.origin) || link.username || link.password || link.search || link.hash) problem("The public work DOI link is untrusted.");
    parentDoi = decodeURIComponent(link.pathname.slice(1));
  }
  const actualConcept = recordDoi(record.conceptdoi || record.concept_doi || record.parent?.pids?.doi?.identifier || parentDoi);
  if (actualDoi !== doi || conceptDoi && actualConcept !== conceptDoi) problem("The public record DOI differs from the bound edition or work.");
  if (!Array.isArray(metadata.creators)) problem("The public creators are invalid.");
  const authors = metadata.creators.map((author) => author?.name || author?.person_or_org?.name);
  const license = typeof metadata.license === "string" ? metadata.license : metadata.license?.id || metadata.rights?.[0]?.id;
  if (metadata.title !== profile.title || metadata.version !== profile.version || canonical(authors) !== canonical(profile.authors.map((author) => author.name)) || license !== (profile.license || "cc-by-4.0")) problem("The public title, version, creators or license differs from the frozen edition.");
  if (expectedMetadata && !zenodoMetadataMatches(record, expectedMetadata)) problem("The public author identities, source links or publication metadata differ from the frozen edition.");
  const files = Array.isArray(record.files) ? record.files : Object.entries(record.files?.entries || {}).map(([key, file]) => ({ ...file, key }));
  const expected = expectedFiles || [{ artifact: "publication.pdf", bytes, sha256: sha256(bytes) }];
  if (files.length !== expected.length) problem("The public file set differs from this edition.");
  const observed = expected.map((item) => {
    const target = expectedFiles ? zenodoArtifactName(profile, item.artifact) : name;
    const matches = files.filter((file2) => (file2.key || file2.filename) === target);
    if (matches.length !== 1) problem("The public file set contains a missing or repeated filename.");
    const file = matches[0], checksum = String(file.checksum || "").toLowerCase(), md52 = crypto__namespace.createHash("md5").update(item.bytes).digest("hex");
    if (Number(file.size ?? file.filesize) !== item.bytes.length || ![md52, `md5:${md52}`, item.sha256, `sha256:${item.sha256}`].includes(checksum)) problem("The public filename, size or checksum differs from a frozen artifact.");
    return { artifact: item.artifact, name: target, size: item.bytes.length, checksum, fileUrl: file.links?.content || file.links?.download || file.links?.self };
  });
  return { snapshot: { id, doi: actualDoi, conceptDoi: actualConcept, title: metadata.title, version: metadata.version, authors, license, ...expectedMetadata ? { expectedMetadata } : {}, files: observed }, fileUrl: observed.find((file) => file.artifact === "publication.pdf")?.fileUrl, files: observed };
}
async function verifyPublishedEdition(store, options, profileId, buildId2, request) {
  return store.locked(profileId, async () => {
    const id = String(request.recordId || "");
    if (!/^[1-9][0-9]{0,24}$/.test(id)) throw new Error("Invalid published record identity.");
    const saved = await store.profile(profileId), build = await store.build(profileId, buildId2), remote = await store.remote(profileId);
    if (!saved || build.workId !== saved.profile.workId || build.pdfSha256 !== request.pdfSha256) throw new Error("The verification request does not match the frozen PDF and work.");
    const binding = remote?.status === "published" && remote.recordId === id ? { ...remote.upload, versionDoi: remote.versionDoi } : remote?.history?.find((item) => item.recordId === id);
    if (!remote || !binding || binding.buildId && binding.buildId !== buildId2 || binding.pdfSha256 && binding.pdfSha256 !== build.pdfSha256) throw new Error("Verify a published record bound to this exact edition, or attach the existing published record first.");
    const bytes = await store.artifact(profileId, buildId2, "publication.pdf"), manifest = JSON.parse((await store.artifact(profileId, buildId2, "manifest.json")).toString("utf8"));
    const profile = normalizeProfile(manifest.plan.profile), doi = normalizeDoi(manifest.plan.doi.versionDoi), conceptDoi = normalizeDoi(manifest.plan.doi.conceptDoi || remote.conceptDoi);
    if (profile.id !== profileId || profile.workId !== build.workId || profile.version !== build.version || !doi || binding.versionDoi !== doi) throw new Error("The frozen edition DOI does not match the bound published record.");
    const origin = remote.environment === "production" ? "https://zenodo.org" : "https://sandbox.zenodo.org";
    const resolver = remote.environment === "production" ? "doi.org" : "handle.test.datacite.org";
    const recordUrl = `${origin}/api/records/${id}`, doiUrl = `https://${resolver}/${doi.split("/").map(encodeURIComponent).join("/")}`;
    const notChecked = { status: "pending", detail: "Not yet checked." };
    const result = {
      schema: "math-workspace.publication-verification/v1",
      profileId,
      workId: build.workId,
      buildId: buildId2,
      recordId: id,
      environment: remote.environment,
      checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "pending",
      versionDoi: doi,
      pdfSha256: build.pdfSha256,
      record: { ...notChecked, url: recordUrl },
      file: { ...notChecked, expectedBytes: bytes.length },
      doi: { ...notChecked, url: doiUrl, resolver }
    };
    const client2 = new PublicReader(options, origin);
    const expectedMetadata = manifest.plan.projectMetadata !== void 0 ? zenodoPublicationMetadata(profile, build) : void 0;
    const artifacts = build.publicArtifacts ? await publicArtifactBytes(store, build) : void 0;
    try {
      const first = publicRecord(await client2.record(id), profile, id, doi, conceptDoi, zenodoFileName(profile), bytes, expectedMetadata, artifacts);
      result.record = { status: "passed", detail: "The anonymous public record matches the edition DOI, work DOI, title, version, creators, license and PDF file metadata.", url: recordUrl, httpStatus: 200 };
      try {
        const fileUrl = first.fileUrl || `${origin}/records/${id}/files/${encodeURIComponent(zenodoArtifactName(profile, "publication.pdf"))}`;
        const downloaded = await client2.download(fileUrl, bytes.length);
        result.file = { status: downloaded.sha256 === build.pdfSha256 && downloaded.bytes === bytes.length ? "passed" : "failed", detail: downloaded.sha256 === build.pdfSha256 && downloaded.bytes === bytes.length ? "The anonymously downloaded PDF matches the frozen PDF byte count and SHA-256." : "The anonymously downloaded PDF differs from the frozen edition.", url: downloaded.url, expectedBytes: bytes.length, observedBytes: downloaded.bytes, observedSha256: downloaded.sha256, httpStatus: 200 };
      } catch (error) {
        result.file = { ...result.file, ...observation(error, result.file.url), expectedBytes: bytes.length };
      }
      if (artifacts) {
        result.files = [];
        for (const artifact of artifacts) {
          const name = zenodoArtifactName(profile, artifact.artifact);
          const item = { artifact: artifact.artifact, fileName: name, expectedSha256: artifact.sha256 };
          if (artifact.artifact === "publication.pdf") {
            result.files.push({ ...item, ...result.file });
            continue;
          }
          const url2 = first.files.find((file) => file.artifact === artifact.artifact)?.fileUrl || `${origin}/records/${id}/files/${encodeURIComponent(name)}`;
          try {
            const downloaded = await client2.download(url2, artifact.bytes.length), passed = downloaded.sha256 === artifact.sha256 && downloaded.bytes === artifact.bytes.length;
            result.files.push({ ...item, status: passed ? "passed" : "failed", detail: passed ? "The anonymously downloaded artifact matches its frozen byte count and SHA-256." : "The publicly downloaded artifact differs from this edition.", observedSha256: downloaded.sha256, url: downloaded.url });
          } catch (error) {
            result.files.push({ ...item, ...observation(error, url2) });
          }
        }
      }
      if (result.file.status === "passed") try {
        const after = publicRecord(await client2.record(id), profile, id, doi, conceptDoi, zenodoFileName(profile), bytes, expectedMetadata, artifacts);
        if (canonical(first.snapshot) !== canonical(after.snapshot)) problem("The public record changed during the PDF download. Retry verification.");
      } catch (error) {
        result.record = observation(error, recordUrl);
      }
      try {
        const target = await client2.resolve(doiUrl, id);
        result.doi = { status: "passed", detail: "The DOI resolver reaches this exact public edition.", url: target, resolver, httpStatus: 200 };
      } catch (error) {
        result.doi = { ...observation(error, doiUrl), resolver };
      }
      if (remote.environment === "sandbox" && result.doi.httpStatus === 404) result.doi.detail = "Zenodo sandbox states that test DOIs are not real and do not resolve. This test DOI does not establish production DOI registration or resolution.";
    } catch (error) {
      result.record = observation(error, recordUrl);
    }
    const states = [result.record, result.file, result.doi, ...result.files || []].map((item) => item.status);
    result.status = states.includes("failed") ? "failed" : states.every((state) => state === "passed") ? "verified" : "pending";
    result.checkedAt = (/* @__PURE__ */ new Date()).toISOString();
    await store.writeVerification(result);
    return result;
  });
}
const URL = require("node:url").URL;
function host(state) {
  const target = state.target, github = target.provider === "github";
  const repository = (target.url.startsWith("git@") ? target.url.split(":").slice(1).join(":") : new URL(target.url).pathname.slice(1)).replace(/\.git\/?$/, "").replace(/\/$/, "");
  if (!/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(repository) || repository.split("/").some((part) => part === "." || part === "..") || github && repository.split("/").length !== 2) throw new Error("Invalid hosted publication repository path.");
  return {
    github,
    repository,
    origin: github ? "https://github.com" : "https://gitlab.com",
    api: github ? `https://api.github.com/repos/${repository}` : `https://gitlab.com/api/v4/projects/${encodeURIComponent(repository)}`
  };
}
function marker(state) {
  return `Math Workspace publication

Build: ${state.buildId}
Manifest-SHA256: ${state.manifestSha256}
Source-commit: ${state.commit}
`;
}
async function bodyBytes(response, limit) {
  const length = response.headers?.get("content-length");
  if (length && Number(length) > limit) throw new Error("The release service exceeded the expected artifact size.");
  if (!response.body?.getReader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > limit) throw new Error("The release service exceeded the expected artifact size.");
    return bytes;
  }
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  try {
    for (; ; ) {
      const part = await reader.read();
      if (part.done) break;
      const bytes = Buffer.from(part.value);
      size += bytes.length;
      if (size > limit) throw new Error("The release service exceeded the expected artifact size.");
      chunks.push(bytes);
    }
  } finally {
    await reader.cancel().catch(() => void 0);
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
function client(state, options, anonymous = false) {
  const provider = host(state), token = !anonymous && (options.environment || process.env)[state.target.tokenEnv];
  const request = async (url2, method = "GET", body, binary = false, allowMissing = false) => {
    const parsed = new URL(url2), allowed = new URL(provider.api);
    const upload = provider.github && parsed.origin === "https://uploads.github.com" && parsed.pathname.startsWith(`/repos/${provider.repository}/releases/`);
    if (!(parsed.origin === allowed.origin && (parsed.pathname === allowed.pathname || parsed.pathname.startsWith(allowed.pathname + "/")) || upload) || parsed.username || parsed.password || parsed.hash) throw new Error("The release API destination is not trusted.");
    if (!anonymous && !token) throw new Error(`Configure ${state.target.tokenEnv} in the server process.`);
    const controller = new globalThis.AbortController(), timer = setTimeout(() => controller.abort(), 6e4);
    try {
      const multipart = body instanceof globalThis.FormData;
      const response = await (options.fetch || globalThis.fetch)(url2, {
        method,
        redirect: "error",
        credentials: "omit",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...!anonymous ? provider.github ? { Authorization: `Bearer ${token}` } : { "PRIVATE-TOKEN": token } : {},
          ...body !== void 0 && !multipart ? { "Content-Type": binary ? "application/octet-stream" : "application/json" } : {}
        },
        ...body !== void 0 ? { body: binary || multipart ? body : JSON.stringify(body) } : {}
      });
      if (allowMissing && response.status === 404) {
        await response.body?.cancel().catch(() => void 0);
        return null;
      }
      if (!response.ok) throw new Error(`The release API returned HTTP ${response.status}. Read its state before retrying.`);
      const bytes = await bodyBytes(response, 2 * 1024 * 1024);
      return JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      if (error instanceof Error && /HTTP|trusted|size/.test(error.message)) throw error;
      throw new Error("The hosted release result is unknown. Read the existing release before retrying.");
    } finally {
      clearTimeout(timer);
    }
  };
  return { ...provider, request };
}
function assetUrl(state, name, value) {
  const provider = host(state), parsed = new URL(value, provider.origin);
  const prefix = provider.github ? `/${provider.repository}/releases/download/${encodeURIComponent(state.target.tag)}/` : `/${provider.repository}/uploads/`;
  const projectPrefix = !provider.github && /^[1-9][0-9]*$/.test(state.hostedProjectId || "") ? `/-/project/${state.hostedProjectId}/uploads/` : void 0;
  if (parsed.origin !== provider.origin || !(parsed.pathname.startsWith(prefix) || projectPrefix && parsed.pathname.startsWith(projectPrefix)) || parsed.username || parsed.password || parsed.hash || parsed.search || decodeURIComponent(parsed.pathname.split("/").pop() || "") !== name) throw new Error("The release asset URL differs from this repository and filename.");
  return parsed.toString();
}
async function download(state, url2, file, options, authenticated = false) {
  const provider = host(state), token = (options.environment || process.env)[state.target.tokenEnv];
  for (let hop = 0; hop < 6; hop++) {
    const parsed = new URL(url2);
    const allowed = parsed.origin === provider.origin || provider.github && ["https://api.github.com", "https://release-assets.githubusercontent.com", "https://objects.githubusercontent.com"].includes(parsed.origin) || !provider.github && parsed.origin === "https://storage.googleapis.com";
    if (!allowed || parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash) throw new Error("Untrusted release download destination.");
    const controller = new globalThis.AbortController(), timer = setTimeout(() => controller.abort(), 6e4);
    try {
      const response = await (options.fetch || globalThis.fetch)(url2, { method: "GET", redirect: "manual", credentials: "omit", signal: controller.signal, headers: {
        Accept: "application/octet-stream",
        ...authenticated && parsed.origin === "https://api.github.com" ? { Authorization: `Bearer ${token}` } : {}
      } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const next = response.headers.get("location");
        if (!next) throw new Error("The asset redirect is missing.");
        url2 = new URL(next, url2).toString();
        await response.body?.cancel().catch(() => void 0);
        continue;
      }
      if (response.status !== 200) throw new Error(`The public release artifact returned HTTP ${response.status}.`);
      const bytes = await bodyBytes(response, file.bytes.length);
      if (bytes.length !== file.bytes.length || sha256(bytes) !== file.sha256) throw new Error("A release artifact differs from this edition.");
      return;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Too many release artifact redirects.");
}
function releaseMatches(state, release) {
  if (!release || release.tag_name !== state.target.tag || (release.body ?? release.description) !== marker(state)) throw new Error("The existing hosted release is not bound to this exact edition.");
}
async function inspectHostedRepository(target, options, anonymous = false) {
  if (target.provider === "git") return;
  const configured = !!(options.environment || process.env)[target.tokenEnv];
  const api = client({ target }, options, anonymous || !configured), project = await api.request(api.api);
  const matches = api.github ? project.private === false && String(project.full_name).toLowerCase() === api.repository.toLowerCase() : project.visibility === "public" && project.path_with_namespace === api.repository;
  if (!matches) throw new Error("Choose a public repository with the reviewed identity. Repository visibility is never changed automatically.");
}
async function publishHostedRelease(state, files, profile, options, save) {
  const api = client(state, options), tag = encodeURIComponent(state.target.tag);
  await inspectHostedRepository(state.target, options);
  if (!api.github) {
    const project = await api.request(api.api);
    if (!Number.isSafeInteger(project.id) || project.id < 1 || project.path_with_namespace !== api.repository) throw new Error("The GitLab project identity differs from this repository.");
    state = { ...state, hostedProjectId: String(project.id) };
    await save(state);
  }
  let release = await api.request(`${api.api}/releases/${api.github ? "tags/" : ""}${tag}`, "GET", void 0, false, true);
  if (!release && api.github) {
    const drafts = await api.request(`${api.api}/releases?per_page=100`);
    const matches = drafts.filter((item) => item.tag_name === state.target.tag);
    if (matches.length > 1) throw new Error("More than one draft uses this release tag. Reconcile the hosted releases.");
    release = matches[0];
  }
  if (release) releaseMatches(state, release);
  if (api.github) {
    if (!release) release = await api.request(`${api.api}/releases`, "POST", { tag_name: state.target.tag, target_commitish: state.commit, name: `${profile.title} ${profile.version}`, body: marker(state), draft: true });
    releaseMatches(state, release);
    if (!Number.isSafeInteger(release.id) || release.id < 1) throw new Error("Invalid hosted release identity.");
    state = { ...state, releaseId: String(release.id), releaseUrl: `${api.origin}/${api.repository}/releases/tag/${tag}` };
    await save(state);
    let assets2 = await api.request(`${api.api}/releases/${release.id}/assets?per_page=100`);
    if (!Array.isArray(assets2) || assets2.some((asset) => !files.some((file) => file.artifact === asset.name)) || new Set(assets2.map((asset) => asset.name)).size !== assets2.length) throw new Error("The hosted release has unexpected or repeated assets. Existing files are preserved.");
    const receipts = [];
    for (const file of files) {
      let asset = assets2.find((item) => item.name === file.artifact);
      if (!asset) {
        if (!release.draft) throw new Error("A published release is missing a reviewed artifact.");
        asset = await api.request(`https://uploads.github.com/repos/${api.repository}/releases/${release.id}/assets?name=${encodeURIComponent(file.artifact)}`, "POST", file.bytes, true);
      }
      if (asset.name !== file.artifact || asset.size !== file.bytes.length || asset.digest && asset.digest !== `sha256:${file.sha256}` || !Number.isSafeInteger(asset.id)) throw new Error("A hosted asset differs from the reviewed file.");
      if (!asset.digest) await download(state, `${api.api}/releases/assets/${asset.id}`, file, options, true);
      receipts.push({ artifact: file.artifact, name: file.artifact, url: assetUrl(state, file.artifact, asset.browser_download_url) });
    }
    assets2 = await api.request(`${api.api}/releases/${release.id}/assets?per_page=100`);
    if (assets2.length !== files.length || !files.every((file) => assets2.filter((asset) => asset.name === file.artifact && asset.size === file.bytes.length && (!asset.digest || asset.digest === `sha256:${file.sha256}`)).length === 1)) throw new Error("The hosted release file set changed during upload.");
    state = { ...state, assets: receipts };
    await save(state);
    if (release.draft) {
      release = await api.request(`${api.api}/releases/${release.id}`, "PATCH", { draft: false });
      releaseMatches(state, release);
      if (release.draft) throw new Error("The release service did not acknowledge publication.");
    }
    return state;
  }
  if (release) {
    const links = release.assets?.links || [];
    if (links.length !== files.length || !files.every((file) => links.filter((link) => link.name === file.artifact).length === 1)) throw new Error("The existing release file set differs from this edition.");
    state = { ...state, releaseId: state.target.tag, releaseUrl: `${api.origin}/${api.repository}/-/releases/${tag}`, assets: links.map((link) => ({ artifact: link.name, name: link.name, url: assetUrl(state, link.name, link.url) })) };
    for (const file of files) await download(state, state.assets.find((asset) => asset.artifact === file.artifact).url, file, options);
    return state;
  }
  const assets = [...state.assets || []];
  for (const file of files) {
    const known = assets.find((asset) => asset.artifact === file.artifact);
    if (known) {
      await download(state, assetUrl(state, file.artifact, known.url), file, options);
      continue;
    }
    const form = new globalThis.FormData();
    form.append("file", new globalThis.Blob([file.bytes]), file.artifact);
    const uploaded = await api.request(`${api.api}/uploads`, "POST", form);
    const url2 = assetUrl(state, file.artifact, uploaded.full_path || `/${api.repository}${uploaded.url}`);
    assets.push({ artifact: file.artifact, name: file.artifact, url: url2 });
    state = { ...state, assets };
    await save(state);
  }
  release = await api.request(`${api.api}/releases`, "POST", { name: `${profile.title} ${profile.version}`, tag_name: state.target.tag, description: marker(state), assets: { links: assets.map((asset) => ({ name: asset.name, url: asset.url, link_type: "other" })) } });
  releaseMatches(state, release);
  return { ...state, releaseId: state.target.tag, releaseUrl: `${api.origin}/${api.repository}/-/releases/${tag}` };
}
async function verifyHostedRelease(state, files, options) {
  await inspectHostedRepository(state.target, options, true);
  const api = client(state, options, true), tag = encodeURIComponent(state.target.tag);
  const release = await api.request(`${api.api}/releases/${api.github ? "tags/" : ""}${tag}`);
  releaseMatches(state, release);
  if (release.draft) throw new Error("The hosted release is not public yet.");
  const assets = api.github ? await api.request(`${api.api}/releases/${release.id}/assets?per_page=100`) : release.assets?.links;
  if (!Array.isArray(assets) || assets.length !== files.length) throw new Error("The public release file set differs from this edition.");
  for (const file of files) {
    const matches = assets.filter((asset) => asset.name === file.artifact);
    if (matches.length !== 1) throw new Error("A public release artifact is missing or repeated.");
    const url2 = assetUrl(state, file.artifact, api.github ? matches[0].browser_download_url : matches[0].url);
    await download(state, url2, file, options);
  }
  const after = await api.request(`${api.api}/releases/${api.github ? "tags/" : ""}${tag}`);
  releaseMatches(state, after);
}
const fs = require("node:fs/promises");
const os = require("node:os");
const childProcess = require("node:child_process");
function gitCredentials(target, options) {
  if (target.provider === "git" || !target.url.startsWith("https://")) return {};
  const token = (options.environment || process.env)[target.tokenEnv];
  if (!token) return {};
  const host2 = target.provider === "github" ? "github.com" : "gitlab.com";
  const authorization = Buffer.from(`${target.provider === "github" ? "x-access-token" : "oauth2"}:${token}`).toString("base64");
  return { GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: `http.https://${host2}/.extraHeader`, GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${authorization}` };
}
async function git(cwd, args, input, identity = false, credential = {}) {
  const env = {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_") && !/(?:TOKEN|SECRET|PASSWORD)$/.test(key))),
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_NO_LAZY_FETCH: "1",
    ...identity ? { GIT_AUTHOR_NAME: "Math Workspace", GIT_AUTHOR_EMAIL: "publication@localhost", GIT_COMMITTER_NAME: "Math Workspace", GIT_COMMITTER_EMAIL: "publication@localhost" } : {},
    ...credential
  };
  return new Promise((resolve, reject) => {
    const child = childProcess.execFile(
      "git",
      ["--no-optional-locks", "-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", "-c", "commit.gpgSign=false", "-c", "protocol.ext.allow=never", ...args],
      { cwd, env, timeout: 6e4, maxBuffer: 200 * 1024 * 1024, encoding: "buffer" },
      (error, stdout) => error ? reject(new Error("The Git publication operation did not complete. Read the target state before retrying.")) : resolve(stdout)
    );
    child.stdin.on("error", () => void 0);
    child.stdin.end(input);
  });
}
async function heads(target, options = {}) {
  const output = (await git(os.tmpdir(), ["ls-remote", "--", target.url, `refs/heads/${target.branch}`, `refs/tags/${target.tag}`, `refs/tags/${target.tag}^{}`], void 0, false, gitCredentials(target, options))).toString("utf8");
  const refs = /* @__PURE__ */ new Map();
  for (const line of output.trim().split("\n").filter(Boolean)) {
    const [hash, ref] = line.split(/\s+/);
    if (!/^[a-f0-9]{40,64}$/.test(hash)) throw new Error("Invalid remote Git revision.");
    refs.set(ref, hash);
  }
  return { baseCommit: refs.get(`refs/heads/${target.branch}`) || null, tagCommit: refs.get(`refs/tags/${target.tag}^{}`) || refs.get(`refs/tags/${target.tag}`) || null };
}
async function temporary(action) {
  const directory = await fs.mkdtemp(path__namespace.join(os.tmpdir(), "math-publication-git-"));
  try {
    await git(directory, ["init", "--bare", "--quiet"]);
    return await action(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}
class PublicationRepository {
  constructor(store, options, current) {
    this.store = store;
    this.options = options;
    this.current = current;
  }
  async edition(profileId, buildId2, manifestSha256, fresh = true) {
    const build = await this.store.build(profileId, buildId2);
    if (!build.publicArtifacts || build.manifestSha256 !== manifestSha256) throw new Error("Review the exact complete publication manifest before repository delivery.");
    const manifest = JSON.parse((await this.store.artifact(profileId, buildId2, "manifest.json")).toString("utf8"));
    const target = repositoryTarget(manifest.plan.profile.delivery?.repository);
    if (fresh) {
      const saved = await this.store.profile(profileId);
      const current = saved && await this.current(saved.profile), frozenDoi = manifest.plan.doi;
      const sameDoiProgress = current?.doi.source === "zenodo" && frozenDoi.source === "zenodo" && current.doi.state === "published" && frozenDoi.state === "reserved" && current.doi.versionDoi === frozenDoi.versionDoi && current.doi.recordId === frozenDoi.recordId && (!current.doi.conceptDoi || !frozenDoi.conceptDoi || current.doi.conceptDoi === frozenDoi.conceptDoi);
      const fingerprint2 = sameDoiProgress ? sha256(canonical({ ...current, fingerprint: void 0, doi: frozenDoi })) : current?.fingerprint;
      if (!saved || fingerprint2 !== build.fingerprint) throw new Error("The publication sources or target changed. Build and review the current edition.");
    }
    const files = await publicArtifactBytes(this.store, build), sources = publicationZipFiles(await this.store.artifact(profileId, buildId2, "source.zip"));
    for (const file of files.filter((item) => ["CITATION.cff", "release.json"].includes(item.artifact))) sources.set(file.artifact, file.bytes);
    const checksums = [...sources].sort(([a], [b]) => a.localeCompare(b)).map(([name, bytes]) => `${sha256(bytes)}  ${name}`).join("\n") + "\n";
    if (sources.has("SOURCE-CHECKSUMS.sha256")) throw new Error("A source file conflicts with the repository checksum manifest.");
    sources.set("SOURCE-CHECKSUMS.sha256", Buffer.from(checksums));
    const projected = /* @__PURE__ */ new Map();
    for (const [name, bytes] of sources) projected.set(`${target.directory}/${name}`, bytes);
    if (target.provider === "git") for (const file of files) projected.set(`${target.directory}/artifacts/${file.artifact}`, file.bytes);
    const modes = new Map((manifest.plan.delivery.files || []).map((file) => [`${target.directory}/${file.path}`, file.mode || 420]));
    return { build, manifest, target, projected, files, modes };
  }
  async review(profileId, buildId2, manifestSha256) {
    const edition = await this.edition(profileId, buildId2, manifestSha256), state = await this.store.repository(profileId, buildId2);
    await inspectHostedRepository(edition.target, this.options);
    const remote = await heads(edition.target, this.options);
    if (state && (state.manifestSha256 !== manifestSha256 || canonical(state.target) !== canonical(edition.target))) throw new Error("This edition is already bound to another repository target.");
    if (remote.tagCommit && state?.commit !== remote.tagCommit) throw new Error("This release tag already exists and is not bound to this reviewed edition. Choose a new version and tag.");
    const content = {
      profileId,
      buildId: buildId2,
      manifestSha256,
      target: edition.target,
      ...remote,
      files: [...edition.projected].map(([name, bytes]) => ({ path: name, bytes: bytes.length, sha256: sha256(bytes), mode: edition.modes.get(name) || 420 })),
      alreadyPublished: !!state?.commit && remote.tagCommit === state.commit
    };
    return { ...content, fingerprint: sha256(canonical(content)) };
  }
  async publish(profileId, buildId2, review) {
    return this.store.locked(profileId, async () => {
      const plan = await this.review(profileId, buildId2, review.manifestSha256);
      if (plan.fingerprint !== review.fingerprint) throw new Error("The public repository changed after review. Review its file and ref changes again.");
      const edition = await this.edition(profileId, buildId2, review.manifestSha256);
      if (edition.target.provider !== "git" && !(this.options.environment || process.env)[edition.target.tokenEnv]) throw new Error(`Configure ${edition.target.tokenEnv} in the server process before publishing hosted release assets.`);
      let state = await this.store.repository(profileId, buildId2) || { schema: "math-workspace.publication-repository/v1", profileId, buildId: buildId2, manifestSha256: review.manifestSha256, target: edition.target, status: "prepared", updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      if (!plan.alreadyPublished) {
        state = await temporary(async (directory) => {
          if (plan.baseCommit) {
            await git(directory, ["fetch", "--quiet", "--no-tags", "--", plan.target.url, `refs/heads/${plan.target.branch}`], void 0, false, gitCredentials(plan.target, this.options));
            const fetched = (await git(directory, ["rev-parse", "FETCH_HEAD"])).toString().trim();
            if (fetched !== plan.baseCommit) throw new Error("The repository branch changed after review.");
            await git(directory, ["read-tree", fetched]);
            const prior = await git(directory, ["ls-tree", "-r", "-z", fetched, "--", plan.target.directory]);
            if (prior.length) throw new Error("The edition directory already contains files. Existing repository files are never replaced; choose a new version directory.");
          } else await git(directory, ["read-tree", "--empty"]);
          const index = [];
          for (const [name, bytes] of edition.projected) {
            const hash = (await git(directory, ["hash-object", "-w", "--stdin"], bytes)).toString().trim();
            index.push(Buffer.from(`${edition.modes.get(name) === 493 ? "100755" : "100644"} ${hash}	${name}\0`));
          }
          await git(directory, ["update-index", "-z", "--index-info"], Buffer.concat(index));
          const tree = (await git(directory, ["write-tree"])).toString().trim();
          const commit = (await git(directory, ["commit-tree", tree, ...plan.baseCommit ? ["-p", plan.baseCommit] : []], `Publish ${edition.manifest.plan.profile.title} ${edition.build.version}

Manifest-SHA256: ${review.manifestSha256}
`, true)).toString().trim();
          const pending = { ...state, commit, baseCommit: plan.baseCommit, fingerprint: plan.fingerprint, status: "unknown", pending: "push", updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
          await this.store.writeRepository(pending);
          await git(directory, ["push", "--atomic", "--", plan.target.url, `${commit}:refs/heads/${plan.target.branch}`, `${commit}:refs/tags/${plan.target.tag}`], void 0, false, gitCredentials(plan.target, this.options));
          const observed = await heads(plan.target, this.options);
          if (observed.baseCommit !== commit || observed.tagCommit !== commit) throw new Error("Read back the repository refs before claiming a successful push.");
          return pending;
        });
      }
      if (!state.commit) throw new Error("The repository publication has no acknowledged source commit.");
      state = { ...state, status: "unknown", pending: "release", updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await this.store.writeRepository(state);
      if (state.target.provider !== "git") state = await publishHostedRelease(state, edition.files, edition.manifest.plan.profile, this.options, async (value) => this.store.writeRepository(value));
      state = { ...state, status: "published", pending: void 0, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await this.store.writeRepository(state);
      return state;
    });
  }
  async verify(profileId, buildId2, manifestSha256) {
    return this.store.locked(profileId, async () => {
      const edition = await this.edition(profileId, buildId2, manifestSha256, false), state = await this.store.repository(profileId, buildId2);
      if (!state?.commit || canonical(state.target) !== canonical(edition.target)) throw new Error("There is no repository receipt bound to this edition.");
      let status = "pending", detail = "Repository verification has not completed.";
      try {
        const remote = await heads(state.target);
        if (remote.tagCommit !== state.commit) {
          status = "failed";
          detail = "The public release tag differs from this edition.";
        } else {
          await temporary(async (directory) => {
            await git(directory, ["fetch", "--quiet", "--no-tags", "--", state.target.url, `refs/tags/${state.target.tag}`]);
            const rows = (await git(directory, ["ls-tree", "-r", "-z", state.commit, "--", state.target.directory])).toString().split("\0").filter(Boolean);
            if (rows.length !== edition.projected.size) throw new Error("The public source file set differs from this edition.");
            for (const row of rows) {
              const match = /^(100644|100755) blob ([a-f0-9]+)\t([\s\S]+)$/.exec(row);
              if (!match || !edition.projected.has(match[3])) throw new Error("The public source tree has an unexpected file or mode.");
              if (match[1] !== (edition.modes.get(match[3]) === 493 ? "100755" : "100644")) throw new Error("A public source mode differs from this edition.");
              const bytes = await git(directory, ["cat-file", "blob", match[2]]);
              if (!bytes.equals(edition.projected.get(match[3]))) throw new Error("A public source file differs from the frozen edition.");
            }
          });
          if (state.target.provider !== "git") await verifyHostedRelease(state, edition.files, this.options);
          status = "verified";
          detail = "The public tag, exact source file set and every release artifact match this edition.";
        }
      } catch (error) {
        detail = error instanceof Error ? error.message : "The public verification could not finish.";
        status = /differs|unexpected|missing|changed/.test(detail) ? "failed" : "pending";
      }
      const result = { ...state, verification: { checkedAt: (/* @__PURE__ */ new Date()).toISOString(), status, detail } };
      await this.store.writeRepository(result);
      return result;
    });
  }
}
class PublicationService {
  constructor(root, options = {}) {
    this.options = options;
    this.store = new PublicationStore(root);
    this.zenodo = new ZenodoPublication(this.store, options, (profile) => this.plan(profile));
    this.repository = new PublicationRepository(this.store, options, (profile) => this.plan(profile));
  }
  async inspect() {
    const catalog = await publicationCatalog(this.store.root), profiles = await this.store.profiles(), { record: metadata, config } = await readPublicationMetadata(this.store.root);
    const defaultProfile = { id: "publication", workId: path__namespace.basename(this.store.root).replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^[^a-zA-Z0-9]+/, "").slice(0, 79) || "work", version: "0.1.0", chapters: [], frontMatter: [], backMatter: [], matter: { automatic: true }, toc: { enabled: true, depth: 2 }, cover: { showVersion: true }, zenodo: { environment: "sandbox", tokenEnv: "ZENODO_TOKEN" } };
    defaultProfile.delivery = {};
    return { ...catalog, metadata, profiles, tools: await publicationTools(void 0, this.options), defaultProfile, leanProjects: leanProjects(config).map(({ key, root }) => ({ key, root })), credentialStatus: profiles.map(({ profile }) => ({ profileId: profile.id, environment: profile.zenodo?.environment || "sandbox", ...this.zenodo.credential(profile) })) };
  }
  async save(input, expectedRevision) {
    const profile = normalizeProfile(input), { config } = await readPublicationMetadata(this.store.root);
    resolvePublicationMetadata(profile, config);
    return this.store.save(profile, expectedRevision);
  }
  async metadata() {
    return (await readPublicationMetadata(this.store.root)).record;
  }
  saveMetadata(input, expectedRevision) {
    return savePublicationMetadata(this.store, input, expectedRevision);
  }
  async doi(profile) {
    const remote = await this.store.remote(profile.id);
    if (remote?.conceptDoi && profile.doi?.conceptDoi && remote.conceptDoi !== profile.doi.conceptDoi) throw new Error("The project or edition work DOI differs from the bound Zenodo work. Reconcile it before continuing.");
    if (profile.doi?.versionDoi || !remote?.versionDoi && profile.doi?.conceptDoi) return { source: "manual", state: "unverified", versionDoi: profile.doi.versionDoi, conceptDoi: profile.doi.conceptDoi, provenance: profile.doi.provenance || "Manually entered in the publication profile; provider registration is not asserted." };
    if (remote?.versionDoi) return { source: "zenodo", state: remote.status === "published" ? "published" : "reserved", versionDoi: remote.versionDoi, conceptDoi: remote.conceptDoi || profile.doi?.conceptDoi, recordId: remote.draftId || remote.recordId, provenance: remote.status === "published" ? "Zenodo publication acknowledgement" : "Zenodo draft DOI reservation; not registered until publication" };
    return { source: "none", state: "none", conceptDoi: profile.doi?.conceptDoi };
  }
  async plan(input) {
    const profile = normalizeProfile(input);
    return (await makePublicationPlan(this.store.root, profile, (value) => this.doi(value), this.options)).plan;
  }
  async build(input, expectedFingerprint, options = {}) {
    const profile = normalizeProfile(input), result = await makePublicationPlan(this.store.root, profile, (value) => this.doi(value), this.options);
    if (!/^[a-f0-9]{64}$/.test(expectedFingerprint) || result.plan.fingerprint !== expectedFingerprint) throw new Error("The publication plan changed. Review a fresh plan before building.");
    return renderPublication(this.store, result.plan, result.snapshot, () => this.plan(profile), this.options, options);
  }
  async status(profileId) {
    const profile = await this.store.profile(profileId);
    if (!profile) throw new Error("Publication profile not found.");
    const builds = await this.store.builds(profileId), repositories = (await Promise.all(builds.map((build) => this.store.repository(profileId, build.id)))).filter(Boolean);
    const target = profile.profile.delivery?.repository;
    return {
      profile,
      metadata: await this.metadata(),
      builds,
      repositories,
      repositoryCredential: target ? { configured: target.provider === "git" || !!(this.options.environment || process.env)[target.tokenEnv || (target.provider === "github" ? "GITHUB_TOKEN" : "GITLAB_TOKEN")], tokenEnv: target.tokenEnv } : void 0,
      remote: await this.store.remote(profileId),
      credential: this.zenodo.credential(profile.profile),
      verifications: await this.store.verifications(profileId)
    };
  }
  async readArtifact(profileId, buildId2, artifact) {
    const bytes = await this.store.artifact(profileId, buildId2, artifact);
    return { bytes, contentType: artifact === "publication.pdf" ? "application/pdf" : artifact.endsWith(".zip") ? "application/zip" : artifact.endsWith(".json") ? "application/json; charset=utf-8" : artifact === "compiled.md" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8", fileName: artifact };
  }
  reserveDoi(profileId, expectedRevision, options = { mode: "reuse-or-create" }) {
    return this.zenodo.reserve(profileId, expectedRevision, options);
  }
  attachZenodo(profileId, expectedRevision, options) {
    return this.zenodo.attach(profileId, expectedRevision, options);
  }
  reviewUpload(profileId, buildId2, review) {
    return this.zenodo.reviewUpload(profileId, buildId2, review);
  }
  upload(profileId, buildId2, review) {
    return this.zenodo.upload(profileId, buildId2, review);
  }
  publish(profileId, buildId2, review) {
    return this.zenodo.publish(profileId, buildId2, review);
  }
  verifyPublished(profileId, buildId2, request) {
    return verifyPublishedEdition(this.store, this.options, profileId, buildId2, request);
  }
  reviewRepository(profileId, buildId2, manifestSha256) {
    return this.repository.review(profileId, buildId2, manifestSha256);
  }
  publishRepository(profileId, buildId2, review) {
    return this.repository.publish(profileId, buildId2, review);
  }
  verifyRepository(profileId, buildId2, manifestSha256) {
    return this.repository.verify(profileId, buildId2, manifestSha256);
  }
}
exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
exports.FORMAL_KIND_POLICIES = FORMAL_KIND_POLICIES;
exports.FORMAL_TYPE_PATTERN = FORMAL_TYPE_PATTERN;
exports.HASH_ID_RE = HASH_ID_RE;
exports.LeanReviewError = LeanReviewError;
exports.LeanReviewService = LeanReviewService;
exports.MarkdownFence = MarkdownFence;
exports.PublicationService = PublicationService;
exports.ReaderWorkspace = ReaderWorkspace;
exports.TMP_ID_RE = TMP_ID_RE;
exports.buildLeanWorkspace = buildLeanWorkspace;
exports.buildReaderIndex = buildReaderIndex;
exports.buildRuntimeDefinitions = buildRuntimeDefinitions;
exports.captureLeanContracts = captureLeanContracts;
exports.collectLeanDependencies = collectLeanDependencies;
exports.displayLabel = displayLabel;
exports.displayNumber = displayNumber;
exports.documentCollectionForPath = documentCollectionForPath;
exports.escapeRegExp = escapeRegExp;
exports.findSymbolsInMarkdown = findSymbolsInMarkdown;
exports.formalReviewId = formalReviewId;
exports.formatDisplayNumber = formatDisplayNumber;
exports.formatPageHeading = formatPageHeading;
exports.formatPageReference = formatPageReference;
exports.installedToolchainRoot = installedToolchainRoot;
exports.isHardIgnoredDirectory = isHardIgnoredDirectory;
exports.isPageLabelType = isPageLabelType;
exports.isPedagogicalKind = isPedagogicalKind;
exports.leanProjects = leanProjects;
exports.loadWorkspaceSnapshot = loadWorkspaceSnapshot;
exports.manifestDependencies = manifestDependencies;
exports.maskFencedMarkdown = maskFencedMarkdown;
exports.mergeConfig = mergeConfig;
exports.normalizeFormalPagePath = normalizeFormalPagePath;
exports.normalizeLatexSymbol = normalizeLatexSymbol;
exports.normalizeWorkMetadata = normalizeWorkMetadata;
exports.parseFormalMarkerLine = parseFormalMarkerLine;
exports.projectMetadata = projectMetadata;
exports.readLeanBuild = readLeanBuild;
exports.readLeanDependencyArtifact = readLeanDependencyArtifact;
exports.readReviewRecord = readReviewRecord;
exports.relativeInput = relativeInput;
exports.renderAgentGuide = renderAgentGuide;
exports.renderDependencyGraphBridges = renderDependencyGraphBridges;
exports.renderDependencyGraphCycles = renderDependencyGraphCycles;
exports.renderDependencyGraphFocus = renderDependencyGraphFocus;
exports.renderDependencyGraphImpact = renderDependencyGraphImpact;
exports.renderDependencyGraphIsolated = renderDependencyGraphIsolated;
exports.renderDependencyGraphMatrix = renderDependencyGraphMatrix;
exports.renderDependencyGraphSummary = renderDependencyGraphSummary;
exports.renderDependencyGraphUpstream = renderDependencyGraphUpstream;
exports.renderDependencyReport = renderDependencyReport;
exports.renderLeanReport = renderLeanReport;
exports.renderProjectAnalysis = renderProjectAnalysis;
exports.renderReferenceMap = renderReferenceMap;
exports.renderReport = renderReport;
exports.reviewHash = reviewHash;
exports.reviewPathInside = reviewPathInside;
exports.reviewSafePath = reviewSafePath;
exports.safePath = safePath;
exports.scanFormalDocuments = scanFormalDocuments;
exports.scanLeanWorkspace = scanLeanWorkspace;
exports.shouldExcludeScanPath = shouldExcludeScanPath;
exports.sortManuscriptPages = sortManuscriptPages;
exports.stripSolutionAssociation = stripSolutionAssociation;
exports.toPosix = toPosix;
exports.typeName = typeName;
exports.unique = unique$1;
exports.updateDocumentState = updateDocumentState;
exports.validateReviewWorkspace = validateReviewWorkspace;
exports.writeLeanContracts = writeLeanContracts;
