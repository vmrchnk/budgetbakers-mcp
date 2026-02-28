import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchAll, fetchOne } from "../api-client.js";
import type { Transaction } from "../types.js";

export function registerTransactionTools(server: McpServer) {
  server.tool(
    "search_transactions",
    "Search transactions with filters. accountId is required — use get_accounts first to find it.",
    {
      accountId: z.string().describe("Account ID (required). Use get_accounts to find it."),
      dateFrom: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      dateTo: z.string().optional().describe("End date (YYYY-MM-DD)"),
      categoryId: z.string().optional().describe("Filter by category ID"),
      payee: z.string().optional().describe("Filter by merchant/payee name"),
      amountMin: z.number().optional().describe("Minimum amount"),
      amountMax: z.number().optional().describe("Maximum amount"),
      labelId: z.string().optional().describe("Filter by label ID"),
      limit: z.number().optional().describe("Max records to return (default: all)"),
    },
    async ({ accountId, dateFrom, dateTo, categoryId, payee, amountMin, amountMax, labelId, limit }) => {
      const params: Record<string, string | number | undefined> = {
        accountId,
        dateFrom,
        dateTo,
        categoryId,
        labelId,
      };

      let records = await fetchAll<Transaction>("/records", params);

      if (payee) {
        const search = payee.toLowerCase();
        records = records.filter((r) =>
          r.payee?.toLowerCase().includes(search),
        );
      }
      if (amountMin !== undefined) {
        records = records.filter((r) => r.amount >= amountMin);
      }
      if (amountMax !== undefined) {
        records = records.filter((r) => r.amount <= amountMax);
      }
      if (limit) {
        records = records.slice(0, limit);
      }

      const result = records.map((r) => ({
        id: r.id,
        date: r.date,
        amount: r.amount,
        currency: r.currency,
        categoryId: r.categoryId,
        payee: r.payee,
        note: r.note,
        labelIds: r.labelIds,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { count: result.length, transactions: result },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "get_transaction",
    "Get full details of a single transaction by ID.",
    {
      id: z.string().describe("Transaction ID"),
    },
    async ({ id }) => {
      const record = await fetchOne<Transaction>("/records/by-id", { id });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(record, null, 2) }],
      };
    },
  );
}
