import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDirectory, buildExtension, projectDirectory } from "./build.js";

const files = [
  "LICENSE",
  "manifest.json",
  "clipboard-guard.js",
  "content.js",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
] as const;

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return crc >>> 0;
});

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff]!;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function localHeader(name: Buffer, data: Buffer, checksum: number): Buffer {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0x21, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);
  return header;
}

function centralHeader(
  name: Buffer,
  data: Buffer,
  checksum: number,
  offset: number,
): Buffer {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0x21, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  return header;
}

function endRecord(entryCount: number, centralSize: number, centralOffset: number): Buffer {
  const record = Buffer.alloc(22);
  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(0, 4);
  record.writeUInt16LE(0, 6);
  record.writeUInt16LE(entryCount, 8);
  record.writeUInt16LE(entryCount, 10);
  record.writeUInt32LE(centralSize, 12);
  record.writeUInt32LE(centralOffset, 16);
  record.writeUInt16LE(0, 20);
  return record;
}

function createArchive(entries: ReadonlyArray<readonly [string, Buffer]>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const [filename, data] of entries) {
    const name = Buffer.from(filename, "utf8");
    const checksum = crc32(data);
    const header = localHeader(name, data, checksum);

    localParts.push(header, name, data);
    centralParts.push(centralHeader(name, data, checksum, localOffset), name);
    localOffset += header.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  return Buffer.concat([
    ...localParts,
    centralDirectory,
    endRecord(entries.length, centralDirectory.length, localOffset),
  ]);
}

export async function packageExtension(): Promise<string> {
  await buildExtension();

  const manifest = JSON.parse(
    fs.readFileSync(path.join(buildDirectory, "manifest.json"), "utf8"),
  ) as { version: string };
  const outputDirectory = path.join(projectDirectory, "dist");
  const archive = path.join(outputDirectory, `no-paste-${manifest.version}.zip`);
  const temporaryArchive = `${archive}.tmp`;
  const entries = files.map((filename): readonly [string, Buffer] => [
    filename,
    fs.readFileSync(path.join(buildDirectory, filename)),
  ]);

  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(temporaryArchive, createArchive(entries));
  fs.rmSync(archive, { force: true });
  fs.renameSync(temporaryArchive, archive);
  return archive;
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedFile === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${await packageExtension()}\n`);
}
