-- ARS MCP schema
-- D1 with FTS5 full-text search

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,                -- canonical citation: "16-925.01"
  title INTEGER NOT NULL,
  chapter INTEGER,                    -- optional, populated when known
  article INTEGER,                    -- optional, populated when known
  section_number TEXT NOT NULL,       -- "925.01" (text to preserve form)
  section_sort REAL NOT NULL,         -- 925.01 for ORDER BY
  section_name TEXT,
  body TEXT NOT NULL,                 -- plain text
  body_html TEXT,                     -- preserved HTML
  source_url TEXT NOT NULL,
  content_hash TEXT NOT NULL,         -- sha256 of body, change detection
  scraped_at INTEGER NOT NULL,        -- unix epoch (every scrape touches this)
  updated_at INTEGER NOT NULL         -- unix epoch (only on content change)
);

CREATE INDEX IF NOT EXISTS idx_sections_title ON sections(title, section_sort);
CREATE INDEX IF NOT EXISTS idx_sections_title_chapter ON sections(title, chapter, section_sort);

CREATE VIRTUAL TABLE IF NOT EXISTS sections_fts USING fts5(
  id UNINDEXED,
  section_name,
  body,
  content='sections',
  content_rowid='rowid',
  tokenize='porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS sections_ai AFTER INSERT ON sections BEGIN
  INSERT INTO sections_fts(rowid, id, section_name, body)
  VALUES (new.rowid, new.id, new.section_name, new.body);
END;

CREATE TRIGGER IF NOT EXISTS sections_ad AFTER DELETE ON sections BEGIN
  INSERT INTO sections_fts(sections_fts, rowid, id, section_name, body)
  VALUES('delete', old.rowid, old.id, old.section_name, old.body);
END;

CREATE TRIGGER IF NOT EXISTS sections_au AFTER UPDATE ON sections BEGIN
  INSERT INTO sections_fts(sections_fts, rowid, id, section_name, body)
  VALUES('delete', old.rowid, old.id, old.section_name, old.body);
  INSERT INTO sections_fts(rowid, id, section_name, body)
  VALUES (new.rowid, new.id, new.section_name, new.body);
END;

CREATE TABLE IF NOT EXISTS titles_meta (
  title INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  last_scraped_at INTEGER
);

CREATE TABLE IF NOT EXISTS scrape_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title INTEGER,                      -- NULL for full-code runs
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  status TEXT NOT NULL,               -- 'running' | 'success' | 'failed'
  sections_seen INTEGER DEFAULT 0,
  sections_new INTEGER DEFAULT 0,
  sections_changed INTEGER DEFAULT 0,
  sections_errored INTEGER DEFAULT 0,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_started ON scrape_runs(started_at DESC);
