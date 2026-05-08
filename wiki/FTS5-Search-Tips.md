# FTS5 Search Tips

The `ars_search` tool runs queries against an FTS5 virtual table in SQLite (Cloudflare D1). Understanding how the indexer handles your query helps you get better results.

## How queries are tokenized

The MCP wraps your query like this:

```
"token1"* AND "token2"* AND "token3"*
```

So a query like `"campaign contribution disclosure"` becomes three prefix tokens, all of which must appear in the same section.

The body and section name are indexed using the **porter** stemmer plus **unicode61** tokenizer. This means:

- `disclosure` matches `disclosed`, `disclosing`, `disclosures`
- `vote` matches `voted`, `voting`, `voter`, `voters`
- `contribute` matches `contribution`, `contributions`, `contributor`, `contributing`

Useful 90% of the time, occasionally surprising. Example: `"major contributors disclosure"` (the natural phrase) returns 0 results because the stemmer turns each into something else and the AND-of-stems doesn't co-occur.

## Patterns that work well

### Single distinctive word
```
ars_search(query="VRKA")
```
Returns the cleanest results — VRKA is a specific term that doesn't stem to anything common.

### Two-word concept, common
```
ars_search(query="campaign contribution")
```
Returns sections discussing campaign + contribution. Works because both words are common in the same sections.

### Restrict to a title
```
ars_search(query="disclaimer", title=16)
```
Restricts noise. Title 16 = Elections, so "disclaimer" surfaces sign disclaimer law (16-925).

### Exact phrase via single-word lookup
If you know the section number, use `ars_get_section` instead of search. Search is for "I don't know which section."

## Patterns that work less well

### Long natural-language queries
```
ars_search(query="how much can a PAC contribute to a candidate")
```
Too many AND'd tokens. Try: `query="political action committee contribution limit"` or just browse Title 16.

### Three+ uncommon words together
```
ars_search(query="major contributors threshold")
```
Each word is uncommon, requiring all three to appear together is restrictive. Try one at a time, then narrow.

### Acronyms with stemming collisions
`major` stems to `major`, but `majority` also stems there. So `query="major"` matches both. Most of the time fine, occasionally surprising.

## Snippets and ranking

Each hit includes:

- `snippet`: a window around the match with `<<term>>` highlighting (16 words on each side)
- `rank`: bm25 score (lower = better, sorted ascending)

The snippet shows where in the body the match was. Use it to decide whether to call `ars_get_section` for the full text.

## When search disappoints

If a search returns nothing or weird results:

1. **Try fewer words.** Drop the most generic word.
2. **Try a synonym.** "Contribution" vs "donation" vs "payment".
3. **Try the title-scoped version.** `title=16` filters to elections, `title=13` to criminal code, `title=41` to state government.
4. **Browse instead.** `ars_list_sections(title=16)` lists every section in Title 16 — sometimes you find what you want by section name alone.
5. **Use `ars_get_section` if you know the cite.** Don't search "16-925", just look it up directly.

## Common citation/topic mappings

| Looking for | Try |
|-------------|-----|
| Sign disclaimer law | `ars_get_section("16-925")` |
| VRKA / Prop 211 | `ars_search("VRKA")` or sections 16-971 through 16-979 |
| Public records | `ars_search("public records", title=39)` |
| Open meetings | `ars_search("open meeting", title=38)` |
| Campaign finance generally | `ars_search("campaign finance", title=16)` |
| DUI | `ars_search("driving under the influence", title=28)` or 28-1381+ |
| Voter eligibility | `ars_search("qualifications", title=16)` or 16-101 |

## Debugging your query

If you want to see exactly what FTS5 is matching, hit the REST API:

```bash
curl "https://ars.cactus.watch/api/ars/search?q=YOUR+QUERY&limit=5"
```

The `snippet` field shows the matched terms in context. If they're not what you expected, refine.
