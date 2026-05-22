import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

// Allow CJS-only packages to use require
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
// Resolve workspace packages relative to artifact root
const workspaceRoot = path.resolve(artifactDir, "../..");

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // Map workspace package imports to their source files
    alias: {
      "@workspace/db": path.resolve(workspaceRoot, "lib/db/src/index.ts"),
      "@workspace/api-zod": path.resolve(workspaceRoot, "lib/api-zod/src/index.ts"),
    },
    // Externalize pino and native modules
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "pg-native",
      "pino",
      "pino-http",
      "thread-stream",
      "pino-pretty",
      "pino-worker",
      "pino/file",
      "pino-loki",
      "@hapi/shot",
    ],
    sourcemap: "linked",
    // Make CJS packages work in ESM output
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
