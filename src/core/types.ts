// Tipos compartilhados pelo framework de servidores MCP do plugin.
// Cada API do governo é descrita declarativamente por uma `ApiDefinition`,
// e o núcleo (core/server.ts) gera o servidor MCP a partir dela. Adicionar uma
// nova API ou um novo endpoint é, na maioria dos casos, só acrescentar dados.

/** Tipo de um parâmetro de consulta, mapeado para JSON Schema. */
export type ParamType = "string" | "integer" | "number" | "boolean";

/** Descreve um parâmetro de uma ferramenta (vira propriedade do inputSchema). */
export interface ParamDef {
  name: string;
  type: ParamType;
  description: string;
  /** Valores aceitos (gera `enum` no schema). */
  enum?: Array<string | number>;
  /** Valor padrão exibido no schema (não é enviado automaticamente). */
  default?: string | number | boolean;
}

/**
 * Uma ferramenta MCP. Pode ser:
 * - **HTTP** (tem `path`): faz GET em `baseUrl + path` repassando os parâmetros.
 * - **local** (tem `handler`): resolve em memória, sem rede (ex.: tabelas de domínio).
 */
export interface ToolDef {
  name: string;
  description: string;
  /** Caminho do endpoint relativo à baseUrl. Obrigatório para ferramentas HTTP. */
  path?: string;
  /** Parâmetros aceitos. */
  params?: ParamDef[];
  /** Nomes dos parâmetros obrigatórios. */
  required?: string[];
  /** Handler local — quando presente, a ferramenta não faz rede. */
  handler?: (args: Record<string, unknown>) => unknown | Promise<unknown>;
}

/** Descrição completa de uma API: tudo que o core precisa para subir um servidor. */
export interface ApiDefinition {
  /** Nome do servidor MCP (aparece no handshake). */
  serverName: string;
  /** Rótulo amigável usado nas mensagens de erro (ex.: "PNCP", "Compras.gov.br"). */
  apiLabel: string;
  /** URL base das requisições HTTP. */
  baseUrl: string;
  /** Timeout padrão (ms). */
  timeoutMs: number;
  /** Nome da variável de ambiente que sobrescreve o timeout (ex.: "PNCP_TIMEOUT_MS"). */
  timeoutEnvVar?: string;
  /**
   * Quando true, as mensagens de erro de timeout/5xx sugerem reduzir o intervalo
   * de datas — útil para APIs lentas/instáveis como o PNCP.
   */
  slowApi?: boolean;
  /** Ferramentas expostas pelo servidor. */
  tools: ToolDef[];
}
