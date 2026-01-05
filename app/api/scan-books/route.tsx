import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supebaseClient"; // Dosya yolunu kontrol et

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

// Backend işlemleri için Supabase istemcisi oluşturuyoruz
// Not: Okuma işlemi yapacağımız için normal URL ve Key yeterlidir.

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;

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

    const prompt = `
      Sen bir kütüphane asistanısın. Fotoğraftaki kitapları oku.
      Cevap JSON şeması:
      [ { "title": "Kitap Adı", "description": "Yazar Adı" } ]
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
    // Gemini'den gelen listeyi dönüyoruz ve her biri için DB kontrolü yapıyoruz.
    // Promise.all kullanarak bu işlemi paralel ve hızlı yapıyoruz.

    const checkedBooks = await Promise.all(
      booksFromAI.map(async (book: any) => {
        // Kitap başlığına göre arama yap (ilike = büyük/küçük harf duyarsız)
        const { data } = await supabase
          .from("items") // Senin tablonun adı 'iteams' idi
          .select("id")
          .ilike("title", book.title)
          .maybeSingle();
        console.log(data);
        return {
          ...book,
          isExists: !!data, // Eğer data varsa true, yoksa false döner
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
