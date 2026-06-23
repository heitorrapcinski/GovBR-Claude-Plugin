// Observabilidade dos servidores MCP. Em stdio o `stdout` é o canal do protocolo
// JSON-RPC: escrever lá corromperia a comunicação. Por isso os logs vão SEMPRE
// para `stderr` (capturado pelo Claude Code) e, opcionalmente, para um arquivo.
//
// Nada aqui pode lançar exceção: logging é best-effort e jamais deve derrubar o
// servidor. Toda E/S fica protegida por try/catch silencioso.
//
// Configuração em duas camadas, com esta precedência (maior primeiro):
//   1. Arquivo de runtime  ~/.govbr-claude-plugin/config.json
//   2. Variáveis de ambiente (no bundle MCPB vêm do `mcp_config.env`; em dev/stdio,
//      do sistema ou do .mcp.json)
//   3. Padrão embutido
//
// O arquivo existe para mudar o nível SEM reempacotar/reimportar o plugin: basta
// editá-lo e reiniciar o servidor (o host relança o processo). Campos aceitos:
//   { "logLevel": "silent|error|info|debug", "logFormat": "json|text", "logDir": "..." }
//
// Variáveis de ambiente equivalentes (padrões entre parênteses):
//   GOVBR_LOG_LEVEL   silent | error | info | debug   (padrão: error)
//   GOVBR_LOG_DIR     pasta dos arquivos de log        (padrão: dir de dados do usuário)
//   GOVBR_LOG_FORMAT  json | text                      (padrão: json)
import { appendFileSync, mkdirSync, readFileSync, renameSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

export type LogLevel = "silent" | "error" | "info" | "debug";

const LEVEL_RANK: Record<LogLevel, number> = { silent: 0, error: 1, info: 2, debug: 3 };

/** Rotaciona o arquivo quando passa deste tamanho (mantém só um `.1` anterior). */
const MAX_LOG_BYTES = 5 * 1024 * 1024;

/** Tamanho máximo de um valor de string nos params logados (evita despejos enormes). */
const MAX_VALUE_LEN = 120;

function parseLevel(raw: string | undefined): LogLevel {
  const v = (raw ?? "").trim().toLowerCase();
  return v in LEVEL_RANK ? (v as LogLevel) : "error";
}

/** Config opcional de runtime; campos ausentes caem para env/padrão. */
interface FileConfig {
  logLevel?: string;
  logFormat?: string;
  logDir?: string;
}

/**
 * Lê `~/.govbr-claude-plugin/config.json` para permitir trocar nível/formato/pasta
 * sem reempacotar o plugin. Caminho fixo em `homedir()` (independe de `logDir`).
 * Best-effort: arquivo ausente ou JSON inválido → `{}`, nunca lança.
 */
function readFileConfig(): FileConfig {
  try {
    const path = join(homedir(), ".govbr-claude-plugin", "config.json");
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (parsed && typeof parsed === "object") return parsed as FileConfig;
  } catch {
    // Sem arquivo ou conteúdo inválido: segue com env/padrão.
  }
  return {};
}

/**
 * Diretório padrão de logs: `~/.govbr-claude-plugin/logs` em qualquer SO, onde
 * `~` = `os.homedir()` (C:\Users\… no Windows, /home/… no Linux, /Users/… no
 * macOS). Fica fora do diretório de instalação do plugin, que é sobrescrito a
 * cada update. Sobrescreva com a env GOVBR_LOG_DIR.
 */
function defaultLogDir(): string {
  return join(homedir(), ".govbr-claude-plugin", "logs");
}

/**
 * Sanitiza os parâmetros antes de logar: trunca strings longas e mascara o miolo
 * de sequências que parecem CPF (11 dígitos) ou CNPJ (14 dígitos), para não
 * gravar identificadores completos em disco.
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    if (/^\d{11}$/.test(value)) return `${value.slice(0, 3)}******${value.slice(-2)}`;
    if (/^\d{14}$/.test(value)) return `${value.slice(0, 5)}******${value.slice(-2)}`;
    return value.length > MAX_VALUE_LEN ? `${value.slice(0, MAX_VALUE_LEN)}…` : value;
  }
  return value;
}

function sanitizeParams(params: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params ?? {})) out[k] = sanitizeValue(v);
  return out;
}

export interface LogRecord {
  /** Nível do evento; o registro só é emitido se o nível configurado o permitir. */
  level: Exclude<LogLevel, "silent">;
  /** Tipo do evento: "call" (chamada de ferramenta), "boot", "fatal", etc. */
  event: string;
  [key: string]: unknown;
}

