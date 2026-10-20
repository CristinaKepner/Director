// Canonical skill library → deterministic catalog and optional agent discovery mirror.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const library = path.join(root, "skills-library");
const installed = path.join(library, "installed");
const check = process.argv.includes("--check");
const flova = JSON.parse(
  fs.readFileSync(path.join(root, "docs/flova-skills.json")),
);
function filesIn(dir, prefix = "") {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => entryPaths(dir, prefix, entry))
    .sort();
}
function entryPaths(dir, prefix, entry) {
  const relative = prefix + entry.name;
  if (entry.isSymbolicLink())
    throw new Error(`Unsupported symlink: ${relative}`);
  if (entry.isDirectory())
    return filesIn(path.join(dir, entry.name), relative + "/");
  return [relative];
}
function fileInfo(dir, file) {
  const data = fs.readFileSync(path.join(dir, file));
  return {
    path: file,
    bytes: data.length,
    sha256: crypto.createHash("sha256").update(data).digest("hex"),
  };
}
function description(file) {
  const text = fs.readFileSync(file, "utf8");
  return (text.match(/^description:\s*(.+)$/m)?.[1] || "").replace(
    /^"|"$/g,
    "",
  );
}
const skillDefaults = { kind: "skill", entry: "SKILL.md" };
const referenceDefaults = {
  group: "code-video",
  kind: "reference",
  entry: "README.md",
  description: "代码视频指南、提示词与源码参考",
  documents: ["README.md"],
};
function snapshot(directory) {
  const dir = path.join(library, directory);
  const files = filesIn(dir).map((file) => fileInfo(dir, file));
  return { directory, files };
}
function installedEntry(id) {
  const data = snapshot(`installed/${id}`);
  const title = flova.find((item) => item.name === id)?.title || id;
  const group = id.startsWith("flova-") ? "flova" : "project";
  const identity = { id, title, group, ...skillDefaults };
  return { ...identity, ...data, ...skillDocuments(data) };
}
function skillDocuments(data) {
  const dir = path.join(library, data.directory);
  const documents = ["SKILL.md", "reference.md"].filter((file) =>
    fs.existsSync(path.join(dir, file)),
  );
  return { description: description(path.join(dir, "SKILL.md")), documents };
}
function referenceEntry(id) {
  const file = path.join(library, id, "SOURCE.json");
  const source = JSON.parse(fs.readFileSync(file));
  const origin = { source: source.repository, revision: source.commit };
  const identity = { id: `reference-${id}`, title: id, ...referenceDefaults };
  return { ...identity, ...snapshot(id), ...origin };
}
function verifyMirror(entry) {
  const mirror = path.join(root, ".agents/skills", entry.id);
  const actual = filesIn(mirror).map((file) => fileInfo(mirror, file));
  if (JSON.stringify(actual) !== JSON.stringify(entry.files))
    throw new Error(`Skill mirror drift: ${entry.id}`);
}
function syncMirror(entry) {
  const mirror = path.join(root, ".agents/skills", entry.id);
  fs.cpSync(path.join(library, entry.directory), mirror, { recursive: true });
  verifyMirror(entry);
}
const entries = fs.readdirSync(installed).sort().map(installedEntry);
const references = [
  "lemo-opuscar",
  "awesome-opus5-5-videos",
  "PDoomVideo",
  "opus-video-prompts",
].map(referenceEntry);
const serialized =
  JSON.stringify(
    { version: 1, entries: [...entries, ...references] },
    null,
    2,
  ) + "\n";
const target = path.join(library, "catalog.json");
if (check && fs.readFileSync(target, "utf8") !== serialized)
  throw new Error("Skill catalog is stale; run npm run skills:index");
if (!check) fs.writeFileSync(target, serialized);
for (const entry of entries)
  process.argv.includes("--sync") ? syncMirror(entry) : verifyMirror(entry);
console.log(
  `${entries.length} skills + ${references.length} reference libraries; catalog and discovery mirrors verified`,
);
