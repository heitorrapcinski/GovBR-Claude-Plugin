import { createRequire } from "module";

// __PKG_VERSION__ é injetado pelo esbuild em tempo de build (ver build.mjs).
// Em dev (tsx, sem o define) ele não existe, então lemos o package.json em runtime.
declare const __PKG_VERSION__: string | undefined;

export function resolveVersion(): string {
  if (typeof __PKG_VERSION__ === "string") return __PKG_VERSION__;
  try {
    const require = createRequire(import.meta.url);
    return (require("../../package.json") as { version: string }).version;
  } catch {
    return "0.0.0";
  }
}
