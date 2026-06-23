#!/usr/bin/env node

/**
 * @theyahia/alfa-bank-mcp — MCP server for Alfa-Bank Business (Alfa API).
 *
 * 8 tools: list_accounts, get_account_balance, get_account_statement,
 * create_payment_order, get_payment_status, list_counterparties,
 * get_exchange_rates, get_salary_registry.
 *
 * ⚠️ See README "Disclaimer & endpoint verification status": endpoint paths are
 * aligned to public docs but not all verified 1:1, and production access needs
 * mTLS + GOST request signing. The server does not reach the live contour
 * without real certificates and a bank contract.
 *
 * Security:
 *   - stdout reserved for JSON-RPC — all logs go to stderr (never console.log)
 *   - credentials never logged or placed in error responses
 *   - input validation via Zod on every tool call
 *   - hard timeout + bounded retries on all API requests
 */

import { createServer } from "node:http";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { AlfaBankClient } from "./client.js";
import { configureMtlsFromEnv } from "./auth/mtls.js";
import { registerAccountTools } from "./tools/accounts.js";
import { registerPaymentTools } from "./tools/payments.js";
import { registerReferenceTools } from "./tools/references.js";

// Single source of truth for the version (resolved at runtime from package.json).
const requireFromHere = createRequire(import.meta.url);
const { version } = requireFromHere("../package.json") as { version: string };

const TOOL_COUNT = 8;

const INSTRUCTIONS =
  "Tools for Alfa-Bank Business (Alfa API): accounts, balances, statements, payments, " +
  "counterparties, exchange rates and payroll registries. All tools are read-only EXCEPT " +
  "create_payment_order, which moves real money and is annotated as destructive — confirm with " +
  "the user before calling it. Auth is OAuth2/OIDC (client credentials); production also requires " +
  "mTLS and a PKCS#7 GOST signature on payments, so payment submission errors out until a real " +
  "signer is injected. Endpoint paths follow the public Alfa API docs; some are unverified (see README).";

/** Builds the Alfa API client from environment configuration. */
function buildClient(): AlfaBankClient {
  return new AlfaBankClient({
    clientId: process.env.ALFA_CLIENT_ID ?? "",
    clientSecret: process.env.ALFA_CLIENT_SECRET ?? "",
    baseUrl: process.env.ALFA_BASE_URL || "https://baas.alfabank.ru",
    scope: process.env.ALFA_SCOPE,
    timeoutMs: process.env.ALFA_TIMEOUT_MS ? Number(process.env.ALFA_TIMEOUT_MS) : undefined,
  });
}

/** Creates a fully configured MCP server (no transport attached). */
export function createMcpServer(): McpServer {
  const client = buildClient();
  const server = new McpServer({ name: "alfa-bank-mcp", version }, { instructions: INSTRUCTIONS });

  registerAccountTools(server, client); // list_accounts, get_account_balance, get_account_statement
  registerPaymentTools(server, client); // create_payment_order, get_payment_status
  registerReferenceTools(server, client); // list_counterparties, get_exchange_rates, get_salary_registry

  return server;
}

async function startHttpServer(server: McpServer, port: number): Promise<void> {
  const httpServer = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Session-Id");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", server: "alfa-bank-mcp", tools: TOOL_COUNT }));
      return;
    }

    if (req.url === "/mcp") {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
      await server.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  });

  httpServer.listen(port, () => {
    console.error(`[alfa-bank-mcp] HTTP server on port ${port}`);
    console.error(`[alfa-bank-mcp] MCP: http://localhost:${port}/mcp`);
    console.error(`[alfa-bank-mcp] Health: http://localhost:${port}/health`);
  });
}

function installShutdownHandlers(server: McpServer): void {
  const shutdown = async (signal: string) => {
    console.error(`[alfa-bank-mcp] ${signal} received — shutting down.`);
    try {
      await server.close();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

async function main(): Promise<void> {
  // Environment validation — fail fast with a clear message.
  if (!process.env.ALFA_CLIENT_ID || !process.env.ALFA_CLIENT_SECRET) {
    console.error(
      "[alfa-bank-mcp] FATAL: ALFA_CLIENT_ID and ALFA_CLIENT_SECRET are required.\n" +
        "  Get OAuth credentials at https://developers.alfabank.ru/\n" +
        "  Then add them to your MCP client env configuration.",
    );
    process.exit(1);
  }

  const mtls = configureMtlsFromEnv();
  console.error(
    mtls
      ? "[alfa-bank-mcp] mTLS configured from ALFA_TLS_* env."
      : "[alfa-bank-mcp] Running without mTLS (demo mode — cannot reach the live Alfa API).",
  );

  const server = createMcpServer();
  installShutdownHandlers(server);

  const httpPort = process.argv.includes("--http")
    ? Number(process.env.HTTP_PORT ?? "3000")
    : process.env.HTTP_PORT
      ? Number(process.env.HTTP_PORT)
      : null;

  if (httpPort) {
    await startHttpServer(server, httpPort);
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`[alfa-bank-mcp] Server v${version} started (stdio) — ${TOOL_COUNT} tools ready.`);
  }
}

/** True when this file is the process entry point (not imported by tests). */
function isMainModule(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  main().catch((err) => {
    console.error("[alfa-bank-mcp] Fatal error:", err);
    process.exit(1);
  });
}
