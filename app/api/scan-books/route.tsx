import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

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
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
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

    const formData = await req.formData();
    const file = formData.get("image") as File;
    const category = formData.get("category") as string || "books"; // Default to books if nothing provided

    if (!file) {
      return NextResponse.json({ error: "Resim bulunamadı" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");

    // --- AI BÖLÜMÜ ---
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    let promptContext = "kitapları";
    if (category === "movies") promptContext = "filmleri (DVD/Blu-ray kutuları)";
    if (category === "games") promptContext = "oyunları (PS, Xbox, PC kutuları)";
    if (category === "food") promptContext = "yiyecek paketlerini veya etiketlerini";
    if (category === "lego") promptContext = "LEGO setlerini";
    if (category === "electronics") promptContext = "elektronik cihazları";
    if (category === "music") promptContext = "müzik albümlerini (CD/Plak)";

    const prompt = `
      Sen bir ${category} uzmanısın. Fotoğraftaki ${promptContext} oku ve tanımla.
      Sadece net olarak görebildiğin başlıkları listele.
      Eğer kategoriye uymayan bir şey varsa onu yoksay.

      Cevap JSON şeması:
      [ { "title": "Öğe Başlığı", "description": "Kısa açıklama (Yazar, Platform, Marka vb.)" } ]
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: file.type,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    const booksFromAI = JSON.parse(text);

    // --- VERİTABANI KONTROL BÖLÜMÜ ---
    const checkedBooks = await Promise.all(
      booksFromAI.map(async (book: any) => {
        const { data } = await supabase
          .from("items")
          .select("id")
          .ilike("title", book.title)
          .maybeSingle();

        return {
          ...book,
          isExists: !!data,
        };
      })
    );

    return NextResponse.json({ books: checkedBooks });
  } catch (error) {
    console.error("İşlem Hatası:", error);
    return NextResponse.json(
      { error: "İşlem başarısız oldu" },
      { status: 500 }
    );
  }
}
