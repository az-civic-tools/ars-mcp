import { scrapeTitle } from "./scrape";
import { ACTIVE_TITLES, isActiveTitle } from "./titles";
import type { Env, ScrapeStats } from "./types";

const MAX_TITLES_PER_CRON = 5;

function authed(req: Request, env: Env): boolean {
  const h = req.headers.get("authorization") ?? "";
  const token = h.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 && token === env.SCRAPE_AUTH_TOKEN;
}

async function logRunStart(env: Env, title: number | null): Promise<number> {
  const r = await env.DB.prepare(
    `INSERT INTO scrape_runs (title, started_at, status) VALUES (?, ?, 'running')`
  )
    .bind(title, Math.floor(Date.now() / 1000))
    .run();
  return Number(r.meta.last_row_id);
}

async function logRunFinish(
  env: Env,
  id: number,
  stats: ScrapeStats | null,
  error?: string
): Promise<void> {
  await env.DB.prepare(
    `UPDATE scrape_runs SET
       finished_at = ?, status = ?, sections_seen = ?, sections_new = ?,
       sections_changed = ?, sections_errored = ?, error = ?
     WHERE id = ?`
  )
    .bind(
      Math.floor(Date.now() / 1000),
      error ? "failed" : "success",
      stats?.seen ?? 0,
      stats?.created ?? 0,
      stats?.changed ?? 0,
      stats?.errored ?? 0,
      error ?? null,
      id
    )
    .run();
}

async function pickStaleTitles(env: Env, n: number): Promise<number[]> {
  const r = await env.DB.prepare(
    `SELECT title FROM titles_meta ORDER BY COALESCE(last_scraped_at, 0) ASC`
  ).all<{ title: number }>();
  const known = r.results.map((x) => x.title);
  const knownSet = new Set(known);
  const missing = ACTIVE_TITLES.filter((t) => !knownSet.has(t));
  return [...missing, ...known].slice(0, n);
}

async function runOne(env: Env, title: number): Promise<{ title: number } & Partial<ScrapeStats> & { error?: string }> {
  const runId = await logRunStart(env, title);
  try {
    const stats = await scrapeTitle(title, env);
    await logRunFinish(env, runId, stats);
    return { title, ...stats };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logRunFinish(env, runId, null, msg);
    return { title, error: msg };
  }
}

const json = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json" },
    ...init,
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/health") return new Response("ok");

    if (request.method === "POST") {
      if (!authed(request, env)) {
        return new Response("unauthorized", { status: 401 });
      }

      const titleMatch = path.match(/^\/scrape\/title\/(\d+)$/);
      if (titleMatch) {
        const t = parseInt(titleMatch[1], 10);
        if (!isActiveTitle(t)) {
          return json({ error: `title ${t} is not active` }, { status: 400 });
        }
        const result = await runOne(env, t);
        return json(result);
      }

      if (path === "/scrape/cron") {
        const titles = await pickStaleTitles(env, MAX_TITLES_PER_CRON);
        const ran: Array<Awaited<ReturnType<typeof runOne>>> = [];
        for (const t of titles) ran.push(await runOne(env, t));
        return json({ ran });
      }
    }

    return new Response("ARS scraper. POST to /scrape/title/:N or /scrape/cron with bearer token.", {
      headers: { "content-type": "text/plain" },
    });
  },

  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const titles = await pickStaleTitles(env, MAX_TITLES_PER_CRON);
    for (const t of titles) {
      try {
        await runOne(env, t);
      } catch (e) {
        console.error(`cron failed for title ${t}:`, e);
      }
    }
  },
} satisfies ExportedHandler<Env>;
