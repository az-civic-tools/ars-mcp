#!/usr/bin/env bash
# Bootstrap scrape — runs through all 47 active ARS titles, one at a time.
# At ~1 req/sec, full pass takes 3-5 hours.
# Re-runnable... existing sections with unchanged content are skipped (scraped_at touched only).

set -u

TOKEN=$(security find-generic-password -a "$USER" -s "ars-mcp-scrape-token" -w 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "ERROR: no scrape token in keychain (ars-mcp-scrape-token)" >&2
  exit 1
fi

ENDPOINT="${SCRAPER_ENDPOINT:-https://ars-scraper.alex-logvin.workers.dev}"
LOG="${LOG:-$HOME/Documents/development/ars-mcp/scripts/bootstrap.log}"

ACTIVE_TITLES=(1 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49)

echo "=== Bootstrap scrape started: $(date) ===" | tee -a "$LOG"
echo "Endpoint: $ENDPOINT" | tee -a "$LOG"
echo "Titles to scrape: ${#ACTIVE_TITLES[@]}" | tee -a "$LOG"

for t in "${ACTIVE_TITLES[@]}"; do
  echo "--- Title $t @ $(date +%H:%M:%S) ---" | tee -a "$LOG"
  resp=$(curl -sS -X POST \
    -H "Authorization: Bearer $TOKEN" \
    --max-time 1800 \
    "$ENDPOINT/scrape/title/$t" 2>&1)
  echo "$resp" | tee -a "$LOG"
  echo "" >> "$LOG"
  # tiny breather between titles
  sleep 3
done

echo "=== Bootstrap scrape finished: $(date) ===" | tee -a "$LOG"
