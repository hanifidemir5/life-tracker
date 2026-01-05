import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Metin bulunamadı" }, { status: 400 });
    }

    // --- AI BÖLÜMÜ ---
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
      Aşağıdaki metin bir kitap listesi içeriyor. Bu metni analiz et ve kitapları çıkar.
      
      Metin: "${text}"
      
      Cevap JSON şeması:
      [ { "title": "Kitap Adı", "description": "Yazar Adı (yoksa boş bırak)" } ]
      
      Sadece net bir şekilde kitap veya eşya olduğunu anladığın maddeleri al.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const booksFromAI = JSON.parse(response.text());

    // --- VERİTABANI KONTROLÜ ---
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
    console.error("Liste İşleme Hatası:", error);
    return NextResponse.json({ error: "Liste işlenemedi" }, { status: 500 });
  }
}
