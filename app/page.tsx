"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient";
import { Loader2, Plus, Pencil, Users, LogOut, Globe, BookOpen } from "lucide-react"; // Added Globe, BookOpen
import Link from "next/link";
import { getIconComponent, colorOptions } from "@/app/lib/iconMap";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useTheme } from "@/app/contexts/ThemeContext";

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
  const { colors, isPaired, isLoading: themeLoading } = useTheme();

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

  // Show neutral loading until theme is determined
  if (loading || themeLoading)
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#fafafa' }}>
        <Loader2 className="animate-spin w-8 h-8" style={{ color: '#9ca3af' }} />
      </div>
    );

  return (
    <main className={`min-h-screen ${colors.pageBg} flex flex-col items-center justify-center p-8`}>
      <div className="text-center mb-10 relative pt-28 sm:pt-16 w-full max-w-6xl">
        {/* Top-right buttons */}
        <div className="absolute top-0 right-0 flex items-center gap-3">
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
            className={`flex items-center gap-2 px-5 py-2.5 bg-white ${isPaired ? 'text-purple-600 hover:bg-purple-50 border-purple-100 hover:border-purple-200' : 'text-indigo-600 hover:bg-indigo-50 border-indigo-100 hover:border-indigo-200'} rounded-full transition-all font-bold text-sm border-2 shadow-lg hover:shadow-xl`}
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
            className={`flex items-center gap-2 px-5 py-2.5 bg-white ${isPaired ? 'text-rose-600 hover:bg-rose-50 border-rose-100 hover:border-rose-200' : 'text-blue-600 hover:bg-blue-50 border-blue-100 hover:border-blue-200'} rounded-full transition-all font-bold text-sm border-2 shadow-lg hover:shadow-xl`}
            title={t('settings')}
          >
            {isPaired ? <Users className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
            <span>{t('settings')}</span>
          </Link>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
          {isPaired ? t('appName') : t('appNameSingle')}
        </h1>
        <p className="text-gray-500 text-lg">
          {isPaired ? t('selectCategory') : t('selectCategorySingle')}
        </p>
      </div>

      {/* KATEGORILER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => router.push(`/${cat.key}`)}
            className={`w-full relative cursor-pointer flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-lg border-2 ${isPaired ? 'border-pink-100 hover:border-rose-200' : 'border-slate-100 hover:border-blue-200'} transition-all transform hover:-translate-y-2 hover:shadow-2xl ${cat.color_class} group`}
            style={{ minHeight: "200px" }}
          >
            {/* Private Category Lock Icon */}
            {cat.is_private && (
              <div className="absolute top-3 left-3 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border-2 border-purple-200">
                <span>🔒</span>
                <span>{t('privateCategory')}</span>
              </div>
            )}

            {/* EDİT BUTONU (SAĞ ÜST) */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Kartın tıklanmasını engelle
                router.push(`/edit-category/${cat.id}`);
              }}
              className="absolute top-4 right-4 p-2 bg-white/80 rounded-full text-gray-400 hover:text-blue-600 hover:bg-white shadow-sm transition-all opacity-0 group-hover:opacity-100"
              title={t('editCategory')}
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
          className={`w-full flex flex-col items-center justify-center p-8 border-2 border-dashed ${isPaired ? 'border-rose-200 hover:border-rose-400 hover:bg-rose-50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50'} rounded-2xl transition-all group shadow-lg hover:shadow-xl`}
          style={{ minHeight: "200px" }}
        >
          <div className={`mb-4 p-4 rounded-full ${isPaired ? 'bg-rose-50 group-hover:bg-rose-100' : 'bg-slate-100 group-hover:bg-slate-200'} transition-colors`}>
            <Plus className={`w-8 h-8 ${isPaired ? 'text-rose-400 group-hover:text-rose-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
          </div>
          <span className={`text-xl font-semibold ${isPaired ? 'text-rose-400 group-hover:text-rose-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
            {t('addCategory')}
          </span>
        </button>
      </div>


      {/* Floating Add Item Button (Global) */}
      <Link
        href="/add"
        className={`fixed bottom-8 right-8 bg-gradient-to-r ${colors.buttonGradient} hover:opacity-90 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center z-50`}
      >
        <Plus className="w-8 h-8" />
      </Link>
    </main >
  );
}
