import type { ApiDefinition } from "../../core/types.js";
import { DOMAIN_TABLES, getDomainTable, TABELAS_DISPONIVEIS } from "./domain.js";

const MODALIDADES =
  "1=Leilão Eletrônico, 2=Diálogo Competitivo, 3=Concurso, 4=Concorrência Eletrônica, " +
  "5=Concorrência Presencial, 6=Pregão Eletrônico, 7=Pregão Presencial, 8=Dispensa de Licitação, " +
  "9=Inexigibilidade, 10=Manifestação de Interesse, 11=Pré-qualificação, 12=Credenciamento, 13=Leilão Presencial";

export const pncpDefinition: ApiDefinition = {
  serverName: "govbr-pncp",
  apiLabel: "PNCP",
  baseUrl: "https://pncp.gov.br/api/consulta",
  // A API do PNCP é lenta: respostas válidas chegam a levar ~50s e o gateway
  // devolve 504 por volta de ~70s. Timeout de cliente um pouco acima disso.
  timeoutMs: 90000,
  timeoutEnvVar: "PNCP_TIMEOUT_MS",
  slowApi: true,
  tools: [
    {
      name: "pncp_consultar_itens_pca_usuario",
      description:
        "Consulta itens do Plano de Contratações Anual (PCA) filtrados por ano e portal/sistema de contratações (idUsuario). " +
        "Opcionalmente filtra por código de classificação superior (classe do material ou grupo do serviço). " +
        "Retorna lista paginada de itens com CNPJ, razão social do órgão, código da unidade, nome da unidade, ano, " +
        "número de controle PNCP, data de publicação e lista detalhada de itens (descrição, quantidade, valores, etc).",
      path: "/v1/pca/usuario",
      required: ["anoPca", "idUsuario", "pagina"],
      params: [
        { name: "anoPca", type: "integer", description: "Ano do Plano de Contratações Anual (ex: 2024)" },
        { name: "idUsuario", type: "integer", description: "ID do portal/sistema de contratações públicas que publicou no PNCP" },
        { name: "pagina", type: "integer", description: "Número da página desejada (começa em 1)", default: 1 },
        { name: "codigoClassificacaoSuperior", type: "string", description: "Código da Classe do material ou Grupo do serviço conforme catálogo (opcional)" },
        { name: "tamanhoPagina", type: "integer", description: "Quantidade de registros por página (mínimo 10, máximo 500, padrão 500)", default: 500 },
      ],
    },
    {
      name: "pncp_consultar_itens_pca",
      description:
        "Consulta itens do Plano de Contratações Anual (PCA) filtrados por ano e código de classificação superior. " +
        "Retorna lista paginada de itens com CNPJ, razão social do órgão, código da unidade, nome da unidade, ano, " +
        "número de controle PNCP, data de publicação e lista detalhada de itens (descrição, quantidade, valores, etc).",
      path: "/v1/pca/",
      required: ["anoPca", "codigoClassificacaoSuperior", "pagina"],
      params: [
        { name: "anoPca", type: "integer", description: "Ano do Plano de Contratações Anual (ex: 2024)" },
        { name: "codigoClassificacaoSuperior", type: "string", description: "Código da Classe do material ou Grupo do serviço conforme catálogo" },
        { name: "pagina", type: "integer", description: "Número da página desejada (começa em 1)", default: 1 },
        { name: "tamanhoPagina", type: "integer", description: "Quantidade de registros por página (mínimo 10, máximo 500, padrão 500)", default: 500 },
      ],
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
      path: "/v1/contratacoes/publicacao",
      required: ["dataInicial", "dataFinal", "codigoModalidadeContratacao", "pagina"],
      params: [
        { name: "dataInicial", type: "string", description: "Data inicial no formato AAAAMMDD (ex: 20240101)" },
        { name: "dataFinal", type: "string", description: "Data final no formato AAAAMMDD (ex: 20240131)" },
        { name: "codigoModalidadeContratacao", type: "integer", description: `Código da modalidade de contratação: ${MODALIDADES}` },
        { name: "pagina", type: "integer", description: "Número da página desejada (começa em 1)", default: 1 },
        { name: "codigoModoDisputa", type: "integer", description: "Modo de disputa: 1=Aberto, 2=Fechado, 3=Aberto-Fechado, 4=Dispensa Com Disputa, 5=Não se aplica, 6=Fechado-Aberto (opcional)" },
        { name: "uf", type: "string", description: "Sigla da Unidade Federativa (ex: SP, RJ, MG, DF) - opcional" },
        { name: "codigoMunicipioIbge", type: "string", description: "Código IBGE do município (ex: 3550308 para São Paulo) - opcional" },
        { name: "cnpj", type: "string", description: "CNPJ do órgão/entidade, somente dígitos (ex: 00059311000126) - opcional" },
        { name: "codigoUnidadeAdministrativa", type: "string", description: "Código da unidade administrativa do órgão - opcional" },
        { name: "idUsuario", type: "integer", description: "ID do portal/sistema de contratações que publicou - opcional" },
        { name: "tamanhoPagina", type: "integer", description: "Quantidade de registros por página (mínimo 10, máximo 500, padrão 50)", default: 50 },
      ],
    },
    {
      name: "pncp_consultar_contratacoes_proposta",
      description:
        "Consulta contratações publicadas no PNCP cujo período de recebimento de propostas está em aberto até a data informada. " +
        "Útil para encontrar licitações com prazo de envio de propostas ainda vigente. " +
        "Retorna os mesmos campos que pncp_consultar_contratacoes_publicacao: número de controle PNCP, modalidade, " +
        "objeto, valores, datas de abertura/encerramento de propostas, dados do órgão, etc.",
      path: "/v1/contratacoes/proposta",
      required: ["dataFinal", "codigoModalidadeContratacao", "pagina"],
      params: [
        { name: "dataFinal", type: "string", description: "Data final do período no formato AAAAMMDD (ex: 20240131)" },
        { name: "codigoModalidadeContratacao", type: "integer", description: `Código da modalidade: ${MODALIDADES} (ver pncp_tabelas_dominio)` },
        { name: "pagina", type: "integer", description: "Número da página desejada (começa em 1)", default: 1 },
        { name: "uf", type: "string", description: "Sigla da UF (ex: SP, RJ) - opcional" },
        { name: "codigoMunicipioIbge", type: "string", description: "Código IBGE do município - opcional" },
        { name: "cnpj", type: "string", description: "CNPJ do órgão, somente dígitos - opcional" },
        { name: "codigoUnidadeAdministrativa", type: "string", description: "Código da unidade administrativa - opcional" },
        { name: "idUsuario", type: "integer", description: "ID do portal/sistema de contratações - opcional" },
        { name: "tamanhoPagina", type: "integer", description: "Quantidade de registros por página (mínimo 10, máximo 500, padrão 500)", default: 500 },
      ],
    },
    {
      name: "pncp_consultar_atas",
      description:
        "Consulta atas de registro de preços publicadas no PNCP cujo período de vigência coincide com o período informado. " +
        "Retorna: número de controle da ata e da contratação vinculada, número da ata, ano, datas de assinatura e vigência, " +
        "indicador de cancelamento, objeto da contratação, CNPJ e nome do órgão, unidade administrativa.",
      path: "/v1/atas",
      required: ["dataInicial", "dataFinal", "pagina"],
      params: [
        { name: "dataInicial", type: "string", description: "Data inicial de vigência no formato AAAAMMDD (ex: 20240101)" },
        { name: "dataFinal", type: "string", description: "Data final de vigência no formato AAAAMMDD (ex: 20241231)" },
        { name: "pagina", type: "integer", description: "Número da página desejada (começa em 1)", default: 1 },
        { name: "idUsuario", type: "integer", description: "ID do portal/sistema que publicou a ata - opcional" },
        { name: "cnpj", type: "string", description: "CNPJ do órgão, somente dígitos - opcional" },
        { name: "codigoUnidadeAdministrativa", type: "string", description: "Código da unidade administrativa - opcional" },
        { name: "tamanhoPagina", type: "integer", description: "Quantidade de registros por página (mínimo 10, máximo 500, padrão 500)", default: 500 },
      ],
    },
    {
      name: "pncp_consultar_contratos",
      description:
        "Consulta contratos e empenhos com força de contrato publicados no PNCP em um período de datas. " +
        "Retorna: número de controle PNCP do contrato e da contratação vinculada, número do contrato, ano, " +
        "tipo de contrato, categoria do processo, objeto, dados do fornecedor (CNPJ/CPF, nome/razão social), " +
        "valores (inicial, parcelas, global, acumulado), datas de assinatura e vigência, dados do órgão contratante.",
      path: "/v1/contratos",
      required: ["dataInicial", "dataFinal", "pagina"],
      params: [
        { name: "dataInicial", type: "string", description: "Data inicial de publicação no formato AAAAMMDD (ex: 20240101)" },
        { name: "dataFinal", type: "string", description: "Data final de publicação no formato AAAAMMDD (ex: 20240131)" },
        { name: "pagina", type: "integer", description: "Número da página desejada (começa em 1)", default: 1 },
        { name: "cnpjOrgao", type: "string", description: "CNPJ do órgão contratante, somente dígitos - opcional" },
        { name: "codigoUnidadeAdministrativa", type: "string", description: "Código da unidade administrativa - opcional" },
        { name: "usuarioId", type: "integer", description: "ID do portal/sistema que publicou o contrato - opcional" },
        { name: "tamanhoPagina", type: "integer", description: "Quantidade de registros por página (mínimo 10, máximo 500, padrão 500)", default: 500 },
      ],
    },
    {
      name: "pncp_tabelas_dominio",
      description:
        "Retorna as tabelas de domínio do PNCP com os códigos e nomes utilizados nas consultas. " +
        "Use para descobrir os códigos corretos de modalidade, modo de disputa, tipo de contrato, etc. " +
        `Tabelas disponíveis: ${TABELAS_DISPONIVEIS.join(", ")}.`,
      handler: (args) => {
        const tabela = args.tabela as string | undefined;
        return tabela ? getDomainTable(tabela) : DOMAIN_TABLES;
      },
      params: [
        {
          name: "tabela",
          type: "string",
          description:
            `Nome da tabela específica a retornar (opcional). Valores aceitos: ${TABELAS_DISPONIVEIS.join(", ")}. ` +
            `Se não informado, retorna todas as tabelas.`,
          enum: TABELAS_DISPONIVEIS,
        },
      ],
    },
  ],
};
