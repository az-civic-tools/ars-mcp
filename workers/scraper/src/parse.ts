const BASE = "https://www.azleg.gov";

import type { ParsedSection } from "./types";

export function parseSectionListPage(
  html: string,
  title: number
): { sectionUrls: string[] } {
  // azleg's /arsDetail/?title=N page has a generic <title>"Arizona Revised Statutes"</title>,
  // so we don't try to extract the title name here. Title names come from titles.ts (hardcoded).
  // Section URLs appear in href="/viewdocument/?docName=https://www.azleg.gov/ars/N/NNNNN.htm"
  // or as direct /ars/N/NNNNN.htm links. Decimal sections use a HYPHEN in the URL: 00121-01.htm.
  const re = new RegExp(`/ars/${title}/(\\d+(?:-\\d+)?)\\.htm`, "gi");
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    seen.add(match[0].toLowerCase());
  }
  const sectionUrls = Array.from(seen)
    .map((p) => `${BASE}${p}`)
    .sort();
  return { sectionUrls };
}

export function parseSection(
  html: string,
  url: string,
  title: number
): ParsedSection | null {
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleTag) return null;

  const titleText = decodeEntities(titleTag[1]).trim();
  // Observed forms in azleg's bare /ars/{title}/{section}.htm files:
  //   "16-101 - Qualifications of registrant; definition"
  //   "16-121.01 - Requirements for proper registration; violation; classification"
  //   "13-1001 - Attempt; classifications"
  // Pattern: TITLE - SECTION[.DECIMAL] - NAME (with optional space-hyphen-space separator)
  const m = titleText.match(/^(\d+)\s*-\s*([\d.]+)\s*[-.]?\s*(.*)$/);
  if (!m) return null;

  const parsedTitle = parseInt(m[1], 10);
  if (parsedTitle !== title) {
    // Sanity: page title disagrees with URL title... bail.
    return null;
  }

  const sectionNumber = m[2].replace(/\.$/, "");
  const sectionName = m[3].trim() || null;
  const id = `${title}-${sectionNumber}`;
  const sectionSort = parseFloat(sectionNumber) || 0;

  const bodyTag = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = (bodyTag ? bodyTag[1] : html).trim();
  const body = htmlToText(bodyHtml);

  if (!body) return null;

  return {
    id,
    title,
    chapter: null,
    article: null,
    section_number: sectionNumber,
    section_sort: sectionSort,
    section_name: sectionName,
    body,
    body_html: bodyHtml,
    source_url: url,
  };
}

function htmlToText(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");

  return stripped
    .split("\n")
    .map((l) => decodeEntities(l).replace(/\s+/g, " ").trim())
    .reduce<string[]>((acc, l) => {
      if (l === "" && acc[acc.length - 1] === "") return acc;
      acc.push(l);
      return acc;
    }, [])
    .join("\n")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([\da-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
