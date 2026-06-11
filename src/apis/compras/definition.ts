import type { ApiDefinition, ParamDef, ToolDef } from "../../core/types.js";
import {
  COMPRAS_DOMAIN_TABLES,
  COMPRAS_TABELAS_DISPONIVEIS,
  getComprasDomainTable,
  MODALIDADE_COMPRA_INLINE,
} from "./domain.js";

// API de Dados Abertos do Compras.gov.br (Manual v2.0 — Fev/2026).
// Base: https://dadosabertos.compras.gov.br — REST/JSON, GET, sem autenticação.
// Resposta padrão: { resultado: [...], totalRegistros, totalPaginas, paginasRestantes }.
// Datas no formato AAAA-MM-DD.

// --- Parâmetros reutilizáveis ---------------------------------------------
const pagina: ParamDef = {
  name: "pagina",
  type: "integer",
  description: "Página dos resultados (começa em 1)",
  default: 1,
};
const tamanhoPagina: ParamDef = {
  name: "tamanhoPagina",
  type: "integer",
  description: "Quantidade de registros por página (mínimo 10, máximo 500, padrão 10)",
  default: 10,
};
const status = (nome: string, desc: string): ParamDef => ({
  name: nome,
  type: "boolean",
  description: `${desc} (true = ativo, false = inativo)`,
});

// Helper para montar uma ferramenta HTTP de forma concisa.
function tool(
  name: string,
  description: string,
  path: string,
  params: ParamDef[],
  required: string[] = []
): ToolDef {
  return { name, description, path, params, required };
}

