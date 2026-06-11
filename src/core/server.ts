import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { createApiHttpClient } from "./http.js";
import type { ApiDefinition, ToolDef } from "./types.js";
import { resolveVersion } from "./version.js";

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

    try {
      if (!tool) throw new Error(`Ferramenta desconhecida: ${name}`);

      const result = tool.handler
        ? await tool.handler(safeArgs)
        : await http.get(tool.path as string, safeArgs);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
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
  process.stderr.write(`MCP ${def.serverName} iniciado com sucesso\n`);
}
