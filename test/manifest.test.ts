import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

interface ContentScriptRegistration {
  matches: string[];
  js: string[];
  run_at: string;
  all_frames: boolean;
  match_about_blank: boolean;
  match_origin_as_fallback: boolean;
  world: "MAIN" | "ISOLATED";
}

interface ExtensionManifest {
  manifest_version: number;
  minimum_chrome_version: string;
  version: string;
  content_scripts: ContentScriptRegistration[];
  icons: Record<string, string>;
  permissions?: unknown;
  host_permissions?: unknown;
}

interface PackageMetadata {
  version: string;
  license: string;
  engines: { node: string };
  repository: { url: string };
}

const root = fileURLToPath(new URL("../", import.meta.url));
const build = path.join(root, "build");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "manifest.json"), "utf8"),
) as ExtensionManifest;
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
) as PackageMetadata;

test("uses supported Chrome metadata and one version across project files", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.minimum_chrome_version, "111");
  assert.equal(manifest.version, packageJson.version);
  assert.equal(packageJson.engines.node, ">=20.6");
});

test("declares the public project and its open source license", () => {
  assert.equal(packageJson.license, "MIT");
  assert.equal(packageJson.repository.url, "git+https://github.com/Charlie284/no-paste.git");

  const license = fs.readFileSync(path.join(root, "LICENSE"), "utf8");
  assert.match(license, /^MIT License$/m);
  assert.match(license, /Copyright \(c\) 2026 Charlie Harper/);
});

test("loads both paste defenses at document start in every accessible frame", () => {
  const mainWorld = manifest.content_scripts.find(({ world }) => world === "MAIN");
  const isolatedWorld = manifest.content_scripts.find(({ world }) => world === "ISOLATED");
  assert.ok(mainWorld);
  assert.ok(isolatedWorld);

  assert.deepEqual(mainWorld.js, ["clipboard-guard.js"]);
  assert.deepEqual(isolatedWorld.js, ["content.js"]);

  for (const registration of [mainWorld, isolatedWorld]) {
    assert.deepEqual(registration.matches, ["<all_urls>"]);
    assert.equal(registration.run_at, "document_start");
    assert.equal(registration.all_frames, true);
    assert.equal(registration.match_about_blank, true);
    assert.equal(registration.match_origin_as_fallback, true);
    assert.equal(fs.existsSync(path.join(build, registration.js[0]!)), true);
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
