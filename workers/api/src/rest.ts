import {
  getSection,
  listTitles,
  listSectionsInTitle,
  searchSections,
} from "./queries";
import { DISCLAIMER, type Env } from "./types";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...(init?.headers ?? {}),
    },
  });
}

export async function handleRest(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== "GET") {
    return json({ error: "method not allowed" }, { status: 405 });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/ars/titles") {
    const titles = await listTitles(env.DB);
    return json({ titles, disclaimer: DISCLAIMER });
  }

  let m = path.match(/^\/api\/ars\/titles\/(\d+)$/);
  if (m) {
    const t = parseInt(m[1], 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "200", 10), 500);
    const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10), 0);
    const sections = await listSectionsInTitle(env.DB, t, limit, offset);
    return json({ title: t, sections, limit, offset, disclaimer: DISCLAIMER });
  }

  if (path === "/api/ars/search") {
    const q = url.searchParams.get("q") ?? "";
    if (!q.trim()) return json({ error: "missing q parameter" }, { status: 400 });
    const titleParam = url.searchParams.get("title");
    const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);
    const hits = await searchSections(env.DB, q, {
      title: titleParam ? parseInt(titleParam, 10) : undefined,
      limit,
    });
    return json({ q, hits, disclaimer: DISCLAIMER });
  }

  m = path.match(/^\/api\/ars\/sections\/([\d.\-]+)$/);
  if (m) {
    const id = m[1];
    const section = await getSection(env.DB, id);
    if (!section) return json({ error: `section ${id} not found` }, { status: 404 });
    return json({ section, disclaimer: DISCLAIMER });
  }

  // Friendly shorthand: /api/ars/16-901
  m = path.match(/^\/api\/ars\/(\d+-[\d.]+)$/);
  if (m) {
    const id = m[1];
    const section = await getSection(env.DB, id);
    if (!section) return json({ error: `section ${id} not found` }, { status: 404 });
    return json({ section, disclaimer: DISCLAIMER });
  }

  return json({ error: "not found", path }, { status: 404 });
}
