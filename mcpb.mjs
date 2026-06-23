// Empacota cada servidor MCP num bundle .mcpb (MCP Bundle), o formato que o
// importador de plugins do Claude (Cowork/desktop) aceita para servidores locais
// — diferente de stdio cru, que o importador rejeita. O .mcpb é um zip com um
// `manifest.json` na raiz e o servidor já bundlado; o host lê o manifest e sobe o
// `mcp_config.command` como servidor stdio. Como build.mjs já gera .cjs
// autossuficientes (deps inclusas via esbuild), o bundle não precisa de node_modules.
//
// Saída: build/govbr-pncp.mcpb e build/govbr-compras.mcpb.
// Requer rodar `npm run build` antes (gera os .cjs em build/).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// Metadados de cada bundle. O `bundle` é o .cjs gerado por build.mjs.
const servers = [
  {
    name: "govbr-pncp",
    displayName: "GovBR — PNCP",
    bundle: "build/pncp.cjs",
    entry: "pncp.cjs",
    description:
      "Consulta o PNCP (Portal Nacional de Contratações Públicas): licitações, " +
      "contratos, atas de registro de preço, itens do PCA, resultados e arquivos por contratação.",
  },
  {
    name: "govbr-compras",
    displayName: "GovBR — Compras.gov.br",
    bundle: "build/compras.cjs",
    entry: "compras.cjs",
    description:
      "Consulta o Compras.gov.br: catálogos de material (CATMAT) e serviço (CATSER), " +
      "pesquisa de preços, contratações 14.133, atas de registro de preço, contratos e fornecedores.",
  },
];

const faltando = servers.filter((s) => !existsSync(s.bundle));
if (faltando.length > 0) {
  console.error(
    `Bundle(s) não encontrado(s): ${faltando.map((s) => s.bundle).join(", ")}. Rode \`npm run build\` antes.`
  );
  process.exit(1);
}

mkdirSync("build", { recursive: true });

for (const s of servers) {
  // Diretório de staging do bundle: manifest.json na raiz + server/<entry>.
  const dir = `build/mcpb/${s.name}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(`${dir}/server`, { recursive: true });
  cpSync(s.bundle, `${dir}/server/${s.entry}`);

  const manifest = {
    $schema: "https://raw.githubusercontent.com/anthropics/mcpb/main/schemas/mcpb-manifest-v0.4.schema.json",
    manifest_version: "0.4",
    name: s.name,
    display_name: s.displayName,
    version: pkg.version,
    description: s.description,
    author: { name: "Heitor Rapcinski", email: "heitor.rapcinski@gmail.com" },
    repository: { type: "git", url: "https://github.com/heitorrapcinski/GovBR-Claude-Plugin" },
    license: "MIT",
    keywords: ["pncp", "compras-gov", "licitacao", "contratacao-publica", "dados-abertos", "brazil", "govbr"],
    server: {
      type: "node",
      entry_point: `server/${s.entry}`,
      // O host lança este comando como servidor stdio. ${__dirname} é o diretório
      // do bundle desempacotado — não usar caminho absoluto da máquina de build.
      //
      // O `env` passa a configuração de log EXPLICITAMENTE ao processo bundlado,
      // interpolando os valores de `user_config` (abaixo). Sem isso, o servidor só
      // veria GOVBR_LOG_* se o app GUI herdasse o ambiente do shell — o que nem
      // sempre acontece, deixando o log no padrão `error` (silencioso no arquivo).
      mcp_config: {
        command: "node",
        args: [`\${__dirname}/server/${s.entry}`],
        env: {
          GOVBR_LOG_LEVEL: "${user_config.log_level}",
          GOVBR_LOG_FORMAT: "${user_config.log_format}",
          GOVBR_LOG_DIR: "${user_config.log_dir}",
        },
      },
    },
    // Configuração exposta na UI do app ao instalar/ajustar o plugin. Todos os
    // campos têm default, então o `env` acima sempre recebe um valor concreto.
    user_config: {
      log_level: {
        type: "string",
        title: "Nível de log",
        description: "silent | error | info | debug. Use 'debug' para registrar também as consultas e os parâmetros.",
        default: "error",
        required: false,
      },
      log_format: {
        type: "string",
        title: "Formato do log",
        description: "json (uma linha estruturada por evento) ou text (legível).",
        default: "json",
        required: false,
      },
      log_dir: {
        type: "directory",
        title: "Pasta dos logs",
        description: "Onde gravar os arquivos .log. Padrão: ~/.govbr-claude-plugin/logs.",
        default: "${HOME}/.govbr-claude-plugin/logs",
        required: false,
      },
    },
    compatibility: {
      platforms: ["darwin", "win32", "linux"],
      runtimes: { node: ">=18" },
    },
  };

  writeFileSync(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");

  // Valida e empacota via a CLI oficial. `pack <dir> <saida>` zipa e confere o
  // manifest contra o schema (additionalProperties:false — campo errado falha aqui).
  const out = `build/${s.name}.mcpb`;
  execFileSync("npx", ["--yes", "@anthropic-ai/mcpb", "pack", dir, out], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  console.log(`Bundle gerado: ${out}`);
}
