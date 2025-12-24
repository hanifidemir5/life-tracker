"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient";
import {
  Book,
  MapPin,
  Smile,
  Box,
  CheckCircle,
  Circle,
  ArrowLeft,
  Loader2,
  User,
} from "lucide-react";

// Tip tanımına 'owner' ekledik (İsteğe bağlı olabilir -> ?)
type Item = {
  id: number;
  title: string;
  description: string;
  category: string;
  status: boolean;
  owner?: string; // Yeni alan
};

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const currentCategory = params.category as string;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // ... (categoryLabels aynı kalıyor) ...
  const categoryLabels: Record<string, string> = {
    book: "📚 Kitap Listesi",
    place: "📍 Gezilen Yerler",
    activity: "🎨 Aktiviteler",
    lego: "🧩 Lego Koleksiyonu",
  };

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("category", currentCategory)
        .order("id", { ascending: false });

      if (error) {
        console.error("Veri çekme hatası:", error);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    };

    fetchItems();
  }, [currentCategory]);

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, status: !currentStatus } : item
      )
    );
    await supabase
      .from("items")
      .update({ status: !currentStatus })
      .eq("id", id);
  };

  const getIcon = (category: string) => {
    switch (category) {
      case "book":
        return <Book className="w-5 h-5 text-blue-500" />;
      case "place":
        return <MapPin className="w-5 h-5 text-red-500" />;
      case "lego":
        return <Box className="w-5 h-5 text-yellow-500" />;
      case "activity":
        return <Smile className="w-5 h-5 text-green-500" />;
      default:
        return <Circle className="w-5 h-5" />;
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    selected === "home" ? router.push("/") : router.push(`/${selected}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">
              {categoryLabels[currentCategory] || "Liste"}
            </h1>
          </div>

          <select
            value={currentCategory}
            onChange={handleCategoryChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none bg-gray-50 text-gray-700 cursor-pointer min-w-[200px]"
          >
            <option value="home">🏠 Ana Sayfaya Dön</option>
            <option disabled>──────────</option>
            <option value="book">📚 Kitaplar</option>
            <option value="place">📍 Gezilen Yerler</option>
            <option value="activity">🎨 Aktiviteler</option>
            <option value="lego">🧩 Legolar</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gray-50 p-3 rounded-full group-hover:bg-blue-50 transition-colors">
                    {getIcon(item.category)}
                  </div>
                  <div>
                    <h3
                      className={`font-semibold text-lg ${
                        item.status
                          ? "text-gray-400 line-through"
                          : "text-gray-900"
                      }`}
                    >
                      {item.title}
                    </h3>

                    {/* AÇIKLAMA VE SAHİP BİLGİSİ */}
                    <div className="flex flex-wrap gap-2 items-center mt-1">
                      {item.description && (
                        <p className="text-sm text-gray-500">
                          {item.description}
                        </p>
                      )}

                      {/* EĞER SAHİBİ VARSA GÖSTER */}
                      {item.owner && (
                        <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                          <User className="w-3 h-3" />
                          {item.owner}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleStatus(item.id, item.status)}
                  className="pl-4 hover:scale-110 transition-transform"
                >
                  {item.status ? (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  ) : (
                    <Circle className="w-8 h-8 text-gray-300 hover:text-blue-400" />
                  )}
                </button>
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">Bu listede henüz öğe yok.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
