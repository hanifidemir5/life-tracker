"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient";
import { Save, X, Layers, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

export default function AddCategoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    key: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Kategori ekleme işlemi
    const savePromise = new Promise(async (resolve, reject) => {
      // 1. Aynı key var mı kontrolü yapılabilir ama SQL 'unique' kısıtlaması zaten hata verir.
      const { error } = await supabase.from("categories").insert([
        {
          name: formData.name, // Örn: 🎬 Filmler
          key: formData.key.toLowerCase().replace(/ /g, "-"), // Örn: filmler
        },
      ]);

      if (error) reject(error);
      else resolve("success");
    });

    await toast
      .promise(
        savePromise,
        {
          pending: "Kategori oluşturuluyor...",
          success: "Yeni kategori hazır! 🎉",
          error: "Bu kategori zaten var veya bir hata oluştu.",
        },
        { position: "top-right" }
      )
      .then(() => {
        // İşlem bitince ana sayfaya dönelim
        router.push("/");
        router.refresh();
      })
      .finally(() => setLoading(false));
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Kategori Ekle</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-black">
          {/* İsim Alanı */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori Adı (Emojili yazabilirsin)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Layers className="h-5 w-5 text-gray-400" />
              </div>
              <input
                required
                type="text"
                placeholder="Örn: 🎬 Filmler"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Key (Kod) Alanı */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori Kodu (URL'de görünecek)
            </label>
            <input
              required
              type="text"
              placeholder="Örn: film (Türkçe karakter kullanma)"
              value={formData.key}
              onChange={(e) =>
                setFormData({ ...formData, key: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50 font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Sadece ingilizce harfler ve boşluksuz.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {loading ? "Oluşturuluyor..." : "Kategoriyi Kaydet"}
          </button>
        </form>
      </div>
    </main>
  );
}
