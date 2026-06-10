#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosError } from "axios";
import { createRequire } from "module";
import { DOMAIN_TABLES, getDomainTable, TABELAS_DISPONIVEIS } from "./constants.js";

// __PKG_VERSION__ é injetado pelo esbuild em tempo de build (ver build.mjs).
// Em dev (tsx, sem o define) ele não existe, então lemos o package.json em runtime.
declare const __PKG_VERSION__: string | undefined;

function resolveVersion(): string {
  if (typeof __PKG_VERSION__ === "string") return __PKG_VERSION__;
  try {
    const require = createRequire(import.meta.url);
    return (require("../package.json") as { version: string }).version;
  } catch {
    return "0.0.0";
  }
}

const version = resolveVersion();

const BASE_URL = "https://pncp.gov.br/api/consulta";

const httpClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    accept: "*/*",
    "User-Agent": `GovBR-Claude-Plugin/${version}`,
  },
  timeout: 60000,
});

async function pncpGet(endpoint: string, params: Record<string, unknown>): Promise<unknown> {
  const cleanParams: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      cleanParams[key] = value;
    }
  }

  try {
    const response = await httpClient.get(endpoint, { params: cleanParams });
    if (response.status === 204) {
      return { mensagem: "Nenhum registro encontrado para os parâmetros informados.", totalRegistros: 0, data: [] };
    }
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const data = error.response?.data;
      const msg = typeof data === "string" ? data : JSON.stringify(data);
      throw new Error(`Erro PNCP HTTP ${status}: ${msg || error.message}`);
    }
    throw error;
  }
}

