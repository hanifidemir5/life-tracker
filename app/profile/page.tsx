"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supebaseClient";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { ArrowLeft, Copy, Check, Heart, UserPlus, Loader2, Users, BookOpen, Download } from "lucide-react";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { allDataToCSV, allDataToJSON, downloadFile, getExportFilename } from "@/app/lib/exportUtils";
import { Category } from "@/app/hooks/useCategories";
import { Item } from "@/app/hooks/useItems";

export default function SettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState("");
    const [partnerId, setPartnerId] = useState("");
    const [currentPartner, setCurrentPartner] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const { t } = useLanguage();
    const { colors, isPaired } = useTheme();

    useEffect(() => {
        const checkUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            setUserId(user.id);
            await fetchProfile(user.id);
            await checkExistingPartner(user.id);
            setLoading(false);
        };

        checkUser();
    }, [router]);

    const fetchProfile = async (uid: string) => {
        const { data } = await supabase.from("profiles").select("display_name").eq("id", uid).single();
        if (data) setDisplayName(data.display_name || "");
    };

    const handleSaveProfile = async () => {
        if (!userId) return;
        setSaving(true);
        const { error } = await supabase.from("profiles").upsert({
            id: userId,
            display_name: displayName,
            updated_at: new Date().toISOString(),
        });

        if (error) {
            toast.error(t('updateError'));
            console.error(error);
        } else {
            toast.success(t('profileUpdated'));
        }
        setSaving(false);
    };

    const checkExistingPartner = async (myId: string) => {
        // Çift var mı kontrol et
        const { data, error } = await supabase
            .from("couples")
            .select("*")
            .or(`user1_id.eq.${myId},user2_id.eq.${myId}`)
            .maybeSingle();

        if (data) {
            // Eğer bir kayıt varsa, partnerin ID'sini bul
            const partner = data.user1_id === myId ? data.user2_id : data.user1_id;
            setCurrentPartner(partner);
        }
    };

    const handleCopy = () => {
        if (userId) {
            navigator.clipboard.writeText(userId);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            toast.success(t('copied'));
        }
    };

    // Export all data
    const handleExportAll = async (type: "csv" | "json") => {
        setExporting(true);
        try {
            // Fetch all categories
            const { data: categories, error: catError } = await supabase
                .from("categories")
                .select("*")
                .order("id");

            if (catError) throw catError;

            // Fetch all items
            const { data: items, error: itemsError } = await supabase
                .from("items")
                .select("*")
                .order("id", { ascending: false });

            if (itemsError) throw itemsError;

            // Group items by category
            const itemsByCategory: Record<string, Item[]> = {};
            (items || []).forEach((item: Item) => {
                if (!itemsByCategory[item.category]) {
                    itemsByCategory[item.category] = [];
                }
                itemsByCategory[item.category].push(item);
            });

            // Generate export content
            if (type === "csv") {
                const csvContent = allDataToCSV(categories as Category[], itemsByCategory);
                const filename = getExportFilename("all_data", "csv");
                downloadFile(csvContent, filename, "csv");
            } else {
                const jsonContent = allDataToJSON(categories as Category[], itemsByCategory);
                const filename = getExportFilename("all_data", "json");
                downloadFile(jsonContent, filename, "json");
            }

            toast.success(t('exportSuccess'));
        } catch (error) {
            console.error("Export error:", error);
            toast.error(t('error'));
        } finally {
            setExporting(false);
        }
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!partnerId.trim()) {
            toast.warn(t('partnerCodeEmpty'));
            return;
        }

        if (partnerId === userId) {
            toast.error(t('selfMatchError'));
            return;
        }

        setSaving(true);
        try {
            // 1. Önce partner ID'nin geçerli olup olmadığını kontrol edemiyoruz (yetki yok),
            // direkt eklemeye çalışacağız. Eğer foreign key hatası verirse user yok demektir.

            // Biz user1, partner user2 olsun.
            const { error } = await supabase.from("couples").insert([
                {
                    user1_id: userId,
                    user2_id: partnerId,
                },
            ]);

            if (error) {
                if (error.code === "23505") {
                    toast.info(t('alreadyMatched'));
                } else if (error.code === "23503") { // Foreign key violation
                    toast.error(t('codeNotFound'));
                } else {
                    console.error(error);
                    // Belki biz user2 yerindeyizdir? Veya RLS hatası?
                    // RLS hatası ise kullanıcıya bildirim göster.
                    toast.error(t('error') + ": " + error.message);
                }
                return;
            }

            toast.success(t('matchSuccess'));
            setCurrentPartner(partnerId);
            setPartnerId("");
            router.refresh();

        } catch (err) {
            toast.error(t('error'));
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm(t('disconnectConfirm'))) return;

        setSaving(true);
        try {
            // Kendi olduğumuz tüm çift kayıtlarını sil
            const { error } = await supabase
                .from("couples")
                .delete()
                .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

            if (error) throw error;

            toast.info("Bağlantı kesildi.");
            setCurrentPartner(null);
            router.refresh();
        } catch (error: any) {
            toast.error("Hata: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${colors.pageBg}`}>
                <Loader2 className={`w-8 h-8 animate-spin ${isPaired ? 'text-rose-600' : 'text-blue-600'}`} />
            </div>
        );
    }

    return (
        <main className={`min-h-screen p-4 flex items-center justify-center`}>
            <div className={`bg-white w-full max-w-3xl rounded-2xl shadow-2xl border-2 ${isPaired ? 'border-rose-100' : 'border-slate-100'} overflow-hidden`}>
                {/* Header */}
                <div className={`bg-gradient-to-r from-rose-400 to-purple-500 p-6 text-white text-center relative`}>
                    <button
                        onClick={() => router.push("/")}
                        className="absolute left-6 top-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        {isPaired ? (
                            <Heart className="w-8 h-8 text-white animate-pulse" fill="white" />
                        ) : (
                            <BookOpen className="w-8 h-8 text-white" />
                        )}
                    </div>
                    <h1 className="text-2xl font-bold">{t('profilePageTitle')}</h1>
                    <p className="text-purple-100 text-sm mt-1">{isPaired ? t('shareLife') : t('shareLifeSingle')}</p>
                </div>

                <div className="p-4 sm:p-8 space-y-8">

                    {/* --- PROFILE SETTINGS --- */}
                    <div className="pb-8 border-b border-rose-100">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-rose-500" />
                            {t('myProfile')}
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                placeholder={t('displayPlaceholder')}
                                className="flex-1 px-4 py-2 border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none text-gray-900 placeholder:text-gray-400 bg-rose-50/30"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                            />
                            <button
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="bg-rose-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-600 disabled:opacity-50 shadow-md shadow-rose-200"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : t('saveName')}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            {t('nameNote')}
                        </p>
                    </div>

                    {/* --- EXPORT DATA SECTION --- */}
                    <div className="pb-8 border-b border-rose-100">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Download className="w-5 h-5 text-purple-500" />
                            {t('exportAll')}
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">
                            {t('exportAllDescription') || 'Download all your categories and items as a backup file.'}
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => handleExportAll("csv")}
                                disabled={exporting}
                                className="flex items-center gap-2 px-5 py-3 bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 rounded-xl font-medium hover:bg-fuchsia-100 hover:border-fuchsia-300 transition-all disabled:opacity-50"
                            >
                                {exporting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <span className="text-lg">📊</span>
                                )}
                                {t('exportAsCSV')}
                            </button>
                            <button
                                onClick={() => handleExportAll("json")}
                                disabled={exporting}
                                className="flex items-center gap-2 px-5 py-3 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl font-medium hover:bg-purple-100 hover:border-purple-300 transition-all disabled:opacity-50"
                            >
                                {exporting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <span className="text-lg">📄</span>
                                )}
                                {t('exportAsJSON')}
                            </button>
                        </div>
                    </div>
                    {currentPartner ? (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-6 text-center animate-in fade-in zoom-in relative group">
                            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Heart className="w-6 h-6 fill-current" />
                            </div>
                            <h3 className="text-lg font-bold text-rose-800 mb-1">{t('connectionActive')}</h3>
                            <p className="text-rose-600 text-sm mb-2">{t('matchedMessage')}</p>
                            <div className="text-xs text-rose-500 font-mono bg-white inline-block px-2 py-1 rounded border border-rose-200 mb-4">
                                {currentPartner}
                            </div>

                            <button
                                onClick={handleDisconnect}
                                disabled={saving}
                                className="w-full py-2 bg-white border border-rose-200 text-rose-600 rounded-lg text-sm font-medium hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('disconnect')}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                            <p className="text-purple-800 text-sm font-medium">{t('notMatchedMessage')}</p>
                        </div>
                    )}


                    {/* My Code */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                            {t('yourCode')}
                        </label>
                        <div
                            onClick={handleCopy}
                            className="group relative flex items-center justify-between p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-rose-400 hover:bg-rose-50 transition-all"
                        >
                            <code className="text-sm font-mono text-gray-700 font-semibold break-all mr-2">
                                {userId}
                            </code>
                            <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-rose-500" />}
                            </div>
                            {isCopied && (
                                <span className="absolute -top-8 right-0 bg-black text-white text-xs py-1 px-2 rounded shadow-lg animate-in fade-in slide-in-from-bottom-2">
                                    {t('copied')}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            {t('shareCode')}
                        </p>
                    </div>


                    {/* Enter Partner Code */}
                    {!currentPartner && (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500 font-medium">{t('or')}</span>
                                </div>
                            </div>
                            <form onSubmit={handleConnect} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                                        {t('partnerCode')}
                                    </label>
                                    <input
                                        type="text"
                                        value={partnerId}
                                        onChange={(e) => setPartnerId(e.target.value)}
                                        placeholder={t('partnerCodePlaceholder')}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-rose-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <UserPlus className="w-5 h-5" />
                                    )}
                                    {saving ? "Connecting..." : t('addPartner')}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
