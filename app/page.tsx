"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient";
import { Loader2, Plus, Pencil } from "lucide-react"; // Pencil eklendi
import { getIconComponent, colorOptions } from "@/app/lib/iconMap";

type Category = {
  id: number;
  key: string;
  name: string;
  icon_name: string;
  color_class: string;
};

export default function Home() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("id");
      if (data) setCategories(data);
      setLoading(false);
    };
    fetchCategories();
  }, []);

  const getIconColorClass = (bgClass: string) => {
    const colorOpt = colorOptions.find((c) => c.value === bgClass);
    return colorOpt ? colorOpt.iconColor : "text-gray-500";
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
          Life Tracker
        </h1>
        <p className="text-gray-500 text-lg">
          Takip etmek istediğin listeyi seç.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => router.push(`/${cat.key}`)}
            className={`relative cursor-pointer flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-gray-200 transition-all transform hover:-translate-y-1 hover:shadow-lg ${cat.color_class} group`}
          >
            {/* EDİT BUTONU (SAĞ ÜST) */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Kartın tıklanmasını engelle
                router.push(`/edit-category/${cat.id}`);
              }}
              className="absolute top-4 right-4 p-2 bg-white/80 rounded-full text-gray-400 hover:text-blue-600 hover:bg-white shadow-sm transition-all opacity-0 group-hover:opacity-100"
              title="Kategoriyi Düzenle"
            >
              <Pencil className="w-4 h-4" />
            </button>

            <div className="mb-4 bg-white p-4 rounded-full shadow-sm">
              {getIconComponent(
                cat.icon_name,
                `w-8 h-8 ${getIconColorClass(cat.color_class)}`
              )}
            </div>
            <span className="text-xl font-semibold text-gray-800">
              {cat.name}
            </span>
          </div>
        ))}

        <button
          onClick={() => router.push("/add-category")}
          className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-2xl hover:border-gray-400 hover:bg-gray-50 transition-all group"
        >
          <div className="mb-4 p-4 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors">
            <Plus className="w-8 h-8 text-gray-400 group-hover:text-gray-600" />
          </div>
          <span className="text-xl font-semibold text-gray-400 group-hover:text-gray-600">
            Yeni Ekle
          </span>
        </button>
      </div>
    </main>
  );
}
