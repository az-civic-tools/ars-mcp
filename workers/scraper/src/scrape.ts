import { parseSection, parseSectionListPage } from "./parse";
import { titleName } from "./titles";
import type { Env, ScrapeStats } from "./types";

const BASE = "https://www.azleg.gov";
const POLITE_DELAY_MS = 1100;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchHtml(url: string, env: Env): Promise<string> {
  const r = await fetch(url, {
    headers: { "user-agent": env.USER_AGENT },
    cf: { cacheTtl: 0, cacheEverything: false },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} fetching ${url}`);
  return r.text();
}

export async function scrapeTitle(title: number, env: Env): Promise<ScrapeStats> {
  const detailUrl = `${BASE}/arsDetail/?title=${title}`;
  const detailHtml = await fetchHtml(detailUrl, env);
  const { sectionUrls } = parseSectionListPage(detailHtml, title);

  await env.DB.prepare(
    `INSERT INTO titles_meta (title, name, source_url, last_scraped_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(title) DO UPDATE SET
       name = excluded.name,
       source_url = excluded.source_url,
       last_scraped_at = excluded.last_scraped_at`
  )
    .bind(title, titleName(title), detailUrl, Math.floor(Date.now() / 1000))
    .run();

  const stats: ScrapeStats = { seen: 0, created: 0, changed: 0, errored: 0 };

  for (const url of sectionUrls) {
    stats.seen++;
    try {
      await sleep(POLITE_DELAY_MS);
      const html = await fetchHtml(url, env);
      const parsed = parseSection(html, url, title);
      if (!parsed) {
        stats.errored++;
        continue;
      }

      const hash = await sha256Hex(parsed.body);
      const now = Math.floor(Date.now() / 1000);

      const existing = await env.DB.prepare(
        `SELECT content_hash FROM sections WHERE id = ?`
      )
        .bind(parsed.id)
        .first<{ content_hash: string }>();

      if (!existing) {
        await env.DB.prepare(
          `INSERT INTO sections
            (id, title, chapter, article, section_number, section_sort,
             section_name, body, body_html, source_url, content_hash,
             scraped_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            parsed.id,
            parsed.title,
            parsed.chapter,
            parsed.article,
            parsed.section_number,
            parsed.section_sort,
            parsed.section_name,
            parsed.body,
            parsed.body_html,
            parsed.source_url,
            hash,
            now,
            now
          )
          .run();
        stats.created++;
      } else if (existing.content_hash !== hash) {
        await env.DB.prepare(
          `UPDATE sections SET
             chapter = ?, article = ?, section_number = ?, section_sort = ?,
             section_name = ?, body = ?, body_html = ?, source_url = ?,
             content_hash = ?, scraped_at = ?, updated_at = ?
           WHERE id = ?`
        )
          .bind(
            parsed.chapter,
            parsed.article,
            parsed.section_number,
            parsed.section_sort,
            parsed.section_name,
            parsed.body,
            parsed.body_html,
            parsed.source_url,
            hash,
            now,
            now,
            parsed.id
          )
          .run();
        stats.changed++;
      } else {
        await env.DB.prepare(`UPDATE sections SET scraped_at = ? WHERE id = ?`)
          .bind(now, parsed.id)
          .run();
      }
    } catch (e) {
      stats.errored++;
      console.error(`scrape failed for ${url}:`, e);
    }
  }

  return stats;
}
