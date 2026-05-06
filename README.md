# ARS MCP

Free, open-source MCP server and REST API for the Arizona Revised Statutes.

Live at **https://ars.cactus.watch**.

## What this is

A weekly-refreshed mirror of the Arizona Revised Statutes (ARS), exposed as:

- **A REST API** anyone can hit with `curl` (no key, no auth)
- **A remote MCP server** you can plug into Claude Desktop, Cursor, Cline, or any other MCP client

The data is scraped from [azleg.gov](https://www.azleg.gov/arstitle/), the official source. This mirror is **not authoritative**: every response carries a disclaimer pointing back to azleg.gov for legal use.

## Why

If you do AZ legal, civic, or compliance work, you reference statutes constantly. Cite-checking via curl + a wrapper SPA is slow and noisy. This service gives you full-text search, fast lookups, and an MCP your AI assistant can call directly.

## Add to Claude Desktop

Edit your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "arizona-statutes": {
      "url": "https://ars.cactus.watch/mcp"
    }
  }
}
```

Restart Claude Desktop. You'll get four new tools:

| Tool | Purpose |
|------|---------|
| `ars_get_section` | Pull a section by citation, e.g. `16-901` or `A.R.S. § 16-925.01` |
| `ars_search` | Full-text search, optionally scoped to a title |
| `ars_list_titles` | List all 47 active titles with section counts |
| `ars_list_sections` | List sections within a title (browsing) |

## REST API

No key. No rate limit beyond Cloudflare's defaults. Just fetch.

```bash
# Get a section
curl https://ars.cactus.watch/api/ars/16-901
curl https://ars.cactus.watch/api/ars/sections/16-925.01

# List all titles
curl https://ars.cactus.watch/api/ars/titles

# List sections in Title 16 (Elections)
curl "https://ars.cactus.watch/api/ars/titles/16?limit=50"

# Full-text search (across whole code)
curl "https://ars.cactus.watch/api/ars/search?q=campaign+contribution"

# Scope search to one title
curl "https://ars.cactus.watch/api/ars/search?q=disclaimer&title=16"
```

Every response includes a `disclaimer` field. Don't strip it.

## Architecture

Two Cloudflare Workers backed by a single D1 database with FTS5 full-text search.

```
ars.cactus.watch
  ├── /                  Static landing page
  ├── /api/ars/*         REST API   (ars-api Worker)
  └── /mcp               MCP server (ars-api Worker)

ars-scraper Worker (no public route)
  ├── Cron: weekly sweep of stale titles
  └── Authed POST /scrape/title/:N  (manual rescrape)
```

| Resource | Name |
|----------|------|
| API Worker | `ars-api` |
| Scraper Worker | `ars-scraper` |
| D1 Database | `ars-mcp-db` |
| Subdomain | `ars.cactus.watch` |

## Repo layout

```
ars-mcp/
├── schema/                 D1 schema + migrations
├── workers/
│   ├── api/                REST + MCP Worker
│   └── scraper/            Scraper Worker (cron + manual)
└── site/                   Static landing page (optional)
```

## Run it yourself

If you want to host your own copy (or fork for another state):

```bash
git clone https://github.com/az-civic-tools/ars-mcp.git
cd ars-mcp

# Install deps in each worker
cd workers/api && npm install && cd ../..
cd workers/scraper && npm install && cd ../..

# Create CF resources via wrangler or the Cloudflare MCP, then update wrangler.toml IDs
# Run schema migration
npx wrangler d1 execute ars-mcp-db --file=schema/0001_init.sql --remote

# Set scraper auth secret
cd workers/scraper && npx wrangler secret put SCRAPE_AUTH_TOKEN

# Deploy both workers
npx wrangler deploy            # in workers/scraper
cd ../api && npx wrangler deploy

# Bootstrap scrape (run once)
for t in 1 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49; do
  curl -X POST -H "Authorization: Bearer $TOKEN" \
    https://ars-scraper.YOUR.workers.dev/scrape/title/$t
  sleep 2
done
```

## Data freshness

- Weekly cron picks the 5 oldest-scraped titles and re-scrapes them
- Full code refresh cycle: ~10 weeks
- AZ statutes update once a year (effective Jan 1 after each session). Weekly cron is overkill, but it catches emergency legislation
- `updated_at` on every section reflects when content actually changed (not when last checked)

## Disclaimer

This is a community mirror. **It is not the official source.** For any legal, regulatory, compliance, or court use, refer to [azleg.gov](https://www.azleg.gov/arstitle/) directly.

The data is provided "as is" with no warranty. See [LICENSE](LICENSE).

## License

[MIT](LICENSE) — Use it however you want. No attribution required, but a star helps.

## Sister projects

Built by the same crew behind:

- [Cactus Watch](https://cactus.watch) — Arizona bill tracker with free public API
- [az-civic-tools](https://github.com/az-civic-tools/az-civic-tools) — District finder, civics education guide
