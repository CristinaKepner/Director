import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { capabilities } from "../core/index.js";
const root = new URL("../", import.meta.url);
const catalog = JSON.parse(
  fs.readFileSync(new URL("docs/features/catalog.json", root)),
);
const read = (file) => fs.readFileSync(new URL(file, root), "utf8");
const exists = (file) => fs.existsSync(new URL(file, root));

test("每项功能都有说明、实现入口和真实测试文件", () => {
  for (const feature of catalog.features) checkFeature(feature);
});
function checkFeature(feature) {
  assert.ok(exists(`docs/features/${feature.id}/README.md`));
  assert.ok(exists(`docs/features/${feature.id}/implementation.md`));
  assert.ok(feature.modules.length && feature.tests.length, feature.id);
  for (const file of [...feature.modules, ...feature.tests, ...feature.docs]) {
    assert.ok(exists(file), `${feature.id}: ${file}`);
  }
}

test("迁移目标存在且旧私有实现已移除，避免两套实现漂移", () => {
  for (const [before, after] of Object.entries(catalog.moves)) {
    assert.ok(exists(after), after);
    assert.equal(exists(before), false, before);
  }
});

test("每个已注册操作唯一归属一个功能，操作说明可定位", () => {
  for (const action of capabilities()) checkAction(action);
});
function checkAction(action) {
  const owners = actionOwners(action.name);
  assert.equal(owners.length, 1, action.name);
  const doc = read(`docs/features/${owners[0].id}/implementation.md`);
  assert.ok(doc.includes(`\`${action.name}\``));
}
function actionOwners(name) {
  const exact = catalog.features.filter((f) =>
    f.actionNames?.includes(name),
  );
  if (exact.length) return exact;
  return catalog.features.filter((f) =>
    f.actionPrefixes.includes(name.split(".")[0]),
  );
}

test("功能文档中的本地相对链接全部存在", () => {
  const files = fs.readdirSync(new URL("docs/features/", root), {
    recursive: true,
  });
  for (const file of files.filter((f) => f.endsWith(".md")))
    checkLinks(`docs/features/${file}`);
});
function checkLinks(file) {
  for (const [, target] of read(file).matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(https?:|#)/.test(target)) continue;
    const relative = path.join(path.dirname(file), target.split("#")[0]);
    assert.ok(exists(relative), `${file}: ${target}`);
  }
}

test("功能源码覆盖清单与打包根目录一致", () => {
  const resources = JSON.parse(read("desktop/package.json")).build
    .extraResources;
  for (const target of Object.values(catalog.moves))
    checkPackaged(target, resources);
});
function checkPackaged(file, resources) {
  assert.ok(
    resources.some((r) => file.startsWith(r.from.replace(/^\.\.\//, "") + "/")),
    file,
  );
  checkStaticResource(file);
}
function checkStaticResource(file) {
  if (!file.startsWith("web/") && !file.startsWith("core/")) return;
  const command = `copy("${file.split("/")[0]}")`;
  assert.ok(read("tools/build-web.mjs").includes(command), file);
}
