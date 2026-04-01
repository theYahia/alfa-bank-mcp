#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AlfaBankClient } from "./client.js";
import {
  listAccountsTool,
  getAccountBalanceTool,
  getAccountStatementTool,
} from "./tools/accounts.js";
import {
  createPaymentOrderTool,
  getPaymentStatusTool,
} from "./tools/payments.js";
import {
  listCounterpartiesTool,
  getExchangeRatesTool,
  getSalaryRegistryTool,
} from "./tools/references.js";

const clientId = process.env.ALFA_CLIENT_ID;
const clientSecret = process.env.ALFA_CLIENT_SECRET;
const baseUrl =
  process.env.ALFA_BASE_URL || "https://partner.business.alfabank.ru";

if (!clientId || !clientSecret) {
  console.error(
    "Missing ALFA_CLIENT_ID or ALFA_CLIENT_SECRET environment variables"
  );
  process.exit(1);
}

const client = new AlfaBankClient({ clientId, clientSecret, baseUrl });

const server = new McpServer({
  name: "alfa-bank-mcp",
  version: "1.0.0",
});

// Register all tools
server.tool(
  listAccountsTool.name,
  listAccountsTool.description,
  listAccountsTool.inputSchema.shape,
  async () => listAccountsTool.handler(client)
);

server.tool(
  getAccountBalanceTool.name,
  getAccountBalanceTool.description,
  getAccountBalanceTool.inputSchema.shape,
  async (args) => getAccountBalanceTool.handler(client, args)
);

server.tool(
  getAccountStatementTool.name,
  getAccountStatementTool.description,
  getAccountStatementTool.inputSchema.shape,
  async (args) => getAccountStatementTool.handler(client, args)
);

server.tool(
  createPaymentOrderTool.name,
  createPaymentOrderTool.description,
  createPaymentOrderTool.inputSchema.shape,
  async (args) => createPaymentOrderTool.handler(client, args)
);

server.tool(
  getPaymentStatusTool.name,
  getPaymentStatusTool.description,
  getPaymentStatusTool.inputSchema.shape,
  async (args) => getPaymentStatusTool.handler(client, args)
);

server.tool(
  listCounterpartiesTool.name,
  listCounterpartiesTool.description,
  listCounterpartiesTool.inputSchema.shape,
  async () => listCounterpartiesTool.handler(client)
);

server.tool(
  getExchangeRatesTool.name,
  getExchangeRatesTool.description,
  getExchangeRatesTool.inputSchema.shape,
  async () => getExchangeRatesTool.handler(client)
);

server.tool(
  getSalaryRegistryTool.name,
  getSalaryRegistryTool.description,
  getSalaryRegistryTool.inputSchema.shape,
  async () => getSalaryRegistryTool.handler(client)
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Alfa-Bank MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
