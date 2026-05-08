# Getting Started

Two paths: use the MCP server in your AI tools, or hit the REST API directly with curl. They're the same data; the MCP is just structured for AI consumption.

## Option A — Add to Claude Code

```bash
claude mcp add --scope user --transport http arizona-statutes \
  https://ars.cactus.watch/mcp
```

Restart Claude Code. Verify with:
```bash
claude mcp list
```

You'll get 4 new tools: `ars_get_section`, `ars_search`, `ars_list_titles`, `ars_list_sections`.

## Option B — Add to Claude Desktop

Open `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or the equivalent on Windows/Linux:

```json
{
  "mcpServers": {
    "arizona-statutes": {
      "url": "https://ars.cactus.watch/mcp"
    }
  }
}
```

Quit and relaunch Claude Desktop.

## Option C — Cursor / Cline / other MCP clients

Same URL, same Streamable HTTP transport. Wherever your client lets you add a remote MCP server, drop in `https://ars.cactus.watch/mcp`.

## Option D — Just curl

No client at all. The REST API is fully public:

```bash
curl https://ars.cactus.watch/api/ars/16-925
```

## First query — five things to try

### 1. Look up a section by citation

```
ars_get_section(citation="16-925")
```

Returns the full text of A.R.S. § 16-925 (Advertising and fundraising disclosure statements) with section heading, body, source URL, and a "not authoritative" disclaimer.

Citation forms accepted:
- `16-925`
- `A.R.S. § 16-925`
- `§ 16-925`
- `16-925.01` (decimal sections)

### 2. Search the whole code

```
ars_search(query="campaign contribution")
```

Returns the top-ranked sections with snippets. Words are matched as prefix tokens with porter stemming.

### 3. Search within a single title

```
ars_search(query="disclaimer", title=16)
```

Restricts to a single title. Title 16 = Elections, Title 13 = Criminal Code, Title 41 = State Government.

### 4. List all titles

```
ars_list_titles()
```

Returns all 47 active titles with their names and section counts. Good for getting oriented.

### 5. Browse a title

```
ars_list_sections(title=16, limit=50)
```

Returns every section in Title 16 with its citation and name. Useful for "what's actually in this title".

## Next steps

- Read [Examples and Recipes](Examples) for real-world investigations
- Read [Title Index](Title-Index) for the full list of active titles
- Read [Why MCP?](Why-MCP) if you're convincing someone (or yourself) to use this instead of curl
