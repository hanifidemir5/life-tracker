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
  ImagePlus,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useTheme } from "@/app/contexts/ThemeContext";

type Category = {
  id: number;
  key: string;
  name: string;
  is_owner_required?: boolean;
};

type ScannedBook = {
  title: string;
  description: string;
  isExists?: boolean;
  image_url?: string;
};

type AnalysisMethod = "camera" | "text" | "csv" | null;

export default function AddItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const { colors, isPaired } = useTheme();
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
    status: false,
    created_at: new Date().toISOString().split('T')[0], // Default to today (YYYY-MM-DD)
  });

  // Photo upload state (max 5 photos)
  const MAX_PHOTOS = 5;
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ id: string; name: string } | null>(null);

  // --- KATEGORİYE GÖRE OWNER ZORUNLULUĞU ---
  // Seçili kategorinin 'is_owner_required' özelliğini bul
  const selectedCategoryObj = categories.find(c => c.key === formData.category);
  const isOwnerRequired = selectedCategoryObj ? selectedCategoryObj.is_owner_required : false;

  // Butonların aktif/pasif durumunu kontrol eden mantık
  const isActionDisabled = isOwnerRequired && !formData.owner;

  const searchParams = useSearchParams();
  const preSelectedCategory = searchParams.get("category");

  useEffect(() => {
    const initData = async () => {
      // 1. Kategorileri Çek
      const { data: catData } = await supabase.from("categories").select("*");
      if (catData) {
        setCategories(catData);
        if (preSelectedCategory) {
          const exists = catData.find((c) => c.key === preSelectedCategory);
          if (exists) {
            setFormData((prev) => ({ ...prev, category: preSelectedCategory }));
          }
        } else if (catData.length > 0 && !formData.category) {
          setFormData((prev) => ({ ...prev, category: catData[0].key }));
        }
      }

      // 2. Profilleri Çek
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Kendi Profilim
      const { data: myProfile } = await supabase.from("profiles").select("id, display_name").eq("id", user.id).single();
      const myName = myProfile?.display_name || "Me";
      setCurrentUserProfile({ id: user.id, name: myName });

      // Partner Profilim (Couples tablosundan)
      const { data: coupleData } = await supabase
        .from("couples")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle();

      const profileList = [{ id: user.id, name: myName }];

      if (coupleData) {
        const partnerId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id;
        const { data: partnerProfile } = await supabase.from("profiles").select("id, display_name").eq("id", partnerId).single();
        const partnerName = partnerProfile?.display_name || "Partner";
        profileList.push({ id: partnerId, name: partnerName });
      }

      setProfiles(profileList);
    };

    initData();
  }, [preSelectedCategory]);

  const stopAnalyzing = () => {
    setAnalyzingMethod(null);
  };

  const handleProcessResults = async (allBooks: ScannedBook[]) => {
    // 1. Veritabanındaki mevcut kitapları kontrol et
    const { data: existingItems } = await supabase
      .from("items")
      .select("title")
      .eq("category", formData.category);

    // Set haline getir (küçük harf ile)
    const existingTitles = new Set((existingItems || []).map(i => i.title.trim().toLowerCase()));

    // 2. Taranan kitapları işaretle
    const processedBooks = allBooks.map(book => ({
      ...book,
      isExists: existingTitles.has(book.title.trim().toLowerCase())
    }));

    setFoundBooks(processedBooks);

    // 3. Sadece VERİTABANINDA OLMAYANLARI seçili yap
    const newIndices = new Set<number>();
    processedBooks.forEach((book, idx) => {
      if (!book.isExists) {
        newIndices.add(idx);
      }
    });

    // Eğer hepsi zaten varsa, yine de modalı aç ama uyarı ver
    toast.info(t('allItemsRegistered'));

    setSelectedIndices(newIndices);
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
      toast.info(t('scanningImage') + " 🤖", { autoClose: 3000 });
      const response = await fetch("/api/scan-books", {
        method: "POST",
        body: formDataUpload,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      handleProcessResults(data.books);
    } catch (error) {
      console.error(error);
      toast.error(t('errorOccurred'));
    } finally {
      stopAnalyzing();
      e.target.value = "";
    }
  };

  // --- 2. LİSTE (METİN) ---
  const handleProcessList = async () => {
    if (!listText.trim()) {
      toast.warn(t('pleasePasteList'));
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
      toast.info(t('processingList'), { autoClose: 3000 });
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
      toast.error(t('processingFailed'));
    } finally {
      stopAnalyzing();
    }
  };

  // --- TOPLU KAYDETME ---
  const handleSaveSelectedBooks = async () => {
    if (selectedIndices.size === 0) return;
    setLoading(true);

    // Fonksiyon çalıştığı andaki güncel kategoriye göre zorunluluğu tekrar kontrol et
    const selectedCat = categories.find(c => c.key === formData.category);
    const currentIsOwnerRequired = selectedCat ? selectedCat.is_owner_required : false;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error(t('loginRequired'));
        setLoading(false);
        return;
      }

      // 1. Önce bu kategorideki mevcut öğelerimi çek (duplicate kontrolü için)
      const { data: existingItems } = await supabase
        .from("items")
        .select("title")
        .eq("category", formData.category);

      const existingTitles = new Set((existingItems || []).map(i => i.title.toLowerCase()));

      // 2. Eklenecek kitapları hazırla (Duplicate olmayanlar)
      const booksToInsert: any[] = [];
      let duplicateCount = 0;

      foundBooks.forEach((book, index) => {
        if (selectedIndices.has(index)) {
          if (existingTitles.has(book.title.toLowerCase())) {
            duplicateCount++;
          } else {
            booksToInsert.push({
              title: book.title,
              description: book.description,
              category: formData.category,
              owner: currentIsOwnerRequired ? formData.owner : null,
              status: false,
              user: user.id,
              image_urls: book.image_url ? [book.image_url] : null,
            });
          }
        }
      });

      if (booksToInsert.length === 0 && duplicateCount > 0) {
        toast.warning(t('allItemsInList'));
        setLoading(false);
        return;
      }

      if (booksToInsert.length > 0) {
        const { error } = await supabase.from("items").insert(booksToInsert);
        if (error) throw error;
      }

      const successMsg = booksToInsert.length > 0 ? `${booksToInsert.length} ${t('itemsAdded')}` : "";
      const skipMsg = duplicateCount > 0 ? `${duplicateCount} ${t('duplicatesSkipped')}` : "";

      if (duplicateCount > 0) {
        toast.info(`${successMsg} ${skipMsg}`);
      } else {
        toast.success(`${successMsg} 🎉`);
      }

      setShowSelectionModal(false);
      setFoundBooks([]);
      router.push(`/${formData.category}`);
      router.refresh();
    } catch (error) {
      toast.error(t('saveError'));
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
    const selectedCat = categories.find(c => c.key === formData.category);
    const currentIsOwnerRequired = selectedCat ? selectedCat.is_owner_required : false;

    if (currentIsOwnerRequired && !formData.owner) {
      toast.warn(t('pleaseSelectOwner'));
      return;
    }
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error(t('loginRequired'));
        setLoading(false);
        return;
      }

      // DUPLICATE CONTROL
      const { data: existingItems } = await supabase
        .from("items")
        .select("id")
        .eq("category", formData.category)
        .ilike("title", formData.title.trim());

      if (existingItems && existingItems.length > 0) {
        toast.warning(t('itemExists'));
        setLoading(false);
        return;
      }

      // Upload photos if any
      let imageUrls: string[] = [];
      if (selectedPhotos.length > 0) {
        toast.info(t('uploadingPhotos'));
        imageUrls = await uploadPhotosToStorage(user.id);
      }

      await supabase.from("items").insert([
        {
          title: formData.title.trim(),
          category: formData.category,
          description: formData.description,
          owner: currentIsOwnerRequired ? formData.owner : null,
          status: formData.status,
          user: user.id,
          image_urls: imageUrls.length > 0 ? imageUrls : null,
          created_at: formData.created_at ? new Date(formData.created_at).toISOString() : new Date().toISOString(),
        },
      ]);

      // Clear photo state
      setSelectedPhotos([]);
      setPhotoPreviews([]);

      toast.success(t('added'));
      router.push(`/${formData.category}`);
      router.refresh();
    } catch {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialActionClick = (e: React.MouseEvent, action: () => void) => {
    if (isActionDisabled) {
      e.preventDefault();
      toast.warn(t('ownerRequiredWarn'));
    } else {
      action();
    }
  };

  // Photo upload handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    const remainingSlots = MAX_PHOTOS - selectedPhotos.length;
    if (files.length > remainingSlots) {
      toast.warn(t('photoLimit'));
      return;
    }

    // Generate previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setSelectedPhotos(prev => [...prev, ...files]);
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]); // Cleanup
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotosToStorage = async (userId: string): Promise<string[]> => {
    if (selectedPhotos.length === 0) return [];

    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of selectedPhotos) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('item-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      }
    } finally {
      setUploadingPhotos(false);
    }

    return uploadedUrls;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl border-2 border-pink-100 relative overflow-hidden">
        {/* GLOBAL LOADER */}
        {analyzingMethod !== null && (
          <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center text-center p-6 animate-in fade-in">
            <Sparkles className="w-12 h-12 text-purple-600 animate-pulse mb-4" />
            <h2 className="text-xl font-bold text-gray-800">
              {t('aiWorking')}
            </h2>
            <p className="text-gray-500 mt-2">
              {analyzingMethod === "camera" && t('scanningImage')}
              {analyzingMethod === "csv" && t('readingCsv')}
              {analyzingMethod === "text" && t('analyzingList')}
            </p>
          </div>
        )}

        {/* --- METİN GİRİŞ MODALI --- */}
        {showTextModal && (
          <div className="absolute inset-0 bg-white z-40 flex flex-col p-6 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {t('pasteList')}
              </h2>
              <button onClick={() => setShowTextModal(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <textarea
              value={listText}
              onChange={(e) => setListText(e.target.value)}
              placeholder={t('listPlaceholder')}
              className="flex-1 w-full border text-gray-800 border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none mb-4 text-sm"
            />
            <button
              onClick={handleProcessList}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 flex items-center justify-center gap-2"
            >
              {t('analyze')} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* --- SELECTION MODAL --- */}
        {showSelectionModal && (
          <div className="absolute inset-0 bg-white z-40 flex flex-col p-6 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-4 border-b pb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {t('itemsToAdd')} ({foundBooks.length})
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
                const isAlreadyAdded = book.isExists;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (!isAlreadyAdded) toggleBookSelection(idx);
                    }}
                    className={`p-3 rounded-lg border flex items-start gap-3 transition-all ${isAlreadyAdded
                      ? "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed"
                      : isSelected
                        ? "border-blue-500 bg-blue-50 cursor-pointer"
                        : "border-gray-200 hover:bg-gray-50 cursor-pointer"
                      }`}
                  >
                    <div className="mt-1">
                      {isAlreadyAdded ? (
                        <div className="w-5 h-5 flex items-center justify-center bg-gray-300 rounded text-white text-[10px] font-bold">✓</div>
                      ) : isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300" />
                      )}
                    </div>

                    {/* Image Preview */}
                    {book.image_url && (
                      <img
                        src={book.image_url}
                        alt={book.title}
                        className="w-12 h-16 object-cover rounded-md border border-gray-200"
                      />
                    )}

                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-gray-800 text-sm">
                          {book.title}
                        </h3>
                        {isAlreadyAdded && (
                          <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                            {t('alreadyExistsBadge')}
                          </span>
                        )}
                      </div>
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
                {t('cancel')}
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
                {t('save')} ({selectedIndices.size})
              </button>
            </div>
          </div>
        )}

        {/* --- HEADER --- */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{t('addItem')}</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6 text-black">
          {/* CATEGORY SELECTION */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('category')}
            </label>
            <select
              value={formData.category}
              onChange={(e) => {
                const selectedCategory = e.target.value;
                const selectedCatObj = categories.find(c => c.key === selectedCategory);
                // KATEGORİ DEĞİŞTİĞİNDE:
                // Eğer yeni kategori owner gerektirmiyorsa, owner state'ini temizle.
                const shouldClearOwner = selectedCatObj && !selectedCatObj.is_owner_required;

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

          {/* DATE PICKER */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('itemDate')}
            </label>
            <input
              type="date"
              value={formData.created_at}
              onChange={(e) =>
                setFormData({ ...formData, created_at: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
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
                {t('whoHasIt')}
                <span className="text-xs font-normal opacity-70">
                  {t('whoHasItHint')}
                </span>
              </label>
              <div className="flex gap-4">
                {profiles.map((profile) => (
                  <label
                    key={profile.id}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <div className="relative flex items-center justify-center">
                      <input
                        type="radio"
                        name="owner"
                        value={profile.name}
                        checked={formData.owner === profile.name}
                        onChange={(e) =>
                          setFormData({ ...formData, owner: e.target.value })
                        }
                        className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-blue-600 checked:bg-blue-600 transition-all"
                      />
                      <div className="absolute w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                    </div>
                    <span
                      className={`${formData.owner === profile.name
                        ? "text-gray-900 font-medium"
                        : "text-gray-600"
                        } group-hover:text-gray-900`}
                    >
                      {profile.name}
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
              <span className="text-xs font-bold">{t('camera')}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleScanImage}
                disabled={analyzingMethod !== null || isActionDisabled}
              />
            </label>

            {/* 2. LIST BUTTON */}
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
              <span className="text-xs font-bold">{t('paste')}</span>
            </button>

            {/* 3. CSV BUTTON */}
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
              <span className="text-xs font-bold">{t('csv')}</span>
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
              {t('orEnterManually')}
            </span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>

          {/* MANUEL FORM */}
          <form onSubmit={handleSubmit} className="space-y-5 text-black">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('itemName')}
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
                {t('notes')}
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

            {/* PHOTO UPLOAD SECTION */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('uploadPhotos')} <span className="text-gray-400">({selectedPhotos.length}/{MAX_PHOTOS})</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {/* Photo Previews */}
                {photoPreviews.map((preview, idx) => (
                  <div key={idx} className="relative w-16 h-16 group">
                    <img
                      src={preview}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover rounded-lg border-2 border-pink-200"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add Photo Button */}
                {selectedPhotos.length < MAX_PHOTOS && (
                  <label className="w-16 h-16 border-2 border-dashed border-pink-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-pink-50 hover:border-pink-400 transition-colors">
                    <ImagePlus className="w-5 h-5 text-pink-400" />
                    <span className="text-[10px] text-pink-400 mt-0.5">{t('addPhoto')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoSelect}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">{t('immortalize')}</p>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer" onClick={() => setFormData({ ...formData, status: !formData.status })}>
              <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${formData.status ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                {formData.status && <CheckSquare className="w-4 h-4 text-white" />}
              </div>
              <span className="text-sm font-medium text-gray-700 select-none">
                {t('markAsCompleted')}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {loading ? t('saving') : t('addToList')}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
