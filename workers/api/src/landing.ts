// Static landing page served from the Worker at "/"
// Designed to be small, distinctive, and self-explanatory.

export const LANDING_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Arizona Revised Statutes — MCP server &amp; REST API</title>
<meta name="description" content="Free, open-source MCP server and REST API for the Arizona Revised Statutes. No key. Plug it into Claude Desktop, Cursor, or any MCP client." />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='28'%3E%F0%9F%8C%B5%3C/text%3E%3C/svg%3E" />
<style>
  :root {
    --bg: #f6f1e7;
    --bg-2: #ede4d0;
    --ink: #1a1f1c;
    --ink-soft: #4a5048;
    --accent: #b3460c;
    --accent-2: #5b7a4f;
    --rule: #2a2f2c;
    --code-bg: #1a1f1c;
    --code-ink: #f6f1e7;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
    background: var(--bg);
    color: var(--ink);
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 760px; margin: 0 auto; padding: 4rem 1.5rem 6rem; }
  .stamp {
    display: inline-block;
    border: 2px solid var(--ink);
    padding: 0.2rem 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.7rem;
    transform: rotate(-1.5deg);
    color: var(--ink);
    background: var(--bg-2);
  }
  h1 {
    font-size: clamp(2.2rem, 5vw, 3.4rem);
    line-height: 1.05;
    margin: 1.2rem 0 0.6rem;
    letter-spacing: -0.02em;
  }
  h1 .accent { color: var(--accent); }
  .lede {
    font-size: 1.18rem;
    color: var(--ink-soft);
    max-width: 60ch;
  }
  hr.rule {
    border: none;
    border-top: 1px solid var(--rule);
    margin: 2.4rem 0 1.6rem;
    opacity: 0.35;
  }
  h2 {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.82rem;
    color: var(--accent-2);
    margin: 2.2rem 0 0.7rem;
  }
  pre, code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.86rem;
  }
  pre {
    background: var(--code-bg);
    color: var(--code-ink);
    padding: 1.1rem 1.2rem;
    border-radius: 6px;
    overflow-x: auto;
    line-height: 1.5;
    border-left: 3px solid var(--accent);
  }
  code:not(pre code) {
    background: var(--bg-2);
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
  }
  ul.routes {
    list-style: none;
    padding: 0;
    margin: 0.6rem 0;
  }
  ul.routes li {
    padding: 0.45rem 0;
    border-bottom: 1px dashed rgba(42, 47, 44, 0.25);
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: baseline;
  }
  ul.routes li:last-child { border-bottom: none; }
  ul.routes code { background: transparent; padding: 0; color: var(--ink); }
  ul.routes .desc { color: var(--ink-soft); font-size: 0.92rem; text-align: right; }
  a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
  a:hover { color: var(--ink); }
  .tools {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.8rem;
    margin: 0.6rem 0;
  }
  .tools .tool {
    padding: 0.8rem 1rem;
    background: var(--bg-2);
    border-left: 3px solid var(--accent-2);
  }
  .tools .tool code { background: transparent; padding: 0; }
  .tools .tool .name {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: var(--accent);
    font-weight: 600;
    font-size: 0.92rem;
  }
  .tools .tool .desc {
    font-size: 0.9rem;
    color: var(--ink-soft);
    margin-top: 0.2rem;
  }
  footer {
    margin-top: 3rem;
    padding-top: 1.2rem;
    border-top: 1px solid rgba(42, 47, 44, 0.25);
    color: var(--ink-soft);
    font-size: 0.88rem;
  }
  footer a { color: var(--accent-2); }
  .disclaimer {
    background: var(--bg-2);
    border-left: 3px solid var(--accent);
    padding: 0.9rem 1.1rem;
    margin-top: 1.4rem;
    font-size: 0.92rem;
    color: var(--ink-soft);
  }
</style>
</head>
<body>
<main class="wrap">
  <span class="stamp">Mirror, not authority</span>
  <h1>Arizona <span class="accent">Revised</span><br/>Statutes.</h1>
  <p class="lede">
    A free, open-source MCP server and REST API for the Arizona Revised Statutes (ARS). Add it to Claude Desktop, Cursor, or any MCP client. Or just <code>curl</code>.
  </p>

  <hr class="rule" />

  <h2>Add to Claude Desktop</h2>
  <pre><code>{
  "mcpServers": {
    "arizona-statutes": {
      "url": "https://ars.cactus.watch/mcp"
    }
  }
}</code></pre>

  <h2>MCP Tools</h2>
  <div class="tools">
    <div class="tool"><div class="name">ars_get_section</div><div class="desc">Pull a section by citation, e.g. 16-901.</div></div>
    <div class="tool"><div class="name">ars_search</div><div class="desc">Full-text search, optionally scoped to a title.</div></div>
    <div class="tool"><div class="name">ars_list_titles</div><div class="desc">All 47 active titles with section counts.</div></div>
    <div class="tool"><div class="name">ars_list_sections</div><div class="desc">List sections within a title.</div></div>
  </div>

  <h2>REST API</h2>
  <ul class="routes">
    <li><code>GET /api/ars/titles</code><span class="desc">All titles with counts</span></li>
    <li><code>GET /api/ars/titles/:n</code><span class="desc">Sections within a title</span></li>
    <li><code>GET /api/ars/sections/:id</code><span class="desc">One section by citation</span></li>
    <li><code>GET /api/ars/:id</code><span class="desc">Same, shorthand</span></li>
    <li><code>GET /api/ars/search?q=</code><span class="desc">Full-text search</span></li>
  </ul>

  <pre><code>curl https://ars.cactus.watch/api/ars/16-901
curl "https://ars.cactus.watch/api/ars/search?q=campaign+contribution&amp;title=16"</code></pre>

  <div class="disclaimer">
    <strong>This mirror is not authoritative.</strong> Source: <a href="https://www.azleg.gov/arstitle/">azleg.gov</a>. Re-scraped weekly. For any legal, regulatory, or compliance use, refer to the official text.
  </div>

  <footer>
    Built by <a href="https://cactus.watch">Cactus Watch</a> &middot;
    Source on <a href="https://github.com/az-civic-tools/ars-mcp">GitHub</a> &middot;
    <a href="https://github.com/az-civic-tools/ars-mcp/blob/main/LICENSE">MIT</a>
  </footer>
</main>
</body>
</html>`;
