#!/usr/bin/env node
import { startApiServer } from "../../core/server.js";
import { comprasDefinition } from "./definition.js";

startApiServer(comprasDefinition).catch((error) => {
  process.stderr.write(`Erro fatal ao iniciar o servidor Compras.gov.br: ${error}\n`);
  process.exit(1);
});
