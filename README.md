# GovBR Claude Plugin

Plugin que integra o **Claude** a **APIs de dados abertos do governo brasileiro**, permitindo consultar contratações públicas, catálogos, preços de referência, fornecedores e mais — diretamente na conversa, sem sair do Claude.

O plugin é **multi-API**: cada API do governo é exposta por um **servidor MCP** próprio e um **skill** em linguagem natural. Hoje acompanha duas APIs, e a arquitetura foi pensada para acrescentar outras com facilidade.

| API | Servidor MCP | Skill | O que cobre |
|---|---|---|---|
| **PNCP** — Portal Nacional de Contratações Públicas | `pncp` | `/pncp` | Licitações, contratações diretas, atas, contratos e itens do Plano de Contratações Anual (PCA), de qualquer ente (União/estados/municípios) |
| **Compras.gov.br** — Dados Abertos (SIASG) | `compras` | `/compras` | Catálogos CATMAT/CATSER, pesquisa de preço, PGC, UASGs/órgãos, licitações legadas, contratações 14.133, ARP, contratos e fornecedores (esfera federal) |

Cada **servidor MCP** é a camada de acesso aos dados (sabe chamar a API); cada **skill** é a camada de interpretação (entende o pedido em português e escolhe a ferramenta e os parâmetros). Ao instalar o plugin, tudo é registrado automaticamente.

---

## APIs base

