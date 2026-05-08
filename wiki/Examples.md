# Examples and Recipes

Real-world use cases. Each shows the MCP tool call, the equivalent curl, and what to expect back.

## Look up a specific cite

```
ars_get_section(citation="16-925")
```

```bash
curl "https://ars.cactus.watch/api/ars/16-925"
```

Returns the full text of A.R.S. § 16-925 (sign disclaimer law). Useful when you know exactly what you want.

## Decimal section

```
ars_get_section(citation="16-121.01")
```

```bash
curl "https://ars.cactus.watch/api/ars/16-121.01"
```

Decimal sections work the same way. The mirror handles both the citation form (`.01`) and the URL form (`-01`) internally.

## Search for a topic

```
ars_search(query="campaign contribution", title=16)
```

```bash
curl "https://ars.cactus.watch/api/ars/search?q=campaign+contribution&title=16"
```

Returns ranked snippets in Title 16 (Elections). Useful when you don't know the cite.

## Find the VRKA sections

```
ars_search(query="VRKA")
```

Returns the relevant Prop 211 sections (16-971 through 16-979). VRKA is a specific term that returns clean results.

## Browse a title's table of contents

```
ars_list_sections(title=16, limit=200)
```

Returns every section in Title 16 with its citation and section name. Useful for "what's actually in this title."

## Find a statutory definition

Definitions usually live in the first section of each chapter (e.g., 16-101, 16-901, 16-941, etc.) or in the title's general definitions section.

```
ars_search(query="definitions", title=16)
```

Returns sections that define terms. To get a specific definition, narrow further or just look up the section number.

## Compare two sections side-by-side

```
ars_get_section(citation="16-901")
ars_get_section(citation="16-901.01")
```

Just call twice. Useful for tracking when a base section was amended or split.

## Find every place a phrase appears

```
ars_search(query="independent expenditure", limit=50)
```

Returns up to 50 sections mentioning the phrase. Use `limit` to control how many you scan.

## Quick civic-research patterns

### Sign disclaimer compliance
```
ars_get_section("16-925")    # the rules
ars_get_section("16-1019")   # ROW provisions
ars_search("disclaimer", title=16, limit=10)
```

### Open records
```
ars_get_section("39-121")    # general open records statute
ars_search("public records", title=39)
```

### Open meetings
```
ars_search("open meeting", title=38, limit=20)
```

### Election law overview
```
ars_list_sections(title=16, limit=359)   # all of Title 16
ars_search("voter registration", title=16, limit=20)
```

## Composing investigations

A typical multi-step civic-research loop:

1. **Get oriented:** `ars_list_titles()` to see the landscape
2. **Find the right title:** narrow to e.g. Title 16 for elections
3. **Browse:** `ars_list_sections(title=16, limit=200)` to see section names
4. **Search within:** `ars_search(query="X", title=16)` to find specific topics
5. **Read deeply:** `ars_get_section(citation="16-Y")` to get full text
6. **Cross-reference:** repeat for related sections

That's the standard research loop. The MCP makes each step a single tool call instead of a curl + parse + normalize cycle.

## Combining with the SOS MCP

For campaign finance work specifically, pair this MCP with the [SOS MCP](https://github.com/az-civic-tools/sos-mcp):

- **ARS MCP** for "what does the law require?"
- **SOS MCP** for "did this committee comply?"

Example workflow:
1. `ars_get_section("16-925")` — read the disclaimer requirements
2. `sos_committee_transactions(entity_id=...)` — see what a committee actually filed
3. `sos_vrka_search(filer_id=...)` — see if they filed VRKA when they should have
4. Cross-reference against the statutory triggers in `ars_get_section("16-973")`

That's the full civic-tech research loop.
