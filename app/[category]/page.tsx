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
  ArrowRightLeft,
  Calendar,
  X,
  MoreVertical,
  Check,
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
import CalendarSidebar from "@/app/components/TodoSection";

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
  const [bulkMoveModalOpen, setBulkMoveModalOpen] = useState(false);
  const [moveToCategoryKey, setMoveToCategoryKey] = useState<string>("");
  const [isMoving, setIsMoving] = useState(false);
  const [unsavedChangesModalOpen, setUnsavedChangesModalOpen] = useState(false);

  const [pendingCategoryChange, setPendingCategoryChange] = useState<string | null>(null);

  // Bulk import modal state
  const [showBulkImport, setShowBulkImport] = useState(false);

  const [isMobileCalendarOpen, setIsMobileCalendarOpen] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedItemId((prev) => (prev === id ? null : id));
  };

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

  // Bulk move handlers
  const handleBulkMove = () => {
    if (selectedItems.size === 0) return;
    setMoveToCategoryKey("");
    setBulkMoveModalOpen(true);
  };

  const confirmBulkMove = async () => {
    if (!moveToCategoryKey || selectedItems.size === 0) return;
    setIsMoving(true);
    setBulkMoveModalOpen(false);
    const idsToMove = Array.from(selectedItems);

    try {
      const { error } = await supabase
        .from("items")
        .update({ category: moveToCategoryKey })
        .in("id", idsToMove);

      if (error) throw error;

      // Remove moved items from local state
      setLocalItems(prev => prev.filter(item => !selectedItems.has(item.id)));

      const targetCat = allCategories.find(c => c.key === moveToCategoryKey);
      const targetName = targetCat?.name || moveToCategoryKey;

      toast.success(
        `${selectedItems.size} ${'öğe taşındı'} → ${targetName}`
      );

      setSelectedItems(new Set());
      setIsSelectionMode(false);
      invalidateItems(currentCategoryKey);
      invalidateItems(moveToCategoryKey);
    } catch (error) {
      console.error("Bulk move error:", error);
      toast.error('Taşıma başarısız oldu');
      invalidateItems(currentCategoryKey);
    } finally {
      setIsMoving(false);
    }
  };

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

  const renderPagination = (extraClassName: string) => (
    <div className={`flex items-center justify-center gap-2 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 ${extraClassName}`}>
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={!paginatedData!.hasPreviousPage}
        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>

      <div className="flex items-center gap-1 sm:gap-2">
        {Array.from({ length: Math.min(5, paginatedData!.totalPages) }, (_, i) => {
          let pageNum;
          if (paginatedData!.totalPages <= 5) pageNum = i + 1;
          else if (currentPage <= 3) pageNum = i + 1;
          else if (currentPage >= paginatedData!.totalPages - 2) pageNum = paginatedData!.totalPages - 4 + i;
          else pageNum = currentPage - 2 + i;
          return (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-semibold text-sm sm:text-base transition-colors ${currentPage === pageNum ? `bg-linear-to-r ${colors.buttonGradient} text-white` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={!paginatedData!.hasNextPage}
        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>

      <span className="text-xs sm:text-sm text-gray-500 ml-1 sm:ml-4 whitespace-nowrap">{t('page') || 'Page'} {currentPage} / {paginatedData!.totalPages}</span>
    </div>
  );

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
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 min-w-0 order-last lg:order-first">
        {/* HEADER */}
        <div className="flex flex-col gap-3 mb-6 relative z-20">
          {/* TOP ROW: Title Section */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
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
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold text-gray-800 leading-none">{headerTitle}</h1>
                  {paginatedData && (
                    <span className="text-xs text-gray-400 font-medium mt-1">
                      {paginatedData.totalCount} {t('items') || 'items'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Calendar Toggle Button */}
            <button 
              onClick={() => setIsMobileCalendarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors shadow-sm ml-auto shrink-0"
            >
              <Calendar className="w-5 h-5" />
            </button>
          </div>

          {/* BOTTOM ROW: Actions Section */}
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-2">
              {/* CATEGORY DROPDOWN */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 hover:border-gray-300 transition-colors text-sm h-full"
                >
                  <span className="font-medium truncate mr-1">
                    {categoryData?.name || t('selectCategoryDropdown')}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isDropdownOpen && (
                  <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                )}

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                    <div
                      onClick={() => handleCategoryChange("home")}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 text-gray-700 border-b border-gray-100"
                    >
                      <span className="text-xl">🏠</span>
                      <span className="font-medium">{t('backToHome')}</span>
                    </div>

                    <div className="max-h-[200px] overflow-y-auto">
                      {allCategories.map((cat: Category) => (
                        <div
                          key={cat.id}
                          onClick={() => handleCategoryChange(cat.key)}
                          className={`px-3 py-2.5 cursor-pointer flex items-center gap-2 transition-colors ${currentCategoryKey === cat.key ? `${colors.primaryLight} ${colors.primary}` : "hover:bg-gray-50 text-gray-700"
                            }`}
                        >
                          <div className={`p-1 rounded-full ${cat.color_class.replace("hover:", "")} bg-opacity-30 shrink-0`}>
                            {getIconComponent(cat.icon_name, `w-3 h-3 ${getIconColorClass(cat.color_class)}`)}
                          </div>
                          <span className="font-medium text-sm truncate">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SELECT MODE BUTTON */}
              <button
                onClick={toggleSelectionMode}
                className={`flex items-center justify-center gap-1 px-1 py-2 rounded-lg font-medium transition-colors text-xs ${isSelectionMode
                  ? `${colors.primaryLight} border ${colors.border} ${colors.primary}`
                  : "bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
              >
                {isSelectionMode ? (
                  <>
                    <span>✕</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('select')}</span>
                  </>
                )}
              </button>

              {/* IMPORT BUTTON */}
              <button
                onClick={() => setShowBulkImport(true)}
                className={`flex items-center justify-center gap-1 px-1 py-2 ${colors.primaryLight} border ${colors.border} rounded-lg ${colors.primary} hover:opacity-90 transition-colors font-medium text-xs`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('import')}</span>
              </button>

              {/* EXPORT BUTTON */}
              <div className="relative">
                <button
                  onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                  className="w-full h-full flex items-center justify-center gap-1 px-1 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors font-medium text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('export')}</span>
                </button>

                {isExportDropdownOpen && (
                  <div className="fixed inset-0 z-10" onClick={() => setIsExportDropdownOpen(false)} />
                )}

                {isExportDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                    <button
                      onClick={handleExportCSV}
                      className="w-full px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700 border-b border-gray-100 text-sm"
                    >
                      <span className="text-base">📊</span>
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="w-full px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700 text-sm"
                    >
                      <span className="text-base">📄</span>
                      <span>JSON</span>
                    </button>
                  </div>
                )}
              </div>
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
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkMove}
                disabled={selectedItems.size === 0 || isMoving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                {isMoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                {t('move') || 'Move'} ({selectedItems.size})
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={selectedItems.size === 0 || isDeleting}
                className={`flex items-center gap-2 px-4 py-2 bg-linear-to-r ${colors.buttonGradient} text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md`}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {t('bulkDelete')} ({selectedItems.size})
              </button>
            </div>
          </div>
        )}

        {/* TOP PAGINATION */}
        {paginatedData && paginatedData.totalPages > 1 && renderPagination("mb-4")}

        {/* LİSTE */}
        <div className="grid grid-cols-1 gap-4 z-0">
          {localItems.map((item) => {
            const isExpanded = expandedItemId === item.id;
            const validImages = item.image_urls?.filter(url => url && typeof url === 'string' && url.trim() !== "") || [];
            const hasImage = validImages.length > 0;
            const heroImage = hasImage ? validImages[photoSlideIndex[item.id] || 0] : null;

            return (
              <div
                key={item.id}
                ref={(el) => { itemRefs.current[item.id] = el; }}
                onClick={() => isSelectionMode ? toggleItemSelection(item.id) : toggleExpand(item.id)}
                className={`bg-white rounded-4xl shadow-sm hover:shadow-md border transition-all duration-300 cursor-pointer overflow-hidden group relative
                  ${highlightedItemId === String(item.id) ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
                  ${selectedItems.has(item.id)
                    ? `border-2 border-current ring-2 ring-opacity-50 ${colors.primaryLight} ${colors.primary}`
                    : pendingUpdates.hasOwnProperty(item.id)
                      ? `border-2 border-dashed ${colors.borderLight}`
                      : `border-gray-100 hover:border-gray-200`
                  }
                  ${isExpanded ? 'p-4 sm:p-6' : `p-4 flex items-center gap-4 ${isSelectionMode ? 'pl-14' : ''}`}`}
              >
                {/* Selection Checkbox */}
                {isSelectionMode && (
                  <div
                    className={`absolute z-20 p-1.5 rounded-full shadow-md transition-colors ${isExpanded ? 'top-4 left-4' : 'top-1/2 -translate-y-1/2 left-4'} ${selectedItems.has(item.id) ? `bg-linear-to-br ${colors.buttonGradient} text-white` : "bg-white text-gray-400"}`}
                  >
                    {selectedItems.has(item.id) ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </div>
                )}

                {isExpanded ? (
                  /* --- EXPANDED VIEW --- */
                  <div className="flex flex-col sm:flex-row gap-6 w-full">
                    {/* Left: Big Image */}
                    {hasImage ? (
                      <div className="w-full sm:w-1/3 shrink-0 relative h-56 sm:h-auto sm:aspect-2/3 rounded-2xl overflow-hidden shadow-lg bg-gray-100">
                        <img
                          src={heroImage!}
                          alt={item.title}
                          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${!item.status ? 'grayscale' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(heroImage!, '_blank');
                          }}
                        />
                        {/* Image Nav & Count */}
                        {validImages.length > 1 && (
                          <>
                            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur-sm z-10">
                              {(photoSlideIndex[item.id] || 0) + 1}/{validImages.length}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentIdx = photoSlideIndex[item.id] || 0;
                                const newIdx = currentIdx === 0 ? validImages.length - 1 : currentIdx - 1;
                                setPhotoSlideIndex(prev => ({ ...prev, [item.id]: newIdx }));
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-lg transition-opacity opacity-0 group-hover:opacity-100 z-10"
                            >
                              <ChevronLeft className="w-4 h-4 text-gray-700" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentIdx = photoSlideIndex[item.id] || 0;
                                const newIdx = currentIdx === validImages.length - 1 ? 0 : currentIdx + 1;
                                setPhotoSlideIndex(prev => ({ ...prev, [item.id]: newIdx }));
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-lg transition-opacity opacity-0 group-hover:opacity-100 z-10"
                            >
                              <ChevronRight className="w-4 h-4 text-gray-700" />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className={`w-full sm:w-1/3 shrink-0 relative h-56 sm:h-auto sm:aspect-2/3 rounded-2xl flex items-center justify-center shadow-inner ${categoryData?.color_class.replace("hover:", "") || "bg-gray-50"}`}>
                        {categoryData && getIconComponent(categoryData.icon_name, `w-16 h-16 opacity-50 ${getIconColorClass(categoryData.color_class)}`)}
                      </div>
                    )}

                    {/* Right: Content */}
                    <div className="flex flex-col flex-1 py-1 sm:min-w-0">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {hasImage && <span className="text-[10px] bg-pink-100 text-pink-600 font-bold px-2 py-1 rounded-full uppercase tracking-wider">{t('featuredContent')}</span>}
                        {item.status ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-600 font-bold px-2 py-1 rounded-full uppercase tracking-wider">{t('completed')}</span>
                        ) : (
                            <span className="text-[10px] bg-amber-100 text-amber-600 font-bold px-2 py-1 rounded-full uppercase tracking-wider">{t('pending')}</span>
                        )}
                      </div>
                      
                      <div className="flex items-start justify-between gap-4">
                        <h2 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight mb-2 break-words whitespace-normal">{item.title}</h2>
                        {/* More Options / Edit Button Desktop */}
                        <div className="flex items-center gap-1 shrink-0 -mt-1">
                          <Link
                            href={`/update/${item.id}?page=${currentPage}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors shadow-sm"
                            title={t('edit')}
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={(e) => handleDelete(e, item.id)}
                            className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shadow-sm"
                            title={t('delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-500 pt-1 pb-4 leading-relaxed">
                        {item.description ? item.description : <span className="italic opacity-50">{t('emptyDescription')}</span>}
                      </p>

                      <div className="mt-auto" />

                      {/* Bottom row */}
                      <div className="flex justify-between items-end mt-4 pt-4 border-t border-gray-100">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('releaseDate')}</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                          </p>
                        </div>

                        {/* Checkmark Button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStatus(item.id, item.status); }}
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-md shrink-0 ${item.status ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          {item.status ? <Check className="w-6 h-6 text-white" /> : <Clock className="w-5 h-5 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* --- COLLAPSED VIEW --- */
                  <>
                    {/* Left: Small Image */}
                    {hasImage ? (
                      <div className="w-14 h-20 sm:w-16 sm:h-24 shrink-0 rounded-xl overflow-hidden shadow-sm bg-gray-100 flex items-center justify-center">
                        <img
                          src={heroImage!}
                          alt={item.title}
                          className={`w-full h-full object-cover ${!item.status ? 'grayscale' : ''}`}
                        />
                      </div>
                    ) : (
                      <div className={`w-14 h-20 sm:w-16 sm:h-24 shrink-0 rounded-xl flex items-center justify-center shadow-inner ${categoryData?.color_class.replace("hover:", "") || "bg-gray-50"}`}>
                        {categoryData && getIconComponent(categoryData.icon_name, `w-6 h-6 sm:w-8 sm:h-8 opacity-50 ${getIconColorClass(categoryData.color_class)}`)}
                      </div>
                    )}

                    {/* Middle: Text */}
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className={`text-base sm:text-lg font-bold truncate leading-tight tracking-tight ${item.status ? "text-slate-500 line-through decoration-slate-400" : "text-slate-800"}`}>
                        {item.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs font-semibold text-slate-400 truncate mt-1 tracking-wide">
                        {item.owner ? item.owner : (categoryData?.name || "Item")} &bull; {item.created_at ? new Date(item.created_at).getFullYear() : ""}
                      </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="shrink-0 flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStatus(item.id, item.status); }}
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${item.status ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-50 border border-gray-200 text-gray-300 hover:bg-gray-100'}`}
                        >
                          {item.status ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-gray-300" />}
                        </button>

                        <button 
                          onClick={(e) => { 
                             e.stopPropagation(); 
                             router.push(`/update/${item.id}?page=${currentPage}`); 
                          }} 
                          className="p-2 sm:p-2.5 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-50 transition-colors rounded-full"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}



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
                className={`bg-linear-to-r ${colors.buttonGradient} text-white px-8 py-3 rounded-xl font-bold transition-all hover:shadow-lg hover:scale-105 flex items-center gap-2`}
              >
                <Plus className="w-5 h-5" />{t('addNew')}
              </Link>
            </div>
          )}
        </div>

        {/* BOTTOM PAGINATION */}
        {paginatedData && paginatedData.totalPages > 1 && renderPagination("mt-8")}

        {/* SAVE BUTTON */}
        {Object.keys(pendingUpdates).length > 0 && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
            <button
              onClick={saveChanges}
              disabled={isSaving}
              className="bg-orange-600 hover:bg-orange-700 text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-full shadow-2xl flex items-center gap-2 sm:gap-3 font-bold text-sm sm:text-lg transition-transform hover:scale-105"
            >
              <Save className="w-6 h-6" />
              {Object.keys(pendingUpdates).length} {t('saveChangesCount')}
            </button>
          </div>
        )}
        </div>

        {/* RIGHT — CALENDAR SIDEBAR (hidden on mobile) */}
        <CalendarSidebar userId={currentUserId} className="hidden lg:block order-first lg:order-last" />

        {/* MOBILE CALENDAR DRAWER */}
        <div 
            className={`fixed inset-0 z-50 flex justify-end lg:hidden transition-all duration-300 ${isMobileCalendarOpen ? "visible opacity-100" : "invisible opacity-0"}`}
        >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
              onClick={() => setIsMobileCalendarOpen(false)} 
            />
            {/* Drawer */}
            <div className={`relative w-full max-w-sm bg-[#f8f5f6] h-full overflow-y-auto shadow-2xl px-4 pt-16 pb-4 transition-transform duration-300 transform ${isMobileCalendarOpen ? "translate-x-0" : "translate-x-full"}`}>
                <button 
                    onClick={() => setIsMobileCalendarOpen(false)} 
                    className="absolute top-4 right-4 p-2 bg-white rounded-full text-gray-400 hover:text-rose-500 shadow-sm z-10"
                >
                    <X className="w-5 h-5" />
                </button>
                <CalendarSidebar userId={currentUserId} className="sticky! top-0!" />
            </div>
        </div>
      </div>

      {/* Floating Add Button */}
      <Link
        href={`/add?category=${currentCategoryKey}`}
        className="fixed bottom-8 right-8 bg-linear-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white p-4 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-110 flex items-center justify-center z-40"
      >
        <Plus className="w-7 h-7" />
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

      {/* Bulk Move Modal */}
      {bulkMoveModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-800">
              {'Kategori Taşı'} ({selectedItems.size} {'öğe'})
            </h2>
            <p className="text-sm text-gray-500">
              {'Seçili öğeleri hangi kategoriye taşımak istiyorsunuz?'}
            </p>
            <select
              value={moveToCategoryKey}
              onChange={(e) => setMoveToCategoryKey(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">{'Kategori seçin...'}</option>
              {allCategories
                .filter(c => c.key !== currentCategoryKey)
                .map(c => (
                  <option key={c.key} value={c.key}>{c.name}</option>
                ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setBulkMoveModalOpen(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmBulkMove}
                disabled={!moveToCategoryKey || isMoving}
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isMoving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRightLeft className="w-5 h-5" />}
                {'Taşı'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
