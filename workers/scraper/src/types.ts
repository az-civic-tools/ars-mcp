export interface Env {
  DB: D1Database;
  SCRAPE_AUTH_TOKEN: string;
  USER_AGENT: string;
}

export interface ParsedSection {
  id: string;
  title: number;
  chapter: number | null;
  article: number | null;
  section_number: string;
  section_sort: number;
  section_name: string | null;
  body: string;
  body_html: string;
  source_url: string;
}

export interface ScrapeStats {
  seen: number;
  created: number;
  changed: number;
  errored: number;
}
