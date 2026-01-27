import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Simple regex-based parser - no AI needed, fast and reliable
function parseListText(text: string) {
  const lines = text.split('\n').filter((l: string) => l.trim());

  return lines.map((line: string) => {
    // Clean up the line
    line = line.trim();

    // Try to extract title and type from patterns like "Title (type)" or "Title(type)"
    const matchWithParens = line.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (matchWithParens) {
      return {
        title: matchWithParens[1].trim(),
        description: matchWithParens[2].trim().toLowerCase()
      };
    }

    // No parentheses - just return the title
    return { title: line, description: "" };
  });
}

// Search Wikipedia for an image
async function searchWikipediaImage(query: string, type: string = ""): Promise<string | undefined> {
  try {
    // Construct search query (append type for better context if exists)
    const searchQuery = type ? `${query} ${type}` : query;

    // Search for the page
    const searchUrl = `https://tr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.query?.search?.length) return undefined;

    const pageId = searchData.query.search[0].pageid;

    // Get page info with image
    const pageUrl = `https://tr.wikipedia.org/w/api.php?action=query&pageids=${pageId}&prop=pageimages&pithumbsize=500&format=json&origin=*`;
    const pageRes = await fetch(pageUrl);
    const pageData = await pageRes.json();

    const pages = pageData.query?.pages;
    if (!pages) return undefined;

    const page = Object.values(pages)[0] as any;
    return page.thumbnail?.source;
  } catch (error) {
    console.error(`Wikipedia search error for ${query}:`, error);
    return undefined;
  }
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Metin bulunamadı" }, { status: 400 });
    }

    // Parse the list using simple regex (fast, no AI needed)
    const parsedItems = parseListText(text);

    // --- VERİTABANI KONTROLÜ VE GÖRSEL ARAMA ---
    const checkedBooks = await Promise.all(
      parsedItems.map(async (book: any) => {
        // Parallel fetch: check DB + fetch Image
        const [dbCheck, imageUrl] = await Promise.all([
          supabase
            .from("items")
            .select("id")
            .ilike("title", book.title)
            .maybeSingle(),
          searchWikipediaImage(book.title, book.description)
        ]);

        return {
          ...book,
          isExists: !!dbCheck.data,
          image_url: imageUrl
        };
      })
    );

    return NextResponse.json({ books: checkedBooks });
  } catch (error: any) {
    console.error("Liste İşleme Hatası:", error?.message || error);
    return NextResponse.json({ error: "Liste işlenemedi", details: error?.message }, { status: 500 });
  }
}
