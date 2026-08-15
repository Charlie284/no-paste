import assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const script = path.join(root, "scripts", "package.ts");
const archive = path.join(root, "dist", "no-paste-1.1.0.zip");

function readStoredEntries(bytes: Buffer): Map<string, Buffer> {
  const endSignature = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const endOffset = bytes.lastIndexOf(endSignature);
  assert.notEqual(endOffset, -1, "ZIP end record is missing");

  const entryCount = bytes.readUInt16LE(endOffset + 10);
  let offset = bytes.readUInt32LE(endOffset + 16);
  const entries = new Map<string, Buffer>();

  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(bytes.readUInt32LE(offset), 0x02014b50);

    const compression = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");

    assert.equal(compression, 0, `${name} should use deterministic stored compression`);
    assert.equal(bytes.readUInt32LE(localOffset), 0x04034b50);

    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    entries.set(name, bytes.subarray(dataOffset, dataOffset + compressedSize));

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function runPackager(): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, ["--import", "tsx", script], {
    cwd: root,
    encoding: "utf8",
  });
}

test("TypeScript packager creates the complete deterministic release archive", () => {
  const firstRun = runPackager();
  assert.equal(firstRun.status, 0, firstRun.stderr);
  const firstArchive = fs.readFileSync(archive);

  const secondRun = runPackager();
  assert.equal(secondRun.status, 0, secondRun.stderr);
  const secondArchive = fs.readFileSync(archive);

  assert.deepEqual(secondArchive, firstArchive);

  const entries = readStoredEntries(firstArchive);
  assert.deepEqual([...entries.keys()], [
    "LICENSE",
    "manifest.json",
    "clipboard-guard.js",
    "content.js",
    "icons/icon-16.png",
    "icons/icon-32.png",
    "icons/icon-48.png",
    "icons/icon-128.png",
  ]);

  const license = entries.get("LICENSE");
  assert.ok(license);
  assert.match(license.toString("utf8"), /^MIT License$/m);
});
