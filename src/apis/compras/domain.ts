// Tabelas de domínio da API de Dados Abertos do Compras.gov.br.
// Servidas localmente pela ferramenta compras_tabelas_dominio, sem chamada de rede.
//
// IMPORTANTE: a modalidade aqui segue a codificação do SIASG/Compras.gov.br
// (Manual API Compras v2.0, seção 10.1) — que é DIFERENTE da do PNCP. Ex.:
// no Compras, Pregão = 5 e Dispensa = 6; no PNCP, Pregão = 6 e Dispensa = 8.
// Estes códigos valem para o parâmetro `codigoModalidade` do módulo Contratações
// e para o parâmetro `modalidade`/`co_modalidade_licitacao` do módulo Legado.
export const COMPRAS_DOMAIN_TABLES = {
  modalidade_compra: [
    { codigo: 1, nome: "Convite" },
    { codigo: 2, nome: "Tomada de Preços" },
    { codigo: 3, nome: "Concorrência" },
    { codigo: 4, nome: "Concorrência Internacional" },
    { codigo: 5, nome: "Pregão (Eletrônico)" },
    { codigo: 6, nome: "Dispensa de Licitação" },
    { codigo: 7, nome: "Inexigibilidade de Licitação" },
    { codigo: 12, nome: "Credenciamento" },
    { codigo: 20, nome: "Concurso" },
    { codigo: 22, nome: "Tomada de Preços por Técnica e Preço" },
    { codigo: 33, nome: "Concorrência por Técnica e Preço" },
    { codigo: 44, nome: "Concorrência Internacional por Técnica e Preço" },
    { codigo: 57, nome: "Convênio" },
  ],

  modo_disputa: [
    { codigo: 1, nome: "Aberto" },
    { codigo: 2, nome: "Fechado" },
    { codigo: 3, nome: "Aberto-Fechado" },
    { codigo: 4, nome: "Dispensa com Disputa" },
    { codigo: 5, nome: "Não se aplica" },
    { codigo: 6, nome: "Fechado-Aberto" },
  ],

  criterio_julgamento: [
    { codigo: 1, nome: "Menor preço" },
    { codigo: 2, nome: "Maior desconto" },
    { codigo: 3, nome: "Melhor técnica ou conteúdo artístico", descricao: "Indisponível" },
    { codigo: 4, nome: "Técnica e preço" },
    { codigo: 5, nome: "Maior lance" },
    { codigo: 6, nome: "Maior retorno econômico" },
    { codigo: 7, nome: "Não se aplica" },
    { codigo: 8, nome: "Melhor técnica" },
    { codigo: 9, nome: "Conteúdo artístico" },
  ],
} as const;

export type ComprasDomainTableKey = keyof typeof COMPRAS_DOMAIN_TABLES;

export function getComprasDomainTable(tabela: string): unknown {
  if (tabela in COMPRAS_DOMAIN_TABLES) {
    return COMPRAS_DOMAIN_TABLES[tabela as ComprasDomainTableKey];
  }
  return {
    erro: `Tabela '${tabela}' não encontrada.`,
    tabelas_disponiveis: Object.keys(COMPRAS_DOMAIN_TABLES),
  };
}

export const COMPRAS_TABELAS_DISPONIVEIS = Object.keys(COMPRAS_DOMAIN_TABLES);

// String pronta para embutir em descrições de ferramentas.
export const MODALIDADE_COMPRA_INLINE = COMPRAS_DOMAIN_TABLES.modalidade_compra
  .map((m) => `${m.codigo}=${m.nome}`)
  .join(", ");
