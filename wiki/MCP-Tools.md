# MCP Tools

Reference for all 4 tools exposed by the ARS MCP server. Every response includes a disclaimer footer pointing to azleg.gov as the authoritative source.

## ars_get_section

Look up a single section by citation.

| Input | Type | Notes |
|-------|------|-------|
| `citation` | string | Citation in any common form |

**Accepted citation forms:**
- `16-925`
- `A.R.S. § 16-925`
- `§ 16-925`
- `A.R.S. 16-925`
- `16-925.01` (decimal sections)
- `16-121.01`

**Returns:** the section heading (number + name), full body text, source URL on azleg.gov, and disclaimer.

**Example:**
```
ars_get_section(citation="16-925")
→
# A.R.S. § 16-925 — Advertising and fundraising disclosure statements

16-925. Advertising and fundraising disclosure statements

A. A person that makes an expenditure for an advertisement or fundraising
solicitation, other than an individual, shall include the following
disclosures in the advertisement or solicitation:

1. The words "paid for by", followed by the name of the person making the
expenditure for the advertisement or fundraising solicitation.
...

Source: https://www.azleg.gov/ars/16/00925.htm
Disclaimer: Source: azleg.gov. Mirror not authoritative...
```

If the section doesn't exist (e.g., repealed or never enacted), returns `Section X-Y not found in the mirror.`

---

## ars_search

Full-text search across all 22,780 indexed sections.

| Input | Type | Default |
|-------|------|---------|
| `query` | string, ≥1 char | required |
| `title` | int 1–49 | (whole code) |
| `limit` | int 1–50 | 20 |

**Returns:** ranked snippets with section citation, name, snippet (`<<term>>` highlights), and source URL.

The search uses FTS5 with the porter stemmer. Multi-word queries are AND'd together with prefix matching. So:

- `"campaign contribution"` → both "campaign*" AND "contribution*" anywhere in the body
- `"VRKA"` → exact term, prefix match
- `"sign disclaimer"` → both terms

**Example:**
```
ars_search(query="major contributors", title=16)
→
**A.R.S. § 16-940** — Findings and declarations
...the vast <<majority>> of Arizona citizens in favor of...
https://www.azleg.gov/ars/16/00940.htm
```

For tips on getting better results, see [FTS5 Search Tips](FTS5-Search-Tips).

---

## ars_list_titles

List all 47 active ARS titles with their names and section counts. Useful for getting oriented.

**No inputs.**

**Returns:** one line per title:
```
Title 1: General Provisions (67 sections)
Title 3: Agriculture (733 sections)
Title 4: Alcoholic Beverages (85 sections)
...
Title 49: The Environment (598 sections)
```

Titles 2 and 24 are repealed and skipped.

---

## ars_list_sections

Browse all sections within a title. Useful for "what's actually in this title" surveys.

| Input | Type | Default |
|-------|------|---------|
| `title` | int 1–49 | required |
| `limit` | int 1–500 | 200 |
| `offset` | int ≥0 | 0 |

**Returns:** one line per section:
```
§ 16-101 — Qualifications of registrant; definition
§ 16-103 — Persons not entitled to vote
§ 16-104 — Voter registration; effect
...
```

Paginate with `offset` and `limit` if you need more than 200.

---

## Common patterns across all tools

- **Citations are normalized.** The MCP accepts any common citation form and normalizes internally to `TITLE-SECTION_NUMBER`.
- **Disclaimer:** every response carries the "not authoritative" footer pointing to azleg.gov. Don't strip it.
- **Decimal sections:** `16-925.01` and similar work natively. Use the period form, not the hyphen form (the URL form on azleg.gov uses hyphen, but our MCP accepts the standard citation form with period).
- **Repealed sections:** not present in the mirror. The upstream's `/ars/16/00102.htm` 404s for repealed sections; we skip those during scrape.

## Output cleanliness note

Section bodies still have the section number + name duplicated at the top of the body text (e.g., the body for § 16-925 starts with `"16-925. Advertising and fundraising disclosure statements\n\n..."` before the actual statutory text). This is a known v1.1 cosmetic issue — search and display both still work correctly, but a future cleanup will strip the duplicated header.
