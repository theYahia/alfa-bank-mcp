# MCP-сервер для Альфа-Банк Бизнес (Alfa API) — счета, выписки и платежи через ИИ

Если вы искали, как подключить Alfa API к нейросети, поднять баланс и выписку по расчётному счёту или подготовить платёжное поручение из чата — это оно. 8 инструментов: счета и балансы, выписки, платёжные поручения, контрагенты, курсы валют, зарплатные реестры. Боевой доступ к Alfa API требует mTLS и подписи ГОСТ PKCS#7 — прочитайте раздел о статусе проверки эндпоинтов ниже, прежде чем подключать продакшн.

> MCP server for Alfa-Bank Business (Alfa API) — accounts, balances, statements, payment orders, counterparties, exchange rates, and payroll registries. **8 tools.**

[![npm](https://img.shields.io/npm/v/@theyahia/alfa-bank-mcp)](https://www.npmjs.com/package/@theyahia/alfa-bank-mcp)
[![CI](https://github.com/theYahia/alfa-bank-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/theYahia/alfa-bank-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![smithery badge](https://smithery.ai/badge/@theyahia/alfa-bank-mcp)](https://smithery.ai/server/@theyahia/alfa-bank-mcp)

Part of [WWmcp](https://github.com/theYahia/WWmcp) series by [@theYahia](https://github.com/theYahia).

> ⚠️ **Read the [Disclaimer & endpoint verification status](#disclaimer--endpoint-verification-status) before use.** This server targets the real [Alfa API](https://developers.alfabank.ru/), but production access requires mTLS and PKCS#7 GOST request signing — see below.

## Quick Start

### Claude Desktop

```json
{
  "mcpServers": {
    "alfa-bank": {
      "command": "npx",
      "args": ["-y", "@theyahia/alfa-bank-mcp"],
      "env": {
        "ALFA_CLIENT_ID": "your-client-id",
        "ALFA_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add alfa-bank -e ALFA_CLIENT_ID=your-id -e ALFA_CLIENT_SECRET=your-secret -- npx -y @theyahia/alfa-bank-mcp
```

### VS Code / Cursor

```json
{
  "servers": {
    "alfa-bank": {
      "command": "npx",
      "args": ["-y", "@theyahia/alfa-bank-mcp"],
      "env": {
        "ALFA_CLIENT_ID": "your-client-id",
        "ALFA_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### Windsurf

```json
{
  "mcpServers": {
    "alfa-bank": {
      "command": "npx",
      "args": ["-y", "@theyahia/alfa-bank-mcp"],
      "env": {
        "ALFA_CLIENT_ID": "your-client-id",
        "ALFA_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### Streamable HTTP (remote / Docker)

```bash
HTTP_PORT=3000 npx -y @theyahia/alfa-bank-mcp --http
```

Endpoints:
- `POST /mcp` — MCP Streamable HTTP transport
- `GET /health` — health check (`{ "status": "ok", "tools": 8 }`)

## Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `ALFA_CLIENT_ID` | Yes | OAuth 2.0 client ID from the [Alfa-Bank developer portal](https://developers.alfabank.ru/) |
| `ALFA_CLIENT_SECRET` | Yes | OAuth 2.0 client secret |
| `ALFA_BASE_URL` | No | API base URL (default `https://baas.alfabank.ru`) |
| `ALFA_SCOPE` | No | Space-separated OAuth/OIDC scopes required by the called methods |
| `ALFA_TLS_CERT` | No | mTLS client certificate (inline PEM or file path) — **required for live API access** |
| `ALFA_TLS_KEY` | No | mTLS client private key (inline PEM or file path) |
| `ALFA_TLS_CA` | No | mTLS CA bundle (inline PEM or file path) |
| `ALFA_TIMEOUT_MS` | No | Per-request timeout in ms (default `15000`) |
| `HTTP_PORT` | No | Port for HTTP transport (default `3000`) |

## Tools (8)

| Tool | Description | Annotation |
|------|-------------|:----------:|
| `list_accounts` | List all business accounts | read-only |
| `get_account_balance` | Get current balance for an account | read-only |
| `get_account_statement` | Get transactions for a date range | read-only |
| `create_payment_order` | Create a payment order (moves real money) | **destructive** |
| `get_payment_status` | Check payment order / registry status | read-only |
| `list_counterparties` | List saved counterparties (beneficiaries) | read-only |
| `get_exchange_rates` | Get current exchange rates | read-only |
| `get_salary_registry` | Get payroll (salary) registries | read-only |

`create_payment_order` is annotated `destructiveHint: true` so MCP clients can require explicit confirmation before it runs.

## Demo Prompts

```
Show me all my Alfa-Bank business accounts and their balances
```

```
Get my account statement for March 2026 and summarize the biggest expenses
```

```
Create a payment of 150,000 RUB to account 40702810000000005678 at BIK 044525225 for consulting services
```

## Architecture

- **Base URL**: `https://baas.alfabank.ru` (override via `ALFA_BASE_URL`)
- **Auth**: OAuth 2.0 / OpenID Connect via Alfa ID — token from `POST /oidc/token` (client credentials), cached until expiry, optional `scope`
- **mTLS**: production mandates a client certificate on every call; supplied via `ALFA_TLS_CERT` / `ALFA_TLS_KEY` (+ optional `ALFA_TLS_CA`) and installed as a global undici dispatcher
- **Signing**: operational methods (payments) require an `X-Alfabank-Signature` PKCS#7 (CAdES-BES) GOST-2012 signature; not implemented by default — inject a `Signer` (`src/auth/signer.ts`) to enable payment submission
- **Timeout**: per-request `AbortController` (default 15s)
- **Retry**: bounded retries with exponential backoff + jitter on 429 / 5xx / network / timeout; a 401 triggers one re-authentication
- **Transport**: stdio (default) or Streamable HTTP (`--http` / `HTTP_PORT`)
- **Safety**: credentials are never logged or placed in error messages; under stdio all logs go to stderr

## Disclaimer & endpoint verification status

This package is aligned to the **public** [Alfa API documentation](https://developers.alfabank.ru/products/alfa-api/documentation), but it is **not a verified, production-ready integration**:

- Production access requires **mTLS certificates**, **PKCS#7 GOST request signing**, and a **signed technical-interaction contract** with the bank. Without these, the server **cannot reach the live contour** — it runs in demo mode.
- `create_payment_order` reflects the real **registry + electronic-signature** model. With the default (unimplemented) signer it returns a clear error instead of submitting; inject a real `Signer` to enable it.
- Endpoint paths were corrected toward the documented surface. Confidence varies — items marked **VERIFY** below (and with `// VERIFY` comments in `src/client.ts`) should be confirmed against the live Swagger on each method's doc page before relying on them.

| Tool | Path | Status |
|------|------|--------|
| auth | `POST /oidc/token` | ✅ documented |
| `get_account_statement` | `GET /api/statement/transactions` | ✅ path documented; range params **VERIFY** (docs use `statementDate`+`page`) |
| `list_accounts` | `GET /api/pp/v1/accounts` | 🟡 likely |
| `get_payment_status` | `GET /api/jp/v1/registries/{id}` | 🟡 likely |
| `create_payment_order` | `POST /api/jp/v1/registries` + signature | 🟡 model documented; exact create payload **VERIFY** |
| `list_counterparties` | `GET /na/jp/v1/beneficiaries` | 🟡 concept documented (beneficiaries); list path **VERIFY** |
| `get_exchange_rates` | `GET /api/rates/gd/v1/offices-rates` | 🟡 likely |
| `get_account_balance` | `GET /api/pp/v1/accounts/{id}/balance` | ⚠️ **VERIFY** (own-account balance path not confirmed) |
| `get_salary_registry` | `GET /api/jp/v1/registries?type=SALARY` | ⚠️ **VERIFY** (not confirmed in public docs) |

## Development

```bash
npm install
npm run dev        # run with tsx
npm run typecheck
npm run lint        # biome
npm run build
npm test            # vitest

# inspect with the MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## Part of WWmcp Series

| MCP | Status | Description |
|-----|--------|-------------|
| [@theyahia/cbr-mcp](https://github.com/theYahia/cbr-mcp) | ready | Currency rates, key rate |
| [@theyahia/yookassa-mcp](https://github.com/theYahia/yookassa-mcp) | ready | Payments, refunds, receipts, payouts, webhooks |
| [@theyahia/alfa-bank-mcp](https://github.com/theYahia/alfa-bank-mcp) | this server | Business accounts, statements, payments |
| ... | | [full list](https://github.com/theYahia/WWmcp) |

## License

MIT

---

Часть [WWmcp](https://github.com/theYahia/WWmcp) · Telegram: [@vhodvai](https://t.me/vhodvai)