const tools: ToolDef[] = [
  // === 4. Módulo Material (Catálogo CATMAT) ===============================
  tool(
    "compras_material_grupos",
    "Catálogo de Materiais (CATMAT): consulta grupos de material por código e/ou status.",
    "/modulo-material/1_consultarGrupoMaterial",
    [pagina, { name: "codigoGrupo", type: "integer", description: "Código do grupo do material" }, status("statusGrupo", "Status do grupo")]
  ),
  tool(
    "compras_material_classes",
    "Catálogo de Materiais (CATMAT): consulta classes de material por grupo, classe e/ou status.",
    "/modulo-material/2_consultarClasseMaterial",
    [
      pagina,
      { name: "codigoGrupo", type: "integer", description: "Código do grupo do material" },
      { name: "codigoClasse", type: "integer", description: "Código da classe do material" },
      status("statusClasse", "Status da classe"),
      { name: "bps", type: "boolean", description: "Filtra classes vinculadas ao Banco de Preços em Saúde (BPS)" },
    ]
  ),
  tool(
    "compras_material_pdms",
    "Catálogo de Materiais (CATMAT): consulta Produtos Descritivos Básicos (PDM) por código, grupo, classe e/ou status.",
    "/modulo-material/3_consultarPdmMaterial",
    [
      pagina,
      { name: "codigoPdm", type: "integer", description: "Código do PDM (Produto Descritivo Básico)" },
      { name: "codigoGrupo", type: "integer", description: "Código do grupo" },
      { name: "codigoClasse", type: "integer", description: "Código da classe" },
      status("statusPdm", "Status do PDM"),
      { name: "bps", type: "boolean", description: "Filtra PDMs vinculados ao Banco de Preços em Saúde (BPS)" },
    ]
  ),
  tool(
    "compras_material_itens",
    "Catálogo de Materiais (CATMAT): consulta itens de material por código, grupo, classe, PDM, NCM, descrição e/ou status.",
    "/modulo-material/4_consultarItemMaterial",
    [
      pagina,
      tamanhoPagina,
      { name: "codigoItem", type: "integer", description: "Código do item de material" },
      { name: "codigoGrupo", type: "integer", description: "Código do grupo do material" },
      { name: "codigoClasse", type: "integer", description: "Código da classe do material" },
      { name: "codigoPdm", type: "integer", description: "Código do PDM" },
      { name: "descricaoItem", type: "string", description: "Texto a buscar na descrição do item" },
      status("statusItem", "Status do item"),
      { name: "bps", type: "boolean", description: "Filtra itens vinculados ao Banco de Preços em Saúde (BPS)" },
      { name: "codigo_ncm", type: "string", description: "Código NCM (Nomenclatura Comum do Mercosul)" },
    ]
  ),
  tool(
    "compras_material_natureza_despesa",
    "Catálogo de Materiais (CATMAT): consulta a natureza da despesa associada a um PDM.",
    "/modulo-material/5_consultarMaterialNaturezaDespesa",
    [
      pagina,
      { name: "codigoPdm", type: "integer", description: "Código do PDM" },
      { name: "codigoNaturezaDespesa", type: "string", description: "Código da natureza de despesa" },
      status("statusNaturezaDespesa", "Status da natureza de despesa"),
    ]
  ),
  tool(
    "compras_material_unidade_fornecimento",
    "Catálogo de Materiais (CATMAT): consulta unidades de fornecimento de um PDM.",
    "/modulo-material/6_consultarMaterialUnidadeFornecimento",
    [
      pagina,
      { name: "codigoPdm", type: "integer", description: "Código do PDM" },
      status("statusUnidadeFornecimentoPdm", "Status da unidade de fornecimento"),
    ]
  ),
  tool(
    "compras_material_caracteristicas",
    "Catálogo de Materiais (CATMAT): consulta as características de um item de material.",
    "/modulo-material/7_consultarMaterialCaracteristicas",
    [pagina, { name: "codigoItem", type: "integer", description: "Código do item de material" }]
  ),

  // === 5. Módulo Serviço (Catálogo CATSER) ===============================
  tool(
    "compras_servico_secoes",
    "Catálogo de Serviços (CATSER): consulta seções de serviço por código e/ou status.",
    "/modulo-servico/1_consultarSecaoServico",
    [pagina, { name: "codigoSecao", type: "integer", description: "Código da seção do serviço" }, status("statusSecao", "Status da seção")]
  ),
  tool(
    "compras_servico_divisoes",
    "Catálogo de Serviços (CATSER): consulta divisões de serviço por seção, divisão e/ou status.",
    "/modulo-servico/2_consultarDivisaoServico",
    [
      pagina,
      { name: "codigoSecao", type: "integer", description: "Código da seção do serviço" },
      { name: "codigoDivisao", type: "integer", description: "Código da divisão do serviço" },
      status("statusDivisao", "Status da divisão"),
    ]
  ),
  tool(
    "compras_servico_grupos",
    "Catálogo de Serviços (CATSER): consulta grupos de serviço por divisão, grupo e/ou status.",
    "/modulo-servico/3_consultarGrupoServico",
    [
      pagina,
      { name: "codigoDivisao", type: "integer", description: "Código da divisão do serviço" },
      { name: "codigoGrupo", type: "integer", description: "Código do grupo do serviço" },
      status("statusGrupo", "Status do grupo"),
    ]
  ),
  tool(
    "compras_servico_classes",
    "Catálogo de Serviços (CATSER): consulta classes de serviço por grupo, classe e/ou status.",
    "/modulo-servico/4_consultarClasseServico",
    [
      pagina,
      { name: "codigoGrupo", type: "integer", description: "Código do grupo do serviço" },
      { name: "codigoClasse", type: "integer", description: "Código da classe do serviço" },
      status("statusGrupo", "Status do grupo"),
    ]
  ),
  tool(
    "compras_servico_subclasses",
    "Catálogo de Serviços (CATSER): consulta subclasses de serviço por classe, subclasse e/ou status.",
    "/modulo-servico/5_consultarSubClasseServico",
    [
      pagina,
      { name: "codigoClasse", type: "integer", description: "Código da classe do serviço" },
      { name: "codigoSubclasse", type: "integer", description: "Código da subclasse do serviço" },
      status("statusSubclasse", "Status da subclasse"),
    ]
  ),
  tool(
    "compras_servico_itens",
    "Catálogo de Serviços (CATSER): consulta itens de serviço por hierarquia (seção/divisão/grupo/classe/subclasse), CPC, código e/ou status.",
    "/modulo-servico/6_consultarItemServico",
    [
      pagina,
      tamanhoPagina,
      { name: "codigoSecao", type: "integer", description: "Código da seção do serviço" },
      { name: "codigoDivisao", type: "integer", description: "Código da divisão do serviço" },
      { name: "codigoGrupo", type: "integer", description: "Código do grupo do serviço" },
      { name: "codigoClasse", type: "integer", description: "Código da classe do serviço" },
      { name: "codigoSubclasse", type: "integer", description: "Código da subclasse do serviço" },
      { name: "codigoCpc", type: "integer", description: "Código CPC" },
      { name: "codigoServico", type: "integer", description: "Código do serviço" },
      { name: "exclusivoCentralCompras", type: "boolean", description: "Indica se o serviço é exclusivo da central de compras" },
      status("statusServico", "Status do serviço"),
    ]
  ),
  tool(
    "compras_servico_unidade_medida",
    "Catálogo de Serviços (CATSER): consulta unidades de medida de um serviço.",
    "/modulo-servico/7_consultarUndMedidaServico",
    [
      pagina,
      { name: "codigoServico", type: "integer", description: "Código do serviço" },
      status("statusUnidadeMedida", "Status da unidade de medida"),
    ]
  ),
  tool(
    "compras_servico_natureza_despesa",
    "Catálogo de Serviços (CATSER): consulta a natureza da despesa de um serviço.",
    "/modulo-servico/8_consultarNaturezaDespesaServico",
    [
      pagina,
      { name: "codigoServico", type: "integer", description: "Código do serviço" },
      { name: "codigoNaturezaDespesa", type: "string", description: "Código da natureza de despesa do serviço" },
      status("statusNaturezaDespesa", "Status da natureza de despesa"),
    ]
  ),

  // === 6. Módulo Pesquisa de Preço =======================================
  tool(
    "compras_precos_material",
    "Pesquisa de Preço: preços praticados em compras de um item de material. Requer o código do item de catálogo (CATMAT).",
    "/modulo-pesquisa-preco/1_consultarMaterial",
    [
      pagina,
      tamanhoPagina,
      { name: "codigoItemCatalogo", type: "integer", description: "Código do item de material no catálogo (obrigatório)" },
      { name: "codigoUasg", type: "string", description: "Código da UASG (unidade administrativa)" },
      { name: "estado", type: "string", description: "Sigla do estado/UF (ex: SP)" },
      { name: "codigoMunicipio", type: "integer", description: "Código do município (IBGE)" },
      { name: "dataResultado", type: "boolean", description: "Filtra por existência de data de resultado" },
      { name: "codigoClasse", type: "integer", description: "Código da classe do material" },
    ],
    ["codigoItemCatalogo"]
  ),
  tool(
    "compras_precos_material_detalhe",
    "Pesquisa de Preço: detalhe dos preços de um material em uma compra específica. Requer o id da compra.",
    "/modulo-pesquisa-preco/2_consultarMaterialDetalhe",
    [
      pagina,
      tamanhoPagina,
      { name: "idCompra", type: "string", description: "Código/ID da compra (obrigatório)" },
      { name: "codigoItemCatalogo", type: "integer", description: "Código do item de material no catálogo" },
    ],
    ["idCompra"]
  ),
  tool(
    "compras_precos_servico",
    "Pesquisa de Preço: preços praticados em compras de um item de serviço. Requer o código do item de catálogo (CATSER).",
    "/modulo-pesquisa-preco/3_consultarServico",
    [
      pagina,
      { name: "codigoItemCatalogo", type: "integer", description: "Código do item de serviço no catálogo (obrigatório)" },
      { name: "codigoUasg", type: "string", description: "Código da UASG (unidade administrativa)" },
      { name: "estado", type: "string", description: "Sigla do estado/UF (ex: SP)" },
      { name: "codigoMunicipio", type: "integer", description: "Código do município (IBGE)" },
      { name: "dataResultado", type: "boolean", description: "Filtra por existência de data de resultado" },
    ],
    ["codigoItemCatalogo"]
  ),
  tool(
    "compras_precos_servico_detalhe",
    "Pesquisa de Preço: detalhe dos preços de um serviço em uma compra específica. Requer o id da compra.",
    "/modulo-pesquisa-preco/4_consultarServicoDetalhe",
    [
      pagina,
      { name: "idCompra", type: "string", description: "Código/ID da compra (obrigatório)" },
      { name: "codigoItemCatalogo", type: "integer", description: "Código do item de serviço no catálogo" },
    ],
    ["idCompra"]
  ),

  // === 7. Módulo PGC (Planejamento e Gerenciamento de Contratações) ======
  tool(
    "compras_pgc_detalhe",
    "PGC (Plano de Contratações): detalhe do plano de um órgão por ano. Requer CNPJ do órgão e ano.",
    "/modulo-pgc/1_consultarPgcDetalhe",
    [
      pagina,
      tamanhoPagina,
      { name: "orgao", type: "string", description: "CNPJ do órgão, somente dígitos (obrigatório)" },
      { name: "anoPcaProjetoCompra", type: "integer", description: "Ano do projeto/plano (obrigatório, ex: 2024)" },
      { name: "codigoUasg", type: "string", description: "Código da UASG" },
    ],
    ["orgao", "anoPcaProjetoCompra"]
  ),
  tool(
    "compras_pgc_detalhe_catalogo",
    "PGC: itens do plano de contratações por catálogo (material ou serviço). Requer ano, tipo (M/S) e código.",
    "/modulo-pgc/2_consultarPgcDetalheCatalogo",
    [
      pagina,
      tamanhoPagina,
      { name: "anoPcaProjetoCompra", type: "integer", description: "Ano do projeto/plano (obrigatório)" },
      { name: "tipo", type: "string", description: "Tipo do item: M = Material, S = Serviço (obrigatório)", enum: ["M", "S"] },
      { name: "codigo", type: "integer", description: "Código de classe (material) ou grupo (serviço) (obrigatório)" },
    ],
    ["anoPcaProjetoCompra", "tipo", "codigo"]
  ),
  tool(
    "compras_pgc_agregacao",
    "PGC: visão agregada do plano de contratações de um órgão por ano. Requer CNPJ do órgão e ano.",
    "/modulo-pgc/3_consultarPgcAgregacao",
    [
      pagina,
      { name: "orgao", type: "string", description: "CNPJ do órgão, somente dígitos (obrigatório)" },
      { name: "ano", type: "integer", description: "Ano do plano, AAAA (obrigatório)" },
    ],
    ["orgao", "ano"]
  ),

  // === 8. Módulo UASG / Órgão ============================================
  tool(
    "compras_uasg",
    "Consulta Unidades Administrativas de Serviços Gerais (UASG) por código, CNPJ, UF, uso do SISG e/ou status.",
    "/modulo-uasg/1_consultarUasg",
    [
      pagina,
      { name: "codigoUasg", type: "string", description: "Código da UASG" },
      { name: "usoSisg", type: "boolean", description: "Filtra UASGs que usam o SISG" },
      { name: "cnpjCpfOrgao", type: "string", description: "CNPJ do órgão, somente dígitos" },
      { name: "cnpjCpfOrgaoVinculado", type: "string", description: "CNPJ do órgão vinculado, somente dígitos" },
      { name: "cnpjCpfOrgaoSuperior", type: "string", description: "CNPJ do órgão superior, somente dígitos" },
      { name: "siglaUf", type: "string", description: "Sigla do estado/UF (ex: SP)" },
      status("statusUasg", "Status da UASG"),
    ],
    ["statusUasg"]
  ),
  tool(
    "compras_orgao",
    "Consulta órgãos por CNPJ, código, uso do SISG e/ou status.",
    "/modulo-uasg/2_consultarOrgao",
    [
      pagina,
      { name: "cnpjCpfOrgao", type: "string", description: "CNPJ do órgão, somente dígitos" },
      { name: "cnpjCpfOrgaoVinculado", type: "string", description: "CNPJ do órgão vinculado, somente dígitos" },
      { name: "cnpjCpfOrgaoSuperior", type: "string", description: "CNPJ do órgão superior, somente dígitos" },
      { name: "codigoOrgao", type: "integer", description: "Código do órgão" },
      status("statusOrgao", "Status do órgão"),
      { name: "usoSisg", type: "boolean", description: "Filtra órgãos que usam o SISG" },
    ],
    ["statusOrgao"]
  ),

  // === 9. Módulo Legado (SIASG anterior à Lei 14.133) ====================
  tool(
    "compras_legado_licitacao",
    "Legado: licitações por período de publicação. Datas obrigatórias (AAAA-MM-DD, intervalo máx. 365 dias). Use pertence14133 para filtrar a Nova Lei de Licitações.",
    "/modulo-legado/1_consultarLicitacao",
    [
      pagina,
      tamanhoPagina,
      { name: "uasg", type: "integer", description: "Código da UASG" },
      { name: "numero_aviso", type: "integer", description: "Número da licitação" },
      { name: "modalidade", type: "integer", description: "Código da modalidade no Compras.gov.br (5=Pregão, 6=Dispensa; ver compras_tabelas_dominio)" },
      { name: "data_publicacao_inicial", type: "string", description: "Data inicial de publicação, AAAA-MM-DD (obrigatório)" },
      { name: "data_publicacao_final", type: "string", description: "Data final de publicação, AAAA-MM-DD (obrigatório, máx. 365 dias)" },
      { name: "pertence14133", type: "boolean", description: "Filtra licitações sob o regime da Lei 14.133/2021" },
    ],
    ["data_publicacao_inicial", "data_publicacao_final"]
  ),
  tool(
    "compras_legado_itens_licitacao",
    "Legado: itens de licitações. Requer o código da modalidade. Filtros por UASG, aviso, fornecedor vencedor (CNPJ/CPF) e item.",
    "/modulo-legado/2_consultarItemLicitacao",
    [
      pagina,
      tamanhoPagina,
      { name: "uasg", type: "integer", description: "Código da UASG" },
      { name: "numero_aviso", type: "integer", description: "Número da licitação" },
      { name: "modalidade", type: "integer", description: "Código da modalidade no Compras.gov.br (obrigatório; 5=Pregão, 6=Dispensa; ver compras_tabelas_dominio)" },
      { name: "decreto_7174", type: "boolean", description: "Filtra itens sob o Decreto 7.174" },
      { name: "codigo_item_material", type: "integer", description: "Código do item de material" },
      { name: "codigo_item_servico", type: "integer", description: "Código do item de serviço" },
      { name: "cnpj_fornecedor", type: "string", description: "CNPJ do vencedor, somente dígitos" },
      { name: "cpfVencedor", type: "string", description: "CPF do vencedor, somente dígitos" },
    ],
    ["modalidade"]
  ),
  tool(
    "compras_legado_pregao",
    "Legado: pregões por período de disponibilização do edital. Datas obrigatórias (AAAA-MM-DD). Filtros por UASG, órgão, número e tipo.",
    "/modulo-legado/3_consultarPregoes",
    [
      pagina,
      tamanhoPagina,
      { name: "co_uasg", type: "integer", description: "Código da UASG que registrou o aviso" },
      { name: "co_orgao", type: "integer", description: "Código do órgão" },
      { name: "numero", type: "integer", description: "Número do pregão" },
      { name: "ds_tipo_pregao_compra", type: "string", description: "Tipo de compra do pregão" },
      { name: "dt_data_edital_inicial", type: "string", description: "Data inicial de disponibilização do edital, AAAA-MM-DD (obrigatório)" },
      { name: "dt_data_edital_final", type: "string", description: "Data final de disponibilização do edital, AAAA-MM-DD (obrigatório)" },
      { name: "pertence14133", type: "boolean", description: "Filtra pregões sob o regime da Lei 14.133/2021" },
    ],
    ["dt_data_edital_inicial", "dt_data_edital_final"]
  ),
  tool(
    "compras_legado_itens_pregao",
    "Legado: itens de pregões por período de homologação. Datas de homologação obrigatórias (AAAA-MM-DD).",
    "/modulo-legado/4_consultarItensPregoes",
    [
      pagina,
      tamanhoPagina,
      { name: "co_uasg", type: "integer", description: "Código da UASG" },
      { name: "decreto_7174", type: "boolean", description: "Filtra itens sob o Decreto 7.174" },
      { name: "fornecedor_vencedor", type: "string", description: "Nome do fornecedor vencedor" },
      { name: "dt_hom_inicial", type: "string", description: "Data inicial de homologação, AAAA-MM-DD (obrigatório)" },
      { name: "dt_hom_final", type: "string", description: "Data final de homologação, AAAA-MM-DD (obrigatório)" },
    ],
    ["dt_hom_inicial", "dt_hom_final"]
  ),
  tool(
    "compras_legado_compra_sem_licitacao",
    "Legado: compras sem licitação (dispensa/inexigibilidade) por ano. Ano obrigatório. Filtros por órgão, UASG, modalidade e datas.",
    "/modulo-legado/5_consultarComprasSemLicitacao",
    [
      pagina,
      tamanhoPagina,
      { name: "dt_ano_aviso", type: "integer", description: "Ano da compra sem licitação (obrigatório)" },
      { name: "nu_aviso_licitacao", type: "integer", description: "Número da compra" },
      { name: "co_modalidade_licitacao", type: "integer", description: "Código da modalidade no Compras.gov.br (tipicamente 6=Dispensa, 7=Inexigibilidade; ver compras_tabelas_dominio)" },
      { name: "co_orgao", type: "string", description: "Código do órgão responsável" },
      { name: "co_orgao_superior", type: "string", description: "Código do órgão superior" },
      { name: "co_uasg", type: "integer", description: "Código da UASG responsável" },
      { name: "dtDeclaracaoDispensaInicial", type: "string", description: "Data inicial do reconhecimento da dispensa, AAAA-MM-DD" },
      { name: "dtDeclaracaoDispensaFinal", type: "string", description: "Data final do reconhecimento da dispensa, AAAA-MM-DD" },
      { name: "dtRatificacao", type: "string", description: "Data da ratificação, AAAA-MM-DD" },
      { name: "dtPublicacao", type: "string", description: "Data da publicação, AAAA-MM-DD" },
      { name: "pertence14133", type: "boolean", description: "Filtra sob o regime da Lei 14.133/2021" },
    ],
    ["dt_ano_aviso"]
  ),
  tool(
    "compras_legado_itens_compra_sem_licitacao",
    "Legado: itens de compras sem licitação por ano. Ano obrigatório. Filtros por UASG, órgão, modalidade, item e fornecedor.",
    "/modulo-legado/6_consultarCompraItensSemLicitacao",
    [
      pagina,
      tamanhoPagina,
      { name: "co_uasg", type: "integer", description: "Código da UASG responsável" },
      { name: "co_orgao", type: "string", description: "Código do órgão responsável" },
      { name: "dt_ano_aviso_licitacao", type: "integer", description: "Ano da compra sem licitação (obrigatório)" },
      { name: "co_modalidade_licitacao", type: "integer", description: "Código da modalidade no Compras.gov.br (tipicamente 6=Dispensa, 7=Inexigibilidade; ver compras_tabelas_dominio)" },
      { name: "co_conjunto_materiais", type: "integer", description: "Código do item de material" },
      { name: "co_servico", type: "integer", description: "Código do item de serviço" },
      { name: "nu_cpf_cnpj_fornecedor", type: "string", description: "CNPJ/CPF do fornecedor, somente dígitos" },
    ],
    ["dt_ano_aviso_licitacao"]
  ),
  tool(
    "compras_legado_rdc",
    "Legado: licitações por RDC (Regime Diferenciado de Contratações) por período de publicação. Datas mín./máx. obrigatórias (AAAA-MM-DD).",
    "/modulo-legado/7_consultarRdc",
    [
      pagina,
      tamanhoPagina,
      { name: "data_publicacao_min", type: "string", description: "Data mínima de publicação, AAAA-MM-DD (obrigatório)" },
      { name: "data_publicacao_max", type: "string", description: "Data máxima de publicação, AAAA-MM-DD (obrigatório)" },
      { name: "modalidade", type: "integer", description: "Código da modalidade no Compras.gov.br (5=Pregão, 6=Dispensa; ver compras_tabelas_dominio)" },
      { name: "numero_aviso", type: "integer", description: "Número do aviso da licitação" },
      { name: "objeto", type: "string", description: "Texto a buscar no objeto da licitação" },
      { name: "orgao", type: "integer", description: "Código do órgão da UASG" },
      { name: "uasg", type: "integer", description: "Código da UASG" },
      { name: "uf_uasg", type: "string", description: "UF da UASG (ex: SP)" },
      { name: "situacao_aviso", type: "string", description: "Situação do aviso" },
      { name: "forma_de_realizacao", type: "string", description: "Presencial ou Eletrônico" },
      { name: "endereco_entrega_edital", type: "string", description: "Endereço de entrega do edital" },
      { name: "funcao_responsavel", type: "string", description: "Função do responsável pela licitação" },
      { name: "nome_responsavel", type: "string", description: "Nome do responsável pela licitação" },
      { name: "valor_estimado_total_min", type: "number", description: "Valor estimado total mínimo" },
      { name: "valor_estimado_total_max", type: "number", description: "Valor estimado total máximo" },
      { name: "valor_homologado_total_min", type: "number", description: "Valor homologado total mínimo" },
      { name: "valor_homologado_total_max", type: "number", description: "Valor homologado total máximo" },
    ],
    ["data_publicacao_min", "data_publicacao_max"]
  ),

  // === 10. Módulo Contratações PNCP (Lei 14.133/2021) ====================
  tool(
    "compras_contratacoes",
    "Contratações da Lei 14.133/2021 publicadas no PNCP, via Compras.gov.br. Requer período de publicação (AAAA-MM-DD, intervalo máximo de 365 dias) e código da modalidade. ATENÇÃO: a modalidade usa a codificação do Compras.gov.br (5=Pregão, 6=Dispensa), DIFERENTE do PNCP. Não há filtro por texto do objeto — para buscar por palavra no objeto (campo objetoCompra), filtre os resultados. Filtros por órgão, CNPJ, UF, IBGE e amparo legal.",
    "/modulo-contratacoes/1_consultarContratacoes_PNCP_14133",
    [
      pagina,
      tamanhoPagina,
      { name: "dataPublicacaoPncpInicial", type: "string", description: "Data inicial de publicação no PNCP, AAAA-MM-DD (obrigatório; intervalo total ≤ 365 dias)" },
      { name: "dataPublicacaoPncpFinal", type: "string", description: "Data final de publicação no PNCP, AAAA-MM-DD (obrigatório; intervalo total ≤ 365 dias)" },
      {
        name: "codigoModalidade",
        type: "integer",
        description:
          `Código da modalidade no Compras.gov.br (obrigatório, NÃO usa os códigos do PNCP): ${MODALIDADE_COMPRA_INLINE}. ` +
          `Para "pregão eletrônico" use 5; para "dispensa" use 6. Ver compras_tabelas_dominio.`,
        enum: COMPRAS_DOMAIN_TABLES.modalidade_compra.map((m) => m.codigo),
      },
      { name: "codigoOrgao", type: "integer", description: "Código do órgão" },
      { name: "orgaoEntidadeCnpj", type: "string", description: "CNPJ da entidade do órgão, somente dígitos" },
      { name: "unidadeOrgaoCodigoUnidade", type: "string", description: "Código da unidade do órgão" },
      { name: "unidadeOrgaoCodigoIbge", type: "integer", description: "Código IBGE da unidade do órgão" },
      { name: "unidadeOrgaoUfSigla", type: "string", description: "Sigla da UF do órgão (ex: SP)" },
      { name: "amparoLegalCodigoPncp", type: "integer", description: "Código do amparo legal no PNCP" },
      { name: "dataAualizacaoPncp", type: "string", description: "Data de atualização no PNCP, AAAA-MM-DD" },
      { name: "contratacaoExcluida", type: "boolean", description: "Inclui contratações excluídas/desconsideradas" },
    ],
    ["dataPublicacaoPncpInicial", "dataPublicacaoPncpFinal", "codigoModalidade"]
  ),
  tool(
    "compras_contratacoes_itens",
    "Itens das contratações da Lei 14.133/2021 (PNCP). Requer material/serviço, código de classe e código de grupo. Filtros por órgão, fornecedor, NCM, BPS e datas de inclusão.",
    "/modulo-contratacoes/2_consultarItensContratacoes_PNCP_14133",
    [
      pagina,
      tamanhoPagina,
      { name: "materialOuServico", type: "string", description: "Tipo do item: M = Material, S = Serviço (obrigatório)", enum: ["M", "S"] },
      { name: "codigoClasse", type: "integer", description: "Código da classe (obrigatório)" },
      { name: "codigoGrupo", type: "integer", description: "Código do grupo (obrigatório)" },
      { name: "orgaoEntidadeCnpj", type: "string", description: "CNPJ da entidade do órgão, somente dígitos" },
      { name: "unidadeOrgaoCodigoUnidade", type: "integer", description: "Código da unidade do órgão" },
      { name: "situacaoCompraItem", type: "string", description: "Situação do item na compra" },
      { name: "codItemCatalogo", type: "integer", description: "Código do item de catálogo" },
      { name: "temResultado", type: "boolean", description: "Filtra itens que possuem resultado" },
      { name: "codFornecedor", type: "string", description: "Código/identificação do fornecedor" },
      { name: "codigoNCM", type: "string", description: "Código NCM (Nomenclatura Comum do Mercosul)" },
      { name: "bps", type: "boolean", description: "Filtra itens vinculados ao Banco de Preços em Saúde (BPS)" },
      { name: "margemPreferenciaNormal", type: "boolean", description: "Filtra itens com margem de preferência normal" },
      { name: "dataInclusaoPncpInicial", type: "string", description: "Data inicial de inclusão no PNCP, AAAA-MM-DD" },
      { name: "dataInclusaoPncpFinal", type: "string", description: "Data final de inclusão no PNCP, AAAA-MM-DD" },
      { name: "dataAtualizacaoPncp", type: "string", description: "Data de atualização no PNCP, AAAA-MM-DD" },
    ],
    ["materialOuServico", "codigoClasse", "codigoGrupo"]
  ),
  tool(
    "compras_contratacoes_itens_resultado",
    "Resultado dos itens das contratações da Lei 14.133/2021 (PNCP): fornecedores vencedores e valores homologados. Requer período do resultado (AAAA-MM-DD).",
    "/modulo-contratacoes/3_consultarResultadoItensContratacoes_PNCP_14133",
    [
      pagina,
      tamanhoPagina,
      { name: "dataResultadoPncpInicial", type: "string", description: "Data inicial do resultado no PNCP, AAAA-MM-DD (obrigatório)" },
      { name: "dataResultadoPncpFinal", type: "string", description: "Data final do resultado no PNCP, AAAA-MM-DD (obrigatório)" },
      { name: "orgaoEntidadeCnpj", type: "string", description: "CNPJ da entidade do órgão, somente dígitos" },
      { name: "unidadeOrgaoCodigoUnidade", type: "string", description: "Código da unidade do órgão" },
      { name: "niFornecedor", type: "string", description: "Número de Identificação Fiscal do fornecedor (CNPJ/CPF)" },
      { name: "codigoPais", type: "string", description: "Código do país do fornecedor" },
      { name: "porteFornecedorId", type: "integer", description: "Código do porte do fornecedor" },
      { name: "naturezaJuridicaId", type: "string", description: "Código da natureza jurídica do fornecedor" },
      { name: "situacaoCompraItemResultadoId", type: "integer", description: "Identificador da situação do item no resultado" },
      { name: "valorUnitarioHomologadoInicial", type: "number", description: "Valor unitário homologado mínimo" },
      { name: "valorUnitarioHomologadoFinal", type: "number", description: "Valor unitário homologado máximo" },
      { name: "valorTotalHomologadoInicial", type: "number", description: "Valor total homologado mínimo" },
      { name: "valorTotalHomologadoFinal", type: "number", description: "Valor total homologado máximo" },
      { name: "aplicacaoMargemPreferencia", type: "boolean", description: "Filtra resultados com aplicação de margem de preferência" },
      { name: "aplicacaoBeneficioMeepp", type: "boolean", description: "Filtra resultados com benefício a ME/EPP" },
      { name: "aplicacaoCriterioDesempate", type: "boolean", description: "Filtra resultados com critério de desempate aplicado" },
    ],
    ["dataResultadoPncpInicial", "dataResultadoPncpFinal"]
  ),

  // === 11. Módulo ARP (Atas de Registro de Preço) ========================
  tool(
    "compras_arp",
    "Atas de Registro de Preço (ARP) por vigência. Requer intervalo de vigência inicial (dataVigenciaInicialMin/Max, AAAA-MM-DD). Filtros por unidade gerenciadora, modalidade, número da ata e assinatura.",
    "/modulo-arp/1_consultarARP",
    [
      pagina,
      tamanhoPagina,
      { name: "dataVigenciaInicialMin", type: "string", description: "Início do intervalo de vigência inicial, AAAA-MM-DD (obrigatório)" },
      { name: "dataVigenciaInicialMax", type: "string", description: "Fim do intervalo de vigência inicial, AAAA-MM-DD (obrigatório)" },
      { name: "codigoUnidadeGerenciadora", type: "integer", description: "Código da unidade gerenciadora (UASG)" },
      { name: "codigoModalidadeCompra", type: "string", description: "Código da modalidade da compra" },
      { name: "numeroAtaRegistroPreco", type: "string", description: "Número da Ata de Registro de Preço" },
      { name: "dataAssinaturaInicial", type: "string", description: "Data inicial de assinatura, AAAA-MM-DD" },
      { name: "dataAssinaturaFinal", type: "string", description: "Data final de assinatura, AAAA-MM-DD" },
    ],
    ["dataVigenciaInicialMin", "dataVigenciaInicialMax"]
  ),
  tool(
    "compras_arp_itens",
    "Itens das Atas de Registro de Preço por vigência. Requer intervalo de vigência inicial (AAAA-MM-DD). Filtros por unidade gerenciadora, modalidade, item, fornecedor e compra.",
    "/modulo-arp/2_consultarARPItem",
    [
      pagina,
      tamanhoPagina,
      { name: "dataVigenciaInicialMin", type: "string", description: "Início do intervalo de vigência inicial, AAAA-MM-DD (obrigatório)" },
      { name: "dataVigenciaInicialMax", type: "string", description: "Fim do intervalo de vigência inicial, AAAA-MM-DD (obrigatório)" },
      { name: "codigoUnidadeGerenciadora", type: "integer", description: "Código da unidade gerenciadora (UASG)" },
      { name: "codigoModalidadeCompra", type: "string", description: "Código da modalidade da compra" },
      { name: "dataAssinaturaInicial", type: "string", description: "Data inicial de assinatura, AAAA-MM-DD" },
      { name: "dataAssinaturaFinal", type: "string", description: "Data final de assinatura, AAAA-MM-DD" },
      { name: "numeroItem", type: "string", description: "Número do item" },
      { name: "codigoItem", type: "integer", description: "Código do item" },
      { name: "tipoItem", type: "string", description: "Tipo do item (material ou serviço)" },
      { name: "niFornecedor", type: "string", description: "Número de identificação do fornecedor (CNPJ/CPF)" },
      { name: "codigoPdm", type: "integer", description: "Código do PDM" },
      { name: "numeroCompra", type: "string", description: "Número da compra" },
    ],
    ["dataVigenciaInicialMin", "dataVigenciaInicialMax"]
  ),
  tool(
    "compras_arp_unidades_item",
    "Unidades participantes de um item de ARP. Requer número da ata, unidade gerenciadora e número do item.",
    "/modulo-arp/3_consultarUnidadesItem",
    [
      pagina,
      tamanhoPagina,
      { name: "numeroAta", type: "string", description: "Número da Ata de Registro de Preço (obrigatório)" },
      { name: "unidadeGerenciadora", type: "string", description: "Código da unidade gerenciadora/UASG (obrigatório)" },
      { name: "numeroItem", type: "string", description: "Número do item na ata (obrigatório)" },
      { name: "codigoUnidadeGerenciadora", type: "integer", description: "Código da unidade gerenciadora" },
      { name: "dataAtualizacao", type: "string", description: "Data de atualização, AAAA-MM-DD" },
    ],
    ["numeroAta", "unidadeGerenciadora", "numeroItem"]
  ),
  tool(
    "compras_arp_empenhos_item",
    "Empenhos e saldo de um item de ARP. Requer número da ata e unidade gerenciadora.",
    "/modulo-arp/4_consultarEmpenhosSaldoItem",
    [
      pagina,
      tamanhoPagina,
      { name: "numeroAta", type: "string", description: "Número da Ata de Registro de Preço (obrigatório)" },
      { name: "unidadeGerenciadora", type: "string", description: "Código da unidade gerenciadora/UASG (obrigatório)" },
      { name: "dataAtualizacao", type: "string", description: "Data de atualização, AAAA-MM-DD" },
    ],
    ["numeroAta", "unidadeGerenciadora"]
  ),
  tool(
    "compras_arp_adesoes_item",
    "Adesões (\"caronas\") de um item de ARP. Requer número da ata, unidade gerenciadora e número do item.",
    "/modulo-arp/5_consultarAdesoesItem",
    [
      pagina,
      tamanhoPagina,
      { name: "numeroAta", type: "string", description: "Número da Ata de Registro de Preço (obrigatório)" },
      { name: "unidadeGerenciadora", type: "string", description: "Código da unidade gerenciadora/UASG (obrigatório)" },
      { name: "numeroItem", type: "string", description: "Número do item na ata (obrigatório)" },
      { name: "unidade", type: "string", description: "Código da unidade solicitante da adesão" },
      { name: "dataAtualizacao", type: "string", description: "Data de atualização, AAAA-MM-DD" },
    ],
    ["numeroAta", "unidadeGerenciadora", "numeroItem"]
  ),

  // === 12. Módulo Contratos ==============================================
  tool(
    "compras_contratos",
    "Contratos por vigência. Requer intervalo de vigência inicial (dataVigenciaInicialMin/Max, AAAA-MM-DD). Filtros por órgão, unidade gestora, número, modalidade, tipo, categoria e fornecedor.",
    "/modulo-contratos/1_consultarContratos",
    [
      pagina,
      tamanhoPagina,
      { name: "dataVigenciaInicialMin", type: "string", description: "Início do intervalo de vigência inicial, AAAA-MM-DD (obrigatório)" },
      { name: "dataVigenciaInicialMax", type: "string", description: "Fim do intervalo de vigência inicial, AAAA-MM-DD (obrigatório)" },
      { name: "codigoOrgao", type: "integer", description: "Código do órgão" },
      { name: "codigoUnidadeGestora", type: "integer", description: "Código da unidade gestora responsável" },
      { name: "codigoUnidadeGestoraOrigemContrato", type: "integer", description: "Código da unidade gestora de origem do contrato" },
      { name: "codigoUnidadeRealizadoraCompra", type: "integer", description: "Código da unidade realizadora da compra" },
      { name: "numeroContrato", type: "string", description: "Número do contrato" },
      { name: "codigoModalidadeCompra", type: "string", description: "Código da modalidade de compra" },
      { name: "codigoTipo", type: "integer", description: "Código do tipo de contrato" },
      { name: "codigoCategoria", type: "integer", description: "Código da categoria do contrato" },
      { name: "niFornecedor", type: "string", description: "Número de identificação do fornecedor (CNPJ/CPF)" },
    ],
    ["dataVigenciaInicialMin", "dataVigenciaInicialMax"]
  ),
  tool(
    "compras_contratos_itens",
    "Itens de contrato por vigência. Requer intervalo de vigência inicial (AAAA-MM-DD). Filtros por órgão, unidade gestora, número, modalidade, item e fornecedor.",
    "/modulo-contratos/2_consultarContratosItem",
    [
      pagina,
      tamanhoPagina,
      { name: "dataVigenciaInicialMin", type: "string", description: "Início do intervalo de vigência inicial, AAAA-MM-DD (obrigatório)" },
      { name: "dataVigenciaInicialMax", type: "string", description: "Fim do intervalo de vigência inicial, AAAA-MM-DD (obrigatório)" },
      { name: "codigoOrgao", type: "integer", description: "Código do órgão" },
      { name: "codigoUnidadeGestora", type: "integer", description: "Código da unidade gestora responsável" },
      { name: "codigoUnidadeGestoraOrigemContrato", type: "integer", description: "Código da unidade gestora de origem do contrato" },
      { name: "codigoUnidadeRealizadoraCompra", type: "integer", description: "Código da unidade realizadora da compra" },
      { name: "numeroContrato", type: "string", description: "Número do contrato" },
      { name: "codigoModalidadeCompra", type: "string", description: "Código da modalidade de compra" },
      { name: "tipoItem", type: "integer", description: "Código do tipo do item" },
      { name: "codigoItem", type: "integer", description: "Código do item" },
      { name: "niFornecedor", type: "string", description: "Número de identificação do fornecedor (CNPJ/CPF)" },
    ],
    ["dataVigenciaInicialMin", "dataVigenciaInicialMax"]
  ),

  // === 13. Módulo Fornecedor =============================================
  tool(
    "compras_fornecedor",
    "Consulta fornecedores por CNPJ/CPF, natureza jurídica, porte, CNAE e status (ativo). O parâmetro 'ativo' é obrigatório.",
    "/modulo-fornecedor/1_consultarFornecedor",
    [
      pagina,
      tamanhoPagina,
      { name: "ativo", type: "boolean", description: "Filtra fornecedores ativos (true) ou inativos (false) (obrigatório)" },
      { name: "cnpj", type: "string", description: "CNPJ do fornecedor, somente dígitos" },
      { name: "cpf", type: "string", description: "CPF do fornecedor, somente dígitos" },
      { name: "naturezaJuridicaId", type: "integer", description: "Código da natureza jurídica" },
      { name: "porteEmpresaId", type: "integer", description: "Código do porte da empresa" },
      { name: "codigoCnae", type: "integer", description: "Código CNAE (Classificação Nacional de Atividades Econômicas)" },
    ],
    ["ativo"]
  ),

  // === 14. Módulo OCDS (Open Contracting Data Standard) ==================
  tool(
    "compras_ocds_releases",
    "OCDS (Open Contracting Data Standard): releases de contratações de um comprador por período. Requer buyerID e período (releaseStartDate/releaseEndDate, AAAA-MM-DD). Paginação por page/offset.",
    "/modulo-ocds/1_releases",
    [
      { name: "page", type: "integer", description: "Página dos resultados (começa em 1)", default: 1 },
      { name: "offset", type: "integer", description: "Quantidade de registros por página (mínimo 10, máximo 500, padrão 10)", default: 10 },
      { name: "buyerID", type: "string", description: "Identificador do comprador (obrigatório)" },
      { name: "releaseStartDate", type: "string", description: "Data inicial da publicação, AAAA-MM-DD (obrigatório)" },
      { name: "releaseEndDate", type: "string", description: "Data final da publicação, AAAA-MM-DD (obrigatório)" },
    ],
    ["buyerID", "releaseStartDate", "releaseEndDate"]
  ),

  // === Tabelas de domínio (local, sem rede) ==============================
  {
    name: "compras_tabelas_dominio",
    description:
      "Retorna as tabelas de domínio do Compras.gov.br (códigos usados nas consultas). " +
      "IMPORTANTE: a modalidade do Compras.gov.br difere da do PNCP (no Compras, Pregão=5 e Dispensa=6). " +
      "Use antes de filtrar por modalidade nos módulos Contratações e Legado. " +
      `Tabelas disponíveis: ${COMPRAS_TABELAS_DISPONIVEIS.join(", ")}.`,
    handler: (args) => {
      const tabela = args.tabela as string | undefined;
      return tabela ? getComprasDomainTable(tabela) : COMPRAS_DOMAIN_TABLES;
    },
    params: [
      {
        name: "tabela",
        type: "string",
        description:
          `Nome da tabela específica (opcional). Valores aceitos: ${COMPRAS_TABELAS_DISPONIVEIS.join(", ")}. ` +
          `Se não informado, retorna todas.`,
        enum: COMPRAS_TABELAS_DISPONIVEIS,
      },
    ],
  },
];

export const comprasDefinition: ApiDefinition = {
  serverName: "govbr-compras",
  apiLabel: "Compras.gov.br",
  baseUrl: "https://dadosabertos.compras.gov.br",
  // Dados Abertos do Compras.gov.br costuma ser mais estável que o PNCP, mas
  // consultas amplas ainda podem demorar. Timeout configurável.
  timeoutMs: 60000,
  timeoutEnvVar: "COMPRAS_TIMEOUT_MS",
  tools,
};
