// Bundle do servidor MCP num único arquivo autossuficiente (deps inclusas).
// Permite distribuir o plugin sem node_modules e sem `npm install` no destino.
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  // CommonJS: `require` nativo resolve as deps CJS do axios (form-data etc.)
  // sem o shim de "Dynamic require" que quebra no formato ESM.
  format: "cjs",
  target: "node18",
  // .cjs garante interpretação como CommonJS em qualquer diretório, sem depender
  // de um package.json ao lado do bundle.
  outfile: "build/index.cjs",
  // O shebang já vem do src/index.ts (esbuild o preserva na linha 1).
  // Injeta a versão do package.json em tempo de build (fonte única da verdade).
  define: { __PKG_VERSION__: JSON.stringify(pkg.version) },
  logLevel: "info",
});
