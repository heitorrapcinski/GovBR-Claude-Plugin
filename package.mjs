// Empacota o plugin num arquivo .plugin (zip) pronto para "Fazer upload de plugin local".
// Inclui apenas o que o plugin precisa em runtime — sem node_modules, src ou .git.
// Saída: build/govbr-claude-plugin.plugin (a pasta build/ está no .gitignore).
import AdmZip from "adm-zip";
import { mkdirSync, existsSync } from "node:fs";

// Bundles de servidor MCP gerados por build.mjs (um por API).
const bundles = ["build/pncp.cjs", "build/compras.cjs"];
const faltando = bundles.filter((b) => !existsSync(b));
if (faltando.length > 0) {
  console.error(`Bundle(s) não encontrado(s): ${faltando.join(", ")}. Rode \`npm run build\` antes.`);
  process.exit(1);
}

const zip = new AdmZip();
zip.addLocalFolder(".claude-plugin", ".claude-plugin");
zip.addLocalFile(".mcp.json");
zip.addLocalFolder("skills", "skills");
for (const bundle of bundles) zip.addLocalFile(bundle, "build");
zip.addLocalFile("README.md");

mkdirSync("build", { recursive: true });
const out = "build/govbr-claude-plugin.plugin";
zip.writeZip(out);
console.log(`Pacote gerado: ${out}`);