export interface Logger {
  /** Emite um registro estruturado (best-effort; nunca lança). */
  log(record: LogRecord): void;
  /** Atalho para registrar uma chamada de ferramenta já com params sanitizados. */
  call(args: {
    tool: string;
    ok: boolean;
    durationMs: number;
    status?: number;
    errKind?: string;
    error?: string;
    params?: Record<string, unknown>;
  }): void;
  /** Helpers de eventos pontuais. */
  boot(message: string): void;
  fatal(message: string): void;
  readonly level: LogLevel;
  readonly file: string | null;
}

/**
 * Cria um logger para um servidor. Resolve nível, formato e arquivo de destino a
 * partir do ambiente. O arquivo é opcional: se a pasta não puder ser criada, o
 * logger segue só com `stderr`, sem nunca falhar.
 */
export function createLogger(serverName: string): Logger {
  // Precedência: arquivo de runtime > variável de ambiente > padrão.
  const cfg = readFileConfig();
  const level = parseLevel(cfg.logLevel ?? process.env.GOVBR_LOG_LEVEL);
  const format =
    (cfg.logFormat ?? process.env.GOVBR_LOG_FORMAT ?? "json").trim().toLowerCase() === "text" ? "text" : "json";
  const threshold = LEVEL_RANK[level];

  let file: string | null = null;
  if (level !== "silent") {
    const dir = (cfg.logDir || process.env.GOVBR_LOG_DIR || "").trim() || defaultLogDir();
    try {
      mkdirSync(dir, { recursive: true });
      file = join(dir, `${serverName}.log`);
    } catch {
      // Sem arquivo: cai para fallback em tmp; se falhar também, só stderr.
      try {
        const fallback = join(tmpdir(), "govbr-claude-plugin");
        mkdirSync(fallback, { recursive: true });
        file = join(fallback, `${serverName}.log`);
      } catch {
        file = null;
      }
    }
  }

  function rotate(): void {
    if (!file) return;
    try {
      if (statSync(file).size > MAX_LOG_BYTES) renameSync(file, `${file}.1`);
    } catch {
      // Arquivo ainda não existe ou rename falhou: ignora.
    }
  }

  function render(record: LogRecord): string {
    const base = { ts: new Date().toISOString(), server: serverName, ...record };
    if (format === "text") {
      const { ts, server, level: lvl, event, ...rest } = base as Record<string, unknown>;
      const tail = Object.entries(rest)
        .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join(" ");
      return `${ts} [${server}] ${String(lvl).toUpperCase()} ${event} ${tail}`.trimEnd();
    }
    return JSON.stringify(base);
  }

  function log(record: LogRecord): void {
    if (LEVEL_RANK[record.level] > threshold) return;
    let line: string;
    try {
      line = render(record);
    } catch {
      return; // Registro não serializável: descarta em silêncio.
    }
    // stderr sempre (canal seguro em stdio).
    try {
      process.stderr.write(line + "\n");
    } catch {
      /* ignore */
    }
    // Arquivo, quando disponível.
    if (file) {
      rotate();
      try {
        appendFileSync(file, line + "\n");
      } catch {
        /* ignore */
      }
    }
  }

  return {
    level,
    file,
    log,
    call({ tool, ok, durationMs, status, errKind, error, params }) {
      // Falhas em "error"; sucessos em "info"; params só em "debug".
      const lvl: Exclude<LogLevel, "silent"> = ok ? "info" : "error";
      const record: LogRecord = { level: lvl, event: "call", tool, ok, durationMs };
      if (status !== undefined) record.status = status;
      if (errKind) record.errKind = errKind;
      if (error) record.error = error;
      if (threshold >= LEVEL_RANK.debug && params) record.params = sanitizeParams(params);
      log(record);
    },
    boot(message) {
      // O boot sempre sinaliza no stderr (confirmação de vida, independe do nível);
      // ao arquivo só quando o nível configurado permitir.
      try {
        process.stderr.write(render({ level: "info", event: "boot", message }) + "\n");
      } catch {
        /* ignore */
      }
      if (file && threshold >= LEVEL_RANK.info) {
        rotate();
        try {
          appendFileSync(file, render({ level: "info", event: "boot", message }) + "\n");
        } catch {
          /* ignore */
        }
      }
    },
    fatal(message) {
      log({ level: "error", event: "fatal", message });
    },
  };
}
