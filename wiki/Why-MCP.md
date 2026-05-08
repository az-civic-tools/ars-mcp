# Why MCP?

This page makes the case for why a Model Context Protocol server in front of azleg.gov is worth standing up at all, instead of just letting your AI curl the upstream directly. It's about three things: **search, knowledge, and tokens**.

## What is MCP exactly?

MCP (Model Context Protocol) is an open spec from Anthropic that defines a standard way for AI assistants to call external tools. Three pieces:

1. **Tools** — typed functions with input schemas and structured outputs
2. **Transport** — how the call moves between client and server (stdio for local, Streamable HTTP for remote)
3. **Discovery** — a handshake (`initialize` → `tools/list`) so the client knows what's available

There's no special model, no proprietary fine-tuning, no platform lock-in. The same MCP server works in Claude Desktop, Claude Code, Cursor, Cline, Continue, Zed — anything that speaks MCP.

## Three reasons MCPs beat raw curl for ARS

### 1. Real search

azleg.gov has no full-text search across the whole code. You can:
- Browse a title and click through chapters
- Open the section index for one title at a time
- Hit individual section URLs if you happen to know the citation

But you cannot say "find me every section that mentions VRKA disclosure." That doesn't exist on the official site.

The ARS MCP indexes all 22,780 sections with FTS5 (SQLite's full-text search). One tool call returns ranked snippets across the entire code in milliseconds.

### 2. Knowledge encapsulation

The bare statute pages at azleg.gov live at `/ars/{title}/{NNNNN}.htm` — fast and clean. But:

- Decimal sections use a HYPHEN: `/ars/16/00925-01.htm` is § 16-925.01 (not a period)
- The wrapper pages at `/viewdocument/?docName=...` are 78 KB SPA shells with the actual statute buried inside (vs. 1-15 KB for the bare URL)
- The body uses `<font color=GREEN>` and `<font color=PURPLE>` markup that needs stripping
- Citation parsing has edge cases (sections with decimals, repealed sections, etc.)

Without an MCP, every time you ask Claude to look something up, it has to either learn those gotchas inside its context window, or guess and fail.

With an MCP, the gotchas live inside the server **once**. The model sees a clean tool: `ars_get_section(citation)`. The mirror handles the rest.

### 3. Token economy

Compare a real task end-to-end.

#### Task: "What does A.R.S. § 16-925 require for sign disclaimers?"

**Without MCP:**

| Step | Tokens |
|------|--------|
| Figure out the right URL (or fetch via WebFetch) | ~600 |
| Curl the SPA wrapper (78 KB) or bare URL (4 KB) | ~5,000–20,000 |
| Strip HTML, parse the body | ~800 |
| Format an answer | ~600 |
| **Total** | **~7,000–22,000 tokens** |

**With MCP:**

| Step | Tokens |
|------|--------|
| Tool schema (loaded once per session) | ~150 |
| Tool call payload | ~30 |
| Tool response (clean text + disclaimer) | ~1,400 |
| Format an answer | ~400 |
| **Total** | **~2,000 tokens** |

Roughly **3-10x reduction** for one query.

The gap widens dramatically for searches. "Find every section that mentions 'major contributors'" via curl means crawling 22,780 sections. Via MCP, it's a single FTS5 query returning ranked snippets in 50ms.

## When NOT to use an MCP

There are real cases where curl is fine:

1. **One-shot, manual lookups.** If you know the citation and just want to read it, `curl https://www.azleg.gov/ars/16/00925.htm` is fine.
2. **Court filings.** For citing a statute in an actual court filing, hit azleg.gov directly. The MCP includes a disclaimer pointing to azleg.gov for exactly this reason.
3. **Need bleeding-edge currency.** The mirror refreshes weekly. New legislation effective Jan 1 may take a few days to land.

But if you (or an AI assistant) will be **researching, drafting, or analyzing** statutes — and especially if you need search — the MCP is the right shape.

## Mirror vs proxy

For the [SOS MCP](https://github.com/az-civic-tools/sos-mcp) (campaign finance), we proxy live because the upstream is well-shaped, the data is huge and constantly changing, and there's no big benefit to local storage.

For ARS, we mirror because:
- Static text data, ~50 MB total — easily fits in D1
- Weekly refresh is plenty (statutes change once a year)
- Local D1 + FTS5 unlocks real search that the upstream doesn't expose
- Local lookups are 10-50x faster than the upstream round-trip

The mirror lives in a Cloudflare D1 database with sections stored as text. An FTS5 virtual table indexes the bodies for ranked search. See [Architecture](Architecture).

## Further reading

- [Anthropic's MCP announcement](https://www.anthropic.com/news/model-context-protocol)
- [MCP specification](https://modelcontextprotocol.io)
- [Examples and Recipes](Examples) — real lookups using the ARS MCP
