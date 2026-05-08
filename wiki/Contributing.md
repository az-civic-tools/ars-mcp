# Contributing

Welcome. Contributions of any size are useful — bug reports, doc corrections, missing edge cases, or full new features.

## What we want

- **Bug reports.** Especially parsing edge cases (sections that don't render correctly, decimal sections we miss, broken citations).
- **Doc corrections.** Wiki pages out of date, examples that no longer return what they promise.
- **New tools.** Wrappers around different views of the data (e.g., `ars_list_chapters`, `ars_recently_changed`).
- **Test coverage.** Currently no automated tests — Vitest setup welcome.
- **Forks for other states.** If you stand one up, link it from the README.

## How to contribute

### Quick fix (typo, doc correction)

1. Edit on GitHub directly via the "Edit" button
2. Submit a PR against `main`

### Code change

1. Fork → branch → commit → push
2. Run `npx tsc --noEmit` in both `workers/api/` and `workers/scraper/`
3. `npx wrangler deploy --dry-run` to verify the build
4. Open a PR with:
   - What changed
   - How it was tested
   - Any new env vars or migrations

### Reporting a parsing edge case

If you find a section that returns something weird:

1. Note the citation (e.g. `16-XXX`)
2. Compare to the upstream at `https://www.azleg.gov/ars/16/00XXX.htm`
3. Open an issue with both the mirror response and the upstream HTML
4. If you know the fix, include it in the PR

## Code style

- TypeScript, strict mode
- Files under 800 lines, functions under 50
- Match the existing structure
- No mutation in helpers — return new objects
- Every external boundary (input from REST, MCP, upstream) gets validated or normalized

## Naming

- REST routes: `/api/ars/<resource>` or `/api/ars/<resource>/:id`
- MCP tools: `ars_<verb>_<resource>` (snake_case)
- Internal functions: `camelCase`

## Testing locally

```bash
cd workers/api
npm install
npx wrangler dev
```

This starts a local Worker at `http://localhost:8787`. Hit `/health`, `/api/ars/titles`, etc. to verify.

For MCP testing, use the inspector:

```bash
npx @modelcontextprotocol/inspector
```

Point it at `http://localhost:8787/mcp`.

## Wiki updates

The wiki pages live in `wiki/` of the main repo. To update:

1. Edit the markdown in `wiki/`
2. Commit and push to main
3. Run `scripts/sync-wiki.sh` to push the updated content to the GitHub wiki repo

The main repo is the source of truth — the wiki is generated from it.

## License

By contributing, you agree your changes are MIT-licensed under [LICENSE](https://github.com/az-civic-tools/ars-mcp/blob/main/LICENSE).

## Code of conduct

Be cool. This is a civic tool meant to make AZ statutes more accessible. Treat contributors and users with respect.
