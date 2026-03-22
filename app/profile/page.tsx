"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supebaseClient";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { ArrowLeft, Copy, Check, Heart, UserPlus, Loader2, User, BookOpen, Download, Save, FileText, Code } from "lucide-react";
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

            toast.info(t('disconnected'));
            setCurrentPartner(null);
            router.refresh();
        } catch (error: any) {
            toast.error(t('error') + ": " + error.message);
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
        <main className={`min-h-screen p-4 sm:p-6 pb-24 ${colors.pageBg}`}>
            <div className="max-w-3xl mx-auto space-y-6">
                
                {/* Hero Banner */}
                <div className="bg-linear-to-r from-rose-500 to-purple-600 rounded-[2.5rem] p-10 text-white text-center shadow-lg relative overflow-hidden">
                    <button
                        onClick={() => router.push("/")}
                        className="absolute left-6 top-6 p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors z-20 backdrop-blur-md"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md relative z-10 shadow-inner">
                        <User className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-black relative z-10 tracking-tight">{t('profilePageTitle') || "Profile"}</h1>
                    <p className="text-white/90 text-sm mt-2 relative z-10 font-medium">{isPaired ? t('shareLife') : t('shareLifeSingle')}</p>
                    
                    {/* Decorative background shapes */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full mix-blend-overlay filter blur-2xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full mix-blend-overlay filter blur-xl transform -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
                </div>

                {/* My Profile Card */}
                <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                        <User className="w-6 h-6 text-rose-500" />
                        {t('myProfile')}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Name</label>
                            <input
                                type="text"
                                placeholder={t('displayPlaceholder')}
                                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none text-slate-800 placeholder:text-slate-400 font-semibold transition-all"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="w-full bg-rose-500 text-white px-6 py-4 rounded-2xl font-bold hover:bg-rose-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-md shadow-rose-200"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {t('saveName') || "Save Changes"}
                        </button>
                        <p className="text-xs text-gray-400 text-center font-medium mt-4">
                            {t('nameNote')}
                        </p>
                    </div>
                </div>

                {/* Download All Data Card */}
                <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <div className="mb-6">
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3 mb-2">
                            <Download className="w-6 h-6 text-rose-500" />
                            {t('exportAll') || "Download All Data"}
                        </h2>
                        <p className="text-sm text-slate-400 font-medium pl-9">
                            {t('exportAllDescription') || 'Download all your categories and items as a backup file.'}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 pl-0 sm:pl-9">
                        <button
                            onClick={() => handleExportAll("csv")}
                            disabled={exporting}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gray-50 text-slate-700 rounded-2xl font-bold hover:bg-gray-100 transition-colors disabled:opacity-50 shrink-0"
                        >
                            {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="text-rose-500"><FileText className="w-5 h-5" /></span>}
                            Download as CSV
                        </button>
                        <button
                            onClick={() => handleExportAll("json")}
                            disabled={exporting}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gray-50 text-slate-700 rounded-2xl font-bold hover:bg-gray-100 transition-colors disabled:opacity-50 shrink-0"
                        >
                            {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="text-rose-500"><Code className="w-5 h-5" /></span>}
                            Download as JSON
                        </button>
                    </div>
                </div>

                {/* Connection Status Card */}
                {currentPartner ? (
                    <div className="bg-rose-50 border border-rose-100 p-6 sm:p-8 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left w-full sm:w-auto">
                            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm relative">
                                <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
                                <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full"></div>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 mb-1">{t('connectionActive') || "Connection Active!"}</h3>
                                <p className="text-slate-500 text-sm font-medium mb-1">{t('matchedMessage') || "You are matched with your partner."}</p>
                                <div className="text-[10px] text-slate-400 font-mono bg-white inline-block px-2 py-1 rounded-md border border-gray-100">
                                    {currentPartner}
                                </div>
                            </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                            <span className="bg-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">{t('linked') || "LINKED"}</span>
                            <button onClick={handleDisconnect} disabled={saving} className="text-xs font-bold text-rose-500 hover:text-rose-600 underline">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : (t('disconnect') || "Disconnect")}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                            <UserPlus className="w-6 h-6 text-rose-500" />
                            Partner Connection
                        </h2>
                        
                        <div className="mb-8">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">{t('yourCode')}</label>
                            <div
                                onClick={handleCopy}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors group"
                            >
                                <code className="text-sm font-mono text-slate-700 font-bold tracking-tight">{userId}</code>
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    {isCopied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-3 font-medium">{t('shareCode')}</p>
                        </div>

                        <div className="relative mb-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-100"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-slate-300 font-black uppercase tracking-widest text-[10px]">{t('or') || "OR"}</span>
                            </div>
                        </div>

                        <form onSubmit={handleConnect} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">{t('partnerCode')}</label>
                                <input
                                    type="text"
                                    value={partnerId}
                                    onChange={(e) => setPartnerId(e.target.value)}
                                    placeholder={t('partnerCodePlaceholder')}
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none text-slate-800 placeholder:text-slate-400 font-semibold transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-slate-800 text-white px-6 py-4 rounded-2xl font-bold hover:bg-slate-900 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-md shadow-slate-200"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                                {t('addPartner')}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </main>
    );
}
