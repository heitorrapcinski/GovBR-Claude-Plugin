# PNCP Claude Plugin

Plugin que integra o **Claude** ao **Portal Nacional de Contratações Públicas (PNCP)**, permitindo consultar licitações, contratos, atas e planos de contratações diretamente na conversa — sem sair do Claude.

O plugin é composto por duas partes que funcionam em conjunto:

| Parte | O que é | Onde funciona |
|---|---|---|
| **Servidor MCP** | Conecta o Claude à API do PNCP e expõe 7 ferramentas de consulta | Claude Desktop (chat) |
| **Skill `/pncp`** | Interface em linguagem natural que usa as ferramentas do MCP | Claude Code (CLI e IDEs) |

O **MCP** é a camada de acesso aos dados — ele sabe como chamar a API do PNCP. O **skill** é a camada de interpretação — ele entende o que você quer dizer em português e decide qual ferramenta usar e com quais parâmetros.

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

- [Node.js](https://nodejs.org/) 18 ou superior
- [Claude Desktop](https://claude.ai/download) — para o servidor MCP
- [Claude Code](https://claude.ai/code) — para o skill `/pncp`

---

## Instalação

### 1. Servidor MCP no Claude Desktop

O MCP é instalado via `npx` — não é necessário clonar o repositório nem instalar nada manualmente.

Abra o arquivo de configuração do Claude Desktop:

| Sistema | Caminho |
|---|---|
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |

Se o arquivo não existir, crie-o. Adicione o bloco abaixo:

```json
{
  "mcpServers": {
    "pncp": {
      "command": "npx",
      "args": ["-y", "pncp-claude-plugin"]
    }
  }
}
```

Se você já tiver outros servidores MCP configurados, adicione apenas o bloco `"pncp": { ... }` dentro de `"mcpServers"`.

Reinicie o Claude Desktop. Um ícone de martelo (🔨) aparecerá no campo de digitação indicando que as ferramentas estão ativas.

### 2. Skill `/pncp` no Claude Code

O skill está incluído no repositório em `.claude/commands/pncp.md`. Para ativá-lo, clone o repositório e abra o Claude Code na pasta do projeto:

```bash
git clone https://github.com/heitorrapcinski/pncp-claudeplugin.git
cd pncp-claudeplugin
```

O skill `/pncp` ficará disponível automaticamente no Claude Code. Ele depende do servidor MCP estar configurado no Claude Desktop para funcionar.

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

---

## Desenvolvimento e publicação

### Rodando localmente

```bash
# Instalar dependências e compilar
npm install

# Modo desenvolvimento (sem compilar)
npm run dev

# Recompilar após alterações
npm run build
```

Para apontar o Claude Desktop ao build local em vez do npx, edite o `claude_desktop_config.json`:

**macOS / Linux:**
```json
{
  "mcpServers": {
    "pncp": {
      "command": "node",
      "args": ["/caminho/para/pncp-claudeplugin/build/index.js"]
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
      "args": ["C:\\caminho\\para\\pncp-claudeplugin\\build\\index.js"]
    }
  }
}
```

### Publicando no npm

Quando o plugin estiver testado e validado:

```bash
npm publish
```

O campo `files` no `package.json` garante que apenas o diretório `build/` seja enviado ao npm — código-fonte, arquivos de configuração e dependências de desenvolvimento ficam de fora.

---

## API base

- **Base URL:** `https://pncp.gov.br/api/consulta`
- **Documentação oficial (Swagger):** `https://pncp.gov.br/api/consulta/swagger-ui/index.html`
- **Protocolo:** REST/JSON, sem autenticação necessária para consultas

---

## Suporte ao PNCP

Em caso de problemas com os dados retornados pela API, entre em contato com a Central de Atendimento do Ministério da Gestão e da Inovação em Serviços Públicos pelo telefone **0800 978 9001**.
