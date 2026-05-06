# ARS MCP

Mirror of the Arizona Revised Statutes (ARS) with REST API + MCP server, deployed to `ars.cactus.watch`.

## Architecture

Two Cloudflare Workers + one D1 database.

- `workers/api/` — Public Worker. REST routes at `/api/ars/*`, MCP at `/mcp`, landing at `/`.
- `workers/scraper/` — Internal Worker. Weekly cron + auth-gated manual endpoints.
- `schema/0001_init.sql` — D1 schema with FTS5 virtual table + triggers for full-text search.

| Cloudflare resource | Name |
|---------------------|------|
| API Worker | `ars-api` |
| Scraper Worker | `ars-scraper` |
| D1 Database | `ars-mcp-db` |
| Subdomain | `ars.cactus.watch` |

## Conventions

- TypeScript for both Workers (wrangler handles TS natively, no separate build step)
- Files under 800 lines, functions under 50
- Immutable patterns... never mutate
- Every response includes a legal disclaimer (mirror is not authoritative)
- ARS section IDs are canonical strings: `"16-901"`, `"16-925.01"`
- Scraper paces at ~1 req/sec to be polite to azleg.gov
- All Cloudflare resources managed via the Cloudflare MCP, never wrangler CLI for inspection

## Data flow

```
azleg.gov  --(weekly cron, polite scrape)-->  ars-scraper  --(D1 inserts/updates)-->  ars-mcp-db
                                                                                          |
                                                                                          v
                                              MCP clients <--(/mcp)-- ars-api -->  REST API consumers
```

## Important parsing notes

- azleg.gov serves bare HTML at `/ars/{TITLE}/{NNNNN}.htm` — use these, NOT the SPA wrappers (`/viewdocument/`, `/FormatDocument.asp`)
- The `<title>` tag in section pages uses ` - ` separator: `"16-101 - Qualifications of registrant; definition"` and `"16-121.01 - Requirements for proper registration..."`
- Decimal sections like `16-121.01` live at URLs with a HYPHEN: `/ars/16/00121-01.htm` (NOT a period)
- Section listings per title come from `https://www.azleg.gov/arsDetail/?title=N`
- The `/arsDetail/?title=N` page has a generic `<title>Arizona Revised Statutes</title>` — don't try to extract the title name from it. Title names are hardcoded in `workers/scraper/src/titles.ts`
- robots.txt allows `/ars/`. Crawl-delay 120s is aggressive — keep our rate at ~1 req/sec and don't hit sequentially without delay

## MCP tools exposed

- `ars_get_section(citation)` — single section by citation
- `ars_search(query, title?, limit?)` — FTS5 search across the whole code
- `ars_list_titles()` — all 47 active titles
- `ars_list_sections(title, limit?, offset?)` — browse sections within a title

## Disclaimer policy

Every response (REST and MCP) MUST include a "not authoritative" disclaimer pointing to azleg.gov. This is non-negotiable... we don't want anyone citing this mirror in court.
