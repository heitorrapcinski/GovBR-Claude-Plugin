# GovBR Claude Plugin

Plugin que integra o **Claude** ao **Portal Nacional de Contratações Públicas (PNCP)**, permitindo consultar licitações, contratos, atas e planos de contratações diretamente na conversa — sem sair do Claude.

O plugin é composto por duas partes que funcionam em conjunto e são distribuídas **juntas, em um único plugin do Claude Code**:

| Parte | O que é |
|---|---|
| **Servidor MCP** | Conecta o Claude à API do PNCP e expõe 7 ferramentas de consulta |
| **Skill `/pncp`** | Interface em linguagem natural que usa as ferramentas do MCP |

O **MCP** é a camada de acesso aos dados — ele sabe como chamar a API do PNCP. O **skill** é a camada de interpretação — ele entende o que você quer dizer em português e decide qual ferramenta usar e com quais parâmetros. Ao instalar o plugin, os dois são registrados automaticamente.

---

## API base

- **Base URL:** `https://pncp.gov.br/api/consulta`
- **Documentação oficial (Swagger):** `https://pncp.gov.br/api/consulta/swagger-ui/index.html`
- **Manual de consumo da API (v1.0):** [ManualPNCPAPIConsultas v1.0 (PDF)](https://www.gov.br/pncp/pt-br/pncp/manuais/versoes-anteriores/ManualPNCPAPIConsultasVerso1.0.pdf/@@display-file/file)
- **Protocolo:** REST/JSON, sem autenticação necessária para consultas

---

## Exemplos de uso

**No Claude Desktop** — converse normalmente:
```
Quais pregões eletrônicos foram publicados em SP esta semana?
Dispensas de licitação com propostas abertas até hoje no RJ.
Contratos publicados em janeiro de 2024 pelo CNPJ 00059311000126.
```

**No Claude Code** — use o skill `/pncp`:
```
/pncp pregões eletrônicos abertos em SP esta semana
/pncp atas de registro de preço vigentes em 2024 no RJ
/pncp contratos assinados em março de 2024 em Brasília
```

---

## Requisitos

- [Node.js](https://nodejs.org/) 18 ou superior — para **compilar** o plugin (gerar o bundle). O plugin já compilado roda sem `node_modules`.
- App do Claude com suporte a plugins (Claude Code, ou Claude Desktop com a área de plugins em **Customize**).

---

## Instalação

O servidor MCP e o comando `/pncp` são distribuídos **juntos, como um único plugin do Claude Code**. Não é necessário editar o `claude_desktop_config.json` manualmente.

### 1. Gere o pacote do plugin

```bash
git clone https://github.com/heitorrapcinski/GovBR-Claude-Plugin.git
cd GovBR-Claude-Plugin
npm install        # instala deps e compila o bundle (script "prepare")
npm run package    # gera build/govbr-claude-plugin.plugin
```

O `npm run package` compila o servidor num bundle autossuficiente (`build/index.cjs`, com todas as dependências embutidas) e empacota o plugin em **`build/govbr-claude-plugin.plugin`** — um arquivo pronto para upload, sem `node_modules`.

### 2. Instale o plugin

No app do Claude, abra a área de plugins (**Customize → plugins**) e escolha **"Fazer upload de plugin local"**. Selecione o arquivo **`build/govbr-claude-plugin.plugin`**.

O Claude lê o manifesto `.claude-plugin/plugin.json` e registra automaticamente:

- o **servidor MCP** (via `.mcp.json` → as 7 ferramentas `pncp_*`);
- o **skill `/pncp`** (via `skills/pncp/SKILL.md`), que o Claude também invoca automaticamente quando você pede dados de contratações.

> **Alternativa — "Adicionar marketplace":** instala a partir de um repositório GitHub. **Não** é usada aqui porque o bundle (`build/`) fica fora do controle de versão (`.gitignore`); para esse modo o bundle precisaria ser publicado. O **upload local** é o caminho suportado por este projeto.

### 3. Confirme

Um ícone de ferramentas aparece no campo de digitação listando as 7 ferramentas `pncp_*`, e o comando `/pncp` fica disponível.

---

## Desenvolvimento

```bash
npm install        # instala deps e gera o bundle (build/index.cjs)
npm run dev        # roda o servidor direto do TypeScript (tsx), sem bundle
npm run build      # regenera o bundle com esbuild
npm run package    # gera o pacote build/govbr-claude-plugin.plugin
npm run typecheck  # checagem de tipos (tsc --noEmit)
```

Estrutura do plugin:

```
GovBR-Claude-Plugin/
├── .claude-plugin/plugin.json   # manifesto do plugin
├── .mcp.json                    # registra o servidor MCP (build/index.cjs)
├── skills/pncp/SKILL.md         # skill /pncp (formato recomendado)
├── src/                         # código-fonte TypeScript do servidor MCP
├── build.mjs                    # script esbuild (gera o bundle)
├── package.mjs                  # script de empacotamento (.plugin)
└── build/                       # gerado, gitignored
    ├── index.cjs                #   bundle autossuficiente
    └── govbr-claude-plugin.plugin  # pacote para upload
```

Após alterar o código em `src/`, rode `npm run build` e recarregue o plugin (`/reload-plugins` ou reinicie o Claude).

---

## Como usar

### Claude Desktop

Após instalar o MCP, converse com o Claude normalmente. Ele detecta automaticamente quando você quer dados do PNCP e chama a ferramenta adequada:

```
Busque os pregões eletrônicos publicados em São Paulo entre 01/06/2024 e 30/06/2024.
Quais dispensas de licitação estão com propostas abertas até hoje no estado do RJ?
Liste os contratos publicados em janeiro de 2024 pelo órgão com CNPJ 00059311000126.
Quais atas de registro de preço estão vigentes entre janeiro e dezembro de 2024?
Me mostre os códigos de modalidade de contratação disponíveis no PNCP.
```

### Claude Code — skill `/pncp`

Digite `/pncp` seguido da sua consulta em linguagem natural:

```
/pncp pregões eletrônicos abertos em SP esta semana
/pncp dispensas publicadas em janeiro de 2024 pelo CNPJ 00059311000126
/pncp atas de registro de preço vigentes em 2024 no estado do RJ
/pncp contratos assinados em março de 2024 em Brasília
/pncp quais modalidades de contratação existem no PNCP?
```

O skill interpreta o pedido e cuida de tudo automaticamente:

| Comportamento | Detalhe |
|---|---|
| **Escolhe a ferramenta certa** | Mapeia o pedido para o endpoint correto (contratações, atas, contratos, PCA) |
| **Converte datas relativas** | "esta semana", "ontem", "este mês" → formato `AAAAMMDD` |
| **Extrai filtros do texto** | UF, município (com código IBGE), CNPJ, modalidade |
| **Formata os resultados** | Valores em R$, datas em DD/MM/AAAA, tabelas organizadas |
| **Informa paginação** | Mostra total de registros e páginas; pergunta se deseja continuar |
| **Sugere refinamentos** | Propõe filtros adicionais ao final da resposta |

---

## Referência das ferramentas MCP

O servidor MCP expõe 7 ferramentas que o Claude usa automaticamente.

### `pncp_tabelas_dominio`
Retorna os códigos de domínio do PNCP (modalidades, tipos de contrato, amparos legais, etc.).

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `tabela` | string | Não | Nome da tabela específica |

**Tabelas disponíveis:** `modalidade_contratacao`, `modo_disputa`, `criterio_julgamento`, `situacao_contratacao`, `situacao_item_contratacao`, `tipo_beneficio`, `tipo_contrato`, `tipo_termo_contrato`, `categoria_processo`, `tipo_documento`, `porte_empresa`, `categoria_item_pca`, `amparo_legal`, `instrumento_convocatorio`, `situacao_resultado_item_contratacao`.

---

### `pncp_consultar_contratacoes_publicacao`
Busca contratações (licitações e contratações diretas) por data de publicação.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `dataInicial` | string | ✅ | Data inicial no formato `AAAAMMDD` |
| `dataFinal` | string | ✅ | Data final no formato `AAAAMMDD` |
| `codigoModalidadeContratacao` | inteiro | ✅ | Código da modalidade |
| `pagina` | inteiro | ✅ | Número da página (começa em 1) |
| `uf` | string | Não | Sigla do estado (ex: `SP`, `RJ`) |
| `codigoMunicipioIbge` | string | Não | Código IBGE do município |
| `cnpj` | string | Não | CNPJ do órgão (somente dígitos) |
| `codigoModoDisputa` | inteiro | Não | Código do modo de disputa |
| `codigoUnidadeAdministrativa` | string | Não | Código da unidade administrativa |
| `idUsuario` | inteiro | Não | ID do portal/sistema de contratações |
| `tamanhoPagina` | inteiro | Não | Registros por página (máx 500, padrão 50) |

**Principais modalidades:** 4 = Concorrência Eletrônica, 6 = Pregão Eletrônico, 8 = Dispensa, 9 = Inexigibilidade.

---

### `pncp_consultar_contratacoes_proposta`
Busca contratações com prazo de recebimento de propostas ainda aberto.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `dataFinal` | string | ✅ | Data limite no formato `AAAAMMDD` |
| `codigoModalidadeContratacao` | inteiro | ✅ | Código da modalidade |
| `pagina` | inteiro | ✅ | Número da página |
| `uf` | string | Não | Sigla do estado |
| `codigoMunicipioIbge` | string | Não | Código IBGE do município |
| `cnpj` | string | Não | CNPJ do órgão |
| `codigoUnidadeAdministrativa` | string | Não | Código da unidade |
| `idUsuario` | inteiro | Não | ID do portal |
| `tamanhoPagina` | inteiro | Não | Registros por página (máx 500) |

---

### `pncp_consultar_atas`
Busca atas de registro de preços por período de vigência.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `dataInicial` | string | ✅ | Data inicial de vigência (`AAAAMMDD`) |
| `dataFinal` | string | ✅ | Data final de vigência (`AAAAMMDD`) |
| `pagina` | inteiro | ✅ | Número da página |
| `cnpj` | string | Não | CNPJ do órgão |
| `idUsuario` | inteiro | Não | ID do portal |
| `codigoUnidadeAdministrativa` | string | Não | Código da unidade |
| `tamanhoPagina` | inteiro | Não | Registros por página (máx 500) |

---

### `pncp_consultar_contratos`
Busca contratos e empenhos com força de contrato por data de publicação.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `dataInicial` | string | ✅ | Data inicial (`AAAAMMDD`) |
| `dataFinal` | string | ✅ | Data final (`AAAAMMDD`) |
| `pagina` | inteiro | ✅ | Número da página |
| `cnpjOrgao` | string | Não | CNPJ do órgão contratante |
| `codigoUnidadeAdministrativa` | string | Não | Código da unidade |
| `usuarioId` | inteiro | Não | ID do portal |
| `tamanhoPagina` | inteiro | Não | Registros por página (máx 500) |

---

### `pncp_consultar_itens_pca_usuario`
Busca itens do Plano de Contratações Anual (PCA) por portal/sistema.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `anoPca` | inteiro | ✅ | Ano do PCA (ex: `2024`) |
| `idUsuario` | inteiro | ✅ | ID do portal de contratações |
| `pagina` | inteiro | ✅ | Número da página |
| `codigoClassificacaoSuperior` | string | Não | Código da classe do material ou grupo do serviço |
| `tamanhoPagina` | inteiro | Não | Registros por página (máx 500) |

---

### `pncp_consultar_itens_pca`
Busca itens do PCA por ano e classificação superior.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `anoPca` | inteiro | ✅ | Ano do PCA |
| `codigoClassificacaoSuperior` | string | ✅ | Código da classe/grupo |
| `pagina` | inteiro | ✅ | Número da página |
| `tamanhoPagina` | inteiro | Não | Registros por página (máx 500) |

