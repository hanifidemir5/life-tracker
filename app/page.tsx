"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient";
import { Loader2, Plus, Pencil, Settings, User, Heart, Lock, Calendar, X } from "lucide-react";
import Link from "next/link";
import { getIconComponent, colorOptions } from "@/app/lib/iconMap";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useCategories, Category } from "@/app/hooks/useCategories";
import CalendarSidebar from "@/app/components/TodoSection";


export default function Home() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobileCalendarOpen, setIsMobileCalendarOpen] = useState(false);

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
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(currentUserId);

  const getIconColorClass = (bgClass: string) => {
    const colorOpt = colorOptions.find((c) => c.value === bgClass);
    return colorOpt ? colorOpt.iconColor : "text-gray-500";
  };

  const isLoading = authLoading || categoriesLoading || themeLoading;

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-10 h-10 text-rose-500" />
      </div>
    );

  return (
    <main className="min-h-screen mt-16 pb-32 px-4 md:px-6">

      {/* TWO-COLUMN LAYOUT */}
      <div className="mx-4 lg:mx-16 flex flex-col lg:flex-row gap-8 items-start">

        {/* LEFT — COLLECTIONS (below sidebar on mobile) */}
        <div className="flex-1 min-w-0 order-last lg:order-first">
          <div className="flex justify-between items-end mb-8 relative">
            <h2 className="text-3xl font-bold text-rose-900 relative inline-block">
              {t('collections')}
              <span className="absolute -bottom-2 left-0 w-12 h-1.5 bg-rose-600 rounded-full"></span>
            </h2>
            <div className="flex items-center gap-2">
              {/* Mobile Calendar Toggle Button */}
              <button
                onClick={() => setIsMobileCalendarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-white border border-rose-100 text-rose-500 hover:bg-rose-50 transition-colors shadow-sm"
              >
                <Calendar className="w-5 h-5" />
              </button>
              {/* Add Collection Button */}
              <button
                onClick={() => router.push("/add-category")}
                className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white px-3 py-2 rounded-xl font-bold transition-transform hover:scale-105 shadow-md shadow-rose-500/20 text-sm"
              >
                <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t('addNewCollection') || "Add Collection"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 px-2">

            {/* ADD NEW CARD */}
            <button
              onClick={() => router.push("/add-category")}
              className="aspect-4/5 flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 bg-white/50 hover:bg-white hover:border-rose-300 hover:shadow-lg transition-all duration-300 transform rotate-1 hover:rotate-0 group"
            >
              <div className="w-12 h-12 text-gray-300 group-hover:text-rose-400 transition-colors mb-2">
                <Plus className="w-full h-full" />
              </div>
              <span className="text-sm font-medium text-gray-400 group-hover:text-rose-500 text-center">
                {t('addNewCollection')}
              </span>
            </button>

            {/* CATEGORY CARDS - POLAROID STYLE */}
            {categories.map((cat: Category, index: number) => {
              const rotationClass = index % 2 === 0 ? "rotate-1 hover:rotate-0" : "-rotate-2 hover:rotate-0";
              const colorObj = colorOptions.find((c) => c.value === cat.color_class) || colorOptions[0];
              const dynamicBorder = colorObj.borderColor;

              return (
                <div
                  key={cat.id}
                  onClick={() => router.push(`/${cat.key}`)}
                  className={`relative cursor-pointer bg-white p-3 pb-14 shadow-md hover:shadow-2xl transition-all duration-500 transform ${rotationClass} group`}
                  style={{ borderRadius: "2px" }}
                >
                  {cat.is_private && (
                    <div className="absolute top-2 left-2 z-20 text-rose-400 bg-white/90 rounded-full p-1.5 shadow-sm" title={t('privateCategory')}>
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                  {!cat.is_private && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 bg-yellow-100/80 shadow-sm transform -rotate-2 z-10"></div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/edit-category/${cat.id}`);
                    }}
                    className="absolute top-4 right-4 z-20 p-1.5 bg-white/80 rounded-full text-gray-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Pencil className="w-5 h-5 cursor-pointer" />
                  </button>
                  <div className={`aspect-square w-full bg-gray-50 border-2 ${dynamicBorder} flex items-center justify-center overflow-hidden relative grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500`}>
                    <div className={`transform transition-transform duration-700 w-full h-full flex items-center justify-center group-hover:scale-110 ${cat.icon_name && (cat.icon_name.startsWith("http") || cat.icon_name.startsWith("/")) ? "" : `${colorObj.iconColor} opacity-80 group-hover:opacity-100`}`}>
                      {getIconComponent(
                        cat.icon_name,
                        cat.icon_name && (cat.icon_name.startsWith("http") || cat.icon_name.startsWith("/"))
                          ? "w-full h-full object-cover opacity-90 group-hover:opacity-100"
                          : "w-14 h-14"
                      )}
                    </div>
                    <div className="absolute inset-0 from-black/10 to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-14 flex flex-col items-center justify-center">
                    <h3 className="text-base font-semibold text-gray-600 text-center leading-tight transform -rotate-1 group-hover:rotate-0 transition-transform duration-300">
                      {cat.name}
                    </h3>
                  </div>
                </div>
              );
            })}



          </div>
        </div>

        {/* RIGHT — CALENDAR SIDEBAR (hidden on mobile) */}
        <CalendarSidebar userId={currentUserId} className="hidden lg:block order-first lg:order-last" />

        {/* MOBILE CALENDAR DRAWER */}
        <div
          className={`fixed inset-0 z-50 flex justify-end lg:hidden transition-all duration-300 ${isMobileCalendarOpen ? "visible opacity-100" : "invisible opacity-0"}`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMobileCalendarOpen(false)}
          />
          {/* Drawer */}
          <div className={`relative w-full max-w-sm bg-[#f8f5f6] h-full overflow-y-auto shadow-2xl px-4 pt-16 pb-4 transition-transform duration-300 transform ${isMobileCalendarOpen ? "translate-x-0" : "translate-x-full"}`}>
            <button
              onClick={() => setIsMobileCalendarOpen(false)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full text-gray-400 hover:text-rose-500 shadow-sm z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <CalendarSidebar userId={currentUserId} className="sticky! top-0!" />
          </div>
        </div>

      </div>

      {/* Floating Add Category Button */}
      <Link
        href="/add-category"
        className="fixed bottom-8 right-8 bg-linear-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white p-4 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-110 flex items-center justify-center z-40"
      >
        <Plus className="w-7 h-7" />
      </Link>
    </main>
  );
}
