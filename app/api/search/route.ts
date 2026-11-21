import type { NextRequest } from "next/server";
import { getSearchSuggestions, searchArticles } from "@/lib/data/search";

// JSON for the search dialog, which runs in the browser: GET /api/search?q=reset
// With no query it returns suggestions (recently updated articles) instead.
// Pages search on the server directly (see app/search/page.tsx) instead of calling this.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = q.trim() ? await searchArticles(q) : await getSearchSuggestions();
  return Response.json({ results });
}
