#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAccountTools } from "./tools/accounts.js";
import { registerCategoryTools } from "./tools/categories.js";
import { registerLabelTools } from "./tools/labels.js";
import { registerTransactionTools } from "./tools/transactions.js";
import { registerAnalyticsTools } from "./tools/analytics.js";

const server = new McpServer({
  name: "budgetbakers",
  version: "1.0.0",
});

registerAccountTools(server);
registerCategoryTools(server);
registerLabelTools(server);
registerTransactionTools(server);
registerAnalyticsTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("BudgetBakers MCP server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
