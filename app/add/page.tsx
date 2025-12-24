"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient";
import { Save, X, Loader2 } from "lucide-react";

export default function AddItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    category: "book",
    description: "",
    owner: "Fatma", // Varsayılan değer
  });

  const categories = [
    { id: "book", name: "📚 Kitap" },
    { id: "place", name: "📍 Gezilen Yer" },
    { id: "activity", name: "🎨 Aktivite" },
    { id: "lego", name: "🧩 Lego" },
  ];

  const owners = ["Fatma", "Hanifi"];

  // Sadece bu kategorilerde "Kimde?" sorusu sorulacak
  const showOwnerField =
    formData.category === "book" || formData.category === "lego";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("items").insert([
        {
          title: formData.title,
          category: formData.category,
          description: formData.description,
          // Eğer alan görünüyorsa seçilen kişiyi, görünmüyorsa null kaydet
          owner: showOwnerField ? formData.owner : null,
          status: false,
        },
      ]);

      if (error) throw error;

      router.push(`/${formData.category}`);
      router.refresh();
    } catch (error) {
      console.error("Hata:", error);
      alert("Kaydedilemedi!");
    } finally {
      setLoading(false);
    }
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
              placeholder="Örn: 1984 Kitabı"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sadece Kitap ve Lego ise gösterilen alan */}
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
