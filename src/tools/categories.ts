import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchAll } from "../api-client.js";
import type { Category } from "../types.js";

export function registerCategoryTools(server: McpServer) {
  server.tool(
    "get_categories",
    "Get income/expense categories. Use to find categoryId for filtering transactions.",
    {
      name: z.string().optional().describe("Search categories by name (case-insensitive)"),
    },
    async ({ name }) => {
      const categories = await fetchAll<Category>("/categories");

      let filtered = categories;
      if (name) {
        const search = name.toLowerCase();
        filtered = filtered.filter((c) =>
          c.name?.toLowerCase().includes(search),
        );
      }

      const result = filtered.map((c) => ({
        id: c.id,
        name: c.name,
        parentId: c.parentId,
        type: c.type,
      }));

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
