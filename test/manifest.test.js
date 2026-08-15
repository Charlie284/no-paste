const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

test("uses supported Chrome metadata and one version across project files", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.minimum_chrome_version, "111");
  assert.equal(manifest.version, packageJson.version);
});

test("loads both paste defenses at document start in every accessible frame", () => {
  const mainWorld = manifest.content_scripts.find(({ world }) => world === "MAIN");
  const isolatedWorld = manifest.content_scripts.find(({ world }) => world === "ISOLATED");

  assert.deepEqual(mainWorld.js, ["clipboard-guard.js"]);
  assert.deepEqual(isolatedWorld.js, ["content.js"]);

  for (const registration of [mainWorld, isolatedWorld]) {
    assert.deepEqual(registration.matches, ["<all_urls>"]);
    assert.equal(registration.run_at, "document_start");
    assert.equal(registration.all_frames, true);
    assert.equal(registration.match_about_blank, true);
    assert.equal(registration.match_origin_as_fallback, true);
    assert.equal(fs.existsSync(path.join(root, registration.js[0])), true);
  }
});

test("requests no API permissions beyond automatic page matching", () => {
  assert.equal(manifest.permissions, undefined);
  assert.equal(manifest.host_permissions, undefined);
});

test("provides valid PNG icons at Chrome's standard sizes", () => {
  assert.deepEqual(manifest.icons, {
    16: "icons/icon-16.png",
    32: "icons/icon-32.png",
    48: "icons/icon-48.png",
    128: "icons/icon-128.png",
  });

  for (const [size, relativePath] of Object.entries(manifest.icons)) {
    const bytes = fs.readFileSync(path.join(root, relativePath));
    const pngSignature = bytes.subarray(0, 8).toString("hex");
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);

    assert.equal(pngSignature, "89504e470d0a1a0a");
    assert.equal(width, Number(size));
    assert.equal(height, Number(size));
  }
});
