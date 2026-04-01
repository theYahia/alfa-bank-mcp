# @theyahia/alfa-bank-mcp

MCP server for Alfa-Bank Business API. Manage business accounts, create payment orders, view statements, check exchange rates, and access payroll registries.

## Install

```bash
npx -y @theyahia/alfa-bank-mcp
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ALFA_CLIENT_ID` | Yes | OAuth 2.0 client ID from Alfa-Bank developer portal |
| `ALFA_CLIENT_SECRET` | Yes | OAuth 2.0 client secret |
| `ALFA_BASE_URL` | No | API base URL (default: `https://partner.business.alfabank.ru`) |

## Tools

| Tool | Description |
|------|-------------|
| `list_accounts` | List all business accounts |
| `get_account_balance` | Get current balance for an account |
| `get_account_statement` | Get transactions for a date range |
| `create_payment_order` | Create a new payment order |
| `get_payment_status` | Check payment order status |
| `list_counterparties` | List saved business counterparties |
| `get_exchange_rates` | Get current exchange rates |
| `get_salary_registry` | Get payroll registries |

## Demo Prompts

1. "Show me all my Alfa-Bank business accounts and their balances"
2. "Create a payment of 150,000 RUB to account 40702810000000005678 at BIK 044525225 for consulting services"
3. "Get my account statement for March 2026 and summarize the biggest expenses"

## License

MIT
