"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/app/lib/supebaseClient";
import {
  Save,
  Loader2,
  Trash2,
  ArrowLeft,
  CheckCircle,
  Circle,
  AlertTriangle,
  ImagePlus,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { itemSchema, ItemFormData } from "@/app/lib/schemas";
import { useInvalidateItems } from "@/app/hooks/useItems";
import dynamic from "next/dynamic";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });
type Category = {
  id: number;
  key: string;
  name: string;
  is_owner_required?: boolean;
};

export default function UpdateItemPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const itemId = params.id;
  const { t } = useLanguage();
  const { colors, isPaired } = useTheme();
  const invalidateItems = useInvalidateItems();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([]);

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
    mode: "onBlur",
    defaultValues: {
      title: "",
      category: "",
      description: "",
      owner: "",
      status: false,
    }
  });

  const currentCategoryKey = watch("category");
  const currentStatus = watch("status");
  const currentOwner = watch("owner");
  const currentTitle = watch("title");

  // Date state separately (schema doesn't enforce it, supabase handles it)
  const [itemDate, setItemDate] = useState("");

  // Photo upload state (max 5 photos)
  const MAX_PHOTOS = 5;
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]); // URLs from database
  const [newPhotos, setNewPhotos] = useState<File[]>([]); // New photos to upload
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]); // Previews for new photos
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // --- KATEGORİYE GÖRE DURUM METNİ BELİRLEME ---
  const getStatusLabel = (category: string, status: boolean) => {
    if (status) {
      // Durum: TRUE (Tamamlanmış)
      switch (category) {
        case "book":
          return t('statusRead');
        case "movie":
          return t('statusWatched');
        case "lego":
          return t('statusCompleted');
        default:
          return t('statusCompleted'); // General
      }
    } else {
      // Durum: FALSE (Bekliyor)
      switch (category) {
        case "book":
          return t('statusToRead');
        case "movie":
          return t('statusToWatch');
        case "lego":
          return t('statusToDo');
        default:
          return t('statusPending'); // General
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Kategorileri Çek
        const { data: catData } = await supabase.from("categories").select("*");
        setCategories(catData || []);

        // 2. Profilleri Çek
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: myProfile } = await supabase.from("profiles").select("id, display_name").eq("id", user.id).maybeSingle();
          const myName = myProfile?.display_name || "Me";
          const profileList = [{ id: user.id, name: myName }];

          const { data: coupleData } = await supabase.from("couples").select("*").or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).maybeSingle();
          if (coupleData) {
            const partnerId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id;
            const { data: partnerProfile } = await supabase.from("profiles").select("id, display_name").eq("id", partnerId).maybeSingle();
            if (partnerProfile) profileList.push({ id: partnerId, name: partnerProfile.display_name });
          }
          setProfiles(profileList);
        }

        // 3. Mevcut Ögeyi Çek
        const { data: itemData, error } = await supabase
          .from("items")
          .select("*")
          .eq("id", itemId)
          .single();

        if (error) throw error;

        if (itemData) {
          reset({
            title: itemData.title,
            category: itemData.category,
            description: itemData.description || "",
            owner: itemData.owner || "",
            status: itemData.status,
          });
          setItemDate(itemData.created_at ? itemData.created_at.split('T')[0] : "");

          // Load existing photos
          if (itemData.image_urls && Array.isArray(itemData.image_urls)) {
            setExistingPhotos(itemData.image_urls);
          }
        }
      } catch (error) {
        console.error(error);
        toast.error(t('error'));
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    if (itemId) fetchData();
  }, [itemId, router, reset, t]);

  const onSubmit = async (data: ItemFormData) => {
    // Kategorinin zorunluluk durumunu kontrol et
    const currentCategoryObj = categories.find(c => c.key === data.category);
    const isOwnerRequired = currentCategoryObj ? currentCategoryObj.is_owner_required : false;

    if (isOwnerRequired && !data.owner) {
      toast.warn(t('pleaseSelectOwner'));
      return;
    }

    setSaving(true);
    try {
      // Upload new photos if any
      const { data: { user } } = await supabase.auth.getUser();
      let uploadedUrls: string[] = [];
      if (newPhotos.length > 0 && user) {
        toast.info(t('uploadingPhotos'));
        uploadedUrls = await uploadNewPhotos(user.id);
      }

      // Combine existing + new photos
      const allPhotoUrls = [...existingPhotos, ...uploadedUrls];

      const { error } = await supabase
        .from("items")
        .update({
          title: data.title,
          category: data.category,
          description: data.description,
          owner: isOwnerRequired ? data.owner : null,
          status: data.status,
          image_urls: allPhotoUrls.length > 0 ? allPhotoUrls : null,
          created_at: itemDate ? new Date(itemDate).toISOString() : undefined,
        })
        .eq("id", itemId);

      if (error) throw error;

      // Clear new photo state
      setNewPhotos([]);
      setNewPhotoPreviews([]);

      toast.success(t('updateSuccess'));

      // Smart redirect: Go to the category page and highlight the updated item
      const page = searchParams.get('page') || '1';
      invalidateItems(data.category);
      router.push(`/${data.category}?page=${page}&highlightItem=${itemId}`);
    } catch (error) {
      toast.error(t('updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("items").delete().eq("id", itemId);
      if (error) throw error;
      toast.info(t('itemDeleted'));
      invalidateItems();
      router.back();
    } catch (error) {
      toast.error(t('deletionFailed'));
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Photo upload handlers
  const totalPhotos = existingPhotos.length + newPhotos.length;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    const remainingSlots = MAX_PHOTOS - totalPhotos;
    if (files.length > remainingSlots) {
      toast.warn(t('photoLimit'));
      return;
    }

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setNewPhotos(prev => [...prev, ...files]);
    setNewPhotoPreviews(prev => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewPhoto = (index: number) => {
    URL.revokeObjectURL(newPhotoPreviews[index]);
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
    setNewPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadNewPhotos = async (userId: string): Promise<string[]> => {
    if (newPhotos.length === 0) return [];

    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of newPhotos) {
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

  const currentCategoryObj = categories.find(c => c.key === currentCategoryKey);
  const isOwnerRequired = currentCategoryObj ? currentCategoryObj.is_owner_required : false;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 flex-1">
      <div className="bg-white w-full max-w-md md:max-w-2xl p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 relative">
        {/* CUSTOM DELETE MODAL */}
        {showDeleteModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/95 rounded-2xl animate-in fade-in zoom-in-95 p-6">
            <div className="text-center w-full">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('deleteItemConfirmTitle')}
              </h3>
              <p className="text-gray-500 mb-6 text-sm">
                {t('deleteItemConfirmMessage')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    t('yesDelete')
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
              onClick={() => {
                const page = searchParams.get('page') || '1';
                router.push(`/${currentCategoryKey}?page=${page}`);
              }}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">{t('edit')}</h1>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
            title={t('deleteItem')}
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-black">
          {/* --- DURUM (STATUS) ALANI --- */}
          <div
            onClick={() =>
              setValue("status", !currentStatus, { shouldValidate: true })
            }
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all group ${currentStatus
              ? "bg-green-50 border-green-200"
              : "bg-gray-50 border-gray-200 hover:border-blue-300"
              }`}
          >
            <div className="flex flex-col">
              <span
                className={`font-semibold ${currentStatus ? "text-green-800" : "text-gray-700"
                  }`}
              >
                {t('status')}
              </span>
              <span
                className={`text-xs ${currentStatus ? "text-green-600" : "text-gray-500"
                  }`}
              >
                {getStatusLabel(currentCategoryKey, currentStatus)}
              </span>
            </div>

            <div className="transform transition-transform group-active:scale-90">
              {currentStatus ? (
                <CheckCircle className="w-8 h-8 text-green-500 shadow-sm" />
              ) : (
                <Circle className="w-8 h-8 text-gray-300 group-hover:text-blue-400 transition-colors" />
              )}
            </div>
          </div>

          {/* BAŞLIK */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('itemName')}
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-xl focus:ring-2 outline-none transition-all
                    ${errors.title
                  ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                  : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"}`}
              {...register("title")}
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          {/* KATEGORİ */}
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
                register("category").onChange(e); // Propagate
                const newCategory = e.target.value;
                const newCatObj = categories.find(c => c.key === newCategory);
                const shouldClearOwner = newCatObj && !newCatObj.is_owner_required;
                if (shouldClearOwner) {
                  setValue("owner", "", { shouldValidate: true });
                }
              }}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.key}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>}
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

          {/* OWNER */}
          {isOwnerRequired && (
            <div
              className={`p-4 rounded-xl border transition-colors ${!currentOwner
                ? "bg-red-50 border-red-200"
                : "bg-blue-50 border-blue-100"
                }`}
            >
              <label
                className={`block text-sm font-medium mb-2 ${!currentOwner ? "text-red-600" : "text-blue-800"
                  }`}
              >
                Who has it now?{" "}
                <span className="text-xs font-normal opacity-70">
                  (Required)
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
                        value={profile.name}
                        {...register("owner")}
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
              {errors.owner && <p className="mt-1 text-xs text-red-500">{errors.owner.message}</p>}
            </div>
          )}

          {/* NOTLAR */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('notes')}
            </label>
            <JoditEditor
              value={watch("description") || ""}
              config={{
                readonly: false,
                placeholder: t('descriptionPlaceholder') || "Enter description...",
                height: 300,
                toolbarAdaptive: false,
                askBeforePasteHTML: false,
                askBeforePasteFromWord: false,
                defaultActionOnPaste: "insert_as_html",
              }}
              onBlur={(newContent) => setValue("description", newContent, { shouldValidate: true })}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* PHOTO SECTION */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('uploadPhotos')} <span className="text-gray-400">({totalPhotos}/{MAX_PHOTOS})</span>
            </label>
            <div className="grid grid-cols-5 gap-3">
              {/* Existing Photos */}
              {existingPhotos.map((url, idx) => (
                <div key={`existing-${idx}`} className="relative aspect-square group">
                  <img
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-full object-cover rounded-xl border-2 border-blue-200 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingPhoto(idx)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* New Photos */}
              {newPhotoPreviews.map((preview, idx) => (
                <div key={`new-${idx}`} className="relative aspect-square group">
                  <img
                    src={preview}
                    alt={`New Photo ${idx + 1}`}
                    className="w-full h-full object-cover rounded-xl border-2 border-pink-300 shadow-sm"
                  />
                  <div className="absolute top-1 left-1 bg-pink-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold">NEW</div>
                  <button
                    type="button"
                    onClick={() => removeNewPhoto(idx)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Add Photo Button */}
              {totalPhotos < MAX_PHOTOS && (
                <label className="aspect-square border-2 border-dashed border-blue-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors">
                  <ImagePlus className="w-6 h-6 text-blue-400" />
                  <span className="text-xs text-blue-400 mt-1 font-medium">{t('addPhoto')}</span>
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
            <p className="text-xs text-gray-400 mt-2">{t('immortalize')}</p>
          </div>

          {/* BUTONLAR */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              {t('cancel')}
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
              {saving ? t('saving') : t('update')}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
