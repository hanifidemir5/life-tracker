"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient";
import { NextPage } from "next";
import { Loader2, Plus, Pencil } from "lucide-react";
import Link from "next/link";
import { getIconComponent, colorOptions } from "@/app/lib/iconMap";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useCategories, Category } from "@/app/hooks/useCategories";


export default function Home() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const { t } = useLanguage();
  const { colors, isPaired, isLoading: themeLoading } = useTheme();

  // Fetch user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      setAuthLoading(false);
    };
    getUser();
  }, []);

  // Use React Query for categories
  const { data: categories = [], isLoading: categoriesLoading, error } = useCategories(currentUserId);

  const getIconColorClass = (bgClass: string) => {
    const colorOpt = colorOptions.find((c) => c.value === bgClass);
    return colorOpt ? colorOpt.iconColor : "text-gray-500";
  };



  // Show neutral loading until theme is determined
  const isLoading = authLoading || categoriesLoading || themeLoading;

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#fafafa' }}>
        <Loader2 className="animate-spin w-8 h-8" style={{ color: '#9ca3af' }} />
      </div>
    );

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 pb-32">
      <div className="text-center mb-4 w-full max-w-6xl">


        {/* Title */}
        <h1 className="lg:hidden text-4xl font-extrabold text-gray-900 mb-3">
          {isPaired ? t('appName') : t('appNameSingle')}
        </h1>
        <p className="text-gray-500 text-lg">
          {isPaired ? t('selectCategory') : t('selectCategorySingle')}
        </p>
      </div>

      {/* KATEGORILER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {categories.map((cat: Category) => (
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
                e.stopPropagation();
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
        className={`fixed bottom-8 right-8 bg-linear-to-r ${colors.buttonGradient} hover:opacity-90 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center z-50`}
      >
        <Plus className="w-8 h-8" />
      </Link>
    </main >
  );
}
