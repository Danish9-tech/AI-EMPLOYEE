import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function build() {
  await esbuild({
    entryPoints: [path.resolve(__dirname, "src/index.ts")],
    platform: "node",
    target: "node18",
    bundle: true,
    format: "cjs",
    outdir: path.resolve(__dirname, "dist"),
    outExtension: { ".js": ".cjs" },
    sourcemap: true,
    minify: false,
    external: ["pg-native"],
    platform: "node",
  });
  console.log("Build complete!");
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});