# BudgetBakers MCP Server

MCP server for integrating Claude with the [BudgetBakers Wallet](https://www.budgetbakers.com/) API. Gives Claude access to financial data: accounts, transactions, categories, and spending analytics.

## Setup

```bash
npm install
npm run build
```

## Configuration

Add to `~/.claude/settings.json` (or Claude Desktop config):

```json
{
  "mcpServers": {
    "budgetbakers": {
      "command": "node",
      "args": ["<path-to-project>/build/index.js"],
      "env": {
        "BUDGETBAKERS_API_TOKEN": "<your-token>"
      }
    }
  }
}
```

You can get the API token from BudgetBakers Wallet settings.

## Tools

| Tool | Description |
|------|-------------|
| `get_accounts` | List all accounts with balances. Filters: `currency`, `accountType` |
| `get_categories` | Income/expense categories. Filter: `name` |
| `get_labels` | User-defined tags. Filter: `name` |
| `search_transactions` | Search transactions. Requires `accountId`. Filters: dates, category, payee, amount, label |
| `get_transaction` | Full details of a single transaction by `id` |
| `spending_by_category` | Spending grouped by category for a date range |
| `cashflow_summary` | Income, expenses, and net cashflow for a date range |
| `top_merchants` | Top merchants by spending for a date range |

> `accountId` is required for transactions and analytics tools. Call `get_accounts` first to get it.

## Example prompts

- "Show my accounts and balances"
- "How much did I spend in February?"
- "What do I spend the most money on?"
- "Top 5 merchants this month"
- "Find all transactions at Starbucks in January"

## Technical details

- TypeScript, ES2022, Node16 modules
- Dependencies: `@modelcontextprotocol/sdk`, `zod`
- Supports `agentHints=true` — API returns hints about pagination, rate limits, etc.
- Automatic pagination via `nextPageUrl` from hints
- Analytics tools aggregate data server-side (API has no analytics endpoints)