const server = new Server(
  { name: "govbr-claude-plugin", version },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "pncp_consultar_itens_pca_usuario",
      description:
        "Consulta itens do Plano de Contratações Anual (PCA) filtrados por ano e portal/sistema de contratações (idUsuario). " +
        "Opcionalmente filtra por código de classificação superior (classe do material ou grupo do serviço). " +
        "Retorna lista paginada de itens com CNPJ, razão social do órgão, código da unidade, nome da unidade, ano, " +
        "número de controle PNCP, data de publicação e lista detalhada de itens (descrição, quantidade, valores, etc).",
      inputSchema: {
        type: "object",
        properties: {
          anoPca: {
            type: "integer",
            description: "Ano do Plano de Contratações Anual (ex: 2024)",
          },
          idUsuario: {
            type: "integer",
            description: "ID do portal/sistema de contratações públicas que publicou no PNCP",
          },
          pagina: {
            type: "integer",
            description: "Número da página desejada (começa em 1)",
            default: 1,
          },
          codigoClassificacaoSuperior: {
            type: "string",
            description: "Código da Classe do material ou Grupo do serviço conforme catálogo (opcional)",
          },
          tamanhoPagina: {
            type: "integer",
            description: "Quantidade de registros por página (mínimo 10, máximo 500, padrão 500)",
            default: 500,
          },
        },
        required: ["anoPca", "idUsuario", "pagina"],
      },
    },
    {
      name: "pncp_consultar_itens_pca",
      description:
        "Consulta itens do Plano de Contratações Anual (PCA) filtrados por ano e código de classificação superior. " +
        "Retorna lista paginada de itens com CNPJ, razão social do órgão, código da unidade, nome da unidade, ano, " +
        "número de controle PNCP, data de publicação e lista detalhada de itens (descrição, quantidade, valores, etc).",
      inputSchema: {
        type: "object",
        properties: {
          anoPca: {
            type: "integer",
            description: "Ano do Plano de Contratações Anual (ex: 2024)",
          },
          codigoClassificacaoSuperior: {
            type: "string",
            description: "Código da Classe do material ou Grupo do serviço conforme catálogo",
          },
          pagina: {
            type: "integer",
            description: "Número da página desejada (começa em 1)",
            default: 1,
          },
          tamanhoPagina: {
            type: "integer",
            description: "Quantidade de registros por página (mínimo 10, máximo 500, padrão 500)",
            default: 500,
          },
        },
        required: ["anoPca", "codigoClassificacaoSuperior", "pagina"],
      },
    },
    {
      name: "pncp_consultar_contratacoes_publicacao",
      description:
        "Consulta contratações (licitações e contratações diretas) publicadas no PNCP em um período de datas. " +
        "Obrigatório informar datas inicial e final no formato AAAAMMDD e código da modalidade. " +
        "Retorna: número de controle PNCP, número da compra, modalidade, modo de disputa, situação, objeto, " +
        "amparo legal, valores estimado e homologado, datas de abertura/encerramento de propostas, " +
        "dados do órgão e unidade administrativa. " +
        "Modalidades: 1=Leilão Eletrônico, 4=Concorrência Eletrônica, 6=Pregão Eletrônico, 8=Dispensa, 9=Inexigibilidade (ver pncp_tabelas_dominio).",
      inputSchema: {
        type: "object",
        properties: {
          dataInicial: {
            type: "string",
            description: "Data inicial no formato AAAAMMDD (ex: 20240101)",
          },
          dataFinal: {
            type: "string",
            description: "Data final no formato AAAAMMDD (ex: 20240131)",
          },
          codigoModalidadeContratacao: {
            type: "integer",
            description:
              "Código da modalidade de contratação: 1=Leilão Eletrônico, 2=Diálogo Competitivo, 3=Concurso, " +
              "4=Concorrência Eletrônica, 5=Concorrência Presencial, 6=Pregão Eletrônico, 7=Pregão Presencial, " +
              "8=Dispensa de Licitação, 9=Inexigibilidade, 10=Manifestação de Interesse, " +
              "11=Pré-qualificação, 12=Credenciamento, 13=Leilão Presencial",
          },
          pagina: {
            type: "integer",
            description: "Número da página desejada (começa em 1)",
            default: 1,
          },
          codigoModoDisputa: {
            type: "integer",
            description: "Modo de disputa: 1=Aberto, 2=Fechado, 3=Aberto-Fechado, 4=Dispensa Com Disputa, 5=Não se aplica, 6=Fechado-Aberto (opcional)",
          },
          uf: {
            type: "string",
            description: "Sigla da Unidade Federativa (ex: SP, RJ, MG, DF) - opcional",
          },
          codigoMunicipioIbge: {
            type: "string",
            description: "Código IBGE do município (ex: 3550308 para São Paulo) - opcional",
          },
          cnpj: {
            type: "string",
            description: "CNPJ do órgão/entidade, somente dígitos (ex: 00059311000126) - opcional",
          },
          codigoUnidadeAdministrativa: {
            type: "string",
            description: "Código da unidade administrativa do órgão - opcional",
          },
          idUsuario: {
            type: "integer",
            description: "ID do portal/sistema de contratações que publicou - opcional",
          },
          tamanhoPagina: {
            type: "integer",
            description: "Quantidade de registros por página (mínimo 10, máximo 500, padrão 50)",
            default: 50,
          },
        },
        required: ["dataInicial", "dataFinal", "codigoModalidadeContratacao", "pagina"],
      },
    },
    {
      name: "pncp_consultar_contratacoes_proposta",
      description:
        "Consulta contratações publicadas no PNCP cujo período de recebimento de propostas está em aberto até a data informada. " +
        "Útil para encontrar licitações com prazo de envio de propostas ainda vigente. " +
        "Retorna os mesmos campos que pncp_consultar_contratacoes_publicacao: número de controle PNCP, modalidade, " +
        "objeto, valores, datas de abertura/encerramento de propostas, dados do órgão, etc.",
      inputSchema: {
        type: "object",
        properties: {
          dataFinal: {
            type: "string",
            description: "Data final do período no formato AAAAMMDD (ex: 20240131)",
          },
          codigoModalidadeContratacao: {
            type: "integer",
            description:
              "Código da modalidade: 1=Leilão Eletrônico, 4=Concorrência Eletrônica, 6=Pregão Eletrônico, " +
              "8=Dispensa, 9=Inexigibilidade, etc. (ver pncp_tabelas_dominio para lista completa)",
          },
          pagina: {
            type: "integer",
            description: "Número da página desejada (começa em 1)",
            default: 1,
          },
          uf: {
            type: "string",
            description: "Sigla da UF (ex: SP, RJ) - opcional",
          },
          codigoMunicipioIbge: {
            type: "string",
            description: "Código IBGE do município - opcional",
          },
          cnpj: {
            type: "string",
            description: "CNPJ do órgão, somente dígitos - opcional",
          },
          codigoUnidadeAdministrativa: {
            type: "string",
            description: "Código da unidade administrativa - opcional",
          },
          idUsuario: {
            type: "integer",
            description: "ID do portal/sistema de contratações - opcional",
          },
          tamanhoPagina: {
            type: "integer",
            description: "Quantidade de registros por página (mínimo 10, máximo 500, padrão 500)",
            default: 500,
          },
        },
        required: ["dataFinal", "codigoModalidadeContratacao", "pagina"],
      },
    },
    {
      name: "pncp_consultar_atas",
      description:
        "Consulta atas de registro de preços publicadas no PNCP cujo período de vigência coincide com o período informado. " +
        "Retorna: número de controle da ata e da contratação vinculada, número da ata, ano, datas de assinatura e vigência, " +
        "indicador de cancelamento, objeto da contratação, CNPJ e nome do órgão, unidade administrativa.",
      inputSchema: {
        type: "object",
        properties: {
          dataInicial: {
            type: "string",
            description: "Data inicial de vigência no formato AAAAMMDD (ex: 20240101)",
          },
          dataFinal: {
            type: "string",
            description: "Data final de vigência no formato AAAAMMDD (ex: 20241231)",
          },
          pagina: {
            type: "integer",
            description: "Número da página desejada (começa em 1)",
            default: 1,
          },
          idUsuario: {
            type: "integer",
            description: "ID do portal/sistema que publicou a ata - opcional",
          },
          cnpj: {
            type: "string",
            description: "CNPJ do órgão, somente dígitos - opcional",
          },
          codigoUnidadeAdministrativa: {
            type: "string",
            description: "Código da unidade administrativa - opcional",
          },
          tamanhoPagina: {
            type: "integer",
            description: "Quantidade de registros por página (mínimo 10, máximo 500, padrão 500)",
            default: 500,
          },
        },
        required: ["dataInicial", "dataFinal", "pagina"],
      },
    },
    {
      name: "pncp_consultar_contratos",
      description:
        "Consulta contratos e empenhos com força de contrato publicados no PNCP em um período de datas. " +
        "Retorna: número de controle PNCP do contrato e da contratação vinculada, número do contrato, ano, " +
        "tipo de contrato, categoria do processo, objeto, dados do fornecedor (CNPJ/CPF, nome/razão social), " +
        "valores (inicial, parcelas, global, acumulado), datas de assinatura e vigência, dados do órgão contratante.",
      inputSchema: {
        type: "object",
        properties: {
          dataInicial: {
            type: "string",
            description: "Data inicial de publicação no formato AAAAMMDD (ex: 20240101)",
          },
          dataFinal: {
            type: "string",
            description: "Data final de publicação no formato AAAAMMDD (ex: 20240131)",
          },
          pagina: {
            type: "integer",
            description: "Número da página desejada (começa em 1)",
            default: 1,
          },
          cnpjOrgao: {
            type: "string",
            description: "CNPJ do órgão contratante, somente dígitos - opcional",
          },
          codigoUnidadeAdministrativa: {
            type: "string",
            description: "Código da unidade administrativa - opcional",
          },
          usuarioId: {
            type: "integer",
            description: "ID do portal/sistema que publicou o contrato - opcional",
          },
          tamanhoPagina: {
            type: "integer",
            description: "Quantidade de registros por página (mínimo 10, máximo 500, padrão 500)",
            default: 500,
          },
        },
        required: ["dataInicial", "dataFinal", "pagina"],
      },
    },
    {
      name: "pncp_tabelas_dominio",
      description:
        "Retorna as tabelas de domínio do PNCP com os códigos e nomes utilizados nas consultas. " +
        "Use para descobrir os códigos corretos de modalidade, modo de disputa, tipo de contrato, etc. " +
        `Tabelas disponíveis: ${TABELAS_DISPONIVEIS.join(", ")}.`,
      inputSchema: {
        type: "object",
        properties: {
          tabela: {
            type: "string",
            description:
              `Nome da tabela específica a retornar (opcional). ` +
              `Valores aceitos: ${TABELAS_DISPONIVEIS.join(", ")}. ` +
              `Se não informado, retorna todas as tabelas.`,
          },
        },
        required: [],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const safeArgs = (args ?? {}) as Record<string, unknown>;

  try {
    let result: unknown;

    switch (name) {
      case "pncp_consultar_itens_pca_usuario":
        result = await pncpGet("/v1/pca/usuario", safeArgs);
        break;

      case "pncp_consultar_itens_pca":
        result = await pncpGet("/v1/pca/", safeArgs);
        break;

      case "pncp_consultar_contratacoes_publicacao":
        result = await pncpGet("/v1/contratacoes/publicacao", safeArgs);
        break;

      case "pncp_consultar_contratacoes_proposta":
        result = await pncpGet("/v1/contratacoes/proposta", safeArgs);
        break;

      case "pncp_consultar_atas":
        result = await pncpGet("/v1/atas", safeArgs);
        break;

      case "pncp_consultar_contratos":
        result = await pncpGet("/v1/contratos", safeArgs);
        break;

      case "pncp_tabelas_dominio": {
        const tabela = safeArgs.tabela as string | undefined;
        result = tabela ? getDomainTable(tabela) : DOMAIN_TABLES;
        break;
      }

      default:
        throw new Error(`Ferramenta desconhecida: ${name}`);
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `Erro ao consultar PNCP API: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("PNCP MCP Plugin iniciado com sucesso\n");
}

main().catch((error) => {
  process.stderr.write(`Erro fatal ao iniciar o servidor: ${error}\n`);
  process.exit(1);
});
