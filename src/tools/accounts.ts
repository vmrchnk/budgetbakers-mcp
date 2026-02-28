import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchAll } from "../api-client.js";
import type { Account } from "../types.js";

export function registerAccountTools(server: McpServer) {
  server.tool(
    "get_accounts",
    "Get all financial accounts with balances. Use this first to get accountId for other tools.",
    {
      currency: z
        .string()
        .optional()
        .describe("Filter by currency code (e.g. UAH, USD, EUR)"),
      accountType: z
        .string()
        .optional()
        .describe("Filter by account type (e.g. cash, bank, credit)"),
    },
    async ({ currency, accountType }) => {
      const accounts = await fetchAll<Account>("/accounts");

      let filtered = accounts;
      if (currency) {
        filtered = filtered.filter(
          (a) => a.currency?.toUpperCase() === currency.toUpperCase(),
        );
      }
      if (accountType) {
        filtered = filtered.filter(
          (a) => a.type?.toLowerCase() === accountType.toLowerCase(),
        );
      }

      const result = filtered.map((a) => ({
        id: a.id,
        name: a.name,
        balance: a.balance,
        currency: a.currency,
        type: a.type,
      }));

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
