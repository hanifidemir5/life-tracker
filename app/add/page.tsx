"use client";

import { useState, useEffect } from "react"; // useEffect eklendi
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient";
import { Save, X, Loader2, PlusCircle } from "lucide-react"; // PlusCircle eklendi
import { toast } from "react-toastify";
import Link from "next/link"; // Link eklendi

// Kategori tipi
type Category = {
  id: number;
  key: string;
  name: string;
};

export default function AddItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Kategorileri tutacak state (Başlangıçta boş)
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    category: "", // İlk başta boş, veri gelince seçeceğiz
    description: "",
    owner: "Fatma",
  });

  const owners = ["Fatma", "Hanifi"];

  // SAYFA YÜKLENİNCE KATEGORİLERİ ÇEK
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from("categories").select("*");
      if (data) {
        setCategories(data);
        // Varsayılan olarak ilk kategoriyi seç
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, category: data[0].key }));
        }
      }
    };
    fetchCategories();
  }, []);

  const showOwnerField =
    formData.category === "book" || formData.category === "lego";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const insertPromise = new Promise(async (resolve, reject) => {
      const { error } = await supabase.from("items").insert([
        {
          title: formData.title,
          category: formData.category,
          description: formData.description,
          owner: showOwnerField ? formData.owner : null,
          status: false,
        },
      ]);
      if (error) reject(error);
      else resolve("success");
    });

    await toast
      .promise(
        insertPromise,
        {
          pending: "Listeye ekleniyor...",
          success: "Başarıyla eklendi! 🎉",
          error: "Eklenirken bir sorun oluştu 🤯",
        },
        { position: "top-right" }
      )
      .then(() => {
        router.push(`/${formData.category}`);
        router.refresh();
      })
      .finally(() => setLoading(false));
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Yeni Ekle</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-black">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Başlık
            </label>
            <input
              required
              type="text"
              placeholder="Örn: Öğe ismi"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Kategori
              </label>
              {/* Yeni Kategori Ekle Linki */}
              <Link
                href="/add-category"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <PlusCircle className="w-3 h-3" /> Yeni Kategori
              </Link>
            </div>

            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {/* Database'den gelen verileri listele */}
              {categories.map((cat) => (
                <option key={cat.id} value={cat.key}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {showOwnerField && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-blue-800 mb-1">
                Şu an kimde?
              </label>
              <div className="flex gap-4 mt-2">
                {owners.map((person) => (
                  <label
                    key={person}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="owner"
                      value={person}
                      checked={formData.owner === person}
                      onChange={(e) =>
                        setFormData({ ...formData, owner: e.target.value })
                      }
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{person}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notlar
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {loading ? "Kaydediliyor..." : "Listeye Ekle"}
          </button>
        </form>
      </div>
    </main>
  );
}
