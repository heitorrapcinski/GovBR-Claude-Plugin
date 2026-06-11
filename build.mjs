// Bundle dos servidores MCP em arquivos autossuficientes (deps inclusas).
// Um bundle por API do governo, todos a partir do mesmo núcleo (src/core).
// Permite distribuir o plugin sem node_modules e sem `npm install` no destino.
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// Cada entrada vira um bundle .cjs registrado no .mcp.json.
const entries = [
  { in: "src/apis/pncp/index.ts", out: "build/pncp.cjs" },
  { in: "src/apis/compras/index.ts", out: "build/compras.cjs" },
];

for (const entry of entries) {
  await build({
    entryPoints: [entry.in],
    bundle: true,
    platform: "node",
    // CommonJS: `require` nativo resolve as deps CJS do axios (form-data etc.)
    // sem o shim de "Dynamic require" que quebra no formato ESM.
    format: "cjs",
    target: "node18",
    // .cjs garante interpretação como CommonJS em qualquer diretório, sem depender
    // de um package.json ao lado do bundle.
    outfile: entry.out,
    // O shebang já vem do index.ts (esbuild o preserva na linha 1).
    // Injeta a versão do package.json em tempo de build (fonte única da verdade).
    define: { __PKG_VERSION__: JSON.stringify(pkg.version) },
    logLevel: "info",
  });
}
