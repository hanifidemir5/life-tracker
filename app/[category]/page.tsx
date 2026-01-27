"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient";
import {
  CheckCircle,
  Circle,
  ArrowLeft,
  Loader2,
  User,
  Save,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Clock,
  CheckCheck,
  Trash2,
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
  image_urls?: string[];
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [photoSlideIndex, setPhotoSlideIndex] = useState<Record<number, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("*")
          .order("id");

        if (catError) throw catError;
        setCategories(catData || []);

        const activeCategory = catData?.find(
          (c) => c.key === currentCategoryKey
        );
        setCurrentCategoryData(activeCategory || null);

        const { data: itemData, error: itemError } = await supabase
          .from("items")
          .select("*")
          .eq("category", currentCategoryKey)
          .order("id", { ascending: false });

        if (itemError) throw itemError;

        setItems(itemData || []);
        setPendingUpdates({});
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
    const newStatus = !currentStatus;
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item
      )
    );
    setPendingUpdates((prev) => {
      const newState = { ...prev };
      if (newState.hasOwnProperty(id)) {
        delete newState[id];
      } else {
        newState[id] = newStatus;
      }
      return newState;
    });
  };

  const saveChanges = async () => {
    setIsSaving(true);
    const updatesToProcess = Object.entries(pendingUpdates);

    if (updatesToProcess.length === 0) {
      setIsSaving(false);
      return;
    }

    const updatePromise = Promise.all(
      updatesToProcess.map(([id, newStatus]) =>
        supabase.from("items").update({ status: newStatus }).eq("id", id)
      )
    );

    await toast.promise(updatePromise, {
      pending: "Değişiklikler kaydediliyor...",
      success: "Başarıyla güncellendi! 🎉",
      error: "Hata oluştu",
    });

    setPendingUpdates({});
    setIsSaving(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Bu öğeyi silmek istediğine emin misin?")) return;

    // Optimistic Update
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast.info("Silindi", { autoClose: 1500 });

    const { error } = await supabase.from("items").delete().eq("id", id);

    if (error) {
      toast.error("Silinemedi");
      // Revert or refresh
      router.refresh();
    }
  };

  const handleCategoryChange = (key: string) => {
    if (Object.keys(pendingUpdates).length > 0) {
      const confirmLeave = confirm(
        "Kaydedilmemiş değişikliklerin var! Çıkarsan kaybolacak."
      );
      if (!confirmLeave) return;
    }
    setIsDropdownOpen(false);
    key === "home" ? router.push("/") : router.push(`/${key}`);
  };

  const headerTitle = currentCategoryData ? currentCategoryData.name : "Liste";

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 p-8 pb-32">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>

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

          {/* DROPDOWN */}
          <div className="relative min-w-[240px]">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:border-gray-400 transition-colors"
            >
              <span className="font-medium truncate mr-2">
                {currentCategoryData?.name || "Seçiniz"}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {isDropdownOpen && (
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
            )}

            {isDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div
                  onClick={() => handleCategoryChange("home")}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 text-gray-700 border-b border-gray-100"
                >
                  <span className="text-xl">🏠</span>
                  <span className="font-medium">Ana Sayfaya Dön</span>
                </div>

                <div className="max-h-[300px] overflow-y-auto">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat.key)}
                      className={`px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors
                        ${currentCategoryKey === cat.key
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-gray-50 text-gray-700"
                        }
                      `}
                    >
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
        </div>

        {/* LİSTE */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 z-0">
            {items.map((item) => (
              <div
                key={item.id}
                className={`bg-white p-6 pt-8 rounded-xl shadow-lg hover:shadow-2xl border-2 transition-all flex items-start justify-between relative group min-h-[120px]
                  ${pendingUpdates.hasOwnProperty(item.id)
                    ? "border-rose-300 ring-2 ring-rose-100"
                    : "border-pink-100 hover:border-rose-200"
                  }`}
              >
                {/* Edit Butonu */}
                <Link
                  href={`/update/${item.id}`}
                  className="absolute top-2 left-2 p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Düzenle"
                >
                  <Pencil className="w-5 h-5" />
                </Link>

                <div className="flex items-center gap-4">
                  {/* Kategori İkonu */}
                  <div
                    className={`p-3 rounded-full transition-colors ${currentCategoryData?.color_class.replace("hover:", "") ||
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

                  {/* Metin Alanı */}
                  <div>
                    {/* --- DEĞİŞİKLİK 1: line-through kaldırıldı, renk ayarlandı --- */}
                    <h3
                      className={`font-semibold text-lg transition-colors ${item.status ? "text-gray-500" : "text-gray-900"
                        }`}
                    >
                      {item.title}
                    </h3>

                    <div className="flex flex-wrap gap-2 items-center mt-1">
                      {/* --- DEĞİŞİKLİK 2: Durum Etiketi (Tamamlandı/Bekliyor) --- */}
                      <span
                        className={`flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border transition-colors ${item.status
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                      >
                        {item.status ? (
                          <>
                            <CheckCheck className="w-3 h-3" /> Tamamlandı
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" /> Bekliyor
                          </>
                        )}
                      </span>

                      {/* Açıklama */}
                      {item.description && (
                        <p className="text-sm text-gray-500 border-l pl-2 border-gray-300">
                          {item.description}
                        </p>
                      )}

                      {/* Sahip */}
                      {item.owner && (
                        <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                          <User className="w-3 h-3" />
                          {item.owner}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Photo Slider + Icons Column */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Photo Slider */}
                  {item.image_urls && item.image_urls.length > 0 && (
                    <div className="relative w-20 h-20">
                      <img
                        src={item.image_urls[photoSlideIndex[item.id] || 0]}
                        alt={`${item.title} foto`}
                        className="w-20 h-20 object-cover rounded-xl border-2 border-pink-200 shadow-md cursor-pointer hover:scale-105 transition-transform"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(item.image_urls![photoSlideIndex[item.id] || 0], '_blank');
                        }}
                      />

                      {/* Photo Counter + Navigation */}
                      {item.image_urls.length > 1 && (
                        <>
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            {(photoSlideIndex[item.id] || 0) + 1}/{item.image_urls.length}
                          </div>
                          {/* Prev Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentIdx = photoSlideIndex[item.id] || 0;
                              const newIdx = currentIdx === 0 ? item.image_urls!.length - 1 : currentIdx - 1;
                              setPhotoSlideIndex(prev => ({ ...prev, [item.id]: newIdx }));
                            }}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white/90 hover:bg-white rounded-full p-0.5 shadow-md transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4 text-gray-700" />
                          </button>
                          {/* Next Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentIdx = photoSlideIndex[item.id] || 0;
                              const newIdx = currentIdx === item.image_urls!.length - 1 ? 0 : currentIdx + 1;
                              setPhotoSlideIndex(prev => ({ ...prev, [item.id]: newIdx }));
                            }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white/90 hover:bg-white rounded-full p-0.5 shadow-md transition-colors"
                          >
                            <ChevronRight className="w-4 h-4 text-gray-700" />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Icons Column: Delete (top) + Checkbox (bottom) */}
                  <div className="flex flex-col items-center justify-between gap-2 self-stretch">
                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="p-1.5 text-pink-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>

                    {/* Checkbox Button */}
                    <button
                      onClick={() => toggleStatus(item.id, item.status)}
                      className="hover:scale-110 transition-transform"
                    >
                      {item.status ? (
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      ) : (
                        <Circle className="w-8 h-8 text-gray-300 hover:text-blue-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Item Card at End of List */}
            {items.length > 0 && (
              <Link
                href={`/add?category=${currentCategoryKey}`}
                className="bg-white/60 p-6 rounded-xl border-2 border-dashed border-pink-200 hover:border-pink-400 hover:bg-white transition-all flex items-center justify-center gap-3 min-h-[120px] group"
              >
                <div className="bg-pink-100 p-3 rounded-full group-hover:bg-pink-200 transition-colors">
                  <Plus className="w-6 h-6 text-pink-500" />
                </div>
                <span className="text-pink-600 font-semibold text-lg">Yeni Ekle</span>
              </Link>
            )}

            {items.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                <div className="bg-gray-50 p-6 rounded-full mb-6 relative group">
                  <div className="absolute inset-0 bg-blue-100/50 rounded-full animate-ping opacity-75 group-hover:opacity-100 transition-opacity"></div>
                  <Plus className="w-12 h-12 text-blue-500 relative z-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Liste Boş!</h3>
                <p className="text-gray-500 font-medium mb-8 max-w-xs mx-auto">
                  Henüz bu kategoriye ait bir öğe eklenmemiş. İlkini ekleyerek başla!
                </p>

                <Link
                  href={`/add?category=${currentCategoryKey}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all hover:shadow-lg hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Yeni Ekle
                </Link>
              </div>
            )}
          </div>
        )}

        {/* KAYDET BUTONU */}
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

      {/* Floating Add Button for this Category */}
      <Link
        href={`/add?category=${currentCategoryKey}`}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center z-50"
      >
        <Plus className="w-8 h-8" />
      </Link>
    </main>
  );
}