| API | Base URL | Documentação |
|---|---|---|
| PNCP | `https://pncp.gov.br/api/consulta` | [Swagger](https://pncp.gov.br/api/consulta/swagger-ui/index.html) |
| Compras.gov.br | `https://dadosabertos.compras.gov.br` | [Swagger Dados Abertos](https://dadosabertos.compras.gov.br) · [Manual API Compras v2.0 (PDF, 02/2026)](https://www.gov.br/compras/pt-br/acesso-a-informacao/manuais/manual-dados-abertos/manual-api-compras.pdf) |

Ambas são **REST/JSON, GET, sem autenticação** para consultas.

---

> ⚠️ **Desempenho e estabilidade.** O **PNCP** é lento e oscila: respostas válidas chegam a ~50s e, sob carga, os endpoints de contratações devolvem `500`/`504` — use intervalos de datas curtos (≤ 1 mês) e sempre informe a modalidade. O **Compras.gov.br** costuma ser mais estável, mas consultas amplas também podem demorar. Erros `500`/`504`/timeout indicam instabilidade do portal — repita ou reduza o período. Timeouts do cliente: 90s (PNCP, via `PNCP_TIMEOUT_MS`) e 60s (Compras, via `COMPRAS_TIMEOUT_MS`).

---

## Requisitos

- [Node.js](https://nodejs.org/) 22 ou superior — para **compilar** o plugin (gerar os bundles). O plugin já compilado roda sem `node_modules`.
- App do Claude com suporte a plugins (Claude Code, ou Claude Desktop com a área de plugins em **Customize**).

---

## Instalação

Os servidores MCP e os comandos `/pncp` e `/compras` são distribuídos **juntos, como um único plugin**.

### Gere o pacote do plugin

```bash
git clone https://github.com/heitorrapcinski/GovBR-Claude-Plugin.git
cd GovBR-Claude-Plugin
npm install        # instala deps e compila os bundles (script "prepare")
npm run package    # gera build/govbr-claude-plugin.plugin
```

O `npm run package` compila cada servidor num bundle autossuficiente (`build/pncp.cjs` e `build/compras.cjs`, com todas as dependências embutidas), empacota cada um como **MCPB** (`build/govbr-*.mcpb`) e monta o **`build/govbr-claude-plugin.plugin`** — pronto para upload, sem `node_modules`.

> **Por que MCPB?** O importador de "Fazer upload de plugin local" rejeita servidores **stdio crus** (*"MCP server is a local/stdio server. Plugins may only declare remote or MCPB servers"*). Por isso o `plugin.json` não declara stdio; ele referencia os `.mcpb` pelo campo `mcpServers`. Esse formato é aceito nos três Personalizar — **Code, Cowork e Chat**. São dois `.mcpb` porque cada API tem `baseUrl` e cliente HTTP próprios.

### Instale o plugin

No app do Claude, abra **Personalizar → "Fazer upload de plugin local"** e selecione **`build/govbr-claude-plugin.plugin`**. O Claude lê o `.claude-plugin/plugin.json` e registra:

- os **servidores MCP** (via `mcpServers` → os dois `.mcpb`, `pncp` e `compras`);
- os **skills `/pncp` e `/compras`** (via `skills/*/SKILL.md`), que o Claude também invoca automaticamente conforme o pedido.

> ℹ️ O MCPB embute o runtime para rodar sem `node` instalado, mas continua sendo um servidor **local** — funciona em hosts com máquina local (Code/Cowork desktop); **não** roda em sessão 100% na nuvem.

### Confirme

Os comandos `/pncp` e `/compras` ficam disponíveis na barra de comandos, e o Claude passa a reconhecer pedidos de dados de compras públicas automaticamente na conversa.

---

## Observabilidade (logs)

Cada servidor MCP registra suas chamadas de ferramenta para diagnóstico (latência, taxa de erro, timeouts do portal). Como o servidor se comunica por **stdio** — onde o `stdout` é reservado ao protocolo JSON‑RPC —, os logs vão para o **`stderr`** (capturado pelo Claude Code; visível com `claude --debug` ou no painel `/mcp`) e, opcionalmente, para um **arquivo**.

Cada evento é uma linha estruturada. Exemplo (JSON):

```json
{"ts":"2026-06-22T14:03:11.482Z","server":"govbr-pncp","level":"info","event":"call","tool":"pncp_consultar_contratacoes_publicacao","ok":true,"durationMs":842,"status":200}
{"ts":"2026-06-22T14:05:02.107Z","server":"govbr-pncp","level":"error","event":"call","tool":"pncp_consultar_atas","ok":false,"durationMs":90000,"errKind":"timeout"}
```

Os parâmetros das chamadas só são gravados no nível `debug`, e ainda assim **sanitizados**: strings longas são truncadas e sequências que parecem CPF (11 dígitos) ou CNPJ (14 dígitos) têm o miolo mascarado.

### Configuração (variáveis de ambiente)

| Variável | Valores | Padrão | Efeito |
|---|---|---|---|
| `GOVBR_LOG_LEVEL` | `silent` · `error` · `info` · `debug` | `error` | `error`: só falhas. `info`: + chamadas bem‑sucedidas e boot. `debug`: + params sanitizados. `silent`: desliga o arquivo (boot ainda sinaliza no stderr). |
| `GOVBR_LOG_FORMAT` | `json` · `text` | `json` | Formato das linhas. `json` é ideal para parsear/agregar. |
| `GOVBR_LOG_DIR` | caminho absoluto | vazio = padrão | Pasta dos arquivos. Vazio usa o diretório de dados do usuário (ver abaixo). |

Os padrões já dão observabilidade útil (só falhas, em `~/.govbr-claude-plugin/logs`), então **nada precisa ser configurado**. Para ajustar:

- **Variável de ambiente do sistema** (recomendado): defina `GOVBR_LOG_LEVEL=info` no ambiente antes de iniciar o app do Claude — o servidor MCPB herda o ambiente do processo do app.
- **Default embutido no manifest**: adicione um bloco `env` em `server.mcp_config.env` no `mcpb.mjs` (ex.: `"GOVBR_LOG_LEVEL": "info"`) e rode `npm run package`.

### Onde os arquivos são gravados

Um arquivo por servidor (`govbr-pncp.log`, `govbr-compras.log`), com rotação simples (ao passar de 5 MB, vira `.log.1`). Por padrão em **`~/.govbr-claude-plugin/logs/`** — o mesmo caminho em qualquer SO, onde `~` é a home do usuário resolvida via `os.homedir()` (`C:\Users\…` no Windows, `/home/…` no Linux, `/Users/…` no macOS). Fica **fora do diretório de instalação do plugin**, que é sobrescrito a cada update.

> O default de `GOVBR_LOG_DIR` é resolvido **em código**, não no manifest: `~` é convenção de shell que o Node não expande, então o padrão usa `os.homedir()`. Defina `GOVBR_LOG_DIR` com um **caminho absoluto** para centralizar os logs em outro lugar.

Se a pasta não puder ser criada, o servidor segue só com `stderr` — logging nunca derruba o servidor.

---

## Desenvolvimento

```bash
npm install         # instala deps e gera os bundles
npm run dev:pncp    # roda o servidor PNCP direto do TypeScript (tsx)
npm run dev:compras # roda o servidor Compras direto do TypeScript (tsx)
npm run build       # regenera os dois bundles com esbuild
npm run mcpb        # gera os bundles MCPB (build/govbr-*.mcpb)
npm run package     # gera build/govbr-claude-plugin.plugin (mcpb embutido)
npm run typecheck   # checagem de tipos (tsc --noEmit)
```

> Para iterar durante o desenvolvimento sem reinstalar o `.plugin`, rode o servidor direto do código com `npm run dev:pncp` / `npm run dev:compras` (tsx) e inspecione com o [MCP Inspector](https://github.com/modelcontextprotocol/inspector). O `plugin.json` versionado **não** declara `mcpServers`; o `package.mjs` injeta o `mcpServers`→`.mcpb` só na cópia distribuída.

Estrutura do plugin:

```
GovBR-Claude-Plugin/
├── .claude-plugin/plugin.json   # manifesto do plugin
├── skills/
│   ├── pncp/SKILL.md            # skill /pncp
│   └── compras/SKILL.md         # skill /compras
├── src/
│   ├── core/                    # framework genérico (compartilhado)
│   │   ├── types.ts             #   ApiDefinition, ToolDef, ParamDef
│   │   ├── http.ts              #   cliente HTTP + tratamento de erros
│   │   ├── logger.ts            #   observabilidade (stderr + arquivo, configurável)
│   │   ├── server.ts            #   gera o servidor MCP a partir de uma definição
│   │   └── version.ts
│   └── apis/                    # uma pasta por API do governo
│       ├── pncp/                #   definition.ts + domain.ts + index.ts
│       └── compras/             #   definition.ts + index.ts
├── build.mjs                    # esbuild (um bundle por API)
├── mcpb.mjs                     # empacotamento (.mcpb, um por API)
├── package.mjs                  # empacotamento (.plugin, mcpb embutido)
└── build/                       # gerado, gitignored
    ├── pncp.cjs                 #   bundle PNCP
    ├── compras.cjs              #   bundle Compras
    ├── govbr-pncp.mcpb / govbr-compras.mcpb
    └── govbr-claude-plugin.plugin
```

Após alterar o código em `src/`, rode `npm run build` e recarregue o plugin (`/reload-plugins` ou reinicie o Claude).

### Como adicionar uma nova API do governo

A arquitetura é **declarativa**: o núcleo (`src/core`) transforma uma `ApiDefinition` num servidor MCP completo. Para acrescentar uma API:

1. Crie `src/apis/<nova-api>/definition.ts` exportando uma `ApiDefinition` (base URL, timeout e a lista de ferramentas, cada uma com `path`, `params` e `required` — ou um `handler` local).
2. Crie `src/apis/<nova-api>/index.ts` chamando `startApiServer(<novaApi>Definition)`.
3. Registre a entrada em `build.mjs` e o bundle em `mcpb.mjs` (de onde o `package.mjs` puxa os `.mcpb`).
4. (Opcional) Crie `skills/<nova-api>/SKILL.md` para a interface em linguagem natural.

---

## Como usar

As duas formas funcionam tanto no **Claude Desktop** quanto no **Claude Code**.

### Linguagem natural

Converse normalmente; o Claude detecta a API certa e chama a ferramenta adequada:

```
Busque os pregões eletrônicos publicados em São Paulo entre 01/06/2024 e 30/06/2024.   (PNCP)
Quais atas de registro de preço estão vigentes em 2024 no RJ?                            (PNCP)
Qual o preço de referência do item de catálogo 150912?                                  (Compras)
Liste os grupos do catálogo de materiais (CATMAT).                                       (Compras)
Busque fornecedores ativos com CNAE 4751201.                                            (Compras)
Mostre as contratações da Lei 14.133 publicadas em março de 2024, pregão eletrônico.    (Compras)
```

### Skill `/pncp`

```
/pncp pregões eletrônicos abertos em SP esta semana
/pncp dispensas publicadas em janeiro de 2024 pelo CNPJ 00059311000126
/pncp atas de registro de preço vigentes em 2024 no estado do RJ
/pncp quais modalidades de contratação existem no PNCP?
```

### Skill `/compras`

```
/compras grupos do catálogo de materiais
/compras item de material com "máscara cirúrgica" na descrição
/compras preço de referência do item de catálogo 150912 em SP
/compras contratos com vigência iniciando entre 01/01/2024 e 31/03/2024
/compras fornecedores ativos com porte ME
/compras ARP vigentes a partir de janeiro de 2024 da unidade gerenciadora 200999
```

Cada skill interpreta o pedido, escolhe a ferramenta certa, converte datas (PNCP usa `AAAAMMDD`; Compras usa `AAAA-MM-DD`), extrai filtros (UF, município, CNPJ, modalidade), valida os parâmetros obrigatórios (perguntando quando faltar) e formata os resultados (R$, datas em DD/MM/AAAA, paginação).

---

## Referência das ferramentas MCP

### Servidor `pncp` (10 ferramentas)

Consulta por período: `pncp_consultar_contratacoes_publicacao`, `pncp_consultar_contratacoes_proposta`, `pncp_consultar_atas`, `pncp_consultar_contratos`, `pncp_consultar_itens_pca_usuario`, `pncp_consultar_itens_pca`. Domínio: `pncp_tabelas_dominio`.

Detalhe **por contratação** (a partir do número de controle PNCP `CNPJ-1-SEQUENCIAL/ANO`): `pncp_consultar_itens` (itens da contratação), `pncp_consultar_resultado_item` (proposta vencedora/adjudicada + valor homologado por item), `pncp_consultar_arquivos` (edital e anexos com URL de download). Úteis para **pesquisa de preço a partir de um pregão de referência**: pregão → itens → vencedores e valores → edital.

> ℹ️ A API entrega "quem venceu cada item e por quanto" e, dos documentos, expõe **apenas o Edital**. Os **demais anexos** (termos de homologação/julgamento, relatórios), onde está o detalhe das propostas — **marca, modelo e valor** por proposta —, **não vêm por API**: ficam no portal Compras.gov.br, com download protegido (anti-bot). Nesse ponto o skill orienta o usuário a baixar os anexos e o Claude os parseia (ver `skills/compras/SKILL.md`, seção 5.5).

Datas no formato `AAAAMMDD`. Veja os parâmetros detalhados de cada ferramenta na própria descrição exposta pelo MCP.

### Servidor `compras` (44 ferramentas)

Datas no formato `AAAA-MM-DD`. Resposta padrão: `{ resultado: [...], totalRegistros, totalPaginas, paginasRestantes }`.

> ⚠️ **Modalidade no Compras.gov.br ≠ PNCP.** O módulo Contratações/Legado usa a codificação do SIASG, em que **`5` = Pregão** e **`6` = Dispensa** (no PNCP, Pregão = 6 e Dispensa = 8). Use `compras_tabelas_dominio` para conferir. Além disso, o endpoint de contratações **limita o período a 365 dias** e **não filtra por texto do objeto** (filtre `objetoCompra` no cliente).

| Módulo | Ferramentas |
|---|---|
| Material (CATMAT) | `compras_material_grupos`, `compras_material_classes`, `compras_material_pdms`, `compras_material_itens`, `compras_material_natureza_despesa`, `compras_material_unidade_fornecimento`, `compras_material_caracteristicas` |
| Serviço (CATSER) | `compras_servico_secoes`, `compras_servico_divisoes`, `compras_servico_grupos`, `compras_servico_classes`, `compras_servico_subclasses`, `compras_servico_itens`, `compras_servico_unidade_medida`, `compras_servico_natureza_despesa` |
| Pesquisa de Preço | `compras_precos_material`, `compras_precos_material_detalhe`, `compras_precos_servico`, `compras_precos_servico_detalhe` |
| PGC | `compras_pgc_detalhe`, `compras_pgc_detalhe_catalogo`, `compras_pgc_agregacao` |
| UASG / Órgão | `compras_uasg`, `compras_orgao` |
| Legado | `compras_legado_licitacao`, `compras_legado_itens_licitacao`, `compras_legado_pregao`, `compras_legado_itens_pregao`, `compras_legado_compra_sem_licitacao`, `compras_legado_itens_compra_sem_licitacao`, `compras_legado_rdc` |
| Contratações 14.133 | `compras_contratacoes`, `compras_contratacoes_itens`, `compras_contratacoes_itens_resultado` |
| ARP | `compras_arp`, `compras_arp_itens`, `compras_arp_unidades_item`, `compras_arp_empenhos_item`, `compras_arp_adesoes_item` |
| Contratos | `compras_contratos`, `compras_contratos_itens` |
| Fornecedor | `compras_fornecedor` |
| OCDS | `compras_ocds_releases` |
| Tabelas de domínio (local) | `compras_tabelas_dominio` (modalidade, modo de disputa, critério de julgamento) |

Os parâmetros (obrigatórios e opcionais) de cada ferramenta estão descritos no próprio schema MCP e resumidos no skill `/compras`.
