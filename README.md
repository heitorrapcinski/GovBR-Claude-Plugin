# PNCP Claude Plugin

Plugin MCP (Model Context Protocol) que permite ao Claude consultar dados do **Portal Nacional de Contratações Públicas (PNCP)** diretamente na conversa.

Com ele você pode perguntar ao Claude coisas como:
- *"Busque as dispensas de licitação publicadas em SP esta semana"*
- *"Quais pregões eletrônicos estão com propostas abertas até amanhã?"*
- *"Liste os contratos publicados em janeiro de 2024 pelo CNPJ X"*

Ou usar o **skill `/pncp`** no Claude Code para consultas diretas em linguagem natural:

```
/pncp pregões eletrônicos abertos em SP esta semana
```

---

## Requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- [Claude Desktop](https://claude.ai/download) (app para Mac ou Windows) — para uso via MCP
- [Claude Code](https://claude.ai/code) — para uso via skill `/pncp`

---

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/heitorrapcinski/pncp-claudeplugin.git
cd pncp-claudeplugin
```

### 2. Instale as dependências e compile

```bash
npm install
```

O comando `npm install` já executa o build automaticamente. Para recompilar manualmente:

```bash
npm run build
```

### 3. Localize o caminho absoluto do projeto

**Mac/Linux:**
```bash
pwd
# Exemplo: /Users/heitor/pncp-claudeplugin
```

**Windows (PowerShell):**
```powershell
(Get-Location).Path
# Exemplo: C:\Users\heitor\pncp-claudeplugin
```

---

## Configuração no Claude Desktop

### 1. Abra o arquivo de configuração do Claude Desktop

| Sistema | Caminho |
|---|---|
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |

Se o arquivo não existir, crie-o.

### 2. Adicione o servidor PNCP

**macOS / Linux:**
```json
{
  "mcpServers": {
    "pncp": {
      "command": "node",
      "args": ["/Users/heitor/pncp-claudeplugin/build/index.js"]
    }
  }
}
```

**Windows:**
```json
{
  "mcpServers": {
    "pncp": {
      "command": "node",
      "args": ["C:\\Users\\heitor\\pncp-claudeplugin\\build\\index.js"]
    }
  }
}
```

> **Atenção:** substitua o caminho pelo resultado do `pwd` / `Get-Location` obtido no passo anterior.

Se você já tiver outros servidores MCP configurados, adicione apenas o bloco `"pncp": { ... }` dentro de `"mcpServers"`.

### 3. Reinicie o Claude Desktop

Feche e abra o Claude Desktop. Um ícone de martelo (🔨) aparecerá no campo de digitação indicando que as ferramentas estão disponíveis.

---

## Ferramentas disponíveis

O plugin expõe 7 ferramentas que o Claude usa automaticamente conforme necessário.

### `pncp_tabelas_dominio`
Retorna os códigos de domínio do PNCP (modalidades, tipos de contrato, amparos legais, etc.). Útil para descobrir os códigos antes de fazer consultas.

**Parâmetros:**
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `tabela` | string | Não | Nome da tabela específica (ver lista abaixo) |

**Tabelas disponíveis:** `modalidade_contratacao`, `modo_disputa`, `criterio_julgamento`, `situacao_contratacao`, `situacao_item_contratacao`, `tipo_beneficio`, `tipo_contrato`, `tipo_termo_contrato`, `categoria_processo`, `tipo_documento`, `porte_empresa`, `categoria_item_pca`, `amparo_legal`, `instrumento_convocatorio`, `situacao_resultado_item_contratacao`.

---

### `pncp_consultar_contratacoes_publicacao`
Busca contratações (licitações e contratações diretas) por data de publicação.

**Parâmetros:**
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `dataInicial` | string | ✅ | Data inicial no formato `AAAAMMDD` |
| `dataFinal` | string | ✅ | Data final no formato `AAAAMMDD` |
| `codigoModalidadeContratacao` | inteiro | ✅ | Código da modalidade (ver tabela abaixo) |
| `pagina` | inteiro | ✅ | Número da página (começa em 1) |
| `uf` | string | Não | Sigla do estado (ex: `SP`, `RJ`) |
| `codigoMunicipioIbge` | string | Não | Código IBGE do município |
| `cnpj` | string | Não | CNPJ do órgão (somente dígitos) |
| `codigoModoDisputa` | inteiro | Não | Código do modo de disputa |
| `codigoUnidadeAdministrativa` | string | Não | Código da unidade administrativa |
| `idUsuario` | inteiro | Não | ID do portal/sistema de contratações |
| `tamanhoPagina` | inteiro | Não | Registros por página (máx 500, padrão 50) |

**Principais modalidades:**
| Código | Modalidade |
|---|---|
| 4 | Concorrência - Eletrônica |
| 6 | Pregão - Eletrônico |
| 8 | Dispensa de Licitação |
| 9 | Inexigibilidade |

---

### `pncp_consultar_contratacoes_proposta`
Busca contratações com prazo de recebimento de propostas ainda aberto.

**Parâmetros:**
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

**Parâmetros:**
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

**Parâmetros:**
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

**Parâmetros:**
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

**Parâmetros:**
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `anoPca` | inteiro | ✅ | Ano do PCA |
| `codigoClassificacaoSuperior` | string | ✅ | Código da classe/grupo |
| `pagina` | inteiro | ✅ | Número da página |
| `tamanhoPagina` | inteiro | Não | Registros por página (máx 500) |

---

## Skill `/pncp` — Claude Code

O skill `/pncp` está disponível para quem usa o **Claude Code** (CLI ou extensões de IDE). Ele traduz consultas em linguagem natural diretamente para chamadas à API do PNCP.

### Como usar

Digite `/pncp` seguido da sua consulta:

```
/pncp pregões eletrônicos abertos em SP esta semana
/pncp dispensas publicadas em janeiro de 2024 pelo CNPJ 00059311000126
/pncp atas de registro de preço vigentes em 2024 no estado do RJ
/pncp contratos assinados em março de 2024 em Brasília
/pncp quais modalidades de contratação existem no PNCP?
```

### O que o skill faz automaticamente

| Comportamento | Detalhe |
|---|---|
| **Escolhe a ferramenta certa** | Mapeia o pedido para o endpoint correto (contratações, atas, contratos, PCA) |
| **Converte datas relativas** | "esta semana", "ontem", "este mês" → formato `AAAAMMDD` |
| **Extrai filtros do texto** | UF, município (com código IBGE), CNPJ, modalidade |
| **Formata os resultados** | Valores em R$, datas em DD/MM/AAAA, tabelas organizadas |
| **Informa paginação** | Mostra total de registros e páginas; pergunta se deseja continuar |
| **Sugere refinamentos** | Propõe filtros adicionais ao final da resposta |

### Instalação do skill no Claude Code

O skill já está incluído no repositório em `.claude/commands/pncp.md`. Para ativá-lo basta ter o repositório clonado e abrir o Claude Code na pasta do projeto — o skill `/pncp` ficará disponível automaticamente.

---

## Exemplos de uso no Claude Desktop

Após configurar o servidor MCP, converse normalmente com o Claude:

```
Busque os pregões eletrônicos publicados em São Paulo entre 01/06/2024 e 30/06/2024.
```

```
Quais dispensas de licitação estão com propostas abertas até hoje no estado do RJ?
```

```
Liste os contratos publicados em janeiro de 2024 pelo órgão com CNPJ 00059311000126.
```

```
Quais atas de registro de preço estão vigentes entre janeiro e dezembro de 2024?
```

```
Me mostre os códigos de modalidade de contratação disponíveis no PNCP.
```

O Claude interpreta o pedido, chama a ferramenta adequada com os parâmetros corretos e apresenta os dados de forma legível.

---

## Desenvolvimento

Para rodar o servidor sem compilar (modo desenvolvimento):

```bash
npm run dev
```

Para recompilar após alterações:

```bash
npm run build
```

---

## API base

Todas as consultas são feitas contra a API pública do PNCP:

- **Base URL:** `https://pncp.gov.br/api/consulta`
- **Documentação oficial (Swagger):** `https://pncp.gov.br/api/consulta/swagger-ui/index.html`
- **Protocolo:** REST/JSON, sem autenticação necessária para consultas

---

## Suporte ao PNCP

Em caso de problemas com os dados retornados pela API, entre em contato com a Central de Atendimento do Ministério da Gestão e da Inovação em Serviços Públicos pelo telefone **0800 978 9001**.
