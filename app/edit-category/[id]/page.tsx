"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient";
import { Save, X, Loader2, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { iconMap, colorOptions, getIconComponent } from "@/app/lib/iconMap";

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id; // URL'den gelen ID

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    key: "",
    icon_name: "Circle",
    color_class: "hover:bg-gray-50",
  });

  // 1. MEVCUT VERİYİ ÇEK
  useEffect(() => {
    const fetchCategory = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        toast.error("Kategori bulunamadı!");
        router.push("/");
      } else {
        setFormData(data);
      }
      setDataLoading(false);
    };
    fetchCategory();
  }, [id, router]);

  // 2. GÜNCELLEME İŞLEMİ
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // --- ESKİ KODU SİLDİK, SADECE BU YENİ YAPI KALMALI ---
    const updateOperation = async () => {
      const { error } = await supabase
        .from("categories")
        .update({
          name: formData.name,
          icon_name: formData.icon_name,
          color_class: formData.color_class,
        })
        .eq("id", id);

      // Supabase hata döndürürse, toast'ın "error" durumuna geçmesi için hatayı fırlatıyoruz
      if (error) throw error;
    };
    // -----------------------------------------------------

    await toast.promise(updateOperation(), {
      pending: "Güncelleniyor...",
      success: "Kategori güncellendi! 🎉",
      error: "Hata oluştu.",
    });

    setLoading(false);
    router.push("/");
    router.refresh();
  };

  // 3. SİLME İŞLEMİ
  const handleDelete = async () => {
    const confirmDelete = confirm(
      "DİKKAT! Bu kategoriyi silersen içindeki TÜM EŞYALAR da silinecek. Emin misin?"
    );
    if (!confirmDelete) return;

    setLoading(true);

    try {
      // Önce içindeki eşyaları temizle (Manual Cascade Delete)
      await supabase.from("items").delete().eq("category", formData.key);

      // Sonra kategoriyi sil
      const { error } = await supabase.from("categories").delete().eq("id", id);

      if (error) throw error;

      toast.success("Kategori ve içerik silindi 👋");
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Silinirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg p-8 rounded-2xl shadow-lg border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Kategori Düzenle</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6 text-black">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adı
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kodu (Değiştirilemez)
              </label>
              <input
                disabled
                type="text"
                value={formData.key}
                className="w-full px-4 py-2 border border-gray-200 bg-gray-100 rounded-lg text-gray-500 cursor-not-allowed font-mono text-sm"
              />
            </div>
          </div>

          {/* İKON SEÇİMİ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İkon Seç
            </label>
            <div className="grid grid-cols-5 gap-3">
              {Object.keys(iconMap).map((iconKey) => (
                <div
                  key={iconKey}
                  onClick={() =>
                    setFormData({ ...formData, icon_name: iconKey })
                  }
                  className={`cursor-pointer p-3 rounded-xl flex items-center justify-center border transition-all hover:bg-gray-50
                            ${
                              formData.icon_name === iconKey
                                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                                : "border-gray-200"
                            }
                        `}
                >
                  {getIconComponent(iconKey, "w-6 h-6 text-gray-600")}
                </div>
              ))}
            </div>
          </div>

          {/* RENK SEÇİMİ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Renk Teması
            </label>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {colorOptions.map((color) => (
                <div
                  key={color.name}
                  onClick={() =>
                    setFormData({ ...formData, color_class: color.value })
                  }
                  className={`cursor-pointer px-4 py-2 rounded-lg border transition-all whitespace-nowrap flex items-center gap-2
                             ${
                               formData.color_class === color.value
                                 ? "border-gray-400 bg-gray-100 ring-1 ring-gray-300"
                                 : "border-gray-200"
                             }
                        `}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${color.dotColor}`}
                  ></div>
                  <span className="text-sm">{color.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {loading ? "Güncelleniyor..." : "Değişiklikleri Kaydet"}
            </button>

            {/* SİLME BUTONU */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 border border-red-200 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              Kategoriyi Sil
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
