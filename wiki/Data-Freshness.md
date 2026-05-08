# Data Freshness

How often the mirror updates, what `updated_at` actually means, and what to expect when new statutes are signed into law.

## Update cadence

**Weekly cron** runs every Monday at 13:00 UTC (06:00 Arizona time). Each cron pick rescrapes the **5 titles with the oldest `last_scraped_at`** in `titles_meta`. Full-code refresh cycle: roughly **10 weeks**.

This is overkill for the AZ statutes' actual change rate (annual), but it gives us:
- Coverage for emergency legislation effective immediately on signing
- Self-healing if a title scrape ever errors mid-run
- A predictable upper bound on staleness — no section is ever more than ~70 days old in the mirror

## How AZ statutes actually update

The Arizona Legislature meets January through May (60-day session, with possible extensions). Bills passed:

1. Get signed by the Governor (or veto'd / become law without signature)
2. Are published in the **Session Laws** by the Legislative Council
3. Are codified into the Arizona Revised Statutes by Council staff

Effective dates are usually:
- **General effective date:** 90 days after the session ends (roughly Aug-Oct)
- **Emergency clause:** immediately on signing
- **Specific effective date:** as written in the bill (most commonly January 1 or July 1 of the following year)

azleg.gov's ARS index reflects the **codified** version. So a bill signed in May 2026 with general effective date probably shows up at azleg.gov by late August or September 2026, depending on Council workload.

## What `updated_at` means

Each section in the mirror has two timestamps:

- **`scraped_at`** — every time we hit the upstream and confirm the section exists, we touch this. So `scraped_at` reflects "when did we last verify this section is current?"
- **`updated_at`** — only changes when the actual content changes. We hash the body on each scrape; if the hash differs from what's in D1, we bump `updated_at`. Otherwise we leave it alone.

So **`updated_at` is a real change timestamp, not a "we looked at it" timestamp**. If you want to find sections that were modified recently, query for high `updated_at`.

## Forcing a fresh scrape

If you know a section just changed and want to pull it now, the manual endpoint lives at the scraper Worker (auth-gated):

```bash
TOKEN=$(security find-generic-password -a "$USER" -s "ars-mcp-scrape-token" -w)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://ars-scraper.alex-logvin.workers.dev/scrape/title/16
```

This rescrapes Title 16 immediately, regardless of cron schedule.

## What if a scrape fails?

Each scrape attempt logs to `scrape_runs` with status `running`, `success`, or `failed`. If a Worker request runs out of subrequests mid-title (the largest titles cut it close), the run finishes with the partial data already saved.

The next cron pick will see that title is still "stale-ish" and re-scrape it cleanly. No manual intervention needed.

## Coverage gaps to know about

- **Repealed sections** — silently dropped. If `azleg.gov/ars/16/00102.htm` 404s (because § 16-102 was repealed), our scraper just skips it. It will not appear in the mirror.
- **Newly-added sections** — added on next scrape of that title (within ~10 weeks worst case)
- **Renumbered sections** — the old citation will still appear in the mirror until the next title-level rescrape removes it (since the upstream's `arsDetail/?title=N` page no longer lists it)
- **Recodified sections** — if a section moves from Title X to Title Y, both the old and new will appear briefly until both titles are rescraped

For anything where these edge cases matter (court filings, formal complaints), verify against azleg.gov directly.

## Bootstrap history

The initial bootstrap scrape ran 2026-05-06 at ~1 req/s, taking ~5 hours total (47 titles × avg ~250 sections × ~1.1s/section). The MacBook went to sleep partway through, dropping ~20 titles; a recovery script run under `caffeinate -is` finished the job overnight.

All 47 active titles, 22,780 sections, completed by 2026-05-07 02:07 MST.

## Monitoring

The `scrape_runs` table has a row for every scrape attempt. You can query it via Wrangler:

```bash
npx wrangler d1 execute ars-mcp-db --remote \
  --command "SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT 10"
```

For each run:
- `started_at` / `finished_at` — wall-clock bounds
- `sections_seen` / `sections_new` / `sections_changed` / `sections_errored` — counts
- `status` — running / success / failed
- `error` — exception text if failed

A healthy weekly cron should show 5 entries per Monday with `status=success`, mostly `sections_changed=0` (the AZ statutes don't change much week to week).
