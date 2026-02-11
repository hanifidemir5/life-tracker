"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supebaseClient";
import {
    Camera,
    Sparkles,
    CheckSquare,
    Square,
    ClipboardList,
    ArrowRight,
    FileSpreadsheet,
    Loader2,
    Save,
    X,
} from "lucide-react";
import { toast } from "react-toastify";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { itemSchema } from "@/app/lib/schemas";

type ScannedItem = {
    title: string;
    description: string;
    isExists?: boolean;
    image_url?: string;
};

type AnalysisMethod = "camera" | "text" | "csv" | null;

type BulkImportModalProps = {
    categoryKey: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    isOwnerRequired?: boolean;
    currentOwner?: string;
};

export default function BulkImportModal({
    categoryKey,
    isOpen,
    onClose,
    onSuccess,
    isOwnerRequired = false,
    currentOwner,
}: BulkImportModalProps) {
    const { t } = useLanguage();
    const { colors } = useTheme();

    const [analyzingMethod, setAnalyzingMethod] = useState<AnalysisMethod>(null);
    const [foundItems, setFoundItems] = useState<ScannedItem[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [showTextModal, setShowTextModal] = useState(false);
    const [listText, setListText] = useState("");
    const [loading, setLoading] = useState(false);

    const stopAnalyzing = () => {
        setAnalyzingMethod(null);
    };

    const handleProcessResults = async (allItems: ScannedItem[]) => {
        const { data: existingItems } = await supabase
            .from("items")
            .select("title")
            .eq("category", categoryKey);

        const existingTitles = new Set(
            (existingItems || []).map((i) => i.title.trim().toLowerCase())
        );

        const processedItems = allItems.map((item) => ({
            ...item,
            isExists: existingTitles.has(item.title.trim().toLowerCase()),
        }));

        setFoundItems(processedItems);

        const newIndices = new Set<number>();
        processedItems.forEach((item, idx) => {
            if (!item.isExists) {
                newIndices.add(idx);
            }
        });

        toast.info(t("allItemsRegistered"));
        setSelectedIndices(newIndices);
        setShowSelectionModal(true);
    };

    // --- 1. CAMERA ---
    const handleScanImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setAnalyzingMethod("camera");
        const formDataUpload = new FormData();
        formDataUpload.append("image", file);
        formDataUpload.append("category", categoryKey);

        try {
            toast.info((t("scanningImage") as string) + " 🤖", { autoClose: 3000 });
            const response = await fetch("/api/scan-image", {
                method: "POST",
                body: formDataUpload,
            });

            if (response.status === 429) {
                toast.warn(
                    t("serverBusy") ||
                    "Sunucu şu an çok yoğun, lütfen 1 dakika bekleyip tekrar deneyin."
                );
                throw new Error("Rate limit exceeded");
            }

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            handleProcessResults(data.books);
        } catch (error: any) {
            console.error(error);
            if (error.message !== "Rate limit exceeded") {
                toast.error(t("errorOccurred"));
            }
        } finally {
            stopAnalyzing();
            e.target.value = "";
        }
    };

    // --- 2. TEXT PASTE ---
    const handleProcessList = async () => {
        if (!listText.trim()) {
            toast.warn(t("pleasePasteList"));
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
            toast.info(t("processingList"), { autoClose: 3000 });
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
            toast.error(t("processingFailed"));
        } finally {
            stopAnalyzing();
        }
    };

    // --- BULK SAVE ---
    const handleSaveSelected = async () => {
        if (selectedIndices.size === 0) return;
        setLoading(true);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                toast.error(t("loginRequired"));
                setLoading(false);
                return;
            }

            const { data: existingItems } = await supabase
                .from("items")
                .select("title")
                .eq("category", categoryKey);

            const existingTitles = new Set(
                (existingItems || []).map((i) => i.title.toLowerCase())
            );

            const itemsToInsert: any[] = [];
            let duplicateCount = 0;
            let validationErrors = 0;

            foundItems.forEach((item, index) => {
                if (selectedIndices.has(index)) {
                    if (existingTitles.has(item.title.toLowerCase())) {
                        duplicateCount++;
                    } else {
                        const candidateData = {
                            title: item.title.substring(0, 100),
                            category: categoryKey,
                            description: item.description,
                            status: false,
                            owner: isOwnerRequired ? currentOwner || undefined : undefined,
                        };

                        const validation = itemSchema.safeParse(candidateData);

                        if (validation.success) {
                            itemsToInsert.push({
                                ...candidateData,
                                owner: isOwnerRequired ? currentOwner : null,
                                user: user.id,
                                image_urls: item.image_url ? [item.image_url] : null,
                                created_at: new Date().toISOString(),
                            });
                        } else {
                            console.error(
                                "Validation failed for:",
                                item.title,
                                validation.error
                            );
                            validationErrors++;
                        }
                    }
                }
            });

            if (
                itemsToInsert.length === 0 &&
                duplicateCount === 0 &&
                validationErrors > 0
            ) {
                toast.error(`${validationErrors} ${t("saveError")}`);
                setLoading(false);
                return;
            }

            if (itemsToInsert.length === 0 && duplicateCount > 0) {
                toast.warning(t("allItemsInList"));
                setLoading(false);
                return;
            }

            if (itemsToInsert.length > 0) {
                const { error } = await supabase.from("items").insert(itemsToInsert);
                if (error) throw error;
            }

            const successMsg =
                itemsToInsert.length > 0
                    ? `${itemsToInsert.length} ${t("itemsAdded")}`
                    : "";
            const skipMsg =
                duplicateCount > 0
                    ? `${duplicateCount} ${t("duplicatesSkipped")}`
                    : "";

            if (duplicateCount > 0) {
                toast.info(`${successMsg} ${skipMsg}`);
            } else {
                toast.success(`${successMsg} 🎉`);
            }

            handleClose();
            onSuccess();
        } catch (error) {
            toast.error(t("saveError"));
        } finally {
            setLoading(false);
        }
    };

    const toggleItemSelection = (index: number) => {
        const newSelection = new Set(selectedIndices);
        if (newSelection.has(index)) newSelection.delete(index);
        else newSelection.add(index);
        setSelectedIndices(newSelection);
    };

    const handleClose = () => {
        setFoundItems([]);
        setSelectedIndices(new Set());
        setShowSelectionModal(false);
        setShowTextModal(false);
        setListText("");
        setAnalyzingMethod(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md md:max-w-lg rounded-2xl shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
                {/* AI ANALYZING OVERLAY */}
                {analyzingMethod !== null && (
                    <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center text-center p-6 animate-in fade-in">
                        <Sparkles className="w-12 h-12 text-purple-600 animate-pulse mb-4" />
                        <h2 className="text-xl font-bold text-gray-800">
                            {t("aiWorking")}
                        </h2>
                        <p className="text-gray-500 mt-2">
                            {analyzingMethod === "camera" && t("scanningImage")}
                            {analyzingMethod === "csv" && t("readingCsv")}
                            {analyzingMethod === "text" && t("analyzingList")}
                        </p>
                    </div>
                )}

                {/* TEXT PASTE MODAL */}
                {showTextModal && (
                    <div className="absolute inset-0 bg-white z-40 flex flex-col p-6 animate-in slide-in-from-bottom-10">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-800">
                                {t("pasteList")}
                            </h2>
                            <button onClick={() => setShowTextModal(false)}>
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>
                        <textarea
                            value={listText}
                            onChange={(e) => setListText(e.target.value)}
                            placeholder={t("listPlaceholder")}
                            className="flex-1 w-full border text-gray-800 border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none mb-4 text-sm"
                        />
                        <button
                            onClick={handleProcessList}
                            className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 flex items-center justify-center gap-2"
                        >
                            {t("analyze")} <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* SELECTION MODAL */}
                {showSelectionModal && (
                    <div className="absolute inset-0 bg-white z-40 flex flex-col p-6 animate-in slide-in-from-bottom-10">
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                            <h2 className="text-lg font-bold text-gray-800">
                                {t("itemsToAdd")} ({foundItems.length})
                            </h2>
                            <button
                                onClick={() => setShowSelectionModal(false)}
                                className="text-gray-400 hover:text-red-500"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                            {foundItems.map((item, idx) => {
                                const isSelected = selectedIndices.has(idx);
                                const isAlreadyAdded = item.isExists;

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => toggleItemSelection(idx)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isAlreadyAdded
                                            ? "bg-gray-50 border-gray-200 opacity-60"
                                            : isSelected
                                                ? `${colors.primaryLight} ${colors.border}`
                                                : "bg-white border-gray-200 hover:border-gray-300"
                                            }`}
                                    >
                                        <div className="shrink-0">
                                            {isSelected ? (
                                                <CheckSquare
                                                    className={`w-5 h-5 ${colors.primary}`}
                                                />
                                            ) : (
                                                <Square className="w-5 h-5 text-gray-300" />
                                            )}
                                        </div>

                                        {item.image_url && (
                                            <img
                                                src={item.image_url}
                                                alt={item.title}
                                                className="w-12 h-16 object-cover rounded-md border border-gray-200"
                                            />
                                        )}

                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-semibold text-gray-800 text-sm">
                                                    {item.title}
                                                </h3>
                                                {isAlreadyAdded && (
                                                    <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                                        {t("alreadyExistsBadge")}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {item.description}
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
                                {t("cancel")}
                            </button>
                            <button
                                onClick={handleSaveSelected}
                                disabled={loading || selectedIndices.size === 0}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin w-5 h-5" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                {t("save")} ({selectedIndices.size})
                            </button>
                        </div>
                    </div>
                )}

                {/* MAIN CONTENT - Method Picker */}
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">
                            {t("importData")}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {/* CAMERA */}
                        <label
                            className="flex flex-col items-center justify-center gap-2 p-4 text-white rounded-xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all text-center bg-linear-to-br from-purple-500 to-indigo-600"
                        >
                            {analyzingMethod === "camera" ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <Camera className="w-6 h-6" />
                            )}
                            <span className="text-xs font-bold">{t("camera")}</span>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={handleScanImage}
                                disabled={analyzingMethod !== null}
                            />
                        </label>

                        {/* PASTE */}
                        <button
                            onClick={() => setShowTextModal(true)}
                            disabled={analyzingMethod !== null}
                            className="flex flex-col items-center justify-center gap-2 p-4 text-white rounded-xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all text-center bg-linear-to-br from-pink-500 to-rose-600"
                        >
                            {analyzingMethod === "text" ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <ClipboardList className="w-6 h-6" />
                            )}
                            <span className="text-xs font-bold">{t("paste")}</span>
                        </button>

                        {/* CSV */}
                        <label
                            className="flex flex-col items-center justify-center gap-2 p-4 text-white rounded-xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all text-center bg-linear-to-br from-emerald-500 to-teal-600"
                        >
                            {analyzingMethod === "csv" ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <FileSpreadsheet className="w-6 h-6" />
                            )}
                            <span className="text-xs font-bold">{t("csv")}</span>
                            <input
                                type="file"
                                accept=".csv,.txt"
                                className="hidden"
                                onChange={handleCsvUpload}
                                disabled={analyzingMethod !== null}
                            />
                        </label>
                    </div>

                    <p className="text-xs text-gray-400 text-center mt-4">
                        {"Fotoğraf, metin listesi veya CSV dosyası ile toplu öğe ekleyin"}
                    </p>
                </div>
            </div>
        </div>
    );
}
