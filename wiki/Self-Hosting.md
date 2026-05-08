# Self-Hosting

You don't need to self-host to use this — `ars.cactus.watch` is free and public. But if you want your own copy (different rate, different cache, fork for another state's revised statutes), here's the playbook.

## Prerequisites

- Node.js 20+
- A Cloudflare account (free tier is fine)
- `wrangler` CLI: `npm install -g wrangler`

## Steps

### 1. Clone the repo

```bash
git clone https://github.com/az-civic-tools/ars-mcp.git
cd ars-mcp
```

### 2. Install deps in both Workers

```bash
cd workers/api && npm install && cd ../..
cd workers/scraper && npm install && cd ../..
```

### 3. Create a D1 database

```bash
cd workers/api
npx wrangler d1 create ars-mcp-db
```

Wrangler will print an ID. Copy it into `wrangler.toml` (both `workers/api/wrangler.toml` AND `workers/scraper/wrangler.toml`):

```toml
[[d1_databases]]
binding = "DB"
database_name = "ars-mcp-db"
database_id = "your-id-here"
```

### 4. Run the schema migration

```bash
npx wrangler d1 execute ars-mcp-db --remote \
  --file=../../schema/0001_init.sql
```

This creates the `sections`, `sections_fts`, `titles_meta`, and `scrape_runs` tables, plus the FTS5 triggers.

### 5. Set the scraper auth secret

```bash
cd ../scraper
TOKEN=$(openssl rand -hex 32)
echo "$TOKEN" | npx wrangler secret put SCRAPE_AUTH_TOKEN
# Save $TOKEN somewhere safe — you'll need it to manually trigger scrapes
```

### 6. Update routes (optional)

If you want a custom domain, update the `routes` block in `workers/api/wrangler.toml`:

```toml
routes = [
  { pattern = "your-domain.example.com", custom_domain = true }
]
```

If you don't want a custom domain, just delete the `routes` block. The Worker will be available at `<worker-name>.<your-account>.workers.dev`.

### 7. Deploy

```bash
# In workers/scraper:
npx wrangler deploy

# In workers/api:
cd ../api
npx wrangler deploy
```

Both Workers are live.

### 8. Bootstrap scrape

The first scrape needs to populate every title. Run sequentially:

```bash
SCRAPER_URL="https://ars-scraper.YOUR-SUBDOMAIN.workers.dev"
TOKEN="your-token-from-step-5"

for t in 1 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49; do
  echo "Title $t..."
  curl -X POST -H "Authorization: Bearer $TOKEN" "$SCRAPER_URL/scrape/title/$t"
  echo
  sleep 5
done
```

This takes 3-5 hours at the polite ~1 req/s rate. Run under `caffeinate -is` on Mac so the laptop doesn't sleep midway:

```bash
caffeinate -is ./bootstrap.sh
```

There's a sample script at `scripts/bootstrap-scrape.sh` in the repo.

### 9. Verify

```bash
curl https://your-domain/health
# -> ok

curl https://your-domain/api/ars/titles | head
# -> {"titles": [...], "disclaimer": "..."}

curl https://your-domain/api/ars/16-925
# -> full text of A.R.S. § 16-925
```

## Configuration

The scraper Worker reads:

| Var | Default | Notes |
|-----|---------|-------|
| `USER_AGENT` | `ars-mcp-scraper/0.1 ...` | Identifies your traffic to azleg.gov |
| `SCRAPE_AUTH_TOKEN` | (secret) | Required for manual `/scrape/title/:N` calls |

The API Worker reads:

| Var | Default | Notes |
|-----|---------|-------|
| `SITE_NAME` | `Arizona Revised Statutes` | Cosmetic |

Update `USER_AGENT` to identify your fork — include a contact (email, domain) so azleg.gov can reach you if something goes wrong.

## Cost

Cloudflare Workers free tier:
- 100,000 requests / day per Worker
- 10ms CPU per request

D1 free tier:
- 5 GB storage
- 5M reads / day
- 100K writes / day

Realistically you'll never hit the free-tier limits. The current `ars.cactus.watch` deployment runs entirely free.

## Forking for another state

The architecture generalizes to any state with bare-HTML statute pages. To fork for, say, Texas Revised Statutes:

1. **Identify the URL pattern.** Find the bare-HTML form (not the SPA wrapper) at the official site. AZ uses `/ars/{title}/{NNNNN}.htm`. Texas might use something different.

2. **Update `workers/scraper/src/titles.ts`** with the target state's title list and names.

3. **Update `workers/scraper/src/parse.ts`** for the new page format. The two parsers needed are:
   - Section list page → list of section URLs
   - Section page → ParsedSection (id, body, name, etc.)

4. **Update `wrangler.toml`** with new D1 name, route, etc.

5. **Update tools in `mcp.ts`** — rename from `ars_*` to `<state>_*` (or keep generic — your call).

6. **Repo / domain:** create `<state>-statutes-mcp` and a subdomain (e.g. `tx.cactus.watch`).

The hardest part is parser. If the target state's page structure differs significantly from AZ's `<font>` markup, you'll need to rewrite `htmlToText` and `parseSection`.

## Production hardening

If you're running this for serious traffic:

- **Add Cloudflare WAF** in front of the public API to throttle abuse
- **Monitor with Cloudflare Workers Analytics**
- **Set up alerting** on `scrape_runs.status='failed'` rows
- **Cache aggressively** at the Cloudflare edge layer (set Cache-Control on responses)
- **Pin upstream User-Agent** to a contact email so the agency can reach you

## Contributing back

If you find a missing edge case in parsing, a new title, a better normalization — please open a PR against the upstream `az-civic-tools/ars-mcp` repo. The goal is for any AZ user (and any forker) to benefit from the same canonical work.
