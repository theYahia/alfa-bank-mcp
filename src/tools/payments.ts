import { z } from "zod";
import type { AlfaBankClient } from "../client.js";

export const createPaymentOrderTool = {
  name: "create_payment_order",
  description:
    "Create a new payment order in Alfa-Bank. Transfers funds from one account to another using BIK and account number.",
  inputSchema: z.object({
    from_account: z.string().describe("Source account number"),
    to_account: z.string().describe("Destination account number"),
    to_bik: z.string().describe("Destination bank BIK (9 digits)"),
    amount: z.number().positive().describe("Amount in minor units (kopeks)"),
    purpose: z.string().describe("Payment purpose description"),
  }),
  handler: async (
    client: AlfaBankClient,
    args: {
      from_account: string;
      to_account: string;
      to_bik: string;
      amount: number;
      purpose: string;
    }
  ) => {
    const order = await client.createPaymentOrder({
      fromAccount: args.from_account,
      toAccount: args.to_account,
      toBik: args.to_bik,
      amount: args.amount,
      purpose: args.purpose,
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(order, null, 2) }] };
  },
};

export const getPaymentStatusTool = {
  name: "get_payment_status",
  description:
    "Check the status of a previously created payment order by its ID.",
  inputSchema: z.object({
    payment_id: z.string().describe("The payment order ID"),
  }),
  handler: async (client: AlfaBankClient, args: { payment_id: string }) => {
    const status = await client.getPaymentStatus(args.payment_id);
    return { content: [{ type: "text" as const, text: JSON.stringify(status, null, 2) }] };
  },
};
