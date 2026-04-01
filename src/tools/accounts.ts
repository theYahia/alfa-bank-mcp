import { z } from "zod";
import type { AlfaBankClient } from "../client.js";

export const listAccountsTool = {
  name: "list_accounts",
  description:
    "List all business accounts in Alfa-Bank. Returns account numbers, currencies, types, and statuses.",
  inputSchema: z.object({}),
  handler: async (client: AlfaBankClient) => {
    const accounts = await client.listAccounts();
    return { content: [{ type: "text" as const, text: JSON.stringify(accounts, null, 2) }] };
  },
};

export const getAccountBalanceTool = {
  name: "get_account_balance",
  description:
    "Get the current balance of a specific Alfa-Bank business account by its ID.",
  inputSchema: z.object({
    account_id: z.string().describe("The unique account identifier"),
  }),
  handler: async (client: AlfaBankClient, args: { account_id: string }) => {
    const balance = await client.getAccountBalance(args.account_id);
    return { content: [{ type: "text" as const, text: JSON.stringify(balance, null, 2) }] };
  },
};

export const getAccountStatementTool = {
  name: "get_account_statement",
  description:
    "Get account statement (transactions) for a date range. Returns credits, debits, opening/closing balance.",
  inputSchema: z.object({
    account_id: z.string().describe("The unique account identifier"),
    date_from: z.string().describe("Start date in YYYY-MM-DD format"),
    date_to: z.string().describe("End date in YYYY-MM-DD format"),
  }),
  handler: async (
    client: AlfaBankClient,
    args: { account_id: string; date_from: string; date_to: string }
  ) => {
    const statement = await client.getAccountStatement(
      args.account_id,
      args.date_from,
      args.date_to
    );
    return { content: [{ type: "text" as const, text: JSON.stringify(statement, null, 2) }] };
  },
};
