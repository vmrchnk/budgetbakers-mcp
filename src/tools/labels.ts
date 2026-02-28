import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchAll } from "../api-client.js";
import type { Label } from "../types.js";

export function registerLabelTools(server: McpServer) {
  server.tool(
    "get_labels",
    "Get user-defined labels/tags. Use to find labelId for filtering transactions.",
    {
      name: z.string().optional().describe("Search labels by name (case-insensitive)"),
    },
    async ({ name }) => {
      const labels = await fetchAll<Label>("/labels");

      let filtered = labels;
      if (name) {
        const search = name.toLowerCase();
        filtered = filtered.filter((l) =>
          l.name?.toLowerCase().includes(search),
        );
      }

      const result = filtered.map((l) => ({
        id: l.id,
        name: l.name,
      }));

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
