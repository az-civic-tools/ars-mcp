export interface Env {
  DB: D1Database;
  SITE_NAME: string;
  MCP_OBJECT: DurableObjectNamespace;
}

export interface Section {
  id: string;
  title: number;
  chapter: number | null;
  article: number | null;
  section_number: string;
  section_name: string | null;
  body: string;
  source_url: string;
  updated_at: number;
}

export interface SearchHit {
  id: string;
  title: number;
  section_number: string;
  section_name: string | null;
  snippet: string;
  source_url: string;
  rank: number;
}

export interface TitleSummary {
  title: number;
  name: string;
  sections: number;
}

export const DISCLAIMER =
  "Source: azleg.gov. Mirror not authoritative. Verify against the official text before relying on it for legal or compliance purposes.";
