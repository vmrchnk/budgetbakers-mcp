import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchAll } from "../api-client.js";
import type { Transaction } from "../types.js";

async function fetchTransactions(
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<Transaction[]> {
  // Fetch with dateFrom, then filter dateTo client-side
  const records = await fetchAll<Transaction>("/records", {
    accountId,
    recordDate: `gte.${dateFrom}T00:00:00Z`,
  });

  const to = new Date(dateTo + "T23:59:59Z");
  return records.filter((r) => new Date(r.recordDate) <= to);
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
      const records = await fetchTransactions(accountId, dateFrom, dateTo);

      const grouped = new Map<
        string,
        { categoryName: string; totalAmount: number; count: number; currency: string }
      >();

      for (const r of records) {
        if (r.recordType !== "expense") continue;
        const catId = r.category?.id || "uncategorized";
        const catName = r.category?.name || "Uncategorized";
        const existing = grouped.get(catId) || {
          categoryName: catName,
          totalAmount: 0,
          count: 0,
          currency: r.amount.currencyCode,
        };
        existing.totalAmount += Math.abs(r.amount.value);
        existing.count++;
        grouped.set(catId, existing);
      }

      const result = Array.from(grouped.values())
        .map((d) => ({
          ...d,
          totalAmount: Math.round(d.totalAmount * 100) / 100,
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
        if (!currency) currency = r.amount.currencyCode;
        if (r.recordType === "income" || r.amount.value > 0) {
          income += Math.abs(r.amount.value);
        } else {
          expenses += Math.abs(r.amount.value);
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
        if (r.recordType !== "expense") continue;
        const payee = r.payee || r.note || "Unknown";
        const existing = grouped.get(payee) || { totalAmount: 0, count: 0 };
        existing.totalAmount += Math.abs(r.amount.value);
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
