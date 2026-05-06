import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getSection,
  listTitles,
  listSectionsInTitle,
  searchSections,
} from "./queries";
import { DISCLAIMER, type Env } from "./types";

export class ARSMCP extends McpAgent<Env> {
  server = new McpServer({
    name: "Arizona Revised Statutes",
    version: "0.1.0",
  });

  // Workaround for agents@0.12.3: the inherited onStart() calls
  // `this.server.connect()` early, which then collides with the
  // `server.connect()` in fetch() and throws "Already connected to a
  // transport". Override to restore props but skip the early connect.
  override async onStart(): Promise<void> {
    const stored = await this.ctx.storage.get("props");
    if (stored) this.props = stored as typeof this.props;
  }

  async init(): Promise<void> {
    const db = () => this.env.DB;

    this.server.registerTool(
      "ars_get_section",
      {
        description:
          "Get the full text of an Arizona Revised Statute section by citation. " +
          "Citation format: 'TITLE-SECTION', e.g. '16-901' or '16-925.01'. " +
          "Accepts forms like 'A.R.S. § 16-925.01', '§ 16-925.01', or '16-925.01'.",
        inputSchema: { citation: z.string().min(1) },
      },
      async ({ citation }) => {
        const id = normalizeCitation(citation);
        const section = await getSection(db(), id);
        if (!section) {
          return {
            content: [
              { type: "text", text: `Section ${id} not found in the mirror.` },
            ],
            isError: true,
          };
        }
        const heading =
          `# A.R.S. § ${section.id}` +
          (section.section_name ? ` — ${section.section_name}` : "");
        const text = `${heading}\n\n${section.body}\n\nSource: ${section.source_url}\n${DISCLAIMER}`;
        return { content: [{ type: "text", text }] };
      }
    );

    this.server.registerTool(
      "ars_search",
      {
        description:
          "Full-text search across the Arizona Revised Statutes. " +
          "Returns ranked snippets with citations. " +
          "Optionally restrict to a single title (e.g. 13 = criminal code, 16 = elections, 41 = state government).",
        inputSchema: {
          query: z.string().min(1),
          title: z.number().int().min(1).max(49).optional(),
          limit: z.number().int().min(1).max(50).optional(),
        },
      },
      async ({ query, title, limit }) => {
        const hits = await searchSections(db(), query, { title, limit });
        if (hits.length === 0) {
          return {
            content: [{ type: "text", text: `No matches for "${query}".` }],
          };
        }
        const lines = hits.map(
          (h) =>
            `**A.R.S. § ${h.id}**${h.section_name ? ` — ${h.section_name}` : ""}\n${h.snippet}\n${h.source_url}`
        );
        return {
          content: [
            {
              type: "text",
              text:
                `Found ${hits.length} matches for "${query}":\n\n` +
                lines.join("\n\n---\n\n") +
                `\n\n${DISCLAIMER}`,
            },
          ],
        };
      }
    );

    this.server.registerTool(
      "ars_list_titles",
      {
        description:
          "List all 47 active Arizona Revised Statutes titles with their names and section counts.",
        inputSchema: {},
      },
      async () => {
        const titles = await listTitles(db());
        const lines = titles.map(
          (t) => `Title ${t.title}: ${t.name} (${t.sections} sections)`
        );
        return {
          content: [
            { type: "text", text: lines.join("\n") + `\n\n${DISCLAIMER}` },
          ],
        };
      }
    );

    this.server.registerTool(
      "ars_list_sections",
      {
        description: "List all sections within a single ARS title. Useful for browsing.",
        inputSchema: {
          title: z.number().int().min(1).max(49),
          limit: z.number().int().min(1).max(500).optional(),
          offset: z.number().int().min(0).optional(),
        },
      },
      async ({ title, limit, offset }) => {
        const sections = await listSectionsInTitle(
          db(),
          title,
          limit ?? 200,
          offset ?? 0
        );
        if (sections.length === 0) {
          return {
            content: [
              { type: "text", text: `No sections found in Title ${title}.` },
            ],
          };
        }
        const lines = sections.map(
          (s) => `§ ${s.id}${s.section_name ? ` — ${s.section_name}` : ""}`
        );
        return {
          content: [
            { type: "text", text: lines.join("\n") + `\n\n${DISCLAIMER}` },
          ],
        };
      }
    );
  }
}

function normalizeCitation(input: string): string {
  return input
    .replace(/^A\.?R\.?S\.?\s*/i, "")
    .replace(/^§\s*/, "")
    .trim();
}
