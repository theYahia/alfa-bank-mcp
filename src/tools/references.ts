import { z } from "zod";
import type { AlfaBankClient } from "../client.js";

export const listCounterpartiesTool = {
  name: "list_counterparties",
  description:
    "List all saved counterparties (business partners) in Alfa-Bank. Returns names, INN, KPP, BIK, and account numbers.",
  inputSchema: z.object({}),
  handler: async (client: AlfaBankClient) => {
    const counterparties = await client.listCounterparties();
    return { content: [{ type: "text" as const, text: JSON.stringify(counterparties, null, 2) }] };
  },
};

export const getExchangeRatesTool = {
  name: "get_exchange_rates",
  description:
    "Get current currency exchange rates from Alfa-Bank, including buy/sell rates and Central Bank rate.",
  inputSchema: z.object({}),
  handler: async (client: AlfaBankClient) => {
    const rates = await client.getExchangeRates();
    return { content: [{ type: "text" as const, text: JSON.stringify(rates, null, 2) }] };
  },
};

export const getSalaryRegistryTool = {
  name: "get_salary_registry",
  description:
    "Get payroll (salary) registries from Alfa-Bank. Returns registry status, total amount, and employee count.",
  inputSchema: z.object({}),
  handler: async (client: AlfaBankClient) => {
    const registry = await client.getSalaryRegistry();
    return { content: [{ type: "text" as const, text: JSON.stringify(registry, null, 2) }] };
  },
};
