"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient";
import {
  Save,
  Loader2,
  Trash2,
  ArrowLeft,
  CheckCircle,
  Circle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";

type Category = {
  id: number;
  key: string;
  name: string;
};

export default function UpdateItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    owner: "",
    status: false,
  });

  const owners = ["Fatma", "Hanifi"];

  // --- KATEGORİYE GÖRE DURUM METNİ BELİRLEME ---
  const getStatusLabel = (category: string, status: boolean) => {
    if (status) {
      // Durum: TRUE (Tamamlanmış)
      switch (category) {
        case "book":
          return "Okundu";
        case "movie":
          return "İzlendi";
        case "lego":
          return "Tamamlandı";
        default:
          return "Tamamlandı"; // Genel
      }
    } else {
      // Durum: FALSE (Bekliyor)
      switch (category) {
        case "book":
          return "Okunacak";
        case "movie":
          return "İzlenecek";
        case "lego":
          return "Yapılacak";
        default:
          return "Bekliyor"; // Genel
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: catData } = await supabase.from("categories").select("*");
        setCategories(catData || []);

        const { data: itemData, error } = await supabase
          .from("items")
          .select("*")
          .eq("id", itemId)
          .single();

        if (error) throw error;

        if (itemData) {
          setFormData({
            title: itemData.title,
            category: itemData.category,
            description: itemData.description || "",
            owner: itemData.owner || "",
            status: itemData.status,
          });
        }
      } catch (error) {
        console.error(error);
        toast.error("Hata oluştu.");
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    if (itemId) fetchData();
  }, [itemId, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const isOwnerRequired =
      formData.category === "book" || formData.category === "lego";

    if (isOwnerRequired && !formData.owner) {
      toast.warn("Lütfen bir sahip seçin.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("items")
        .update({
          title: formData.title,
          category: formData.category,
          description: formData.description,
          owner: isOwnerRequired ? formData.owner : null,
          status: formData.status,
        })
        .eq("id", itemId);

      if (error) throw error;
      toast.success("Başarıyla güncellendi! 🎉");
      router.back();
      router.refresh();
    } catch (error) {
      toast.error("Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("items").delete().eq("id", itemId);
      if (error) throw error;
      toast.info("Öğe silindi. 🗑️");
      router.back();
      router.refresh();
    } catch (error) {
      toast.error("Silme işlemi başarısız.");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const isOwnerRequired =
    formData.category === "book" || formData.category === "lego";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg border border-gray-100 relative">
        {/* CUSTOM DELETE MODAL */}
        {showDeleteModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/95 rounded-2xl animate-in fade-in zoom-in-95 p-6">
            <div className="text-center w-full">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Emin misin?
              </h3>
              <p className="text-gray-500 mb-6 text-sm">
                Bu öğeyi silmek üzeresin. Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Evet, Sil"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Düzenle</h1>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
            title="Sil"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6 text-black">
          {/* --- DURUM (STATUS) ALANI --- */}
          <div
            onClick={() =>
              setFormData({ ...formData, status: !formData.status })
            }
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all group ${
              formData.status
                ? "bg-green-50 border-green-200"
                : "bg-gray-50 border-gray-200 hover:border-blue-300"
            }`}
          >
            <div className="flex flex-col">
              <span
                className={`font-semibold ${
                  formData.status ? "text-green-800" : "text-gray-700"
                }`}
              >
                Durum
              </span>
              {/* DİNAMİK METİN BURADA KULLANILIYOR */}
              <span
                className={`text-xs ${
                  formData.status ? "text-green-600" : "text-gray-500"
                }`}
              >
                {getStatusLabel(formData.category, formData.status)}
              </span>
            </div>

            <div className="transform transition-transform group-active:scale-90">
              {formData.status ? (
                <CheckCircle className="w-8 h-8 text-green-500 shadow-sm" />
              ) : (
                <Circle className="w-8 h-8 text-gray-300 group-hover:text-blue-400 transition-colors" />
              )}
            </div>
          </div>

          {/* BAŞLIK */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Başlık
            </label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* KATEGORİ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori
            </label>
            <select
              value={formData.category}
              onChange={(e) => {
                const newCategory = e.target.value;
                const shouldClearOwner =
                  newCategory !== "book" && newCategory !== "lego";
                setFormData({
                  ...formData,
                  category: newCategory,
                  owner: shouldClearOwner ? "" : formData.owner,
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.key}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* OWNER */}
          {isOwnerRequired && (
            <div
              className={`p-4 rounded-xl border transition-colors ${
                !formData.owner
                  ? "bg-red-50 border-red-200"
                  : "bg-blue-50 border-blue-100"
              }`}
            >
              <label
                className={`block text-sm font-medium mb-2 ${
                  !formData.owner ? "text-red-600" : "text-blue-800"
                }`}
              >
                Şu an kimde?{" "}
                <span className="text-xs font-normal opacity-70">
                  (Zorunlu)
                </span>
              </label>
              <div className="flex gap-4">
                {owners.map((person) => (
                  <label
                    key={person}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <div className="relative flex items-center justify-center">
                      <input
                        type="radio"
                        name="owner"
                        value={person}
                        checked={formData.owner === person}
                        onChange={(e) =>
                          setFormData({ ...formData, owner: e.target.value })
                        }
                        className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-blue-600 checked:bg-blue-600 transition-all"
                      />
                      <div className="absolute w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                    </div>
                    <span
                      className={`${
                        formData.owner === person
                          ? "text-gray-900 font-medium"
                          : "text-gray-600"
                      } group-hover:text-gray-900`}
                    >
                      {person}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* NOTLAR */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notlar
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* BUTONLAR */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving ? "Kaydediliyor..." : "Güncelle"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
