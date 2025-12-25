"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient"; // Dosya yolunu kontrol et
import {
  CheckCircle,
  Circle,
  ArrowLeft,
  Loader2,
  User,
  Save,
  Plus,
  ChevronDown, // Dropdown oku için eklendi
} from "lucide-react";
import { toast } from "react-toastify";
import { getIconComponent, colorOptions } from "@/app/lib/iconMap";
import Link from "next/link";

type Item = {
  id: number;
  title: string;
  description: string;
  category: string;
  status: boolean;
  owner?: string;
};

type Category = {
  id: number;
  key: string;
  name: string;
  icon_name: string;
  color_class: string;
};

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const currentCategoryKey = params.category as string;

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentCategoryData, setCurrentCategoryData] =
    useState<Category | null>(null);

  const [loading, setLoading] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState<Record<number, boolean>>(
    {}
  );
  const [isSaving, setIsSaving] = useState(false);

  // Custom Dropdown için State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        // 1. Kategorileri Çek
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("*")
          .order("id");

        if (catError) throw catError;

        setCategories(catData || []);

        // Şu anki sayfaya ait kategori verisini bul
        const activeCategory = catData?.find(
          (c) => c.key === currentCategoryKey
        );
        setCurrentCategoryData(activeCategory || null);

        // 2. Öğeleri Çek
        const { data: itemData, error: itemError } = await supabase
          .from("items")
          .select("*")
          .eq("category", currentCategoryKey)
          .order("id", { ascending: false });

        if (itemError) throw itemError;

        setItems(itemData || []);
      } catch (error) {
        console.error(error);
        toast.error("Veriler yüklenirken hata oluştu!");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentCategoryKey]);

  const getIconColorClass = (bgClass: string) => {
    const colorOpt = colorOptions.find((c) => c.value === bgClass);
    return colorOpt ? colorOpt.iconColor : "text-gray-500";
  };

  const toggleStatus = (id: number, currentStatus: boolean) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, status: !currentStatus } : item
      )
    );
    setPendingUpdates((prev) => ({
      ...prev,
      [id]: !currentStatus,
    }));
  };

  const saveChanges = async () => {
    setIsSaving(true);
    const updatesToProcess = Object.entries(pendingUpdates);

    const updatePromise = Promise.all(
      updatesToProcess.map(([id, newStatus]) =>
        supabase.from("items").update({ status: newStatus }).eq("id", id)
      )
    );

    await toast.promise(updatePromise, {
      pending: "Değişiklikler buluta kaydediliyor... ☁️",
      success: "Başarıyla güncellendi! 🎉",
      error: "Hata oluştu 🤯",
    });

    setPendingUpdates({});
    setIsSaving(false);
  };

  const handleCategoryChange = (key: string) => {
    if (Object.keys(pendingUpdates).length > 0) {
      const confirmLeave = confirm(
        "Kaydedilmemiş değişikliklerin var! Çıkarsan kaybolacak."
      );
      if (!confirmLeave) return;
    }

    // Dropdown'ı kapat ve yönlendir
    setIsDropdownOpen(false);
    key === "home" ? router.push("/") : router.push(`/${key}`);
  };

  const headerTitle = currentCategoryData ? currentCategoryData.name : "Liste";

  return (
    <main className="min-h-screen bg-gray-50 p-8 pb-32">
      <div className="max-w-4xl mx-auto">
        {/* HEADER KISMI */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>

            {/* DİNAMİK HEADER İKONU VE BAŞLIK */}
            <div className="flex items-center gap-3">
              {currentCategoryData && (
                <div
                  className={`p-2 rounded-full ${currentCategoryData.color_class.replace(
                    "hover:",
                    ""
                  )} bg-opacity-50`}
                >
                  {getIconComponent(
                    currentCategoryData.icon_name,
                    `w-6 h-6 ${getIconColorClass(
                      currentCategoryData.color_class
                    )}`
                  )}
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-800">
                {headerTitle}
              </h1>
            </div>
          </div>

          {/* --- CUSTOM DROPDOWN BAŞLANGICI --- */}
          <div className="relative min-w-[240px]">
            {/* 1. Tetikleyici Buton */}
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:border-gray-400 transition-colors"
            >
              <span className="font-medium truncate mr-2">
                {currentCategoryData?.name || "Seçiniz"}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* 2. Dışarı Tıklama Yakalayıcı */}
            {isDropdownOpen && (
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
            )}

            {/* 3. Açılır Liste */}
            {isDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                {/* Ana Sayfa Seçeneği */}
                <div
                  onClick={() => handleCategoryChange("home")}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 text-gray-700 border-b border-gray-100"
                >
                  <span className="text-xl">🏠</span>
                  <span className="font-medium">Ana Sayfaya Dön</span>
                </div>

                {/* Kategoriler */}
                <div className="max-h-[300px] overflow-y-auto">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat.key)}
                      className={`px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors
                        ${
                          currentCategoryKey === cat.key
                            ? "bg-blue-50 text-blue-700"
                            : "hover:bg-gray-50 text-gray-700"
                        }
                      `}
                    >
                      {/* Dropdown İçi İkon */}
                      <div
                        className={`p-1.5 rounded-full ${cat.color_class.replace(
                          "hover:",
                          ""
                        )} bg-opacity-30`}
                      >
                        {getIconComponent(
                          cat.icon_name,
                          `w-4 h-4 ${getIconColorClass(cat.color_class)}`
                        )}
                      </div>
                      <span className="font-medium">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* --- CUSTOM DROPDOWN BİTİŞİ --- */}
        </div>

        {/* LİSTE KISMI */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 z-0">
            {items.map((item) => (
              <div
                key={item.id}
                className={`bg-white p-6 rounded-xl shadow-sm border transition-all flex items-center justify-between group 
                  ${
                    pendingUpdates.hasOwnProperty(item.id)
                      ? "border-orange-300 ring-1 ring-orange-100"
                      : "border-gray-100"
                  }`}
              >
                <div className="flex items-center gap-4">
                  {/* LİSTE ELEMANI İKONU */}
                  <div
                    className={`p-3 rounded-full transition-colors ${
                      currentCategoryData?.color_class.replace("hover:", "") ||
                      "bg-gray-50"
                    }`}
                  >
                    {currentCategoryData &&
                      getIconComponent(
                        currentCategoryData.icon_name,
                        `w-5 h-5 ${getIconColorClass(
                          currentCategoryData.color_class
                        )}`
                      )}
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
                    <div className="flex flex-wrap gap-2 items-center mt-1">
                      {item.description && (
                        <p className="text-sm text-gray-500">
                          {item.description}
                        </p>
                      )}
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
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 flex flex-col items-center">
                <Link
                  href="/add"
                  className="bg-gray-300 p-4 rounded-full mb-3 hover:bg-blue-600 text-gray-600 hover:text-white 200 transition"
                >
                  <Plus className="w-8 h-8 " />
                </Link>
                <p className="text-gray-500 font-medium">
                  Bu listede henüz hiç öğe yok.
                </p>
              </div>
            )}
          </div>
        )}

        {Object.keys(pendingUpdates).length > 0 && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5 fade-in">
            <button
              onClick={saveChanges}
              disabled={isSaving}
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-lg transition-transform hover:scale-105"
            >
              <Save className="w-6 h-6" />
              {Object.keys(pendingUpdates).length} Değişikliği Kaydet
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
