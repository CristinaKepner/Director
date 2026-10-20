import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
export const defaultLibraryRoot = new URL(
  "../../../../skills-library/",
  import.meta.url,
);
export function skillError(code) {
  return Object.assign(new Error(code), { code });
}
function validRelative(relative) {
  if (typeof relative !== "string") return false;
  if (relative.includes("\\") || path.isAbsolute(relative)) return false;
  return relative
    .split("/")
    .every((part) => part && part !== ".." && part !== ".");
}
export function inside(root, relative) {
  if (!validRelative(relative)) throw skillError("SKILL_PATH_INVALID");
  const resolved = fs.realpathSync(path.join(root, relative));
  const boundary = fs.realpathSync(root) + path.sep;
  if (!resolved.startsWith(boundary)) throw skillError("SKILL_PATH_INVALID");
  return resolved;
}
export function loadCatalog(root) {
  const catalog = JSON.parse(
    fs.readFileSync(inside(root, "catalog.json"), "utf8"),
  );
  if (catalog.version !== 1 || !Array.isArray(catalog.entries))
    throw skillError("SKILL_CATALOG_INVALID");
  const ids = new Set();
  for (const entry of catalog.entries) validateEntry(root, entry, ids);
  return catalog.entries;
}
function validateEntry(root, entry, ids) {
  if (!/^[a-zA-Z0-9-]+$/.test(entry.id) || ids.has(entry.id))
    throw skillError("SKILL_CATALOG_INVALID");
  if (!Array.isArray(entry.files) || !Array.isArray(entry.documents))
    throw skillError("SKILL_CATALOG_INVALID");
  inside(root, entry.directory);
  if (!documentsRegistered(entry)) throw skillError("SKILL_CATALOG_INVALID");
  ids.add(entry.id);
}
function documentsRegistered(entry) {
  return entry.documents.every((doc) =>
    entry.files.some((file) => file.path === doc),
  );
}
export function integer(value, fallback, max) {
  const number = value === undefined ? fallback : value;
  if (!Number.isInteger(number) || number < 0 || number > max)
    throw skillError("SKILL_RANGE_INVALID");
  return number;
}
export function page(items, input, max = 30) {
  const offset = integer(input.offset, 0, items.length);
  const limit = integer(input.limit, max, max);
  if (limit === 0) throw skillError("SKILL_RANGE_INVALID");
  const end = Math.min(items.length, offset + limit);
  return pageResult(items, offset, end);
}
function pageResult(items, offset, end) {
  return {
    items: items.slice(offset, end),
    total: items.length,
    nextOffset: end < items.length ? end : null,
  };
}

export function matching(items, query, describe) {
  if (query !== undefined && (typeof query !== "string" || query.length > 500))
    throw skillError("SKILL_QUERY_INVALID");
  const terms = (query || "").toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) =>
    terms.every((term) => describe(item).toLowerCase().includes(term)),
  );
}
export function readDocument(root, entry, input = {}) {
  const relative = input.path ?? entry.entry;
  const record = entry.files.find((file) => file.path === relative);
  if (!record) throw skillError("SKILL_FILE_NOT_FOUND");
  const text = verifiedText(
    inside(root, `${entry.directory}/${relative}`),
    record,
  );
  return textPage(relative, text, input, record.sha256);
}
function textPage(file, text, input, sha256) {
  const offset = integer(input.offset, 0, text.length);
  const limit = integer(input.limit, 12000, 24000);
  if (!limit) throw skillError("SKILL_RANGE_INVALID");
  return documentPage(file, text, offset, limit, sha256);
}
function verifiedText(file, record) {
  if (!fs.statSync(file).isFile() || fs.statSync(file).size > 4 * 1024 * 1024)
    throw skillError("SKILL_FILE_TOO_LARGE");
  const data = fs.readFileSync(file);
  if (crypto.createHash("sha256").update(data).digest("hex") !== record.sha256)
    throw skillError("SKILL_CONTENT_CHANGED");
  const text = new TextDecoder("utf-8", { fatal: true }).decode(data);
  if (text.includes("\0")) throw skillError("SKILL_BINARY_FILE");
  return text;
}
function documentPage(file, text, offset, limit, sha256) {
  const range = pageResult(text, offset, Math.min(text.length, offset + limit));
  const location = { path: file, offset, sha256 };
  return {
    ...location,
    content: range.items,
    totalChars: text.length,
    nextOffset: range.nextOffset,
  };
}
