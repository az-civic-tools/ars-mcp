# ARS MCP

Free, open-source MCP server and REST API for the Arizona Revised Statutes.

Live at **https://ars.cactus.watch**.

> **Full documentation lives in the [Wiki](https://github.com/az-civic-tools/ars-mcp/wiki).**

## What this is

A weekly-refreshed mirror of every section of the Arizona Revised Statutes (ARS), exposed as:

- **A REST API** anyone can hit with `curl` (no key, no auth)
- **A remote MCP server** you can plug into Claude Desktop, Cursor, Cline, or any other MCP client

The data is scraped from [azleg.gov](https://www.azleg.gov/arstitle/), the official source. **47 active titles, 22,780 sections, fully indexed for FTS5 full-text search.**

## What is an MCP?

**MCP** stands for **Model Context Protocol** — an open standard that lets AI assistants (Claude, Cursor, Cline, etc.) call external tools in a structured, predictable way. Think of it like a Lego brick that snaps onto your AI: instead of asking your assistant to scrape a website, you give it a tool that returns clean structured data.

The protocol defines:
- **Tools** the AI can call (with typed inputs and outputs)
- **A transport** that carries the calls between client and server (we use Streamable HTTP)
- **A discovery handshake** so the AI knows what's available

That's it. No special model, no fine-tuning, no proprietary glue. Any MCP-compatible client (Claude Desktop, Claude Code, Cursor, Cline, Continue, Zed, etc.) can use this server.

Want a deeper read? See [Why MCP?](https://github.com/az-civic-tools/ars-mcp/wiki/Why-MCP) in the wiki.

## Why use an MCP (vs just curl-ing azleg.gov)?

Three reasons.

**1. Search.** azleg.gov has no real full-text search across the whole code. You can browse by title or click around in their SPA, but you can't ask "show me every section that mentions 'major contributors' in Title 16." The MCP can — across all 22,780 sections in milliseconds.

**2. Token economy.** azleg.gov serves the SPA wrapper at `/viewdocument/?docName=...` — a 78 KB page with the actual statute buried inside. The MCP returns ~1-3 KB of clean text per section, already stripped of HTML chrome.

**3. The model can call it natively.** Tool calls aren't web fetches. Claude doesn't have to know about azleg's URL pattern, the `<font color=GREEN>16-101</font>` markup, or the difference between `/ars/16/00925.htm` and `/ars/16/00925-01.htm`. It just calls `ars_get_section(citation="16-925")` and gets clean text back.

### Token usage example (real numbers)

**Task:** "What does A.R.S. § 16-925 require for sign disclaimers?"

**Without MCP** (Claude curls azleg.gov directly):

| Step | Approx tokens |
|------|---------------|
| Figure out the right URL pattern (or fetch via WebFetch) | ~600 |
| Pull the page (78 KB SPA wrapper or 4 KB bare HTML) | ~5,000–20,000 |
| Strip HTML, parse out the body, identify section heading | ~800 |
| Format an answer | ~600 |
| **Total** | **~7,000–22,000 tokens** |

**With MCP** (Claude calls `ars_get_section`):

| Step | Approx tokens |
|------|---------------|
| Tool schema (loaded once per session) | ~150 |
| Tool call payload | ~30 |
| Tool response (clean text + disclaimer) | ~1,400 |
| Format an answer | ~400 |
| **Total** | **~2,000 tokens** |

Roughly **3-10x reduction** for one query, and that gap widens fast for searches across multiple sections. Ask "find every section that mentions VRKA" and the MCP returns ranked snippets in one call; the curl approach has to either crawl all 22,780 sections or hope the right keywords lead it to the right pages.

The same logic applies to SOS campaign finance, GitHub PRs, and any other domain where the underlying API is messy or verbose. **MCPs are how you give AI assistants leverage on real-world data without burning context.**

---

## Add to Claude Code

```bash
claude mcp add --scope user --transport http arizona-statutes \
  https://ars.cactus.watch/mcp
```

## Add to Claude Desktop

```json
{
  "mcpServers": {
    "arizona-statutes": {
      "url": "https://ars.cactus.watch/mcp"
    }
  }
}
```

## MCP Tools

| Tool | Purpose |
|------|---------|
| `ars_get_section` | Pull a section by citation, e.g. `16-901` or `A.R.S. § 16-925.01` |
| `ars_search` | Full-text search, optionally scoped to a title |
| `ars_list_titles` | List all 47 active titles with section counts |
| `ars_list_sections` | List sections within a title (browsing) |

Full reference: [Wiki — MCP Tools](https://github.com/az-civic-tools/ars-mcp/wiki/MCP-Tools).

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

Full reference: [Wiki — REST API](https://github.com/az-civic-tools/ars-mcp/wiki/REST-API).

## Architecture

Two Cloudflare Workers backed by a single D1 database with FTS5 full-text search.

```
ars.cactus.watch
  ├── /                  Static landing page
  ├── /api/ars/*         REST API   (ars-api Worker)
  └── /mcp               MCP server (ars-api Worker, Streamable HTTP)

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

See [Wiki — Architecture](https://github.com/az-civic-tools/ars-mcp/wiki/Architecture) for design rationale.

## Run it yourself

See [Wiki — Self-Hosting](https://github.com/az-civic-tools/ars-mcp/wiki/Self-Hosting) for a fork-and-run guide.

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

- [sos-mcp](https://github.com/az-civic-tools/sos-mcp) — MCP server for AZ Secretary of State campaign finance (sos.cactus.watch)
- [Cactus Watch](https://cactus.watch) — Arizona bill tracker with free public API
- [az-civic-tools](https://github.com/az-civic-tools/az-civic-tools) — District finder, civics education guide
