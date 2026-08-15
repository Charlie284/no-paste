import { build } from "esbuild";
import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectDirectory = fileURLToPath(new URL("../", import.meta.url));
export const buildDirectory = path.join(projectDirectory, "build");

const staticFiles = [
  "LICENSE",
  "manifest.json",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
] as const;

export async function buildExtension(): Promise<void> {
  await rm(buildDirectory, { recursive: true, force: true });
  await mkdir(buildDirectory, { recursive: true });

  await build({
    entryPoints: {
      "clipboard-guard": path.join(projectDirectory, "src", "clipboard-guard.ts"),
      content: path.join(projectDirectory, "src", "content.ts"),
    },
    outdir: buildDirectory,
    bundle: true,
    platform: "browser",
    format: "iife",
    target: "chrome111",
    charset: "utf8",
    legalComments: "none",
    logLevel: "silent",
  });

  await Promise.all(staticFiles.map(async (filename) => {
    const destination = path.join(buildDirectory, filename);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(projectDirectory, filename), destination);
  }));
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedFile === fileURLToPath(import.meta.url)) {
  await buildExtension();
}
