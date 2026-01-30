"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient";
import { Save, X, Loader2, Camera } from "lucide-react";
import { toast } from "react-toastify";
// Hazırladığımız mapping dosyasını çağırıyoruz
import { iconMap, colorOptions, getIconComponent } from "@/app/lib/iconMap";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { TranslationKey } from "@/app/lib/translations";

export default function AddCategoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const { colors, isPaired } = useTheme();

  // Tab State: 'icon' | 'image'
  const [activeTab, setActiveTab] = useState<"icon" | "image">("icon");

  const [formData, setFormData] = useState({
    name: "",
    key: "",
    icon_name: "Circle", // Varsayılan ikon
    color_class: "hover:bg-gray-50", // Varsayılan
    is_owner_required: false, // Yeni alan
    is_private: false, // Private category field
  });

  // Resim Yükleme State'leri
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Dosya seçilince çalışır
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Önizleme oluştur
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 0. Kullanıcıyı al
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error(t('error'));
        setLoading(false);
        return;
      }

      let finalIconName = formData.icon_name;

      // Eğer "Resim Yükle" tabı aktifse ve dosya seçilmişse
      if (activeTab === "image" && selectedFile) {
        // 1. Dosya ismini benzersiz yap (türkçe karakterleri temizle vs. basitçe timestamp ekle)
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2)}.${fileExt}`;

        // 2. Supabase Storage'a yükle
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("icons") // 'icons' bucket'ı olmalı
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        // 3. Public URL al
        const { data: publicUrlData } = supabase.storage
          .from("icons")
          .getPublicUrl(fileName);

        finalIconName = publicUrlData.publicUrl;
      } else if (activeTab === "image" && !selectedFile) {
        // Resim tabında ama resim seçmemiş -> Hata ver veya varsayılanı kullan
        toast.warning(t('partnerCodeEmpty'));
        setLoading(false);
        return;
      }

      // 4. Veritabanına kaydet
      const { error } = await supabase.from("categories").insert([
        {
          name: formData.name,
          key: formData.key.toLowerCase().replace(/ /g, "-"),
          icon_name: finalIconName,
          color_class: formData.color_class,
          user: user.id,
          is_owner_required: formData.is_owner_required, // Yeni alan eklendi
          is_private: formData.is_private, // Private category field
        },
      ]);

      if (error) throw error;

      toast.success(t('success'));
      router.push("/");
      router.refresh();
    } catch (error: any) {
      console.error("Full Error Object:", error);
      toast.error(t('error') + ": " + (error.message || "Bir şeyler ters gitti"));
    } finally {
      setLoading(false);
    }
  };

  const activeColorObj = colorOptions.find(c => c.value === formData.color_class) || colorOptions[0];

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className={`bg-white w-full max-w-lg lg:max-w-3xl p-8 rounded-2xl shadow-2xl border-4 transition-colors duration-300 ${activeColorObj.borderColor || (isPaired ? 'border-pink-100' : 'border-slate-100')}`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{t('addCategory')}</h1>
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
                {t('categoryName')}
              </label>
              <input
                required
                type="text"
                placeholder={t('categoryNamePlaceholder')}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('categoryKey')}
              </label>
              <input
                required
                type="text"
                placeholder={t('categoryKeyPlaceholder')}
                value={formData.key}
                onChange={(e) =>
                  setFormData({ ...formData, key: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
              />
            </div>
          </div>

          {/* TABLARI SEÇME (İkon Listesi vs Resim Yükle) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('appearance')}
            </label>
            <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
              <button
                type="button"
                onClick={() => setActiveTab("icon")}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === "icon"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {t('iconList')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("image")}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === "image"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {t('uploadImage')}
              </button>
            </div>

            {/* 1. SEÇENEK: İKON LİSTESİ */}
            {activeTab === "icon" && (
              <div className="grid grid-cols-5 gap-3">
                {Object.keys(iconMap).map((iconKey) => (
                  <div
                    key={iconKey}
                    onClick={() =>
                      setFormData({ ...formData, icon_name: iconKey })
                    }
                    className={`cursor-pointer p-3 rounded-xl flex items-center justify-center border transition-all hover:bg-gray-50
                            ${formData.icon_name === iconKey
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : "border-gray-200"
                      }
                        `}
                  >
                    {getIconComponent(iconKey, "w-6 h-6 text-gray-600")}
                  </div>
                ))}
              </div>
            )}

            {/* 2. SEÇENEK: RESİM YÜKLEME */}
            {activeTab === "image" && (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors">
                {imagePreview ? (
                  <div className="relative mb-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded-full shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="mb-2 p-3 bg-blue-50 text-blue-500 rounded-full">
                    <Camera className="w-6 h-6" />
                  </div>
                )}

                {!imagePreview && (
                  <>
                    <p className="text-sm text-gray-600 mb-1">
                      {t('uploadNote')}
                    </p>
                    <p className="text-xs text-gray-400 mb-4">
                      PNG, JPG veya GIF (Max 2MB)
                    </p>
                  </>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="icon-upload"
                />
                {!imagePreview && (
                  <label
                    htmlFor="icon-upload"
                    className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all shadow-sm"
                  >
                    {t('selectFile')}
                  </label>
                )}
              </div>
            )}
          </div>

          {/* RENK SEÇİMİ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('colorTheme')}
            </label>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {colorOptions.map((color) => (
                <div
                  key={color.name}
                  onClick={() =>
                    setFormData({ ...formData, color_class: color.value })
                  }
                  className={`cursor-pointer px-4 py-2 rounded-lg border transition-all whitespace-nowrap flex items-center gap-2
                    ${formData.color_class === color.value
                      ? "border-gray-400 bg-gray-100 ring-1 ring-gray-300"
                      : "border-gray-200"
                    }
              `}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${color.dotColor}`}
                  ></div>

                  <span className="text-sm">{t(color.name as TranslationKey)}</span>
                </div>
              ))}
            </div>
          </div>



          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <input
              type="checkbox"
              id="isOwnerRequired"
              checked={formData.is_owner_required}
              onChange={(e) => setFormData({ ...formData, is_owner_required: e.target.checked })}
              className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
            />
            <label htmlFor="isOwnerRequired" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
              {t('ownerRequiredQuery')}
              <p className="text-xs text-gray-500 font-normal mt-0.5">
                {t('ownerRequiredHint')}
              </p>
            </label>
          </div>

          {/* Private Category Checkbox */}
          <div className="mt-6 p-4 bg-purple-50 border-2 border-purple-100 rounded-xl">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_private}
                onChange={(e) =>
                  setFormData({ ...formData, is_private: e.target.checked })
                }
                className="mt-1 w-5 h-5 text-purple-600 border-purple-300 rounded focus:ring-purple-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔒</span>
                  <span className="font-semibold text-purple-900">
                    {t('privateCategory')}
                  </span>
                </div>
                <p className="text-sm text-purple-700 mt-1">
                  {t('privateCategoryQuery')}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {t('privateCategoryHint')}
                </p>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {loading ? t('saving') : t('save')}
          </button>
        </form >
      </div >
    </main >
  );
}
