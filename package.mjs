// Empacota o plugin num arquivo .plugin (zip) pronto para "Fazer upload de plugin
// local" — funciona nos três Personalizar (Code, Cowork e Chat).
//
// O importador do app REJEITA servidores stdio crus ("Plugins may only declare
// remote or MCPB servers"). Por isso o plugin não declara stdio; ele embute os
// bundles .mcpb (gerados por mcpb.mjs) e os referencia pelo campo `mcpServers`
// do plugin.json.
//
// Saída: build/govbr-claude-plugin.plugin  (a pasta build/ está no .gitignore).
import AdmZip from "adm-zip";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

// Bundles MCPB gerados por mcpb.mjs (um por API). São referenciados na raiz do plugin.
const mcpbs = ["build/govbr-pncp.mcpb", "build/govbr-compras.mcpb"];
const faltando = mcpbs.filter((b) => !existsSync(b));
if (faltando.length > 0) {
  console.error(`Bundle(s) .mcpb não encontrado(s): ${faltando.join(", ")}. Rode \`npm run mcpb\` antes.`);
  process.exit(1);
}

// plugin.json distribuído: o versionado não declara `mcpServers`; aqui
// injetamos o array apontando para os .mcpb embutidos na raiz do plugin.
const manifest = JSON.parse(readFileSync(".claude-plugin/plugin.json", "utf8"));
manifest.mcpServers = mcpbs.map((b) => `./${b.split("/").pop()}`);

const zip = new AdmZip();
zip.addFile(".claude-plugin/plugin.json", Buffer.from(JSON.stringify(manifest, null, 2) + "\n", "utf8"));
for (const b of mcpbs) zip.addLocalFile(b); // vai para a raiz do plugin
zip.addLocalFolder("skills", "skills");
zip.addLocalFile("README.md");

mkdirSync("build", { recursive: true });
const out = "build/govbr-claude-plugin.plugin";
zip.writeZip(out);
console.log(`Pacote gerado: ${out}`);
