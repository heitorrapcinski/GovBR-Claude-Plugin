#!/usr/bin/env node
import { startApiServer } from "../../core/server.js";
import { pncpDefinition } from "./definition.js";

startApiServer(pncpDefinition).catch((error) => {
  process.stderr.write(`Erro fatal ao iniciar o servidor PNCP: ${error}\n`);
  process.exit(1);
});
