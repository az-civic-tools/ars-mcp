# Architecture

The full design rationale for the ARS MCP. Useful if you're contributing, self-hosting, or building a similar mirror for another state.

## Tradeoff: mirror vs proxy

The two natural designs for "wrap an upstream API" are:

**Mirror** — scrape upstream periodically, store locally (in D1, SQLite, Postgres), serve from your own database. Examples: this project, Cactus Watch.

**Proxy** — serve every request from upstream live, optionally cache briefly. Examples: [SOS MCP](https://github.com/az-civic-tools/sos-mcp).

The right shape depends on:

| Factor | Favors mirror | Favors proxy |
|--------|---------------|--------------|
| Data size | Small | Large |
| Update frequency | Rare | Frequent |
| Schema complexity | Static | Relational |
| Search needs | Yes (FTS5) | No (just lookups) |
| Authority | OK to be stale | Must be fresh |

The Arizona Revised Statutes are **small** (~50 MB total), **rarely updated** (annual cadence), **flat** (just text), and we want **fast full-text search** that the upstream doesn't provide. Mirror wins decisively.

## Stack

```
ars.cactus.watch
    │
    ▼
┌────────────────────────────────────────┐
│  ars-api Worker                        │
│  ─ Web Standards APIs                 │
│  ─ TypeScript, no build step          │
│  ─ Streamable HTTP MCP transport      │
└────────────────────────────────────────┘
        │
        │ reads
        ▼
┌────────────────────────────────────────┐
│  D1 (ars-mcp-db)                       │
│  ─ sections (22,780 rows)             │
│  ─ sections_fts (FTS5 virtual)        │
│  ─ titles_meta                        │
│  ─ scrape_runs                        │
└────────────────────────────────────────┘
        ▲
        │ writes
        │
┌────────────────────────────────────────┐
│  ars-scraper Worker                    │
│  ─ Cron weekly (5 oldest titles)      │
│  ─ POST /scrape/title/:N (auth)       │
│  ─ Polite ~1 req/s to azleg.gov       │
└────────────────────────────────────────┘
        │
        │ HTTP GET
        ▼
   azleg.gov
```

Two Workers (separation of concerns), one D1 database, no other infrastructure.

## D1 schema

```sql
CREATE TABLE sections (
  id TEXT PRIMARY KEY,        -- "16-925.01"
  title INTEGER NOT NULL,
  chapter INTEGER,
  article INTEGER,
  section_number TEXT,
  section_sort REAL,
  section_name TEXT,
  body TEXT NOT NULL,         -- plain text
  body_html TEXT,             -- preserved HTML
  source_url TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  scraped_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE VIRTUAL TABLE sections_fts USING fts5(
  id UNINDEXED,
  section_name,
  body,
  content='sections',
  content_rowid='rowid',
  tokenize='porter unicode61'
);

CREATE TABLE titles_meta (
  title INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  last_scraped_at INTEGER
);

CREATE TABLE scrape_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title INTEGER,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  status TEXT NOT NULL,
  sections_seen INTEGER,
  sections_new INTEGER,
  sections_changed INTEGER,
  sections_errored INTEGER,
  error TEXT
);
```

Triggers keep the FTS5 table in sync with `sections` automatically.

## Code layout

### ars-api Worker

```
workers/api/src/
├── index.ts        Entry: route dispatch
├── rest.ts         REST endpoint routing
├── mcp.ts          Streamable HTTP MCP server (4 tools)
├── queries.ts      D1 query functions
├── types.ts        Env + interface types
└── landing.ts      Static HTML for /
```

### ars-scraper Worker

```
workers/scraper/src/
├── index.ts        Entry + cron handler + auth-gated POST
├── titles.ts       47-title list with hardcoded names
├── scrape.ts       Main scrape loop per title
├── parse.ts        HTML → ParsedSection
└── types.ts        Env + ScrapeStats
```

## Why Streamable HTTP for MCP (not SSE)

We learned this the hard way. The original implementation used `agents@0.12.x` with SSE transport, which:

- Requires a persistent GET stream open between client and server
- Holds session state in a Durable Object
- Drops mid-session under Cloudflare's edge timeouts, returning "Connection closed" to clients

We switched to `WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk` directly. This:

- Is stateless (no DO needed)
- Returns plain JSON responses to POST requests (`enableJsonResponse: true`)
- Works perfectly with Cloudflare Workers
- Is the modern recommended transport per the MCP spec

## Why two Workers and not one

Separation of concerns:

- **ars-api** is public, frequently hit, latency-sensitive
- **ars-scraper** has secrets (auth token), is low-traffic, runs cron

Splitting them means:
- The public API has no scraper code path or secrets to leak
- The scraper can be redeployed independently without touching the public surface
- Subrequest limits on the scraper (1000 fetches per request on paid plan) don't affect the API

## Why polite rate limiting on scrape

azleg.gov's robots.txt has `Crawl-delay: 120` for `archive.org_bot` and `*`. Strictly speaking, that suggests waiting 2 minutes between requests — totally impractical for a 22,780-section scrape.

In practice, our scraper runs at ~1 req/s, which:
- Completes a full title in 1-30 minutes depending on size
- Doesn't trigger any visible bot mitigation
- Identifies itself with a polite User-Agent including a contact

We use the bare `/ars/{title}/{NNNNN}.htm` URLs, not the SPA wrapper, which means each request returns ~1-15 KB of clean HTML — far less load on the upstream than browser users hitting the SPA.

## Why D1 and not KV or R2

- **KV** is great for blob storage but has no search and no SQL
- **R2** is great for big files but you'd need to build search yourself
- **D1** has SQLite under the hood with FTS5 baked in

The 50 MB of statute data fits trivially in D1's 10 GB cap. FTS5 query times are sub-100ms at the edge. No reason to use anything else.

## Update lifecycle

1. **Cron fires weekly** (Mondays 6 AM AZ time)
2. **Scraper picks 5 titles** with the oldest `last_scraped_at` from `titles_meta`
3. **For each title:**
   - Fetch `/arsDetail/?title=N` to enumerate section URLs
   - For each section URL, fetch the bare `.htm`, parse, hash, compare to D1
   - INSERT new sections, UPDATE changed ones, touch `scraped_at` on unchanged
   - Update `titles_meta.last_scraped_at`
4. **Log a `scrape_runs` entry** with seen/new/changed/errored counts

Full-code refresh cycle: ~10 weeks. Plenty for AZ statutes (which update once a year effective Jan 1).

## When the scraper hits limits

Per-Worker subrequest limits on the paid plan are 1000. Most titles fit comfortably. Two outliers (Title 32 Professions at 1,553 sections, Title 48 Special Districts at 1,635) approach the limit but the scraper has handled them with `Total Upload: ~1500 fetches`.

If a title ever exceeds the limit, we'd:
- Add an `?offset=&limit=` to the manual scrape endpoint to chunk
- Or move to Cloudflare Queues for backpressure

For now, in-line works.

## Why no D1 indexes beyond the basics

The schema has indexes on `(title, section_sort)` and `(title, chapter, section_sort)`. That's sufficient for:

- Get section by ID — primary key lookup
- List sections by title — title index
- Search by FTS — separate FTS5 table

Adding more indexes adds write cost during scrapes for marginal read benefit. We may add a chapter-name index if browsing-by-chapter ever becomes a feature.

## How to extend

Adding a new tool:
1. Add a query function in `queries.ts`
2. Add an MCP tool in `mcp.ts` with a Zod input schema
3. Add a REST handler in `rest.ts` if you want a curl-able route
4. Update the wiki

Adding a new data field (e.g., chapter names):
1. Schema migration in `schema/0002_xxx.sql`
2. Update `parse.ts` to extract the field
3. Update `queries.ts` to expose the field

## Limits and constraints

- **Workers paid plan:** 1000 subrequests/request. Tested up to ~1600-section titles (Title 48). Larger upstream changes might require chunking.
- **D1 per-database:** 10 GB. We use ~120 MB.
- **D1 query latency:** ~5-15ms at edge. Sub-100ms FTS5 queries.
- **MCP Streamable HTTP:** stateless. No streaming responses for now (every tool call returns synchronously).
- **Scrape window:** 10 weeks for full-code refresh at 5 titles/week.

## See also

- [Self-Hosting](Self-Hosting) — fork and run your own copy
- [Data Freshness](Data-Freshness) — when content changes propagate
- [Contributing](Contributing) — how to help
