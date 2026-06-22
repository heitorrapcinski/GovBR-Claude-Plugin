import axios, { AxiosError, type AxiosInstance } from "axios";
import type { ApiDefinition } from "./types.js";

/**
 * Erro de chamada à API enriquecido com metadados para observabilidade.
 * `status` é o HTTP status (quando houve resposta); `kind` classifica a falha
 * (timeout, network, http_5xx, http_4xx, unknown) para agregação nos logs.
 */
export class ApiCallError extends Error {
  constructor(
    message: string,
    readonly kind: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "ApiCallError";
  }
}

/**
 * Cria um cliente HTTP para uma API, com timeout configurável por variável de
 * ambiente e tratamento de erros uniforme. As mensagens são adaptadas ao rótulo
 * da API (`apiLabel`) e, para APIs lentas (`slowApi`), sugerem reduzir o período.
 */
export function createApiHttpClient(def: ApiDefinition, version: string) {
  const envOverride = def.timeoutEnvVar ? Number(process.env[def.timeoutEnvVar]) : NaN;
  const timeoutMs = Number.isFinite(envOverride) && envOverride > 0 ? envOverride : def.timeoutMs;

  const client: AxiosInstance = axios.create({
    baseURL: def.baseUrl,
    headers: {
      accept: "*/*",
      "User-Agent": `GovBR-Claude-Plugin/${version}`,
    },
    timeout: timeoutMs,
  });

  async function get(endpoint: string, params: Record<string, unknown>): Promise<unknown> {
    const cleanParams: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        cleanParams[key] = value;
      }
    }

    try {
      const response = await client.get(endpoint, { params: cleanParams });
      if (response.status === 204) {
        return {
          mensagem: "Nenhum registro encontrado para os parâmetros informados.",
          totalRegistros: 0,
          resultado: [],
        };
      }
      return response.data;
    } catch (error) {
      throw normalizeError(error, def, timeoutMs);
    }
  }

  return { get, timeoutMs };
}

function normalizeError(error: unknown, def: ApiDefinition, timeoutMs: number): Error {
  if (!(error instanceof AxiosError)) {
    if (error instanceof Error) return new ApiCallError(error.message, "unknown");
    return new ApiCallError(String(error), "unknown");
  }

  const label = def.apiLabel;
  const segundos = Math.round(timeoutMs / 1000);
  const dicaPeriodo = def.slowApi
    ? " Tente novamente, ou reduza o intervalo de datas (ex.: uma semana ou um dia) e use um tamanhoPagina menor."
    : " Tente novamente em alguns instantes.";

  // Sem resposta = timeout ou falha de rede (não há status HTTP).
  if (!error.response) {
    if (error.code === "ECONNABORTED" || /timeout/i.test(error.message)) {
      return new ApiCallError(
        `A API do ${label} não respondeu dentro de ${segundos}s.` +
          (def.slowApi ? " O portal está lento/instável no momento." : "") +
          dicaPeriodo,
        "timeout"
      );
    }
    return new ApiCallError(
      `Falha de conexão com a API do ${label} (${error.code ?? "rede"}): ${error.message}. ` +
        `Verifique sua conexão e tente novamente.`,
      "network"
    );
  }

  const status = error.response.status;
  const data = error.response.data;
  const msg = typeof data === "string" ? data : JSON.stringify(data);

  // 5xx = instabilidade do servidor, não erro de parâmetros.
  if (status >= 500) {
    return new ApiCallError(
      `A API do ${label} retornou erro de servidor (HTTP ${status}) — instabilidade temporária do portal.` +
        dicaPeriodo,
      "http_5xx",
      status
    );
  }
  return new ApiCallError(`Erro ${label} HTTP ${status}: ${msg || error.message}`, "http_4xx", status);
}
