import { createClient } from "@supabase/supabase-js";

// 1. URL ve Key'i değişkene alıyoruz
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 2. Kontrol ediyoruz (Debug için)
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase URL veya Key bulunamadı! Lütfen .env.local dosyasını ve sunucuyu yeniden başlattığını kontrol et."
  );
}

// 3. Client'ı oluşturuyoruz
export const supabase = createClient(supabaseUrl, supabaseKey);
