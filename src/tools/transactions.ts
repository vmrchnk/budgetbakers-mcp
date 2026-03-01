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
      dateFrom: z.string().optional().describe("Start date (YYYY-MM-DD). Converted to recordDate=gte filter."),
      dateTo: z.string().optional().describe("End date (YYYY-MM-DD). Converted to recordDate=lt filter."),
      categoryId: z.string().optional().describe("Filter by category ID"),
      payee: z.string().optional().describe("Filter by merchant/payee name (client-side search)"),
      amountMin: z.number().optional().describe("Minimum amount (absolute value)"),
      amountMax: z.number().optional().describe("Maximum amount (absolute value)"),
      limit: z.number().optional().describe("Max records to return (default: all)"),
    },
    async ({ accountId, dateFrom, dateTo, categoryId, payee, amountMin, amountMax, limit }) => {
      const params: Record<string, string | number | undefined> = {
        accountId,
        categoryId,
      };

      // API uses recordDate=gte.DATE and recordDate=lt.DATE format
      // But since we can only set one value per key, we build the filter string
      if (dateFrom) {
        params.recordDate = `gte.${dateFrom}T00:00:00Z`;
      }
      if (dateTo) {
        // If both dateFrom and dateTo, we need both filters
        // The API supports multiple recordDate params, but our simple params object doesn't
        // So we'll pass dateFrom via recordDate and filter dateTo client-side if needed
        if (!dateFrom) {
          params.recordDate = `lt.${dateTo}T23:59:59Z`;
        }
      }

      let records = await fetchAll<Transaction>("/records", params);

      // Client-side filtering for dateTo when dateFrom is also set
      if (dateFrom && dateTo) {
        const to = new Date(dateTo + "T23:59:59Z");
        records = records.filter((r) => new Date(r.recordDate) <= to);
      }

      if (payee) {
        const search = payee.toLowerCase();
        records = records.filter((r) =>
          r.payee?.toLowerCase().includes(search) ||
          r.note?.toLowerCase().includes(search),
        );
      }
      if (amountMin !== undefined) {
        records = records.filter((r) => Math.abs(r.amount.value) >= amountMin);
      }
      if (amountMax !== undefined) {
        records = records.filter((r) => Math.abs(r.amount.value) <= amountMax);
      }
      if (limit) {
        records = records.slice(0, limit);
      }

      const result = records.map((r) => ({
        id: r.id,
        recordDate: r.recordDate,
        amount: r.amount,
        category: r.category,
        recordType: r.recordType,
        payee: r.payee,
        note: r.note,
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
