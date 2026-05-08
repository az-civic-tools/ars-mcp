# REST API

Every MCP tool has an equivalent REST endpoint. No key, no auth, just fetch.

Base: `https://ars.cactus.watch`

## GET /api/ars/titles

List all 47 active titles with names and section counts.

```bash
curl "https://ars.cactus.watch/api/ars/titles"
```

Returns:
```json
{
  "titles": [
    { "title": 1, "name": "General Provisions", "sections": 67 },
    { "title": 3, "name": "Agriculture", "sections": 733 },
    ...
  ],
  "disclaimer": "..."
}
```

## GET /api/ars/titles/:n

List sections within a title.

| Path | Notes |
|------|-------|
| `:n` | Title number (1–49) |

| Query | Default |
|-------|---------|
| `limit` | 200 |
| `offset` | 0 |

Max `limit`: 500.

```bash
curl "https://ars.cactus.watch/api/ars/titles/16?limit=50"
```

## GET /api/ars/sections/:id

Get a section by citation. Citation form: `TITLE-SECTION_NUMBER`.

```bash
curl "https://ars.cactus.watch/api/ars/sections/16-925"
curl "https://ars.cactus.watch/api/ars/sections/16-925.01"
curl "https://ars.cactus.watch/api/ars/sections/13-1001"
```

## GET /api/ars/:id (shorthand)

Same as `/api/ars/sections/:id` but shorter.

```bash
curl "https://ars.cactus.watch/api/ars/16-925"
```

## GET /api/ars/search

Full-text search.

| Query | Default |
|-------|---------|
| `q` | required |
| `title` | (whole code) |
| `limit` | 20 |

Max `limit`: 100.

```bash
# Across whole code
curl "https://ars.cactus.watch/api/ars/search?q=campaign+contribution"

# Scoped to Title 16
curl "https://ars.cactus.watch/api/ars/search?q=disclaimer&title=16"

# Top 5 only
curl "https://ars.cactus.watch/api/ars/search?q=VRKA&limit=5"
```

Response shape:
```json
{
  "q": "VRKA",
  "hits": [
    {
      "id": "16-971",
      "title": 16,
      "section_number": "971",
      "section_name": "Definitions",
      "snippet": "...the <<VRKA>> regulations require...",
      "source_url": "https://www.azleg.gov/ars/16/00971.htm",
      "rank": -0.0000019
    }
  ],
  "disclaimer": "..."
}
```

`rank` is bm25 (lower = more relevant — sorted ascending).

## Response shape (section detail)

```json
{
  "section": {
    "id": "16-925",
    "title": 16,
    "chapter": null,
    "article": null,
    "section_number": "925",
    "section_name": "Advertising and fundraising disclosure statements",
    "body": "16-925. Advertising and fundraising...",
    "source_url": "https://www.azleg.gov/ars/16/00925.htm",
    "updated_at": 1778089923
  },
  "disclaimer": "..."
}
```

Errors return `{ "error": "...", ... }` with appropriate HTTP status.

## Caching

The Worker doesn't cache — it reads from D1, which is already fast (~5-15ms reads at the edge). Cloudflare's edge cache handles repeated identical GETs at the layer above.

## CORS

All endpoints emit `access-control-allow-origin: *` so you can fetch from any origin in browser code.
