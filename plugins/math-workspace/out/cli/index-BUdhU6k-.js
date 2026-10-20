"use strict";
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
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const crypto__namespace = /* @__PURE__ */ _interopNamespaceDefault(crypto);
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
function stripSolutionAssociation(text) {
  return text.replace(
    new RegExp(`\\s*[（(](?:对应|for)\\s+@${FORMAL_ID_PATTERN}(?:\\s*[；;]\\s*([^）)]*))?[）)]`, "i"),
    (_match, title) => title ? `（${title.trim()}）` : ""
  );
}
function exerciseSupportKind(line) {
  const text = line.trim().replace(/^>\s*/, "").replace(/^(?:\*\*|__)(.*?)(?:\*\*|__)/, "$1").trim();
  if (/^(?:提示|Hint)\s*(?:[：:.]|$)/i.test(text)) return "hint";
  if (/^(?:解答|答案|Solution|Answer)\s*(?:[：:.]|$)/i.test(text)) return "solution";
  return void 0;
}
function solutionTarget(title) {
  const match = title.match(new RegExp(`^(?:对应|for)\\s+@(${FORMAL_ID_PATTERN})(?:\\s*[；;]\\s*(.*))?$`, "i"));
  return match ? { id: match[1], title: (match[2] || "").trim() } : void 0;
}
function collectExerciseContent(lines, startLine, marker, parseMarker) {
  let end = startLine;
  const bodyFence = new MarkdownFence();
  for (let i = startLine + 1; i < lines.length; i++) {
    if (!bodyFence.consume(lines[i]) && (/^#{1,6}\s+/.test(lines[i]) || parseMarker(lines[i]) || /^ {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(lines[i]))) break;
    end = i;
  }
  while (end > startLine && !lines[end].trim()) end--;
  const support = [];
  const supportFence = new MarkdownFence();
  if (marker.type === "exercise") for (let i = startLine + 1; i <= end; i++) {
    const kind = !supportFence.consume(lines[i]) && exerciseSupportKind(lines[i]);
    if (!kind) continue;
    if (support.length) support[support.length - 1].endLine = i - 1;
    support.push({ kind, startLine: i, endLine: end });
  }
  let promptEnd = support.length ? support[0].startLine - 1 : end;
  while (promptEnd > startLine && !lines[promptEnd].trim()) promptEnd--;
  const contentLines = lines.slice(startLine, promptEnd + 1);
  contentLines[0] = contentLines[0].replace(marker.markerText, marker.markerText.replace(/\s+#[A-Za-z0-9_-]+\b$/, ""));
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
function unique(values) {
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
      exclude: unique([
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
        sourceRoots: unique((Array.isArray(project.sourceRoots) ? project.sourceRoots : ["."]).filter((item) => typeof item === "string")),
        target: typeof project.target === "string" ? project.target : "",
        anchorPrefix: typeof project.anchorPrefix === "string" && project.anchorPrefix.trim() ? project.anchorPrefix.trim() : "Math Workspace anchor:"
      })),
      coverageTypes: unique((Array.isArray(existing.lean?.coverageTypes) ? existing.lean.coverageTypes : DEFAULT_CONFIG.lean.coverageTypes).filter((item) => typeof item === "string"))
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
      authorAliases: unique(Array.isArray(existing.pdf?.authorAliases) ? existing.pdf.authorAliases.filter((item) => typeof item === "string") : []),
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
      variables: unique(Array.isArray(existing.pdf?.variables) ? existing.pdf.variables.filter((item) => typeof item === "string") : [])
    },
    debug: {
      ...DEFAULT_CONFIG.debug,
      ...debugConfig,
      markerTraceIds: unique(Array.isArray(existing.debug?.markerTraceIds) ? existing.debug.markerTraceIds.filter((item) => typeof item === "string") : [])
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
  const text = config?.ui?.[language]?.[key] || DEFAULT_CONFIG.ui[language]?.[key] || DEFAULT_CONFIG.ui.zh[key] || "";
  return formatTemplate(text, values);
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
  return unique(value.filter((alias) => typeof alias === "string").map((alias) => alias.trim()).filter(Boolean));
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
  const blank = (text) => text.replace(/[^\r\n]/g, " ");
  return maskFencedMarkdown(content).replace(/<!--[\s\S]*?-->/g, blank).replace(/`[^`\n]*`/g, blank);
}
function cleanMarkerTitle(title) {
  const trimmed = title.trim();
  const strong = trimmed.match(/^(\*\*|__)\s*([\s\S]+?)\s*\1$/);
  return strong ? strong[2].trim() : trimmed;
}
function unwrapLeadingStrong(text) {
  const strong = text.match(/^(\*\*|__)\s*([\s\S]+?)\s*\1([\s\S]*)$/);
  if (!strong) return void 0;
  return `${strong[2].trim()}${strong[3] || ""}`.trim();
}
function parseParenMarkerTitle(text, requireSeparator) {
  const paren = text.match(/^[（(]([^）)]+)[）)]\s*([：:]?)/);
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
function normalizeLeadingMarkerEmphasis(text) {
  const trimmed = text.trim().replace(/^(?:>\s*)+/, "").trim();
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
  const text = normalizeLeadingMarkerEmphasis(line);
  const typePattern = FORMAL_TYPE_PATTERN;
  const typed = text.match(new RegExp(`^(${typePattern})\\s*([\\s\\S]*)$`, "i"));
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
  const match = text.match(new RegExp(`^(${typePattern})\\s+#([A-Za-z0-9_-]+)\\b\\s*([\\s\\S]*)$`, "i"));
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
function markerLineContent(line, marker) {
  if (marker.type === "section") return marker.title;
  return line.trim().replace(marker.markerText, sourceMarkerLabel(marker)).trim();
}
function sourceMarkerLabel(marker) {
  return marker.markerText.replace(/\s+#[A-Za-z0-9_-]+\b$/, "").trim();
}
function normalizeProofBoundaryLine(line) {
  return line.trim().replace(/^>\s*/, "").replace(/^\s*[-+*]\s+/, "").replace(/^\*\*(.+?)\*\*/, "$1").replace(/^__(.+?)__/, "$1").replace(/^\*(.+?)\*/, "$1").replace(/^_(.+?)_/, "$1").trim();
}
function isProofBoundaryLine(line) {
  const text = normalizeProofBoundaryLine(line);
  return /^(?:证明(?:概要|草图|思路|如下|在此略去)?|Proof(?:\s+sketch)?|Sketch of proof)\s*(?:[：:。.．.]|$|\s)/i.test(text);
}
function isProofTerminatorLine(line) {
  const text = normalizeProofBoundaryLine(line);
  return /(?:证毕|Q\.?E\.?D\.?|∎|□)\s*[。.．.]?\s*$/i.test(text) || /\$\s*\\square\s*\$\s*[。.．.]?\s*$/.test(text) || /\\\[\s*\\square\s*\\\]\s*[。.．.]?\s*$/.test(text);
}
function isMarkerBoundaryLine(line) {
  return /^#{1,6}\s+/.test(line) || !!parseFormalMarkerLine(line);
}
function isDisplayMathLine(line) {
  const text = line.trim();
  return text.startsWith("$$") || text.startsWith("\\[") || text.startsWith("\\]") || /^\\(?:begin|end)\{(?:equation|align|alignat|gather|multline|flalign|split|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\}/.test(text);
}
function isStructuredDefinitionContinuation(line) {
  const text = line.trim();
  return isDisplayMathLine(line) || /^>\s*/.test(text) || /^\|.*\|$/.test(text) || /^[-+*]\s+/.test(text) || /^\d+[.)]\s+/.test(text) || /^(\*\*|__)?\s*[（(]?(?:[ivxlcdm]+|[a-z]|\d+)[）).、]\s*/i.test(text);
}
function isDisplayMathStartLine(line) {
  const text = line.trim();
  return text.startsWith("$$") || text.startsWith("\\[") || /^\\begin\{(?:equation|align|alignat|gather|multline|flalign|split|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\}/.test(text);
}
function updateDisplayMathState(line, inDisplayMath) {
  const text = line.trim();
  const dollarCount = (text.match(/\$\$/g) || []).length;
  if (dollarCount % 2 === 1) return !inDisplayMath;
  if (text.startsWith("\\[")) return true;
  if (text.startsWith("\\]")) return false;
  if (/^\\begin\{(?:equation|align|alignat|gather|multline|flalign|split|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\}/.test(text)) return true;
  if (/^\\end\{(?:equation|align|alignat|gather|multline|flalign|split|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\*?\}/.test(text)) return false;
  return inDisplayMath;
}
function trimTrailingBlankLines(lines) {
  const trimmed = [...lines];
  while (trimmed.length > 0 && !trimmed[trimmed.length - 1].trim()) trimmed.pop();
  return trimmed;
}
function collectRecallMarkerContent(lines, startLine, marker) {
  const contentLines = [markerLineContent(lines[startLine], marker)];
  let endLine = startLine;
  if (FORMAL_KIND_POLICIES[marker.type]?.counter === "example") {
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
function collectDefinitionContent(lines, startLine, marker) {
  const contentLines = [marker ? markerLineContent(lines[startLine], marker) : lines[startLine].trim()];
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
function collectMarkerContent(lines, startLine, marker) {
  if (RECALL_TYPES.has(marker.type)) {
    return collectRecallMarkerContent(lines, startLine, marker);
  }
  if (marker.type === "def") {
    return collectDefinitionContent(lines, startLine, marker);
  }
  const contentLines = [markerLineContent(lines[startLine], marker)];
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
  const marker = parseFormalMarkerLine(lines[sourceIndex]);
  if (marker) {
    const collected2 = collectMarkerContent(lines, sourceIndex, marker);
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
function makeLabelData(marker, unitFile, startLine, contentLines, markerNumber, endLine) {
  const content = RECALL_TYPES.has(marker.type) ? contentLines.join("\n") : void 0;
  const label = {
    type: marker.type,
    title: marker.title,
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
function makeDefinitionLabelData(marker, document, book, volume, startLine, contentLines, endLine) {
  const content = contentLines.join("\n");
  const label = {
    type: marker.type,
    title: marker.title,
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
  const text = line.trim();
  return text.includes("|") && text.split("|").filter((part) => part.trim()).length >= 2;
}
function isMarkdownTableDelimiter(line) {
  const text = line.trim();
  if (!text.includes("|")) return false;
  const cells = text.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}
function isMarkdownTableStart(lines, lineIndex) {
  return lineIndex >= 0 && lineIndex + 1 < lines.length && isMarkdownTableRow(lines[lineIndex]) && isMarkdownTableDelimiter(lines[lineIndex + 1]);
}
function lintStructuredNumberedMarker(marker, lines, lineIndex, filePath) {
  if (!STRUCTURED_NUMBERED_TYPES.has(marker.type)) return [];
  const issues = [];
  const next = nextNonBlankLineIndex(lines, lineIndex + 1);
  const previous = previousNonBlankLineIndex(lines, lineIndex - 1);
  if (marker.type === "equation") {
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
  if (!marker.title) {
    issues.push({
      severity: "warn",
      code: `${marker.type}-caption-missing`,
      file: filePath,
      line: lineIndex + 1,
      message: `${marker.type === "figure" ? "Figure" : "Table"} marker should include a caption title.`
    });
  }
  if (marker.type === "figure") {
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
  if (marker.type === "table" && (next < 0 || !isMarkdownTableStart(lines, next))) {
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
      stable: allMarkerStarts.filter((marker) => typeof marker.id === "string" && marker.id.startsWith("h-")).length,
      temporary: allMarkerStarts.filter((marker) => typeof marker.id === "string" && marker.id.startsWith("tmp-")).length
    });
    const markerStarts = allMarkerStarts.filter((marker) => !isPageAnchorMarker(marker, pageAnchor));
    if (markerStarts.some((marker) => marker.type !== "def") && !unit) {
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
      const marker = parseFormalMarkerLine(line);
      if (!marker || marker.type !== "def") continue;
      const collected = collectMarkerContent(lines, lineIndex, marker);
      const label = makeDefinitionLabelData(marker, { filePath }, book, volume, lineIndex, collected.contentLines, collected.endLine);
      definitions.push({
        type: marker.type,
        title: marker.title,
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
        const marker = parseFormalMarkerLine(line);
        if (!marker) continue;
        if (isPageAnchorMarker({ ...marker, line: lineIndex + 1 }, unitFile.pageAnchor)) continue;
        if (marker.type === "def") continue;
        issues.push(...lintStructuredNumberedMarker(marker, lines, lineIndex, unitFile.filePath));
        const counter = FORMAL_KIND_POLICIES[marker.type]?.counter;
        const markerNumber = counter ? counters[counter] = (counters[counter] || 0) + 1 : void 0;
        const exerciseContent = isPedagogicalKind(marker.type) ? collectExerciseContent(lines, lineIndex, marker, parseFormalMarkerLine) : void 0;
        const content = exerciseContent || collectMarkerContent(lines, lineIndex, marker);
        const label = makeLabelData(marker, unitFile, lineIndex, content.contentLines, markerNumber, content.endLine);
        if (exerciseContent) {
          label.bodyEndLine = exerciseContent.bodyEndLine;
          label.supportRanges = exerciseContent.support;
          label.supportContent = exerciseContent.support.map((range) => lines.slice(range.startLine, range.endLine + 1).join("\n")).join("\n");
          label.solutionOf = marker.solutionOf;
          if (marker.type === "solution") label.proofContent = lines.slice(lineIndex, exerciseContent.bodyEndLine + 1).join("\n");
          else label.proofContent = exerciseContent.support.filter((range) => range.kind === "solution").map((range) => lines.slice(range.startLine, range.endLine + 1).join("\n")).join("\n");
        } else {
          const proof = findProofRange(lines, lineIndex + 1, content.endLine + 1);
          if (proof.proofStartLine !== void 0 && proof.proofEndLine !== void 0) {
            label.proofContent = lines.slice(proof.proofStartLine - 1, proof.proofEndLine).join("\n");
          }
        }
        labels[marker.id] = label;
        definitions.push({
          id: marker.id,
          type: marker.type,
          title: marker.title,
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
      existing.aliases = unique([...existing.aliases || [], ...customDefinition.aliases || []]);
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
    const marker = parseFormalMarkerLine(line);
    if (marker) starts.push({ ...marker, file: filePath, line: i + 1 });
  }
  return starts;
}
function isPageAnchorMarker(marker, pageAnchor) {
  return Boolean(
    pageAnchor?.id && marker?.id === pageAnchor.id && marker?.line === pageAnchor.line && marker?.type === "section"
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
    const sorted = [...chapterPages].sort((a, b) => (a.chapter || 0) - (b.chapter || 0));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].chapter === sorted[i - 1].chapter) {
        issues.push({
          severity: "error",
          code: "duplicate-chapter",
          file: sorted[i].filePath,
          message: `Chapter ${sorted[i].chapter} is duplicated in ${sorted[i].bookTitle}.`
        });
      }
      if ((sorted[i].chapter || 0) !== (sorted[i - 1].chapter || 0) + 1) {
        issues.push({
          severity: "warn",
          code: "chapter-gap",
          file: sorted[i].filePath,
          message: `${sorted[i].bookTitle} jumps from chapter ${sorted[i - 1].chapter} to ${sorted[i].chapter}.`
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
  const sorted = [...edges].sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || (nodeById.get(a.from)?.display || a.from).localeCompare(nodeById.get(b.from)?.display || b.from) || (nodeById.get(a.to)?.display || a.to).localeCompare(nodeById.get(b.to)?.display || b.to));
  pushLimitedRows(lines, sorted, limit, (edge) => {
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
    "Command examples use an existing project `workspace` script. Prefer the exact Node/CLI entry and working directory supplied by the Reader, or the project's verified CLI; do not silently change scripts, replace native AI rules, or install a global command to match an example.",
    "",
    `Current index: ${Object.keys(state.labels).length} formal entries, ${state.pages.length} pages, ${(state.symbols || []).length} symbols, ${errors} errors, ${warnings} warnings.`,
    "",
    "## Working Loop",
    "",
    "1. Read the target Markdown source. For an existing target outside current context, retrieve only its matching row from `.math-workspace/reference-map.md`.",
    "2. Declare new numbered objects with `#tmp-*`; reference existing objects and pages with `@h-...`, `@h-....title`, or `@h-....full`. Definitions never receive hashes or refs.",
    "3. Preserve Markdown and LaTeX. Do not write display numbers as references or hand-edit generated artifacts.",
    "4. Run `npm run workspace -- finish <file-or-dir>` after editing. It finalizes temporary IDs and verifies the workspace. Use a separate `verify` only after direct `finalize`, migration, or as an explicit release gate.",
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
    "- Dependency graph: `.math-workspace/dependency-graph.json` is the canonical explicit reference graph. It uses only `@h-...` references between mainline claims, proof-backed hash remarks, exercises and solutions; pedagogical references carry `layer: pedagogical`, while `pedagogicalLinks` keeps solution ownership separate from proof cycles, and marks edges as `statement`, `proof`, or `body`. Edges introduced as explanatory navigation (`见 @h-...`, `参见 @h-...`, or `see @h-...`) are preserved with relation `explanatory`; the Reader relation map excludes them, body references, and self-references from its strict dependency view. `.math-workspace/dependency-report.md` separates mainline theorem-like and supplemental remark statistics. Use `npm run workspace -- graph summary`, `graph impact <h-id>`, `graph upstream <h-id>`, `graph focus <h-id> --depth 2`, `graph bridges`, `graph isolated`, `graph cycles`, or `graph matrix chapter|volume|book` for Markdown analysis. Add `--where statement|proof|body` to filter edge placement. These are structural graph tools, not domain interpretation.",
    "- Definitions and project knowledge: lookup is a tool-first, AI-exception workflow. The tool scans standard `定义（Term）：...` / `Definition (Term): ...` definitions and dedicated concept/glossary pages named by filename or main title; `.math-workspace/project-analysis.md` records detected concept, notation, and summary roles, including combined pages. Prefer the book’s final appendix for concept and notation summaries; reuse existing dedicated pages and follow the book’s appendix order without reserving fixed letters. This placement guidance does not change lookup priority. Do not refresh `.math-workspace/definitions.json` after ordinary edits. Use it only for nonstandard phrases, aliases/bilingual lookup, stable multi-paragraph previews, or a boundary the deterministic extractor cannot represent; include Markdown `content` for those entries. Codex MCP queries return narrow source locators and previews, including all detected roles for a source. Full rendered lookup previews are only guaranteed for definitions in the currently previewed file; cross-file search is primarily for locating and jumping.",
    "- Exercises use `习题 #tmp-e（Title）：...` / `Exercise #tmp-e (Title): ...`, with an independent chapter counter. Solutions use a separate ID and `解答 #tmp-s（对应 @tmp-e）：...` / `Solution #tmp-s (for @tmp-e): ...`; they may live in an appendix near the end of the same book and retain the original exercise number. Order solutions and concept/notation summaries according to the book’s structure. Separate hint/answer paragraphs from the prompt with a blank line. Prompt recall excludes hints and answers; exports include them. Keep stable IDs and Lean declarations when converting existing results; required mainline claims and proofs stay in the main text.",
    "- Explanatory remarks stay plain: `注（Title）：...` / `Remark (Title): ...`, without hash. Non-mainline fact remarks that need a proof or later citation use `注 #tmp-*（Title）：...`; `> 注 #tmp-*（Title）：...` is also recognized inside standard blockquotes. A hash remark is an unnumbered supplemental dependency node and supports recall; a plain remark never enters the dependency graph or Reader dependency markers.",
    "- Independent examples and counterexamples may use `例 #tmp-*` / `Example #tmp-*` and `反例 #tmp-*` / `Counterexample #tmp-*` even without later citations. They share a separate chapter/appendix example counter and never consume theorem numbers. Incidental in-text examples stay plain. Their recall includes all paragraphs, calculations and proof text up to the next formal object, Markdown heading or thematic break; fenced code stays literal. Separate following ordinary prose with a thematic break when needed.",
    "- Symbols: maintain only project-specific `source`, `pattern`, and `meaning` entries in `.math-workspace/symbols.json` when explicit notation semantics change; patterns describe the notation itself with balanced delimiters, not whole equations or open-ended formula fragments. Dedicated notation pages are recognized by filename or main title and supply context only; they do not infer symbol meanings. The navigation symbol table lists symbols matched in the current preview file. Symbols are not inline formula refs and are not searched through the definition search box.",
    "- Appendices use the appendix file prefix, so markers in `appendix-a-*.md` render as `A.1`, `A.2`, etc. `00-introduction.md`, `intro.md`, and `introduction.md` are intro pages, not chapter 0.",
    "- Export: do not compile formal source Markdown directly. Use `npm run workspace -- export-md <file-or-dir> --out dist/book.md` to produce one portable Markdown file, `npm run workspace -- export-md-split <file-or-dir> --out dist/public` to produce compiled Markdown files while preserving the source tree, `npm run workspace -- export-pdf <file-or-dir> --out dist/book.pdf` to call local pandoc after Markdown export, or `npm run workspace -- render-pdf dist/book.md --out dist/book.pdf` when a project release flow has already postprocessed the compiled Markdown. PDF rendering reads `.math-workspace/config.json` `pdf` defaults when present: A4, 2.5cm margins, TOC depth 2, language-aware TOC title, separate TOC page, optional title page metadata, optional publication metadata page, and optional front matter pages. `author` is the cover/PDF metadata author; fuller identity fields are `authorNative`, `authorAliases`, `orcid`, `repository`, `license`, `licenseUrl`, `preferredCitation`, `releaseTag`, `releaseCommit`, and `doi`. When `metadataPage` is true, the generated metadata page is unnumbered, unlisted, and placed after the title page but before the table of contents. Longer AI, license, citation, or provenance statements belong in `frontMatter`, placed after metadata and before the TOC; front matter entries use `source` or `content`, default to `toc: false`, and default to page breaks. Override with `--title`, `--subtitle`, `--author`, `--author-native`, `--author-alias`, `--orcid`, `--repository`, `--license`, `--license-url`, `--preferred-citation`, `--date`, `--release-version`, `--release-tag`, `--release-commit`, `--doi`, `--metadata-page`, `--front-matter`, `--front-matter-title`, `--front-matter-toc`, `--documentclass`, `--title-page`, `--margin`, `--no-toc`, `--toc-depth`, `--paper`, or Pandoc `-V key:value`. No PDF engine is bundled.",
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
    "- Use `npm run workspace -- migrate-text-refs <file-or-dir>` before applying old numbered prose migration; migration commands are dry-run by default.",
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
const fs$1 = require("node:fs/promises");
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
      if ((await fs$1.lstat(current)).isSymbolicLink()) throw new Error("Publication paths cannot follow symbolic links.");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return current;
}
async function optionalJson(file) {
  try {
    return JSON.parse(await fs$1.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
async function atomicJson(root, relative, value) {
  const destination = await safePath(root, relative);
  await fs$1.mkdir(path__namespace.dirname(destination), { recursive: true });
  await safePath(root, relative);
  const temporary = `${destination}.tmp-${crypto__namespace.randomBytes(12).toString("hex")}`;
  try {
    await fs$1.writeFile(temporary, canonical(value), { flag: "wx", mode: 384 });
    await fs$1.rename(temporary, destination);
  } finally {
    await fs$1.rm(temporary, { force: true });
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
    await fs$1.mkdir(parent, { recursive: true });
    const lock = await this.directory(`locks/${namespace}/${id}`);
    try {
      await fs$1.mkdir(lock);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const recovery = await this.directory(`lock-recovery/${namespace}/${id}`);
      await fs$1.mkdir(path__namespace.dirname(recovery), { recursive: true });
      try {
        await fs$1.mkdir(recovery);
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
        await fs$1.rename(lock, stale);
        try {
          await fs$1.mkdir(lock);
        } catch {
          throw new Error("Another publication operation acquired the recovered lock. Retry after it finishes.");
        }
      } finally {
        if (stale) await fs$1.rm(stale, { recursive: true, force: true });
        await fs$1.rm(recovery, { recursive: true, force: true });
      }
    }
    try {
      await fs$1.writeFile(path__namespace.join(lock, "owner.json"), canonical({ pid: process.pid, startedAt: (/* @__PURE__ */ new Date()).toISOString() }), { flag: "wx", mode: 384 });
      return await action();
    } finally {
      await fs$1.rm(lock, { recursive: true, force: true });
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
      names = await fs$1.readdir(directory);
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
      await atomicJson(this.root, `${this.relativeDirectory}/profiles/${profile.id}.json`, record);
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
    await atomicJson(this.root, `${this.relativeDirectory}/remote/${publicationId(id)}.json`, next);
    return next;
  }
  async builds(id) {
    const directory = await this.directory(`builds/${publicationId(id)}`);
    let names;
    try {
      names = await fs$1.readdir(directory);
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
    if (!["publication.pdf", "compiled.md", "manifest.json", "citation.json"].includes(name)) throw new Error("Unknown publication artifact.");
    const build = await this.build(id, release);
    const bytes = await fs$1.readFile(await this.directory(`builds/${publicationId(id)}/${buildId(release)}/${name}`));
    const expected = name === "publication.pdf" ? build.pdfSha256 : name === "compiled.md" ? build.markdownSha256 : name === "manifest.json" ? build.manifestSha256 : void 0;
    if (expected && sha256(bytes) !== expected) throw new Error("The immutable publication artifact changed.");
    if (name === "citation.json") {
      const manifest = JSON.parse((await this.artifact(id, release, "manifest.json")).toString("utf8"));
      if (sha256(bytes) !== manifest.artifacts[name]?.sha256) throw new Error("The immutable publication artifact changed.");
    }
    return bytes;
  }
}
const fs = require("node:fs/promises");
const childProcess = require("node:child_process");
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
  const text = optionalText(value, "DOI", 300)?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  if (text && !/^10\.\d{4,9}\/[^\s<>]+$/i.test(text)) throw new Error("Enter a DOI such as 10.1234/example.");
  return text;
}
function normalizeProfile(input) {
  if (!input || typeof input !== "object") throw new Error("A publication profile is required.");
  const matter = (items, role) => list(items, role, 100).map((item) => {
    if (!item || typeof item !== "object") throw new Error(`Invalid ${role} entry.`);
    const value = { title: optionalText(item.title, `${role} title`, 1e3), file: item.file === void 0 ? void 0 : relativeInput(item.file), content: optionalText(item.content, `${role} content`, 1e6), includeInToc: item.includeInToc === true };
    if (value.file && !/\.md$/i.test(value.file)) throw new Error("Publication matter files must be Markdown files.");
    if (!value.file && !value.content && !value.title) throw new Error(`An empty ${role} entry cannot be published.`);
    return value;
  });
  const authors = list(input.authors, "authors", 100).map((item) => {
    const name = optionalText(item?.name, "author name", 1e3);
    if (!name) throw new Error("Every publication author needs a name.");
    return { name, orcid: optionalText(item.orcid, "ORCID", 1e3), affiliation: optionalText(item.affiliation, "affiliation", 3e3) };
  });
  const chapters = [...new Set(list(input.chapters, "chapter selection", 1e4).map(relativeInput))];
  if (!chapters.length) throw new Error("Select at least one chapter or page.");
  if (chapters.some((file) => !/\.md$/i.test(file))) throw new Error("Publication chapters must be Markdown files.");
  const title = optionalText(input.title, "title", 3e3), version = optionalText(input.version, "version", 200);
  if (!title || !version) throw new Error("Publication title and version are required.");
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
  const matterFiles = [...frontMatter, ...backMatter, ...input.continued?.enabled === false || !continuedFile ? [] : [{ file: continuedFile }]].map((entry) => entry.file).filter(Boolean);
  if (new Set(matterFiles).size !== matterFiles.length) throw new Error("A publication file can only fill one matter role.");
  return JSON.parse(canonical({
    id: publicationId(input.id),
    workId: publicationId(input.workId),
    title,
    version,
    authors,
    chapters,
    scope,
    subtitle: optionalText(input.subtitle, "subtitle", 3e3),
    edition: optionalText(input.edition, "edition", 300),
    language: optionalText(input.language, "language", 80),
    license: optionalText(input.license, "license", 200),
    description: optionalText(input.description, "description", 1e5),
    publicationDate: optionalText(input.publicationDate, "publication date", 100),
    repository: optionalText(input.repository, "repository", 3e3),
    cover: { image: input.cover?.image ? relativeInput(input.cover.image) : void 0, showVersion: input.cover?.showVersion !== false },
    frontMatter,
    backMatter,
    toc: { enabled: input.toc?.enabled !== false, depth, title: optionalText(input.toc?.title, "contents title", 500) },
    continued: { enabled: typeof input.continued?.enabled === "boolean" ? input.continued.enabled : void 0, file: continuedFile, title: optionalText(input.continued?.title, "continued title", 1e3), text: optionalText(input.continued?.text, "continued notice", 1e5) },
    pdf: { engine, paper, margin, documentClass },
    doi: { versionDoi: normalizeDoi(input.doi?.versionDoi), conceptDoi: normalizeDoi(input.doi?.conceptDoi), provenance: optionalText(input.doi?.provenance, "DOI provenance", 3e3) },
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
      child = childProcess.spawn(command, ["--version"], { stdio: ["ignore", "pipe", "pipe"] });
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
  return { pandoc, engine, engineName };
}
async function readSnapshot(root) {
  const files = /* @__PURE__ */ new Map(), inputs = [];
  const capture = async (name, role, required = false) => {
    try {
      const bytes = await fs.readFile(await safePath(root, name));
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
    const entries = await fs.readdir(directory, { withFileTypes: true });
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
async function makePublicationPlan(root, input, doi, options = {}) {
  const profile = normalizeProfile(input), snapshot = await readSnapshot(root), selectedPaths = new Set(profile.chapters);
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
  const continuedFile = profile.continued.file && profile.continued.enabled !== false ? await resolveMatter({ file: profile.continued.file, title: profile.continued.title }, "continued") : void 0;
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
    const bytes = await fs.readFile(await safePath(root, name));
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
            await fs.access(await safePath(root, `${name}${extension}`));
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
  const continuedNotice = { enabled: profile.continued.enabled ?? (!!continuedFile || omitted.length > 0), file: continuedFile?.file, title: profile.continued.title || continuedFile?.title || (english ? "To be continued" : "未完待续"), text: continuedFile?.content ?? (profile.continued.text || (english ? "This is a partial edition of a continuing work. Further chapters and revisions will appear in later versions of the same work." : "本版为持续更新作品的部分内容。后续章节与修订将在同一作品的后续版本中继续发布。")) };
  const warnings = externalReferences.length ? [`${externalReferences.length} reference(s) point outside this edition; omitted pages are not added automatically.`] : [];
  const tools = await publicationTools(profile, options);
  const content = { schema: "math-workspace.publication-plan/v1", profile, selected, omitted, externalReferences, partial: omitted.length > 0, frontMatter, backMatter, continuedNotice, doi, inputs: snapshot.inputs.sort((a, b) => a.path.localeCompare(b.path)), tools, warnings };
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
    delete environment.ZENODO_TOKEN;
    if (options.credentialEnv) delete environment[options.credentialEnv];
    const child = childProcess.spawn(process.execPath, [cliPath, ...args], { cwd: options.cwd, stdio: ["ignore", "pipe", "pipe"], env: environment });
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
    const temporary = await store.directory(`pending/${profile.id}-${id}`);
    await fs.mkdir(temporary, { recursive: true });
    const frozen = path__namespace.join(temporary, "inputs");
    await fs.mkdir(frozen);
    try {
      progress.onProgress?.("Freezing selected sources, formal numbering inputs, and local resources");
      const configName = ".math-workspace/config.json";
      for (const [name, bytes] of snapshot.files) {
        if (name === configName) continue;
        const destination2 = await safePath(frozen, name);
        await fs.mkdir(path__namespace.dirname(destination2), { recursive: true });
        await fs.writeFile(destination2, bytes, { flag: "wx" });
      }
      const sourceConfig = snapshot.files.has(configName) ? JSON.parse(snapshot.files.get(configName).toString("utf8")) : snapshot.config;
      const exportConfig = { ...sourceConfig, lean: { ...sourceConfig?.lean, projects: [] } };
      await fs.mkdir(path__namespace.join(frozen, ".math-workspace"), { recursive: true });
      await fs.writeFile(path__namespace.join(frozen, configName), canonical(exportConfig), { flag: "wx" });
      const invoke = options.runCli || ((args2, runtimeOptions) => runPublicationCli(options.cliPath || path__namespace.resolve(__dirname, "math-workspace.js"), args2, { ...runtimeOptions, credentialEnv: profile.zenodo.tokenEnv }));
      progress.onProgress?.("Compiling selected chapters with their original formal numbering");
      await invoke(["export-md", ...plan.selected.map((page) => page.path), "--out=../compiled.md", "--read-only"], { cwd: frozen, onProgress: progress.onProgress });
      const markdownPath = path__namespace.join(temporary, "compiled.md");
      let markdown = await fs.readFile(markdownPath, "utf8");
      const matterContent = async (entry, key, fallbackTitle, clearTitleMarks = false) => {
        const raw = entry.file ? snapshot.files.get(entry.file).toString("utf8") : entry.content || "";
        const inputName = `.math-workspace/publication-${key}-raw.md`, outputName = `.math-workspace/publication-${key}.md`;
        await fs.writeFile(await safePath(frozen, inputName), raw, { flag: "wx" });
        await invoke(["_publication-fragment", inputName, entry.file || "inline.md", outputName], { cwd: frozen, onProgress: progress.onProgress });
        let compiled = await fs.readFile(await safePath(frozen, outputName), "utf8");
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
        const content = notice.file ? await matterContent({ file: notice.file, title: profile.continued.title, includeInToc: false }, "continued", notice.title) : `# ${notice.title} {.unnumbered .unlisted}

${notice.text}`;
        markdown += `

\\clearpage
\\markboth{}{}

${content}
`;
      }
      await fs.writeFile(markdownPath, markdown, "utf8");
      const language = profile.language || (snapshot.config.language === "en" ? "en-US" : "zh-CN");
      const defaultChineseClass = !profile.pdf.documentClass && language.toLowerCase().startsWith("zh");
      const documentClass = profile.pdf.documentClass || (defaultChineseClass ? "ctexart" : void 0);
      const args = ["render-pdf", "../compiled.md", "--out=../publication.pdf", "--no-project-pdf-defaults", "--title-page", "--metadata-page", "--toc-page-break", `--title=${profile.title}`, `--release-version=${profile.version}`, `--author=${profile.authors.map((author) => author.name).join("; ")}`, `--pdf-engine=${profile.pdf.engine}`, `--paper=${profile.pdf.paper}`, `--margin=${profile.pdf.margin}`, `--lang=${language}`, `--toc-depth=${profile.toc.depth}`, `--toc-title=${profile.toc.title || (snapshot.config.language === "en" ? "Contents" : "目录")}`];
      args.push(profile.toc.enabled ? "--toc" : "--no-toc", profile.cover.showVersion ? "--show-version-on-cover" : "--no-show-version-on-cover");
      if (profile.subtitle || profile.edition) args.push(`--subtitle=${[profile.subtitle, profile.edition].filter(Boolean).join(" · ")}`);
      if (profile.cover.image) args.push(`--cover-image=${profile.cover.image}`);
      if (documentClass) args.push(`--documentclass=${documentClass}`);
      if (defaultChineseClass) args.push("--variable=classoption:fontset=fandol");
      if (profile.license) args.push(`--license=${profile.license}`);
      if (profile.repository) args.push(`--repository=${profile.repository}`);
      if (profile.publicationDate) args.push(`--date=${profile.publicationDate}`);
      if (plan.doi.versionDoi) args.push(`--doi=${plan.doi.versionDoi}`);
      if (plan.doi.conceptDoi) args.push(`--work-doi=${plan.doi.conceptDoi}`);
      if (plan.doi.versionDoi || plan.doi.conceptDoi) {
        const chinese = (profile.language || snapshot.config.language).toLowerCase().startsWith("zh");
        const note = plan.doi.source === "manual" ? chinese ? "DOI 由作者提供；注册信息以 DOI 服务平台记录为准。" : "DOI supplied by the author; registration details follow the DOI provider record." : plan.doi.source === "zenodo" ? chinese ? "DOI 由 Zenodo 分配；注册信息以 DOI 服务平台记录为准。" : "DOI assigned through Zenodo; registration details follow the DOI provider record." : chinese ? "DOI 信息以 DOI 服务平台记录为准。" : "DOI information follows the DOI provider record.";
        args.push(`--doi-state=${note}`);
      }
      for (let index = 0; index < profile.frontMatter.length; index++) {
        const entry = profile.frontMatter[index], name = `.math-workspace/publication-front-${index}.md`;
        const normalized = await matterContent(entry, `front-${index}`);
        await fs.writeFile(await safePath(frozen, name), normalized, "utf8");
        args.push(`--front-matter=${name}`);
        if (!entry.file && entry.title) args.push(`--front-matter-title=${entry.title}`);
        if (entry.includeInToc) args.push("--front-matter-toc");
      }
      progress.onProgress?.("Rendering cover, publication pages, contents, chapters, and conclusion");
      await invoke(args, { cwd: frozen, onProgress: progress.onProgress });
      const pdf = await fs.readFile(path__namespace.join(temporary, "publication.pdf"));
      if (!pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("The PDF renderer did not produce a valid PDF file.");
      if ((await recheck().catch(() => null))?.fingerprint !== plan.fingerprint) throw new Error("Publication sources changed during PDF rendering. This build was not saved.");
      const pdfSha256 = sha256(pdf), markdownBytes = Buffer.from(markdown), citation = { type: "book", title: profile.title, author: profile.authors.map((author) => ({ literal: author.name, ORCID: author.orcid })), version: profile.version, edition: profile.edition, DOI: plan.doi.versionDoi, conceptDOI: plan.doi.conceptDoi, doiProvenance: plan.doi, workId: profile.workId, partial: plan.partial, selectedPages: plan.selected.map((page) => page.path) };
      await fs.writeFile(path__namespace.join(temporary, "citation.json"), canonical(citation), { flag: "wx" });
      const citationBytes = await fs.readFile(path__namespace.join(temporary, "citation.json"));
      const manifest = { schema: "math-workspace.publication-manifest/v1", buildId: id, createdAt, plan, artifacts: { "publication.pdf": { sha256: pdfSha256, bytes: pdf.length }, "compiled.md": { sha256: sha256(markdownBytes), bytes: markdownBytes.length }, "citation.json": { sha256: sha256(citationBytes), bytes: citationBytes.length } }, layout: ["cover", "publication metadata", "front matter", ...profile.toc.enabled ? ["generated table of contents"] : [], "selected chapters in original order and numbering", "back matter", ...plan.continuedNotice.enabled ? ["to be continued"] : []], mathematicalCorrectnessAssessed: false, sourceArchiveSignatureAsserted: false };
      const manifestBytes = canonical(manifest);
      await fs.writeFile(path__namespace.join(temporary, "manifest.json"), manifestBytes, { flag: "wx" });
      const build = { schema: "math-workspace.publication-build/v1", id, profileId: profile.id, workId: profile.workId, version: profile.version, fingerprint: plan.fingerprint, createdAt, pdfSha256, markdownSha256: sha256(markdownBytes), manifestSha256: sha256(manifestBytes), files: { pdf: "publication.pdf", markdown: "compiled.md", manifest: "manifest.json", citation: "citation.json" } };
      await fs.writeFile(path__namespace.join(temporary, "build.json"), canonical(build), { flag: "wx" });
      await fs.writeFile(path__namespace.join(temporary, "checksums.sha256"), `${Object.entries({ ...manifest.artifacts, "manifest.json": { sha256: build.manifestSha256 } }).map(([name, value]) => `${value.sha256}  ${name}`).join("\n")}
`, { flag: "wx" });
      const destination = await store.directory(`builds/${profile.id}/${id}`);
      await fs.mkdir(path__namespace.dirname(destination), { recursive: true });
      await fs.rename(temporary, destination);
      progress.onProgress?.("Immutable PDF edition saved");
      return build;
    } finally {
      await fs.rm(temporary, { recursive: true, force: true });
    }
  });
}
const numericId = (value) => {
  const id = String(value ?? "");
  if (!/^[1-9][0-9]{0,24}$/.test(id)) throw new Error("Invalid Zenodo record or draft identity.");
  return id;
};
const submitted = (record) => record?.submitted === true || record?.state === "done";
const md5 = (bytes) => crypto__namespace.createHash("md5").update(bytes).digest("hex");
const checksumMatches = (value, bytes) => {
  const text = String(value || "").toLowerCase();
  return text === `md5:${md5(bytes)}` || text === md5(bytes) || text === `sha256:${sha256(bytes)}` || text === sha256(bytes);
};
function fileName(profile) {
  return `${profile.id}-${profile.version.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;
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
      const URLConstructor = require("node:url").URL, url = new URLConstructor(input, origin);
      if (url.origin !== origin || url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !url.pathname.startsWith("/api/")) throw new Error("Zenodo returned an untrusted API URL.");
      return url.toString();
    };
    const request = async (input, method = "GET", body, binary = false) => {
      const url = secureUrl(input), fetcher = this.options.fetch || globalThis.fetch;
      if (!fetcher) throw new Error("This Node.js runtime does not provide fetch for Zenodo.");
      let response;
      try {
        response = await fetcher(url, { method, redirect: "error", headers: { Authorization: `Bearer ${token}`, ...body !== void 0 ? { "Content-Type": binary ? "application/octet-stream" : "application/json" } : {} }, ...body !== void 0 ? { body: binary ? body : JSON.stringify(body) } : {} });
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
  nextState(profile, record, previous) {
    const id = numericId(record.id), published = submitted(record), doi = normalizeDoi(record.doi || record.metadata?.doi || record.metadata?.prereserve_doi?.doi), conceptDoi = normalizeDoi(record.conceptdoi || record.concept_doi || previous?.conceptDoi);
    const conceptRecordId = record.conceptrecid ? numericId(record.conceptrecid) : previous?.conceptRecordId;
    if (previous?.conceptRecordId && conceptRecordId && previous.conceptRecordId !== conceptRecordId) throw new Error("Zenodo returned a different work record identity. The existing binding is retained.");
    if (previous?.conceptDoi && conceptDoi && previous.conceptDoi !== conceptDoi) throw new Error("Zenodo returned a different work DOI. The existing work binding is retained.");
    if (profile.doi?.versionDoi && doi && profile.doi.versionDoi !== doi) throw new Error("The manually entered version DOI differs from this Zenodo draft. Reconcile the DOI before proceeding.");
    if (profile.doi?.conceptDoi && conceptDoi && profile.doi.conceptDoi !== conceptDoi) throw new Error("The manually entered work DOI differs from the bound Zenodo work.");
    const origin = profile.zenodo?.environment === "production" ? "https://zenodo.org" : "https://sandbox.zenodo.org";
    const ownedFiles = (previous?.ownedFiles || []).filter((file) => file.draftId === id);
    const owned = [previous?.upload, ...previous?.history || [], ...ownedFiles].filter(Boolean);
    const draftFiles = (record.files || []).map((file) => ({ name: String(file.filename || file.key || ""), checksum: String(file.checksum || ""), bytes: Number(file.filesize || file.size) || void 0, owned: owned.some((item) => item.fileName === (file.filename || file.key) && item.remoteChecksum === String(file.checksum || "")) }));
    const uploadMatches = previous?.upload && (previous.draftId === id || previous.recordId === id) && draftFiles.length === 1 && draftFiles[0].name === previous.upload.fileName && draftFiles[0].checksum === previous.upload.remoteChecksum;
    return { schema: "math-workspace.publication-zenodo/v1", environment: profile.zenodo?.environment || "sandbox", status: published ? "published" : "draft", ...published ? { recordId: id } : { draftId: id }, conceptRecordId, versionDoi: doi, conceptDoi, recordUrl: `${origin}/${published ? "records" : "deposit"}/${id}`, history: previous?.history || [], draftFiles, ownedFiles, ...uploadMatches ? { upload: previous.upload } : {} };
  }
  metadata(profile, build) {
    if (!profile.authors.length) throw new Error("Zenodo publication requires at least one named author.");
    if (!profile.description) throw new Error("Zenodo publication requires a description in the saved profile.");
    const date = profile.publicationDate || build?.createdAt.slice(0, 10) || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Zenodo publication date must use YYYY-MM-DD.");
    const language = zenodoLanguage(profile.language);
    return { upload_type: "publication", publication_type: "book", title: profile.title, creators: profile.authors.map((author) => ({ name: author.name, ...author.orcid ? { orcid: author.orcid.replace(/^https?:\/\/orcid.org\//i, "") } : {}, ...author.affiliation ? { affiliation: author.affiliation } : {} })), description: profile.description, version: profile.version, publication_date: date, access_right: "open", license: profile.license || "cc-by-4.0", ...language ? { language } : {}, ...profile.doi?.versionDoi ? { doi: profile.doi.versionDoi } : {} };
  }
  checkBinding(profile, remote) {
    if (remote && remote.environment !== (profile.zenodo?.environment || "sandbox")) throw new Error("This publication is already bound to a different Zenodo environment.");
  }
  bucket(client, record) {
    if (!record.links?.bucket) throw new Error("Zenodo did not provide an editable draft upload bucket.");
    const bucket = client.secureUrl(record.links.bucket).replace(/\/$/, "");
    if (!/^\/api\/files\/[a-zA-Z0-9-]+$/.test(new (require("node:url")).URL(bucket).pathname)) throw new Error("Zenodo returned an untrusted upload bucket.");
    return bucket;
  }
  async checkOtherWorkBinding(profile) {
    for (const saved of await this.store.profiles()) if (saved.profile.id !== profile.id && saved.profile.workId === profile.workId && (saved.profile.zenodo?.environment || "sandbox") === profile.zenodo.environment && await this.store.remote(saved.profile.id)) throw new Error(`This work already has a Zenodo binding in publication profile ${saved.profile.id}. Continue its existing profile instead of creating a disconnected record.`);
  }
  async reserve(profileId, expectedRevision, options) {
    return this.store.locked(profileId, async () => {
      const { profile: raw } = await this.store.expectProfile(profileId, expectedRevision), profile = normalizeProfile(raw), client = this.client(profile);
      let remote = await this.store.remote(profileId);
      this.checkBinding(profile, remote);
      if (remote?.pending) throw new Error("A previous Zenodo operation has an unresolved result. Attach its existing draft or record to reconcile it before continuing.");
      if (options.mode === "new-version") {
        if (remote?.status !== "published" || remote.recordId !== numericId(options.expectedRecordId)) throw new Error("Creating a new version requires the reviewed latest published record identity.");
        if (profile.doi?.versionDoi) throw new Error("Remove the manually entered version DOI before reserving a new Zenodo version DOI. The stable work DOI can be retained.");
        const record = await client.request(`/api/deposit/depositions/${remote.recordId}`);
        if (!submitted(record)) throw new Error("The bound Zenodo record is not published. Reconcile its status first.");
        const prior = remote;
        remote = await this.store.writeRemote(profileId, { ...remote, status: "unknown", pending: { action: "new-version", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: remote.recordId } });
        const result = await client.request(`/api/deposit/depositions/${prior.recordId}/actions/newversion`, "POST");
        const latest = result?.links?.latest_draft;
        if (!latest) throw new Error("Zenodo did not acknowledge a latest draft. Attach the existing new-version draft explicitly.");
        const verified = client.secureUrl(latest), idMatch = /\/api\/deposit\/depositions\/([1-9][0-9]*)\/?$/.exec(verified);
        if (!idMatch) throw new Error("Zenodo returned an invalid latest draft identity.");
        remote = await this.store.writeRemote(profileId, { ...prior, status: "unknown", pending: { action: "new-version", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: idMatch[1] }, recordId: void 0, draftId: idMatch[1], versionDoi: void 0, upload: void 0, history: [...prior.history || [], { recordId: prior.recordId, versionDoi: prior.versionDoi, buildId: prior.upload?.buildId, pdfSha256: prior.upload?.pdfSha256, fileName: prior.upload?.fileName, remoteChecksum: prior.upload?.remoteChecksum }] });
        const draft2 = await client.request(verified);
        if (submitted(draft2)) throw new Error("Zenodo returned a published record instead of an editable new-version draft.");
        remote = await this.store.writeRemote(profileId, this.nextState(profile, draft2, remote));
      } else if (options.mode !== "reuse-or-create") throw new Error("Choose draft reuse or an explicit new version.");
      else if (remote?.status === "published") throw new Error("This edition is published and immutable. Use the explicit new-version action to continue the same work.");
      if (!remote) {
        if (profile.doi?.versionDoi || profile.doi?.conceptDoi) throw new Error("A manual version or work DOI is already present. Attach its existing Zenodo record before continuing the same work, or remove the manual DOI before creating a new Zenodo work.");
        this.metadata(profile);
        const marker = await this.store.locked("zenodo-work-bindings", async () => {
          await this.checkOtherWorkBinding(profile);
          return this.store.writeRemote(profileId, { schema: "math-workspace.publication-zenodo/v1", environment: client.environment, status: "unknown", pending: { action: "create", startedAt: (/* @__PURE__ */ new Date()).toISOString() } });
        }, "provider");
        let created;
        try {
          created = await client.request("/api/deposit/depositions", "POST", {});
        } catch (error) {
          if (error instanceof ZenodoHttpError && [401, 403].includes(error.status)) {
            const current = await this.store.remote(profileId);
            if (current?.revision === marker.revision && current.pending?.action === "create" && !current.draftId && !current.recordId && !current.conceptRecordId && !current.versionDoi && !current.conceptDoi && !current.pending.recordId && !current.pending.buildId) {
              await require("node:fs/promises").unlink(await this.store.directory(`remote/${profileId}.json`));
            }
          }
          throw error;
        }
        if (submitted(created)) throw new Error("Zenodo returned an unexpected published record.");
        await this.store.writeRemote(profileId, { schema: "math-workspace.publication-zenodo/v1", environment: client.environment, status: "unknown", draftId: numericId(created.id), pending: { action: "create", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: numericId(created.id) } });
        remote = await this.store.writeRemote(profileId, this.nextState(profile, created));
      }
      if (!remote.draftId || remote.status !== "draft") throw new Error("Attach a known editable Zenodo draft before reserving a DOI.");
      const draft = await client.request(`/api/deposit/depositions/${numericId(remote.draftId)}`);
      if (submitted(draft)) throw new Error("Published Zenodo files and metadata cannot be overwritten. Reconcile the record and create a new version.");
      if (!draft.metadata?.prereserve_doi?.doi && !draft.doi && !draft.metadata?.doi) {
        const updated = await client.request(`/api/deposit/depositions/${remote.draftId}`, "PUT", { metadata: { ...draft.metadata, ...this.metadata(profile), prereserve_doi: true } });
        remote = await this.store.writeRemote(profileId, this.nextState(profile, updated, remote));
      } else remote = await this.store.writeRemote(profileId, this.nextState(profile, draft, remote));
      if (!remote.versionDoi) throw new Error("Zenodo has not acknowledged a reserved version DOI. The draft is retained for reconciliation.");
      return remote;
    });
  }
  async attach(profileId, expectedRevision, options) {
    return this.store.locked(profileId, async () => {
      const { profile: raw } = await this.store.expectProfile(profileId, expectedRevision), profile = normalizeProfile(raw), client = this.client(profile), previous = await this.store.remote(profileId);
      this.checkBinding(profile, previous);
      if (!["draft", "record"].includes(options.kind)) throw new Error("Choose draft or published record.");
      const record = await client.request(`/api/deposit/depositions/${numericId(options.id)}`);
      if (submitted(record) !== (options.kind === "record")) throw new Error("The selected Zenodo identity has a different publication status.");
      const sameKnownRecord = previous && [previous.draftId, previous.recordId, ...(previous.history || []).map((item) => item.recordId)].includes(String(record.id));
      if (previous && !sameKnownRecord && (previous.conceptRecordId || previous.conceptDoi) && !record.conceptrecid && !record.conceptdoi && !record.concept_doi) throw new Error("Zenodo did not provide the work identity needed to reconcile this different record.");
      let recovered = previous;
      if (!submitted(record) && previous?.pending?.action === "upload" && previous.pending.buildId && (previous.draftId || previous.pending.recordId) === String(record.id)) {
        const build = await this.store.build(profileId, previous.pending.buildId), bytes = await this.store.artifact(profileId, build.id, "publication.pdf");
        const manifest = JSON.parse((await this.store.artifact(profileId, build.id, "manifest.json")).toString("utf8"));
        const builtProfile = normalizeProfile(manifest.plan.profile);
        if (build.workId !== profile.workId || builtProfile.id !== profile.id || builtProfile.workId !== profile.workId) throw new Error("The interrupted upload build belongs to a different work.");
        const name = fileName(builtProfile), file = (record.files || []).find((file2) => (file2.filename || file2.key) === name && checksumMatches(file2.checksum, bytes) && (!(file2.filesize || file2.size) || Number(file2.filesize || file2.size) === bytes.length));
        if (file) recovered = { ...previous, ownedFiles: [...(previous.ownedFiles || []).filter((item) => item.draftId !== String(record.id) || item.fileName !== name), { draftId: String(record.id), buildId: build.id, pdfSha256: build.pdfSha256, fileName: name, remoteChecksum: String(file.checksum) }] };
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
    const profile = normalizeProfile(saved.profile), build = await this.store.build(profileId, buildId2), remote = await this.store.remote(profileId);
    this.checkBinding(profile, remote);
    if (!remote || remote.revision !== review.remoteRevision) throw new Error("The Zenodo draft state changed. Reload and review it again.");
    if (remote.pending) throw new Error("Reconcile the unresolved Zenodo operation before continuing.");
    if (remote.status !== "draft" || !remote.draftId) throw new Error("Only an editable Zenodo draft can receive this edition; published records are immutable.");
    if (build.pdfSha256 !== review.pdfSha256) throw new Error("The reviewed PDF digest does not match this build.");
    const manifest = JSON.parse((await this.store.artifact(profileId, buildId2, "manifest.json")).toString("utf8"));
    if (canonical(normalizeProfile(manifest.plan.profile)) !== canonical(profile) || (await this.plan(profile).catch(() => null))?.fingerprint !== build.fingerprint) throw new Error("The selected sources, profile, or DOI binding changed. Build and review a fresh edition before uploading or publishing.");
    const bytes = await this.store.artifact(profileId, buildId2, "publication.pdf");
    return { profile, build, remote, bytes, client: this.client(profile), metadata: this.metadata(profile, build) };
  }
  exactFiles(record, name, bytes) {
    return Array.isArray(record?.files) && record.files.length === 1 && (record.files[0].filename || record.files[0].key) === name && checksumMatches(record.files[0].checksum, bytes) && (!record.files[0].filesize || Number(record.files[0].filesize) === bytes.length);
  }
  uploadPlan(profile, build, remote, record, metadata) {
    if (submitted(record)) throw new Error("The Zenodo draft was already published. Its files cannot be overwritten.");
    const name = fileName(profile), owned = [remote.upload, ...remote.history || [], ...(remote.ownedFiles || []).filter((file) => file.draftId === remote.draftId)].filter(Boolean);
    const files = (record.files || []).map((file) => ({ id: String(file.id || ""), name: String(file.filename || file.key || ""), checksum: String(file.checksum || ""), bytes: Number(file.filesize || file.size) || void 0, owned: owned.some((item) => item.fileName === (file.filename || file.key) && item.remoteChecksum === String(file.checksum || "")) })).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    const content = { profileId: profile.id, buildId: build.id, draftId: remote.draftId, remoteRevision: remote.revision, pdfSha256: build.pdfSha256, files, metadataSha256: sha256(canonical(metadata)), target: name, bucket: String(record.links?.bucket || "") };
    return { profileId: profile.id, buildId: build.id, draftId: remote.draftId, remoteRevision: remote.revision, pdfSha256: build.pdfSha256, fingerprint: sha256(canonical(content)), files: files.map(({ id, ...file }) => file), add: files.some((file) => file.name === name) ? [] : [name], replace: files.filter((file) => file.name === name && file.owned).map((file) => file.name), remove: files.filter((file) => file.name !== name && file.owned).map((file) => file.name), blocked: files.filter((file) => !file.owned).map((file) => file.name) };
  }
  async reviewUpload(profileId, buildId2, review) {
    const { profile, build, remote, client, metadata } = await this.reviewed(profileId, buildId2, review);
    const draft = await client.request(`/api/deposit/depositions/${remote.draftId}`);
    this.bucket(client, draft);
    return this.uploadPlan(profile, build, remote, draft, metadata);
  }
  async upload(profileId, buildId2, review) {
    return this.store.locked(profileId, async () => {
      const { profile, build, remote, bytes, client, metadata } = await this.reviewed(profileId, buildId2, review), name = fileName(profile);
      const draft = await client.request(`/api/deposit/depositions/${remote.draftId}`);
      const bucket = this.bucket(client, draft);
      const preflight = this.uploadPlan(profile, build, remote, draft, metadata);
      if (!review.uploadFingerprint || review.uploadFingerprint !== preflight.fingerprint) throw new Error("The Zenodo upload file plan changed or was not reviewed. Review its exact file changes before uploading.");
      if (preflight.blocked.length) throw new Error(`The Zenodo draft contains files not owned by this publication workflow (${preflight.blocked.join(", ")}). Review them in Zenodo before uploading this edition.`);
      await this.store.writeRemote(profileId, { ...remote, pending: { action: "upload", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: remote.draftId, buildId: buildId2 } });
      for (const file of draft.files || []) {
        const id = String(file.id || "");
        if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("Zenodo returned an invalid draft file identity.");
        await client.request(`/api/deposit/depositions/${remote.draftId}/files/${id}`, "DELETE");
      }
      const acknowledgement = await client.request(`${bucket}/${encodeURIComponent(name)}`, "PUT", bytes, true);
      if (!checksumMatches(acknowledgement?.checksum, bytes)) throw new Error("Zenodo did not acknowledge the exact PDF checksum. Reconcile the draft before publishing.");
      await client.request(`/api/deposit/depositions/${remote.draftId}`, "PUT", { metadata: { ...draft.metadata, ...metadata, ...profile.doi?.versionDoi ? {} : { prereserve_doi: true } } });
      const observed = await client.request(`/api/deposit/depositions/${remote.draftId}`);
      if (submitted(observed) || !this.exactFiles(observed, name, bytes)) throw new Error("The Zenodo draft file set differs from this exact edition.");
      if ((await this.plan(profile)).fingerprint !== build.fingerprint) throw new Error("Publication inputs changed during upload. The draft remains unpublished; build and review a fresh edition.");
      return this.store.writeRemote(profileId, { ...this.nextState(profile, observed, remote), upload: { buildId: buildId2, pdfSha256: build.pdfSha256, metadataSha256: sha256(canonical(metadata)), fileName: name, remoteChecksum: String(acknowledgement.checksum), uploadedAt: (/* @__PURE__ */ new Date()).toISOString() } });
    });
  }
  async publish(profileId, buildId2, review) {
    return this.store.locked(profileId, async () => {
      const { profile, build, remote, bytes, client, metadata } = await this.reviewed(profileId, buildId2, review);
      if (remote.draftId !== numericId(review.recordId) || remote.upload?.buildId !== buildId2 || remote.upload?.pdfSha256 !== build.pdfSha256 || remote.upload?.metadataSha256 !== sha256(canonical(metadata))) throw new Error("Publication requires the reviewed record identity and the exact uploaded edition.");
      const draft = await client.request(`/api/deposit/depositions/${remote.draftId}`);
      if (submitted(draft) || !this.exactFiles(draft, remote.upload.fileName, bytes)) throw new Error("The Zenodo draft changed after upload. Review and upload the exact edition again.");
      for (const [key, value] of Object.entries(metadata)) if (canonical(draft.metadata?.[key]) !== canonical(value)) throw new Error("The Zenodo publication metadata changed after review. Upload the reviewed edition again.");
      await this.store.writeRemote(profileId, { ...remote, status: "unknown", pending: { action: "publish", startedAt: (/* @__PURE__ */ new Date()).toISOString(), recordId: remote.draftId, buildId: buildId2 } });
      const result = await client.request(`/api/deposit/depositions/${remote.draftId}/actions/publish`, "POST");
      if (!submitted(result)) throw new Error("Zenodo has not confirmed publication. Attach the existing record to reconcile the result.");
      const returnedDoi = normalizeDoi(result.doi || result.metadata?.doi || result.metadata?.prereserve_doi?.doi);
      const metadataMatches = Object.entries(metadata).every(([key, value]) => canonical(result.metadata?.[key]) === canonical(value));
      if (String(result.id) !== remote.draftId || !this.exactFiles(result, remote.upload.fileName, bytes) || !metadataMatches || returnedDoi !== remote.versionDoi) throw new Error("Zenodo publication acknowledgement differs from the reviewed edition. The remote result requires reconciliation before claiming publication success.");
      return this.store.writeRemote(profileId, this.nextState(profile, result, remote));
    });
  }
}
class PublicationService {
  constructor(root, options = {}) {
    this.options = options;
    this.store = new PublicationStore(root);
    this.zenodo = new ZenodoPublication(this.store, options, (profile) => this.plan(profile));
  }
  async inspect() {
    const catalog = await publicationCatalog(this.store.root), profiles = await this.store.profiles();
    const defaultProfile = { id: "publication", workId: path__namespace.basename(this.store.root).replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^[^a-zA-Z0-9]+/, "").slice(0, 79) || "work", title: "", version: "0.1.0", authors: [], language: catalog.language, license: "cc-by-4.0", chapters: [], frontMatter: [], backMatter: [], toc: { enabled: true, depth: 2 }, cover: { showVersion: true }, zenodo: { environment: "sandbox", tokenEnv: "ZENODO_TOKEN" } };
    return { ...catalog, profiles, tools: await publicationTools(void 0, this.options), defaultProfile, credentialStatus: profiles.map(({ profile }) => ({ profileId: profile.id, environment: profile.zenodo?.environment || "sandbox", ...this.zenodo.credential(profile) })) };
  }
  async save(input, expectedRevision) {
    return this.store.save(normalizeProfile(input), expectedRevision);
  }
  async doi(profile) {
    const remote = await this.store.remote(profile.id);
    if (profile.doi?.versionDoi || !remote?.versionDoi && profile.doi?.conceptDoi) return { source: "manual", state: "unverified", versionDoi: profile.doi.versionDoi, conceptDoi: profile.doi.conceptDoi, provenance: profile.doi.provenance || "Manually entered in the publication profile; provider registration is not asserted." };
    if (remote?.versionDoi) return { source: "zenodo", state: remote.status === "published" ? "published" : "reserved", versionDoi: remote.versionDoi, conceptDoi: remote.conceptDoi || profile.doi?.conceptDoi, recordId: remote.draftId || remote.recordId, provenance: remote.status === "published" ? "Zenodo publication acknowledgement" : "Zenodo draft DOI reservation; not registered until publication" };
    return { source: "none", state: "none", conceptDoi: profile.doi?.conceptDoi };
  }
  async plan(input) {
    const profile = normalizeProfile(input);
    return (await makePublicationPlan(this.store.root, profile, await this.doi(profile), this.options)).plan;
  }
  async build(input, expectedFingerprint, options = {}) {
    const profile = normalizeProfile(input), result = await makePublicationPlan(this.store.root, profile, await this.doi(profile), this.options);
    if (!/^[a-f0-9]{64}$/.test(expectedFingerprint) || result.plan.fingerprint !== expectedFingerprint) throw new Error("The publication plan changed. Review a fresh plan before building.");
    return renderPublication(this.store, result.plan, result.snapshot, () => this.plan(profile), this.options, options);
  }
  async status(profileId) {
    const profile = await this.store.profile(profileId);
    if (!profile) throw new Error("Publication profile not found.");
    return { profile, builds: await this.store.builds(profileId), remote: await this.store.remote(profileId), credential: this.zenodo.credential(profile.profile) };
  }
  async readArtifact(profileId, buildId2, artifact) {
    const bytes = await this.store.artifact(profileId, buildId2, artifact);
    return { bytes, contentType: artifact === "publication.pdf" ? "application/pdf" : artifact.endsWith(".json") ? "application/json; charset=utf-8" : "text/markdown; charset=utf-8", fileName: artifact };
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
}
exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
exports.DEFAULT_LEAN_COVERAGE_TYPES = DEFAULT_LEAN_COVERAGE_TYPES;
exports.FORMAL_KIND_POLICIES = FORMAL_KIND_POLICIES;
exports.FORMAL_TYPE_PATTERN = FORMAL_TYPE_PATTERN;
exports.HASH_ID_RE = HASH_ID_RE;
exports.MarkdownFence = MarkdownFence;
exports.PublicationService = PublicationService;
exports.TMP_ID_RE = TMP_ID_RE;
exports.associatedProofContent = associatedProofContent;
exports.buildReaderIndex = buildReaderIndex;
exports.buildRuntimeDefinitions = buildRuntimeDefinitions;
exports.displayLabel = displayLabel;
exports.displayNumber = displayNumber;
exports.escapeRegExp = escapeRegExp;
exports.findSymbolsInMarkdown = findSymbolsInMarkdown;
exports.formatDisplayNumber = formatDisplayNumber;
exports.formatPageHeading = formatPageHeading;
exports.formatPageReference = formatPageReference;
exports.isPageLabelType = isPageLabelType;
exports.isPedagogicalKind = isPedagogicalKind;
exports.mergeConfig = mergeConfig;
exports.normalizeFormalPagePath = normalizeFormalPagePath;
exports.normalizeLatexSymbol = normalizeLatexSymbol;
exports.parseFormalMarkerLine = parseFormalMarkerLine;
exports.pathPatternMatches = pathPatternMatches;
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
exports.renderProjectAnalysis = renderProjectAnalysis;
exports.renderReferenceMap = renderReferenceMap;
exports.renderReport = renderReport;
exports.safePath = safePath;
exports.scanFormalDocuments = scanFormalDocuments;
exports.shouldExcludeScanPath = shouldExcludeScanPath;
exports.sortManuscriptPages = sortManuscriptPages;
exports.stripSolutionAssociation = stripSolutionAssociation;
exports.toPosix = toPosix;
exports.typeName = typeName;
exports.unique = unique;
