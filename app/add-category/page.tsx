"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient";
import { Save, X, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
// Hazırladığımız mapping dosyasını çağırıyoruz
import { iconMap, colorOptions, getIconComponent } from "@/app/lib/iconMap";

export default function AddCategoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    key: "",
    icon_name: "Circle", // Varsayılan
    color_class: "hover:bg-gray-50", // Varsayılan
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const savePromise = new Promise(async (resolve, reject) => {
      const { error } = await supabase.from("categories").insert([
        {
          name: formData.name,
          key: formData.key.toLowerCase().replace(/ /g, "-"),
          icon_name: formData.icon_name, // Seçilen ikon adı kaydediliyor
          color_class: formData.color_class, // Seçilen renk classı kaydediliyor
        },
      ]);

      if (error) reject(error);
      else resolve("success");
    });

    await toast
      .promise(
        savePromise,
        {
          pending: "Kategori oluşturuluyor...",
          success: "Kategori eklendi! 🎉",
          error: "Hata oluştu.",
        },
        { position: "top-right" }
      )
      .then(() => {
        router.push("/");
        router.refresh();
      })
      .finally(() => setLoading(false));
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg p-8 rounded-2xl shadow-lg border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Kategori Ekle</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-black">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adı
              </label>
              <input
                required
                type="text"
                placeholder="Örn: Müzik"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kodu
              </label>
              <input
                required
                type="text"
                placeholder="Örn: music"
                value={formData.key}
                onChange={(e) =>
                  setFormData({ ...formData, key: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
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
          {/* ... kodun geri kalanı aynı ... */}

          {/* RENK SEÇİMİ KISMI */}
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
                  {/* DÜZELTİLEN KISIM BURASI: */}
                  <div
                    className={`w-3 h-3 rounded-full ${color.dotColor}`}
                  ></div>

                  <span className="text-sm">{color.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ... kodun geri kalanı aynı ... */}

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
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>
      </div>
    </main>
  );
}
