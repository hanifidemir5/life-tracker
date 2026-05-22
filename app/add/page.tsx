"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "../lib/supebaseClient";
import {
  Save,
  X,
  Loader2,
  ImagePlus,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { itemSchema, ItemFormData } from "@/app/lib/schemas";
import { useInvalidateItems } from "@/app/hooks/useItems";
import { useInvalidateCategories, useCategories, Category } from "@/app/hooks/useCategories";
import dynamic from "next/dynamic";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

export default function AddItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const { colors, isPaired } = useTheme();
  const invalidateItems = useInvalidateItems();
  const invalidateCategories = useInvalidateCategories();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema) as any,
    mode: "onBlur", // Updated to match other forms
    defaultValues: {
      title: "",
      category: "",
      description: "",
      owner: "",
      status: false,
    }
  });

  const [itemDate, setItemDate] = useState(new Date().toISOString().split('T')[0]);

  const currentCategoryKey = watch("category");
  const currentOwner = watch("owner");

  // Photo upload state (max 5 photos)
  const MAX_PHOTOS = 5;
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ id: string; name: string } | null>(null);

  const searchParams = useSearchParams();
  const preSelectedCategory = searchParams.get("category");

  // Use React Query for categories
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(currentUserId);

  // --- KATEGORİYE GÖRE OWNER ZORUNLULUĞU ---
  // Seçili kategorinin 'is_owner_required' özelliğini bul
  const selectedCategoryObj = categories.find(c => c.key === currentCategoryKey);
  const isOwnerRequired = selectedCategoryObj ? selectedCategoryObj.is_owner_required : false;

  // Butonların aktif/pasif durumunu kontrol eden mantık
  const isActionDisabled = isOwnerRequired && !currentOwner;

  useEffect(() => {
    const initData = async () => {
      // Profilleri Çek
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Kendi Profilim
      const { data: myProfile } = await supabase.from("profiles").select("id, display_name").eq("id", user.id).maybeSingle();
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
        const { data: partnerProfile } = await supabase.from("profiles").select("id, display_name").eq("id", partnerId).maybeSingle();
        const partnerName = partnerProfile?.display_name || "Partner";
        profileList.push({ id: partnerId, name: partnerName });
      }

      setProfiles(profileList);
    };

    initData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Set pre-selected category AFTER categories are loaded so the <select> can display it
  useEffect(() => {
    if (preSelectedCategory && categories.length > 0) {
      setValue("category", preSelectedCategory);
    }
  }, [preSelectedCategory, categories, setValue]);



  // --- MANUEL KAYDETME ---
  const onSubmit = async (data: ItemFormData) => {
    if (isOwnerRequired && !data.owner) {
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

      const { data: existingItems } = await supabase
        .from("items")
        .select("id")
        .eq("category", data.category)
        .ilike("title", data.title.trim());

      if (existingItems && existingItems.length > 0) {
        toast.warning(t('itemExists'));
        setLoading(false);
        return;
      }

      let imageUrls: string[] = [];
      if (selectedPhotos.length > 0) {
        toast.info(t('uploadingPhotos'));
        imageUrls = await uploadPhotosToStorage(user.id);
      }

      await supabase.from("items").insert([
        {
          title: data.title.trim(),
          category: data.category,
          description: data.description,
          owner: isOwnerRequired ? data.owner : null,
          status: data.status,
          user: user.id,
          image_urls: imageUrls.length > 0 ? imageUrls : null,
          created_at: itemDate ? new Date(itemDate).toISOString() : new Date().toISOString(),
        },
      ]);

      setSelectedPhotos([]);
      setPhotoPreviews([]);

      toast.success(t('added'));
      invalidateItems(data.category);
      invalidateCategories();
      router.push(`/${data.category}`);
    } catch {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };



  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    const remainingSlots = MAX_PHOTOS - selectedPhotos.length;
    if (files.length > remainingSlots) {
      toast.warn(t('photoLimit'));
      return;
    }

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setSelectedPhotos(prev => [...prev, ...files]);
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
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
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className={`bg-white w-full max-w-md md:max-w-2xl p-6 md:p-8 rounded-2xl shadow-2xl border-2 ${colors.borderLight} relative overflow-hidden`}>
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
              className={`w-full px-4 py-2 border rounded-xl focus:ring-2 outline-none
                    ${errors.category
                  ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                  : "border-gray-300 focus:ring-blue-500 bg-white"}`}
              {...register("category")}
              onChange={(e) => {
                register("category").onChange(e); // Propagate to react-hook-form
                const selectedCategory = e.target.value;
                const selectedCatObj = categories.find(c => c.key === selectedCategory);
                const shouldClearOwner = selectedCatObj && !selectedCatObj.is_owner_required;
                if (shouldClearOwner) {
                  setValue("owner", undefined); // Clear owner if not required
                }
              }}
              // Removed disabled={!!preSelectedCategory} to fix React Hook Form validation issue
            >
              {!preSelectedCategory && (
                <option value="">{categoriesLoading ? 'Yükleniyor...' : t('selectCategoryDropdown') || 'Kategori Seçin...'}</option>
              )}
              {categories.map((cat) => (
                <option key={cat.id} value={cat.key}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>
            )}
          </div>

          {/* DATE PICKER */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('itemDate')}
            </label>
            <input
              type="date"
              value={itemDate}
              onChange={(e) => setItemDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* OWNER UI */}
          {isOwnerRequired && (
            <div
              className={`p-4 rounded-xl border transition-colors ${!currentOwner
                ? "bg-red-50 border-red-200 animate-pulse"
                : "bg-blue-50 border-blue-100"
                }`}
            >
              <label
                className={`block text-sm font-medium mb-2 ${!currentOwner ? "text-red-600" : "text-blue-800"
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
                        onChange={() => setValue("owner", profile.name, { shouldValidate: true })}
                        checked={currentOwner === profile.name}
                        className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-blue-600 checked:bg-blue-600 transition-all"
                      />
                      <div className="absolute w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                    </div>
                    <span
                      className={`${currentOwner === profile.name
                        ? "text-gray-900 font-medium"
                        : "text-gray-600"
                        } group-hover:text-gray-900`}
                    >
                      {profile.name}
                    </span>
                  </label>
                ))}
              </div>
              {errors.owner && (
                <p className="mt-1 text-xs text-red-500">{errors.owner.message}</p>
              )}
            </div>
          )}


          {/* MANUEL FORM */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-black">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('itemName')}
              </label>
              <input
                type="text"
                placeholder={t('listPlaceholder')}
                className={`w-full px-4 py-2 border rounded-xl focus:ring-2 outline-none transition-all placeholder-gray-400
                    ${errors.title
                    ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"}`}
                {...register("title")}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('description')}
              </label>
              <JoditEditor
              value={""}
              config={{
                readonly: false,
                placeholder: t('descriptionPlaceholder') || "Enter description...",
                height: 300,
                toolbarAdaptive: false,
                askBeforePasteHTML: false,
                askBeforePasteFromWord: false,
                defaultActionOnPaste: "insert_as_html",
              }}
              onChange={(newContent) => setValue("description", newContent, { shouldValidate: true })}
            />
              {errors.description && (
                <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('status')}
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      name="status"
                      onChange={() => setValue("status", false, { shouldValidate: true })}
                      checked={watch("status") === false}
                      className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-red-500 checked:bg-red-500 transition-all"
                    />
                    <div className="absolute w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                  </div>
                  <span className={`${watch("status") === false ? "font-medium text-red-600" : "text-gray-600"}`}>
                    {t('notStarted')}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      name="status"
                      onChange={() => setValue("status", true, { shouldValidate: true })}
                      checked={watch("status") === true}
                      className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-green-500 checked:bg-green-500 transition-all"
                    />
                    <div className="absolute w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                  </div>
                  <span className={`${watch("status") === true ? "font-medium text-green-600" : "text-gray-600"}`}>
                    {t('completed')}
                  </span>
                </label>
              </div>
            </div>

            {/* FOTOĞRAF YÜKLEME */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('photos')} <span className="text-gray-400 text-xs">({selectedPhotos.length}/{MAX_PHOTOS})</span>
              </label>

              <div className="flex flex-wrap gap-4">
                {/* PREVIEWS */}
                {photoPreviews.map((src, index) => (
                  <div key={index} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group shadow-sm">
                    <img src={src} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* ADD PHOTO BUTTON */}
                {selectedPhotos.length < MAX_PHOTOS && (
                  <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group">
                    <ImagePlus className="w-6 h-6 text-gray-400 group-hover:text-blue-500 mb-1" />
                    <span className="text-[10px] text-gray-400 group-hover:text-blue-500 font-medium">Ekle</span>
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" />
                  {uploadingPhotos ? t('uploading') : t('saving')}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {t('saveItem')}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
