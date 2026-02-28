import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchAll } from "../api-client.js";
import type { Transaction, Category } from "../types.js";

async function fetchTransactions(
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<Transaction[]> {
  return fetchAll<Transaction>("/records", { accountId, dateFrom, dateTo });
}

export function registerAnalyticsTools(server: McpServer) {
  server.tool(
    "spending_by_category",
    "Aggregate spending by category for a date range. Shows where money goes.",
    {
      accountId: z.string().describe("Account ID (required)"),
      dateFrom: z.string().describe("Start date (YYYY-MM-DD)"),
      dateTo: z.string().describe("End date (YYYY-MM-DD)"),
    },
    async ({ accountId, dateFrom, dateTo }) => {
      const [records, categories] = await Promise.all([
        fetchTransactions(accountId, dateFrom, dateTo),
        fetchAll<Category>("/categories"),
      ]);

      const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

      const grouped = new Map<
        string,
        { totalAmount: number; count: number; currency: string }
      >();

      for (const r of records) {
        if (r.amount >= 0) continue; // skip income
        const catId = r.categoryId || "uncategorized";
        const existing = grouped.get(catId) || {
          totalAmount: 0,
          count: 0,
          currency: r.currency,
        };
        existing.totalAmount += Math.abs(r.amount);
        existing.count++;
        grouped.set(catId, existing);
      }

      const result = Array.from(grouped.entries())
        .map(([catId, data]) => ({
          categoryName: categoryMap.get(catId) || catId,
          totalAmount: Math.round(data.totalAmount * 100) / 100,
          count: data.count,
          currency: data.currency,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "cashflow_summary",
    "Calculate income, expenses, and net cashflow for a date range.",
    {
      accountId: z.string().describe("Account ID (required)"),
      dateFrom: z.string().describe("Start date (YYYY-MM-DD)"),
      dateTo: z.string().describe("End date (YYYY-MM-DD)"),
    },
    async ({ accountId, dateFrom, dateTo }) => {
      const records = await fetchTransactions(accountId, dateFrom, dateTo);

      let income = 0;
      let expenses = 0;
      let currency = "";

      for (const r of records) {
        if (!currency) currency = r.currency;
        if (r.amount > 0) {
          income += r.amount;
        } else {
          expenses += Math.abs(r.amount);
        }
      }

      const result = {
        income: Math.round(income * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        netCashflow: Math.round((income - expenses) * 100) / 100,
        currency,
        transactionCount: records.length,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "top_merchants",
    "Find merchants/payees with the highest spending in a date range.",
    {
      accountId: z.string().describe("Account ID (required)"),
      dateFrom: z.string().describe("Start date (YYYY-MM-DD)"),
      dateTo: z.string().describe("End date (YYYY-MM-DD)"),
      limit: z.number().optional().describe("Number of top merchants to return (default: 10)"),
    },
    async ({ accountId, dateFrom, dateTo, limit }) => {
      const records = await fetchTransactions(accountId, dateFrom, dateTo);
      const topN = limit || 10;

      const grouped = new Map<string, { totalAmount: number; count: number }>();

      for (const r of records) {
        if (r.amount >= 0) continue; // skip income
        const payee = r.payee || "Unknown";
        const existing = grouped.get(payee) || { totalAmount: 0, count: 0 };
        existing.totalAmount += Math.abs(r.amount);
        existing.count++;
        grouped.set(payee, existing);
      }

      const result = Array.from(grouped.entries())
        .map(([payee, data]) => ({
          payee,
          totalAmount: Math.round(data.totalAmount * 100) / 100,
          count: data.count,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, topN);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
