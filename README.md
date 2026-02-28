# BudgetBakers MCP Server

MCP сервер для інтеграції Claude з [BudgetBakers Wallet](https://www.budgetbakers.com/) API. Дає Claude доступ до фінансових даних: рахунки, транзакції, категорії, аналітика витрат.

## Встановлення

```bash
npm install
npm run build
```

## Конфігурація

Додай в `~/.claude/settings.json` (або Claude Desktop config):

```json
{
  "mcpServers": {
    "budgetbakers": {
      "command": "node",
      "args": ["/Users/vadym/iOS/projects/budgetbakers-mcp/build/index.js"],
      "env": {
        "BUDGETBAKERS_API_TOKEN": "<your-token>"
      }
    }
  }
}
```

API токен можна отримати в налаштуваннях BudgetBakers Wallet.

## Tools

| Tool | Опис |
|------|------|
| `get_accounts` | Список рахунків з балансами. Фільтри: `currency`, `accountType` |
| `get_categories` | Категорії доходів/витрат. Фільтр: `name` |
| `get_labels` | Користувацькі теги. Фільтр: `name` |
| `search_transactions` | Пошук транзакцій. Потребує `accountId`. Фільтри: дати, категорія, мерчант, сума, лейбл |
| `get_transaction` | Деталі однієї транзакції по `id` |
| `spending_by_category` | Витрати згруповані по категоріях за період |
| `cashflow_summary` | Доходи, витрати, нетто за період |
| `top_merchants` | Мерчанти з найбільшими витратами за період |

> `accountId` — обов'язковий параметр для транзакцій та аналітики. Спочатку викликай `get_accounts` щоб його отримати.

## Приклади запитів до Claude

- "Покажи мої рахунки та баланси"
- "Скільки я витратив у лютому?"
- "На що я витрачаю найбільше грошей?"
- "Топ-5 мерчантів за останній місяць"
- "Знайди всі транзакції в Сільпо за січень"

## Технічні деталі

- TypeScript, ES2022, Node16 modules
- Залежності: `@modelcontextprotocol/sdk`, `zod`
- Підтримка `agentHints=true` — API повертає підказки про пагінацію, rate limits тощо
- Автоматична пагінація через `nextPageUrl` з hints
- Аналітичні tools агрегують дані на стороні сервера (API не має ендпоінтів для аналітики)
