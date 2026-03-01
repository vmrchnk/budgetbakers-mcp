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
        .describe("Filter by account type (e.g. General, CreditCard, CurrentAccount)"),
      includeArchived: z
        .boolean()
        .optional()
        .describe("Include archived accounts (default: false)"),
    },
    async ({ currency, accountType, includeArchived }) => {
      const accounts = await fetchAll<Account>("/accounts");

      let filtered = accounts;
      if (!includeArchived) {
        filtered = filtered.filter((a) => !a.archived);
      }
      if (currency) {
        filtered = filtered.filter(
          (a) =>
            a.initialBalance?.currencyCode?.toUpperCase() ===
            currency.toUpperCase(),
        );
      }
      if (accountType) {
        filtered = filtered.filter(
          (a) => a.accountType?.toLowerCase() === accountType.toLowerCase(),
        );
      }

      const result = filtered.map((a) => ({
        id: a.id,
        name: a.name,
        archived: a.archived,
        accountType: a.accountType,
        initialBalance: a.initialBalance,
        recordCount: a.recordStats?.recordCount,
      }));

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
