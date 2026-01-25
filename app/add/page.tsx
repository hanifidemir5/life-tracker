"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supebaseClient";
import {
  Save,
  X,
  Loader2,
  Camera,
  Sparkles,
  CheckSquare,
  Square,
  ClipboardList,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "react-toastify";

type Category = {
  id: number;
  key: string;
  name: string;
};

type ScannedBook = {
  title: string;
  description: string;
  isExists?: boolean;
};

type AnalysisMethod = "camera" | "text" | "csv" | null;

export default function AddItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [analyzingMethod, setAnalyzingMethod] = useState<AnalysisMethod>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Modallar
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);

  const [foundBooks, setFoundBooks] = useState<ScannedBook[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set()
  );

  const [listText, setListText] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    owner: "",
  });

  const owners = ["Fatma", "Hanifi"];

  // --- KATEGORİYE GÖRE OWNER ZORUNLULUĞU ---
  // Bu değişkeni render sırasında hesaplıyoruz
  const isOwnerRequired =
    formData.category === "book" || formData.category === "lego";

  // Butonların aktif/pasif durumunu kontrol eden mantık
  const isActionDisabled = isOwnerRequired && !formData.owner;

  const searchParams = useSearchParams();
  const preSelectedCategory = searchParams.get("category");

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from("categories").select("*");
      if (data) {
        setCategories(data);
        if (preSelectedCategory) {
          // URL'den gelen kategori varsa onu seç
          const exists = data.find((c) => c.key === preSelectedCategory);
          if (exists) {
            setFormData((prev) => ({ ...prev, category: preSelectedCategory }));
          }
        } else if (data.length > 0 && !formData.category) {
          // Yoksa varsayılan olarak ilkini seç (eğer henüz seçili değilse)
          setFormData((prev) => ({ ...prev, category: data[0].key }));
        }
      }
    };
    fetchCategories();
  }, [preSelectedCategory]);

  const stopAnalyzing = () => {
    setAnalyzingMethod(null);
  };

  const handleProcessResults = (allBooks: ScannedBook[]) => {
    const newBooksOnly = allBooks.filter((book) => !book.isExists);

    if (newBooksOnly.length === 0) {
      if (allBooks.length === 0) {
        toast.warning("Öğe bulunamadı veya format anlaşılamadı.");
      } else {
        toast.success("Listedeki tüm öğeler zaten kayıtlı! 🎉");
      }
      return;
    }

    setFoundBooks(newBooksOnly);
    setSelectedIndices(new Set(newBooksOnly.map((_, i) => i)));
    setShowSelectionModal(true);
  };

  // --- 1. KAMERA ---
  const handleScanImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setAnalyzingMethod("camera");
    const formDataUpload = new FormData();
    formDataUpload.append("image", file);

    try {
      toast.info("Görsel analiz ediliyor... 🤖", { autoClose: 3000 });
      const response = await fetch("/api/scan-books", {
        method: "POST",
        body: formDataUpload,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      handleProcessResults(data.books);
    } catch (error) {
      console.error(error);
      toast.error("Hata oluştu.");
    } finally {
      stopAnalyzing();
      e.target.value = "";
    }
  };

  // --- 2. LİSTE (METİN) ---
  const handleProcessList = async () => {
    if (!listText.trim()) {
      toast.warn("Lütfen bir liste yapıştırın.");
      return;
    }
    setShowTextModal(false);
    processTextContent(listText, "text");
  };

  // --- 3. CSV ---
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        processTextContent(text, "csv");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const processTextContent = async (text: string, method: AnalysisMethod) => {
    setAnalyzingMethod(method);
    try {
      toast.info("Liste işleniyor... 🤖", { autoClose: 3000 });
      const response = await fetch("/api/process-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      handleProcessResults(data.books);
    } catch (error) {
      console.error(error);
      toast.error("İşlenemedi.");
    } finally {
      stopAnalyzing();
    }
  };

  // --- TOPLU KAYDETME ---
  const handleSaveSelectedBooks = async () => {
    if (selectedIndices.size === 0) return;
    setLoading(true);

    // Fonksiyon çalıştığı andaki güncel kategoriye göre zorunluluğu tekrar kontrol et
    const currentIsOwnerRequired =
      formData.category === "book" || formData.category === "lego";

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Oturum açmanız gerekiyor.");
        setLoading(false);
        return;
      }

      const booksToInsert = foundBooks
        .filter((_, index) => selectedIndices.has(index))
        .map((book) => ({
          title: book.title,
          description: book.description,
          category: formData.category,
          // EĞER KATEGORİ BOOK/LEGO DEĞİLSE OWNER KESİNLİKLE NULL GİDER
          owner: currentIsOwnerRequired ? formData.owner : null,
          status: false,
          user: user.id, // Kullanıcı ID eklendi
        }));

      const { error } = await supabase.from("items").insert(booksToInsert);
      if (error) throw error;
      toast.success(`${booksToInsert.length} öğe eklendi! 🎉`);
      setShowSelectionModal(false);
      setFoundBooks([]);
      router.push(`/${formData.category}`);
      router.refresh();
    } catch (error) {
      toast.error("Kaydetme hatası.");
    } finally {
      setLoading(false);
    }
  };

  const toggleBookSelection = (index: number) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) newSelection.delete(index);
    else newSelection.add(index);
    setSelectedIndices(newSelection);
  };

  // --- MANUEL KAYDETME ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Fonksiyon çalıştığı andaki kategoriye göre kontrol
    const currentIsOwnerRequired =
      formData.category === "book" || formData.category === "lego";

    if (currentIsOwnerRequired && !formData.owner) {
      toast.warn("Lütfen bir sahip seçin.");
      return;
    }
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Oturum açmanız gerekiyor.");
        setLoading(false);
        return;
      }

      await supabase.from("items").insert([
        {
          title: formData.title,
          category: formData.category,
          description: formData.description,
          // EĞER KATEGORİ BOOK/LEGO DEĞİLSE OWNER KESİNLİKLE NULL GİDER
          owner: currentIsOwnerRequired ? formData.owner : null,
          status: false,
          user: user.id, // Kullanıcı ID eklendi
        },
      ]);
      toast.success("Eklendi!");
      router.push(`/${formData.category}`);
      router.refresh();
    } catch {
      toast.error("Hata");
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialActionClick = (e: any, action: () => void) => {
    if (isActionDisabled) {
      e.preventDefault();
      toast.warn("Bu kategori için lütfen önce 'Kimin?' olduğunu seçin!");
    } else {
      action();
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden">
        {/* GLOBAL LOADER */}
        {analyzingMethod !== null && (
          <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center text-center p-6 animate-in fade-in">
            <Sparkles className="w-12 h-12 text-purple-600 animate-pulse mb-4" />
            <h2 className="text-xl font-bold text-gray-800">
              Yapay Zeka Çalışıyor
            </h2>
            <p className="text-gray-500 mt-2">
              {analyzingMethod === "camera" && "Görsel taranıyor..."}
              {analyzingMethod === "csv" && "CSV dosyası okunuyor..."}
              {analyzingMethod === "text" && "Liste analiz ediliyor..."}
            </p>
          </div>
        )}

        {/* --- METİN GİRİŞ MODALI --- */}
        {showTextModal && (
          <div className="absolute inset-0 bg-white z-40 flex flex-col p-6 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                Listeyi Yapıştır
              </h2>
              <button onClick={() => setShowTextModal(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <textarea
              value={listText}
              onChange={(e) => setListText(e.target.value)}
              placeholder="Örnek:&#10;1. Dune - Frank Herbert&#10;2. 1984&#10;3. Simyacı"
              className="flex-1 w-full border text-gray-800 border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none mb-4 text-sm"
            />
            <button
              onClick={handleProcessList}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 flex items-center justify-center gap-2"
            >
              Analiz Et <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* --- SEÇİM MODALI --- */}
        {showSelectionModal && (
          <div className="absolute inset-0 bg-white z-40 flex flex-col p-6 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-4 border-b pb-4">
              <h2 className="text-lg font-bold text-gray-800">
                Eklenecek Öğeler ({foundBooks.length})
              </h2>
              <button
                onClick={() => setShowSelectionModal(false)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
              {foundBooks.map((book, idx) => {
                const isSelected = selectedIndices.has(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleBookSelection(idx)}
                    className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all ${isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                      }`}
                  >
                    <div className="mt-1">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 text-sm">
                        {book.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {book.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSelectionModal(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleSaveSelectedBooks}
                disabled={loading || selectedIndices.size === 0}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Kaydet ({selectedIndices.size})
              </button>
            </div>
          </div>
        )}

        {/* --- HEADER --- */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Yeni Ekle</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6 text-black">
          {/* KATEGORİ SEÇİMİ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori
            </label>
            <select
              value={formData.category}
              onChange={(e) => {
                const selectedCategory = e.target.value;
                // KATEGORİ DEĞİŞTİĞİNDE:
                // Eğer yeni kategori Book veya Lego DEĞİLSE, owner state'ini de temizle.
                const shouldClearOwner =
                  selectedCategory !== "book" && selectedCategory !== "lego";

                setFormData({
                  ...formData,
                  category: selectedCategory,
                  owner: shouldClearOwner ? "" : formData.owner,
                });
              }}
              disabled={!!preSelectedCategory}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white ${preSelectedCategory ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.key}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* OWNER UI (SADECE KİTAP/LEGO İSE GÖZÜKÜR) */}
          {isOwnerRequired && (
            <div
              className={`p-4 rounded-xl border transition-colors ${!formData.owner
                ? "bg-red-50 border-red-200 animate-pulse"
                : "bg-blue-50 border-blue-100"
                }`}
            >
              <label
                className={`block text-sm font-medium mb-2 ${!formData.owner ? "text-red-600" : "text-blue-800"
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
                      className={`${formData.owner === person
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

          {/* --- TOPLU EKLEME BUTONLARI (HER ZAMAN GÖRÜNÜR) --- */}
          {/* Eğer owner zorunluysa ve seçilmediyse butonlar gri ve pasif olur */}
          <div className="grid grid-cols-3 gap-2">
            {/* 1. KAMERA BUTONU */}
            <label
              onClick={(e) => handleSpecialActionClick(e, () => { })}
              className={`flex flex-col items-center justify-center gap-2 p-3 text-white rounded-xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all text-center ${isActionDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-br from-purple-500 to-indigo-600"
                }`}
            >
              {analyzingMethod === "camera" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
              <span className="text-xs font-bold">Kamera</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleScanImage}
                disabled={analyzingMethod !== null || isActionDisabled}
              />
            </label>

            {/* 2. LİSTE BUTONU */}
            <button
              onClick={(e) =>
                handleSpecialActionClick(e, () => setShowTextModal(true))
              }
              disabled={analyzingMethod !== null || isActionDisabled}
              className={`flex flex-col items-center justify-center gap-2 p-3 text-white rounded-xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all text-center ${isActionDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-br from-pink-500 to-rose-600"
                }`}
            >
              {analyzingMethod === "text" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ClipboardList className="w-5 h-5" />
              )}
              <span className="text-xs font-bold">Yapıştır</span>
            </button>

            {/* 3. CSV BUTONU */}
            <label
              onClick={(e) => handleSpecialActionClick(e, () => { })}
              className={`flex flex-col items-center justify-center gap-2 p-3 text-white rounded-xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all text-center ${isActionDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-br from-emerald-500 to-teal-600"
                }`}
            >
              {analyzingMethod === "csv" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-5 h-5" />
              )}
              <span className="text-xs font-bold">CSV</span>
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleCsvUpload}
                disabled={analyzingMethod !== null || isActionDisabled}
              />
            </label>
          </div>

          <div className="flex items-center gap-4 my-2">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-xs text-gray-400 font-medium">
              VEYA ELLE GİR
            </span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>

          {/* MANUEL FORM */}
          <form onSubmit={handleSubmit} className="space-y-5 text-black">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notlar
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {loading ? "Kaydediliyor..." : "Listeye Ekle"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
