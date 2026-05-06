import type { Section, SearchHit, TitleSummary } from "./types";

export async function getSection(db: D1Database, id: string): Promise<Section | null> {
  return await db
    .prepare(
      `SELECT id, title, chapter, article, section_number, section_name,
              body, source_url, updated_at
       FROM sections WHERE id = ?`
    )
    .bind(id)
    .first<Section>();
}

export async function listTitles(db: D1Database): Promise<TitleSummary[]> {
  const r = await db
    .prepare(
      `SELECT t.title, t.name, COUNT(s.id) AS sections
       FROM titles_meta t
       LEFT JOIN sections s ON s.title = t.title
       GROUP BY t.title
       ORDER BY t.title`
    )
    .all<TitleSummary>();
  return r.results;
}

export async function listSectionsInTitle(
  db: D1Database,
  title: number,
  limit: number,
  offset: number
): Promise<Section[]> {
  const r = await db
    .prepare(
      `SELECT id, title, chapter, article, section_number, section_name,
              body, source_url, updated_at
       FROM sections WHERE title = ?
       ORDER BY section_sort ASC LIMIT ? OFFSET ?`
    )
    .bind(title, limit, offset)
    .all<Section>();
  return r.results;
}

export async function searchSections(
  db: D1Database,
  q: string,
  opts: { title?: number; limit?: number }
): Promise<SearchHit[]> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const ftsQuery = sanitizeFtsQuery(q);
  if (!ftsQuery) return [];

  const params: Array<string | number> = [ftsQuery];
  let titleFilter = "";
  if (opts.title != null) {
    titleFilter = "AND s.title = ?";
    params.push(opts.title);
  }
  params.push(limit);

  const sql = `
    SELECT s.id, s.title, s.section_number, s.section_name, s.source_url,
           snippet(sections_fts, 2, '<<', '>>', '...', 16) AS snippet,
           bm25(sections_fts) AS rank
    FROM sections_fts
    JOIN sections s ON s.rowid = sections_fts.rowid
    WHERE sections_fts MATCH ? ${titleFilter}
    ORDER BY rank
    LIMIT ?
  `;
  const r = await db.prepare(sql).bind(...params).all<SearchHit>();
  return r.results;
}

function sanitizeFtsQuery(q: string): string {
  // Strip FTS5 special characters to prevent parse errors / injection
  const stripped = q.replace(/["'()*+\-:^~]/g, " ").trim();
  const tokens = stripped.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return "";
  // Treat each token as a prefix match, AND them together
  return tokens.map((t) => `"${t}"*`).join(" AND ");
}
