#!/usr/bin/env bash
# Recovery scrape — re-trigger titles missing or incomplete after bootstrap.
# Idempotent: scrapeTitle skips unchanged sections.

set -u

TOKEN=$(security find-generic-password -a "$USER" -s "ars-mcp-scrape-token" -w 2>/dev/null)
ENDPOINT="${SCRAPER_ENDPOINT:-https://ars-scraper.alex-logvin.workers.dev}"
LOG="${LOG:-$HOME/Documents/development/ars-mcp/scripts/recover.log}"

# Titles missing from initial bootstrap (DNS dropped @ Title 31)
# Plus Title 28 was incomplete (only 55 sections in DB, should be much more)
MISSING=(28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 48 49)

echo "=== Recovery scrape started: $(date) ===" | tee -a "$LOG"
echo "Titles to retry: ${MISSING[*]}" | tee -a "$LOG"

for t in "${MISSING[@]}"; do
  echo "--- Title $t @ $(date +%H:%M:%S) ---" | tee -a "$LOG"
  # Retry up to 3 times per title to ride out transient network issues
  for attempt in 1 2 3; do
    resp=$(curl -sS -X POST \
      -H "Authorization: Bearer $TOKEN" \
      --max-time 3600 \
      --connect-timeout 30 \
      --retry 0 \
      "$ENDPOINT/scrape/title/$t" 2>&1)
    if echo "$resp" | grep -q '"seen"'; then
      echo "$resp" | tee -a "$LOG"
      break
    fi
    echo "Attempt $attempt failed for title $t, retrying in 30s..." | tee -a "$LOG"
    sleep 30
  done
  echo "" >> "$LOG"
  sleep 5
done

echo "=== Recovery scrape finished: $(date) ===" | tee -a "$LOG"
