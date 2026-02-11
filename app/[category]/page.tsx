"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  Download,
  Upload,
} from "lucide-react";
import { toast } from "react-toastify";
import { getIconComponent, colorOptions } from "@/app/lib/iconMap";
import Link from "next/link";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useItems, useInvalidateItems, useAllItems, Item, ITEMS_PER_PAGE } from "@/app/hooks/useItems";
import { useCategories, useCategoryByKey, Category } from "@/app/hooks/useCategories";
import { itemsToCSV, itemsToJSON, downloadFile, getExportFilename } from "@/app/lib/exportUtils";
import ConfirmModal from "@/app/components/ConfirmModal";
import BulkImportModal from "@/app/components/BulkImportModal";

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const currentCategoryKey = params.category as string;

  // Highlight item after update (from query param)
  const highlightItemId = searchParams.get("highlightItem");
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Pagination state
  const pageParam = searchParams.get("page");
  const initialPage = pageParam ? parseInt(pageParam, 10) : 1;
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Sync state with URL parameter if it changes (e.g. browser back button)
  useEffect(() => {
    const page = searchParams.get("page");
    if (page) {
      setCurrentPage(parseInt(page, 10));
    }
  }, [searchParams]);

  // Local state for optimistic updates
  const [localItems, setLocalItems] = useState<Item[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [photoSlideIndex, setPhotoSlideIndex] = useState<Record<number, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Bulk selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [unsavedChangesModalOpen, setUnsavedChangesModalOpen] = useState(false);

  const [pendingCategoryChange, setPendingCategoryChange] = useState<string | null>(null);

  // Bulk import modal state
  const [showBulkImport, setShowBulkImport] = useState(false);

  // React Query hooks
  const { data: paginatedData, isLoading: itemsLoading } = useItems(currentCategoryKey, currentPage);
  const { data: categoryData, isLoading: categoryLoading } = useCategoryByKey(currentCategoryKey);
  const { data: allCategories = [] } = useCategories(currentUserId);
  const { data: allItemsForExport = [] } = useAllItems(currentCategoryKey);
  const invalidateItems = useInvalidateItems();

  // Sync local items with query data
  useEffect(() => {
    if (paginatedData?.items) {
      setLocalItems(paginatedData.items);
    }
  }, [paginatedData?.items]);

  // Fetch current user for access control
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Access control for private categories
      if (categoryData?.is_private && categoryData.user !== user?.id) {
        toast.error(t('accessDenied') + ": " + t('privateCategoryAccessError'));
        router.push("/");
      }
    };
    if (categoryData) {
      checkAccess();
    }
  }, [categoryData, router, t]);

  // Scroll to highlighted item after update
  useEffect(() => {
    if (highlightItemId && localItems.length > 0) {
      const itemIdNum = parseInt(highlightItemId, 10);
      const itemExists = localItems.find(item => item.id === itemIdNum);

      if (itemExists) {
        // Item is on current page, scroll to it
        setHighlightedItemId(highlightItemId);
        setTimeout(() => {
          const itemRef = itemRefs.current[itemIdNum];
          if (itemRef) {
            itemRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Remove highlight after animation
            setTimeout(() => setHighlightedItemId(null), 2000);
          }
        }, 100);
        // Clean up URL
        router.replace(`/${currentCategoryKey}`, { scroll: false });
      }
    }
  }, [highlightItemId, localItems, currentCategoryKey, router]);

  const getIconColorClass = (bgClass: string) => {
    const colorOpt = colorOptions.find((c) => c.value === bgClass);
    return colorOpt ? colorOpt.iconColor : "text-gray-500";
  };

  const toggleStatus = (id: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setLocalItems(
      localItems.map((item) =>
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
      pending: t('savingChanges'),
      success: t('updateSuccess'),
      error: t('updateError'),
    });

    setPendingUpdates({});
    invalidateItems(currentCategoryKey);
    setIsSaving(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDeleteItemId(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteItemId === null) return;

    setLocalItems((prev) => prev.filter((item) => item.id !== deleteItemId));
    toast.info(t('itemDeleted'), { autoClose: 1500 });
    setDeleteModalOpen(false);

    const { error } = await supabase.from("items").delete().eq("id", deleteItemId);

    if (error) {
      toast.error(t('deletionFailed'));
      invalidateItems(currentCategoryKey);
    } else {
      invalidateItems(currentCategoryKey);
    }
    setDeleteItemId(null);
  };

  const handleCategoryChange = (key: string) => {
    if (Object.keys(pendingUpdates).length > 0) {
      setPendingCategoryChange(key);
      setUnsavedChangesModalOpen(true);
      return;
    }
    proceedWithCategoryChange(key);
  };

  const proceedWithCategoryChange = (key: string) => {
    setIsDropdownOpen(false);
    setCurrentPage(1);
    setSelectedItems(new Set());
    key === "home" ? router.push("/") : router.push(`/${key}`);
  };

  const confirmUnsavedChanges = () => {
    setUnsavedChangesModalOpen(false);
    if (pendingCategoryChange) {
      proceedWithCategoryChange(pendingCategoryChange);
      setPendingCategoryChange(null);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    if (allItemsForExport.length === 0) {
      toast.warn(t('listEmpty'));
      return;
    }
    const csvContent = itemsToCSV(allItemsForExport, categoryData?.name || currentCategoryKey);
    const filename = getExportFilename(currentCategoryKey, "csv");
    downloadFile(csvContent, filename, "csv");
    toast.success(t('exportSuccess'));
    setIsExportDropdownOpen(false);
  };

  const handleExportJSON = () => {
    if (allItemsForExport.length === 0) {
      toast.warn(t('listEmpty'));
      return;
    }
    const jsonContent = itemsToJSON(allItemsForExport, categoryData?.name || currentCategoryKey);
    const filename = getExportFilename(currentCategoryKey, "json");
    downloadFile(jsonContent, filename, "json");
    toast.success(t('exportSuccess'));
    setIsExportDropdownOpen(false);
  };


  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (paginatedData?.totalPages || 1)) {
      setCurrentPage(newPage);
      setPendingUpdates({});
      setSelectedItems(new Set());
    }
  };

  // Bulk selection handlers
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedItems(new Set());
  };

  const toggleItemSelection = (id: number) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  };

  const selectAllItems = () => {
    if (selectedItems.size === localItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(localItems.map(item => item.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    setBulkDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    setBulkDeleteModalOpen(false);
    const idsToDelete = Array.from(selectedItems);
    setLocalItems(prev => prev.filter(item => !selectedItems.has(item.id)));

    try {
      const { error } = await supabase
        .from("items")
        .delete()
        .in("id", idsToDelete);

      if (error) throw error;

      toast.success(t('bulkDeleteSuccess')?.replace('{count}', String(selectedItems.size))
        || `${selectedItems.size} öğe silindi!`);

      setSelectedItems(new Set());
      setIsSelectionMode(false);
      invalidateItems(currentCategoryKey);
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error(t('deletionFailed'));
      invalidateItems(currentCategoryKey);
    } finally {
      setIsDeleting(false);
    }
  };

  const headerTitle = categoryData ? categoryData.name : t('headerTitleList');
  const isLoading = itemsLoading || categoryLoading;

  if (isLoading) {
    return (
      <main className="min-h-screen p-8 flex justify-center items-start pt-32">
        <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 pb-32">
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
              {categoryData && (
                <div
                  className={`p-2 rounded-full ${categoryData.color_class.replace("hover:", "")} bg-opacity-50`}
                >
                  {getIconComponent(
                    categoryData.icon_name,
                    `w-6 h-6 ${getIconColorClass(categoryData.color_class)}`
                  )}
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-800">{headerTitle}</h1>
              {paginatedData && (
                <span className="bg-pink-100 text-pink-700 text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                  {paginatedData.totalCount} {t('items') || 'items'}
                </span>
              )}
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
            {/* SELECT MODE BUTTON */}
            <button
              onClick={toggleSelectionMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isSelectionMode
                ? `${colors.primaryLight} border ${colors.border} ${colors.primary} hover:opacity-90`
                : "bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200"
                }`}
            >
              {isSelectionMode ? (
                <>
                  <span className="text-sm">✕</span>
                  <span className="hidden sm:inline">{t('cancelSelection')}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('selectMode')}</span>
                </>
              )}
            </button>

            {/* IMPORT BUTTON */}
            <button
              onClick={() => setShowBulkImport(true)}
              className={`hidden md:flex items-center gap-2 px-4 py-2 ${colors.primaryLight} border ${colors.border} rounded-lg ${colors.primary} hover:opacity-90 transition-colors font-medium`}
              title={t('importData')}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">{t('importData')}</span>
            </button>

            {/* EXPORT DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors font-medium"
                title={t('exportData')}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{t('exportData')}</span>
              </button>

              {isExportDropdownOpen && (
                <div className="fixed inset-0 z-10" onClick={() => setIsExportDropdownOpen(false)} />
              )}

              {isExportDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-gray-700 border-b border-gray-100"
                  >
                    <span className="text-lg">📊</span>
                    <span className="font-medium">{t('exportAsCSV')}</span>
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                  >
                    <span className="text-lg">📄</span>
                    <span className="font-medium">{t('exportAsJSON')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* CATEGORY DROPDOWN */}
            <div className="relative min-w-[180px]">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:border-gray-400 transition-colors"
              >
                <span className="font-medium truncate mr-2">
                  {categoryData?.name || t('selectCategoryDropdown')}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isDropdownOpen && (
                <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
              )}

              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                  <div
                    onClick={() => handleCategoryChange("home")}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 text-gray-700 border-b border-gray-100"
                  >
                    <span className="text-xl">🏠</span>
                    <span className="font-medium">{t('backToHome')}</span>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto">
                    {allCategories.map((cat: Category) => (
                      <div
                        key={cat.id}
                        onClick={() => handleCategoryChange(cat.key)}
                        className={`px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors ${currentCategoryKey === cat.key ? `${colors.primaryLight} ${colors.primary}` : "hover:bg-gray-50 text-gray-700"
                          }`}
                      >
                        <div className={`p-1.5 rounded-full ${cat.color_class.replace("hover:", "")} bg-opacity-30`}>
                          {getIconComponent(cat.icon_name, `w-4 h-4 ${getIconColorClass(cat.color_class)}`)}
                        </div>
                        <span className="font-medium">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SELECTION TOOLBAR */}
        {isSelectionMode && (
          <div className={`flex items-center justify-between ${colors.primaryLight} border ${colors.borderLight} rounded-xl p-4 mb-4`}>
            <div className="flex items-center gap-4">
              <button
                onClick={selectAllItems}
                className={`text-sm font-medium ${colors.primary} hover:opacity-80 underline`}
              >
                {selectedItems.size === localItems.length ? t('deselectAll') : t('selectAll')}
              </button>
              <span className={`${colors.accent} font-medium`}>
                {t('selectedCount')?.replace('{count}', String(selectedItems.size)) || `${selectedItems.size} seçili`}
              </span>
            </div>
            <button
              onClick={handleBulkDelete}
              disabled={selectedItems.size === 0 || isDeleting}
              className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${colors.buttonGradient} text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md`}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {t('bulkDelete')} ({selectedItems.size})
            </button>
          </div>
        )}

        {/* TOP PAGINATION */}
        {paginatedData && paginatedData.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!paginatedData.hasPreviousPage}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="hidden sm:flex items-center gap-2">
              {Array.from({ length: Math.min(5, paginatedData.totalPages) }, (_, i) => {
                let pageNum;
                if (paginatedData.totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= paginatedData.totalPages - 2) pageNum = paginatedData.totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-10 h-10 rounded-lg font-semibold transition-colors ${currentPage === pageNum ? `bg-gradient-to-r ${colors.buttonGradient} text-white` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!paginatedData.hasNextPage}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>

            <span className="text-sm text-gray-500 ml-2 sm:ml-4 whitespace-nowrap">{t('page') || 'Page'} {currentPage} / {paginatedData.totalPages}</span>
          </div>
        )}

        {/* LİSTE */}
        <div className="grid grid-cols-1 gap-4 z-0">
          {localItems.map((item) => (
            <div
              key={item.id}
              ref={(el) => { itemRefs.current[item.id] = el; }}
              onClick={() => isSelectionMode ? toggleItemSelection(item.id) : router.push(`/detail/${item.id}?page=${currentPage}&category=${currentCategoryKey}`)}
              className={`bg-white p-4 md:p-6 md:pt-8 rounded-xl shadow-lg hover:shadow-2xl border-2 transition-all flex flex-col md:flex-row items-center md:items-start justify-between relative group min-h-[120px] cursor-pointer gap-4 md:gap-0
                ${isSelectionMode ? '' : ''}
                ${highlightedItemId === String(item.id) ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
                ${selectedItems.has(item.id)
                  ? `border-current ring-2 ring-opacity-50 ${colors.primaryLight} ${colors.primary}`
                  : pendingUpdates.hasOwnProperty(item.id)
                    ? `border-dashed ${colors.borderLight}`
                    : `${colors.borderLight} hover:${colors.border}`
                }`}
            >
              {/* Selection Checkbox OR Edit Button */}
              {isSelectionMode ? (
                <div
                  className={`absolute top-2 left-2 p-1.5 rounded-lg transition-colors ${selectedItems.has(item.id) ? `bg-gradient-to-br ${colors.buttonGradient} text-white` : "bg-gray-200 text-gray-400"
                    }`}
                >
                  {selectedItems.has(item.id) ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </div>
              ) : (
                <Link
                  href={`/update/${item.id}?page=${currentPage}`}
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute top-2 left-2 p-1.5 text-gray-300 hover:${colors.primary} hover:${colors.primaryLight} rounded-lg transition-colors`}
                  title={t('edit')}
                >
                  <Pencil className="w-5 h-5" />
                </Link>
              )}

              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full transition-colors ${categoryData?.color_class.replace("hover:", "") || "bg-gray-50"}`}>
                  {categoryData && getIconComponent(categoryData.icon_name, `w-5 h-5 ${getIconColorClass(categoryData.color_class)}`)}
                </div>

                <div>
                  <h3 className={`font-semibold text-lg transition-colors ${item.status ? "text-gray-500" : "text-gray-900"}`}>
                    {item.title}
                  </h3>

                  <div className="flex flex-wrap gap-2 items-center mt-1">
                    <span className={`flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border transition-colors ${item.status ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                      {item.status ? (<><CheckCheck className="w-3 h-3" /> {t('completed')}</>) : (<><Clock className="w-3 h-3" /> {t('pending')}</>)}
                    </span>

                    {item.created_at && (
                      <span className="text-sm text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
                    )}

                    {item.description && (
                      <p className="text-sm text-gray-500 border-l pl-2 border-gray-300 hidden sm:block">{item.description}</p>
                    )}

                    {item.owner && (
                      <span className="hidden sm:flex items-center gap-1 text-xs font-medium px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                        <User className="w-3 h-3" />{item.owner}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side */}
              <div className="flex flex-row md:flex-col items-center gap-3 shrink-0 self-end md:self-auto w-full md:w-auto justify-between md:justify-start mt-2 md:mt-0">
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
                    {item.image_urls.length > 1 && (
                      <>
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          {(photoSlideIndex[item.id] || 0) + 1}/{item.image_urls.length}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentIdx = photoSlideIndex[item.id] || 0;
                            const newIdx = currentIdx === 0 ? item.image_urls!.length - 1 : currentIdx - 1;
                            setPhotoSlideIndex(prev => ({ ...prev, [item.id]: newIdx }));
                          }}
                          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white/90 hover:bg-white rounded-full p-0.5 shadow-md"
                        >
                          <ChevronLeft className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentIdx = photoSlideIndex[item.id] || 0;
                            const newIdx = currentIdx === item.image_urls!.length - 1 ? 0 : currentIdx + 1;
                            setPhotoSlideIndex(prev => ({ ...prev, [item.id]: newIdx }));
                          }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white/90 hover:bg-white rounded-full p-0.5 shadow-md"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-700" />
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div className="flex md:flex-col items-center justify-between gap-2 self-stretch ml-auto md:ml-0">
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className={`p-1.5 text-gray-400 hover:${colors.primary} hover:${colors.primaryLight} rounded-lg transition-colors`}
                    title={t('delete')}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatus(item.id, item.status);
                    }}
                    className="hover:scale-110 transition-transform"
                  >
                    {item.status ? <CheckCircle className="w-8 h-8 text-green-500" /> : <Circle className="w-8 h-8 text-gray-300 hover:text-blue-400" />}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {localItems.length > 0 && (
            <Link
              href={`/add?category=${currentCategoryKey}`}
              className={`bg-white/60 p-6 rounded-xl border-2 border-dashed ${colors.borderLight} hover:${colors.border} hover:bg-white transition-all flex items-center justify-center gap-3 min-h-[120px] group`}
            >
              <div className={`p-3 rounded-full ${colors.primaryLight} transition-colors`}>
                <Plus className={`w-6 h-6 ${colors.primary}`} />
              </div>
              <span className={`${colors.primary} font-semibold text-lg`}>{t('addNew')}</span>
            </Link>
          )}

          {localItems.length === 0 && !isLoading && (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center">
              <div className="bg-gray-50 p-6 rounded-full mb-6 relative group">
                <div className={`absolute inset-0 ${colors.primaryLight} rounded-full animate-ping opacity-75`}></div>
                <Plus className={`w-12 h-12 ${colors.primary} relative z-10`} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('listEmpty')}</h3>
              <p className="text-gray-500 font-medium mb-8 max-w-xs mx-auto">{t('listEmptyMessage')}</p>
              <Link
                href={`/add?category=${currentCategoryKey}`}
                className={`bg-gradient-to-r ${colors.buttonGradient} text-white px-8 py-3 rounded-xl font-bold transition-all hover:shadow-lg hover:scale-105 flex items-center gap-2`}
              >
                <Plus className="w-5 h-5" />{t('addNew')}
              </Link>
            </div>
          )}
        </div>

        {/* PAGINATION */}
        {paginatedData && paginatedData.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!paginatedData.hasPreviousPage}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, paginatedData.totalPages) }, (_, i) => {
                let pageNum;
                if (paginatedData.totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= paginatedData.totalPages - 2) pageNum = paginatedData.totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-10 h-10 rounded-lg font-semibold transition-colors ${currentPage === pageNum ? `bg-gradient-to-r ${colors.buttonGradient} text-white` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!paginatedData.hasNextPage}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>

            <span className="text-sm text-gray-500 ml-4">{t('page') || 'Page'} {currentPage} / {paginatedData.totalPages}</span>
          </div>
        )}

        {/* SAVE BUTTON */}
        {Object.keys(pendingUpdates).length > 0 && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
            <button
              onClick={saveChanges}
              disabled={isSaving}
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-lg transition-transform hover:scale-105"
            >
              <Save className="w-6 h-6" />
              {Object.keys(pendingUpdates).length} {t('saveChangesCount')}
            </button>
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <Link
        href={`/add?category=${currentCategoryKey}`}
        className={`fixed bottom-8 right-8 bg-gradient-to-r ${colors.buttonGradient} text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center z-50`}
      >
        <Plus className="w-8 h-8" />
      </Link>

      {/* Delete Item Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeleteItemId(null); }}
        onConfirm={confirmDelete}
        title={t('deleteConfirmTitle') || 'Öğeyi Sil'}
        message={t('deleteConfirm')}
        confirmText={t('yesDelete')}
        cancelText={t('cancel')}
        type="delete"
      />

      {/* Bulk Delete Modal */}
      <ConfirmModal
        isOpen={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        onConfirm={confirmBulkDelete}
        title={t('bulkDeleteTitle') || 'Toplu Silme'}
        message={t('bulkDeleteConfirm')?.replace('{count}', String(selectedItems.size)) || `${selectedItems.size} öğeyi silmek istediğinize emin misiniz?`}
        confirmText={t('yesDelete')}
        cancelText={t('cancel')}
        type="delete"
        loading={isDeleting}
      />

      {/* Unsaved Changes Modal */}
      <ConfirmModal
        isOpen={unsavedChangesModalOpen}
        onClose={() => { setUnsavedChangesModalOpen(false); setPendingCategoryChange(null); }}
        onConfirm={confirmUnsavedChanges}
        title={t('unsavedChangesTitle') || 'Kaydedilmemiş Değişiklikler'}
        message={t('unsavedChangesWarning')}
        confirmText={t('leaveAnyway') || 'Yine de Çık'}
        cancelText={t('stay') || 'Kal'}
        type="warning"
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        categoryKey={currentCategoryKey}
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={() => invalidateItems(currentCategoryKey)}
      />
    </main>
  );
}
