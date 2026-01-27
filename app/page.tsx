"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient";
import { Loader2, Plus, Pencil, Users, LogOut, Globe } from "lucide-react"; // Added Globe
import Link from "next/link";
import { getIconComponent, colorOptions } from "@/app/lib/iconMap";
import { useLanguage } from "@/app/contexts/LanguageContext";

type Category = {
  id: number;
  key: string;
  name: string;
  icon_name: string;
  color_class: string;
  is_private?: boolean;
  user_id?: string;
};

export default function Home() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Fetch all categories
      const { data: catData } = await supabase.from("categories").select("*").order("id");

      // Filter out private categories that don't belong to current user
      const visibleCategories = (catData || []).filter((cat) => {
        // If category is not private, show it
        if (!cat.is_private) return true;
        // If category is private, only show if it belongs to current user
        return cat.user === user?.id;
      });

      setCategories(visibleCategories);
      setLoading(false);
    };
    fetchCategories();
  }, []);

  const getIconColorClass = (bgClass: string) => {
    const colorOpt = colorOptions.find((c) => c.value === bgClass);
    return colorOpt ? colorOpt.iconColor : "text-gray-500";
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-10 relative pt-14 w-full max-w-6xl">
        {/* Top-right buttons */}
        <div className="absolute top-0 right-0 flex items-center gap-3">
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-purple-600 rounded-full hover:bg-purple-50 transition-all font-bold text-sm border-2 border-purple-100 hover:border-purple-200 shadow-lg hover:shadow-xl"
            title={language === 'tr' ? 'Switch to English' : 'Türkçeye geç'}
          >
            <Globe className="w-5 h-5" />
            <span>{language === 'tr' ? 'EN' : 'TR'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-600 rounded-full hover:bg-gray-100 transition-all font-bold text-sm border-2 border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl"
            title={t('logout')}
          >
            <LogOut className="w-5 h-5" />
            <span>{t('logout')}</span>
          </button>
          <Link
            href="/settings"
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-rose-600 rounded-full hover:bg-rose-50 transition-all font-bold text-sm border-2 border-rose-100 hover:border-rose-200 shadow-lg hover:shadow-xl"
            title={t('settings')}
          >
            <Users className="w-5 h-5" />
            <span>{t('settings')}</span>
          </Link>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
          {t('appName')}
        </h1>
        <p className="text-gray-500 text-lg">
          {t('selectCategory')}
        </p>
      </div>

      {/* KATEGORILER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => router.push(`/${cat.key}`)}
            className={`w-full relative cursor-pointer flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-lg border-2 border-pink-100 transition-all transform hover:-translate-y-2 hover:shadow-2xl hover:border-rose-200 ${cat.color_class} group`}
            style={{ minHeight: "200px" }}
          >
            {/* Private Category Lock Icon */}
            {cat.is_private && (
              <div className="absolute top-3 left-3 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border-2 border-purple-200">
                <span>🔒</span>
                <span>Gizli</span>
              </div>
            )}

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

            {(() => {
              const isImage =
                cat.icon_name &&
                (cat.icon_name.startsWith("http") ||
                  cat.icon_name.startsWith("/"));

              return (
                <div
                  className={`mb-4 bg-white rounded-full shadow-sm ${isImage ? "p-1" : "p-4"
                    }`}
                >
                  {getIconComponent(
                    cat.icon_name,
                    isImage
                      ? "w-16 h-16"
                      : `w-8 h-8 ${getIconColorClass(cat.color_class)}`
                  )}
                </div>
              );
            })()}
            <span className="text-xl font-semibold text-gray-800">
              {cat.name}
            </span>
          </div>
        ))}

        <button
          onClick={() => router.push("/add-category")}
          className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-rose-200 rounded-2xl hover:border-rose-400 hover:bg-rose-50 transition-all group shadow-lg hover:shadow-xl"
          style={{ minHeight: "200px" }}
        >
          <div className="mb-4 p-4 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors">
            <Plus className="w-8 h-8 text-gray-400 group-hover:text-gray-600" />
          </div>
          <span className="text-xl font-semibold text-gray-400 group-hover:text-gray-600">
            Yeni Ekle
          </span>
        </button>
      </div>


      {/* Floating Add Item Button (Global) */}
      <Link
        href="/add"
        className="fixed bottom-8 right-8 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center z-50"
      >
        <Plus className="w-8 h-8" />
      </Link>
    </main >
  );
}
