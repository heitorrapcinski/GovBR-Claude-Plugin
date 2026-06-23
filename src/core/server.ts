import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { ApiCallError, createApiHttpClient } from "./http.js";
import { createLogger } from "./logger.js";
import type { ApiDefinition, ToolDef } from "./types.js";
import { resolveVersion } from "./version.js";

/**
 * Separa os argumentos entre parâmetros de caminho (substituídos no `path`) e de
 * querystring. Placeholders `{nome}` no path são preenchidos com os args marcados
 * como `location: "path"`. Retorna o path resolvido e os args restantes (query).
 */
function resolveHttpCall(
  tool: ToolDef,
  args: Record<string, unknown>
): { path: string; query: Record<string, unknown> } {
  const pathParamNames = new Set(
    (tool.params ?? []).filter((p) => p.location === "path").map((p) => p.name)
  );

  let path = tool.path as string;
  const query: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(args)) {
    if (pathParamNames.has(key)) {
      if (value === undefined || value === null || value === "") {
        throw new Error(`Parâmetro de caminho obrigatório ausente: ${key}`);
      }
      path = path.replace(`{${key}}`, encodeURIComponent(String(value)));
    } else {
      query[key] = value;
    }
  }

  const faltando = [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  if (faltando.length > 0) {
    throw new Error(`Parâmetro(s) de caminho obrigatório(s) ausente(s): ${faltando.join(", ")}`);
  }

  return { path, query };
}

/** Converte a definição declarativa de parâmetros em JSON Schema para o MCP. */
function buildInputSchema(tool: ToolDef): Tool["inputSchema"] {
  const properties: Record<string, object> = {};
  for (const p of tool.params ?? []) {
    const prop: Record<string, unknown> = { type: p.type, description: p.description };
    if (p.enum) prop.enum = p.enum;
    if (p.default !== undefined) prop.default = p.default;
    properties[p.name] = prop;
  }
  return {
    type: "object",
    properties,
    required: tool.required ?? [],
  };
}

/**
 * Sobe um servidor MCP (stdio) a partir de uma `ApiDefinition`. Cada `ToolDef`
 * vira uma ferramenta: as HTTP (com `path`) chamam a API; as locais (com
 * `handler`) resolvem em memória.
 */
export async function startApiServer(def: ApiDefinition): Promise<void> {
  const version = resolveVersion();
  const log = createLogger(def.serverName);
  const http = createApiHttpClient(def, version);

  const server = new Server(
    { name: def.serverName, version },
    { capabilities: { tools: {} } }
  );

  const toolsByName = new Map(def.tools.map((t) => [t.name, t]));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: def.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: buildInputSchema(t),
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const safeArgs = (args ?? {}) as Record<string, unknown>;
    const tool = toolsByName.get(name);
    const startedAt = Date.now();

    try {
      if (!tool) throw new Error(`Ferramenta desconhecida: ${name}`);

      let result: unknown;
      if (tool.handler) {
        result = await tool.handler(safeArgs);
      } else {
        const { path, query } = resolveHttpCall(tool, safeArgs);
        result = await http.get(path, query);
      }

      log.call({ tool: name, ok: true, durationMs: Date.now() - startedAt, params: safeArgs });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.call({
        tool: name,
        ok: false,
        durationMs: Date.now() - startedAt,
        status: error instanceof ApiCallError ? error.status : undefined,
        errKind: error instanceof ApiCallError ? error.kind : "internal",
        error: errorMessage,
        params: safeArgs,
      });
      return {
        content: [
          { type: "text" as const, text: `Erro ao consultar a API do ${def.apiLabel}: ${errorMessage}` },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.boot(`MCP ${def.serverName} iniciado com sucesso (versão ${version}, log=${log.level}, arquivo=${log.file ?? "—"})`);
}
