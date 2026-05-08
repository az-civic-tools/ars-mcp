# ARS MCP Wiki

Welcome to the ARS MCP wiki — comprehensive docs for the free, open-source MCP server and REST API mirroring the Arizona Revised Statutes.

**Live at:** https://ars.cactus.watch
**Coverage:** 47 active titles, 22,780 sections, full-text indexed.

## What's inside

### Getting started
- **[Getting Started](Getting-Started)** — install, first query, both REST and MCP
- **[Why MCP?](Why-MCP)** — what an MCP is, why it beats curling azleg.gov, real token-savings numbers

### Reference
- **[MCP Tools](MCP-Tools)** — full reference for all 4 tools with input schemas and example responses
- **[REST API](REST-API)** — full reference for every endpoint
- **[Title Index](Title-Index)** — all 47 active titles with subject and section counts

### Going deeper
- **[Examples and Recipes](Examples)** — common citations, search patterns, integration patterns
- **[FTS5 Search Tips](FTS5-Search-Tips)** — getting the best results out of full-text search
- **[Data Freshness](Data-Freshness)** — how the weekly refresh works, what `updated_at` means

### Operations
- **[Architecture](Architecture)** — how the Workers + D1 + FTS5 fit together, why mirror not proxy
- **[Self-Hosting](Self-Hosting)** — fork and run your own copy (e.g., for another state)
- **[Contributing](Contributing)** — how to help

---

## At a glance

```
┌──────────────────────────────────────────────────────────────────┐
│  Claude Desktop / Claude Code / Cursor / Cline                  │
│                          │                                       │
│              MCP request │ (Streamable HTTP)                    │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ars-api Worker (ars.cactus.watch)                      │   │
│  │  ─ REST endpoints + MCP server                          │   │
│  │  ─ Streamable HTTP transport, stateless                 │   │
│  │  ─ Reads from D1 with FTS5                              │   │
│  └────────────────────┬────────────────────────────────────┘   │
│                       │                                          │
│                       ▼                                          │
│           ┌─────────────────────────┐                           │
│           │   D1 (ars-mcp-db)       │                           │
│           │   ─ sections (22,780)   │                           │
│           │   ─ sections_fts (FTS5) │                           │
│           │   ─ titles_meta         │                           │
│           │   ─ scrape_runs         │                           │
│           └─────────────▲───────────┘                           │
│                         │                                        │
│                         │ writes                                 │
│                         │                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ars-scraper Worker                                      │   │
│  │  ─ Weekly cron — refresh 5 oldest titles                │   │
│  │  ─ POST /scrape/title/:N — auth-gated manual rescrape  │   │
│  └─────────────────────┬───────────────────────────────────┘   │
│                        │                                         │
│                        │ polite scrape (1 req/s)                │
│                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  azleg.gov                                               │   │
│  │  ─ /arstitle/?title=N — section list                    │   │
│  │  ─ /ars/{title}/{NNNNN}.htm — bare statute pages        │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Disclaimer

This mirror is a community tool. It is **not authoritative**. For court filings, formal complaints, or any official use, verify directly against [azleg.gov](https://www.azleg.gov/arstitle/).

## License

[MIT](https://github.com/az-civic-tools/ars-mcp/blob/main/LICENSE) — fork it, run it, change it. No attribution required (a star helps).
