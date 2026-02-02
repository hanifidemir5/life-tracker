import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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



export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Metin bulunamadı" }, { status: 400 });
    }

    // Parse the list using simple regex (fast, no AI needed)
    const parsedItems = parseListText(text);

    // --- VERİTABANI KONTROLÜ VE GÖRSEL ARAMA ---
    const checkedBooks = await Promise.all(
      parsedItems.map(async (book: any) => {
        // Just check DB, no image fetch
        const dbCheck = await supabase
          .from("items")
          .select("id")
          .ilike("title", book.title)
          .maybeSingle();

        return {
          ...book,
          isExists: !!dbCheck.data,
          image_url: undefined // No image needed
        };
      })
    );

    return NextResponse.json({ books: checkedBooks });
  } catch (error: any) {
    console.error("Liste İşleme Hatası:", error?.message || error);
    return NextResponse.json({ error: "Liste işlenemedi", details: error?.message }, { status: 500 });
  }
}
