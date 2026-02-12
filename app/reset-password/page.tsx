"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supebaseClient";
import { toast } from "react-toastify";
import { Lock, Loader2, CheckCircle } from "lucide-react";
import { useLanguage } from "@/app/contexts/LanguageContext";

export default function ResetPasswordPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Check if user is actually authenticated (Supabase signs specific user in via the magic link)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error("Geçersiz veya süresi dolmuş bağlantı. Lütfen tekrar deneyin.");
                router.push("/login");
            }
        };
        checkSession();
    }, [router]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Şifreler eşleşmiyor!");
            return;
        }

        if (password.length < 6) {
            toast.error("Şifre en az 6 karakter olmalı.");
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setSuccess(true);
            toast.success("Şifreniz başarıyla güncellendi!");

            // Redirect after delay
            setTimeout(() => {
                router.push("/");
            }, 2000);

        } catch (error: any) {
            console.error(error);
            toast.error("Şifre güncelleme hatası: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <main className="bg-gradient-auth min-h-screen flex items-center justify-center p-6">
                <div className="w-full max-w-sm space-y-8">
                    <div className="glass-card p-8 rounded-2xl soft-shadow text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                            {t('passwordUpdatedTitle')}
                        </h1>
                        <p className="text-slate-500 mb-6">
                            {t('passwordUpdatedDesc')}
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="bg-gradient-auth min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="bg-violet-200/60 p-5 rounded-full inline-flex items-center justify-center mb-2">
                        <Lock className="w-9 h-9 text-[#991B1B]" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {t('resetPasswordTitle')} <span className="italic text-[#991B1B]">{t('resetPasswordTitleSpan')}</span>
                    </h1>
                    <p className="text-slate-500 font-light text-sm">
                        {t('resetPasswordDesc')}
                    </p>
                </div>

                {/* Glass Card Form */}
                <div className="glass-card p-8 rounded-2xl soft-shadow">
                    <form onSubmit={handleUpdatePassword} className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 ml-1">
                                {t('newPassword')}
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="w-4 h-4 text-violet-300 group-focus-within:text-[#991B1B] transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="block w-full pl-11 pr-4 py-3.5 bg-white/70 border border-violet-100 rounded-2xl focus:ring-2 focus:ring-[#991B1B] focus:border-[#991B1B] outline-none transition-all text-slate-900 placeholder:text-slate-400"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 ml-1">
                                {t('confirmPassword')}
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="w-4 h-4 text-violet-300 group-focus-within:text-[#991B1B] transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="block w-full pl-11 pr-4 py-3.5 bg-white/70 border border-violet-100 rounded-2xl focus:ring-2 focus:ring-[#991B1B] focus:border-[#991B1B] outline-none transition-all text-slate-900 placeholder:text-slate-400"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#991B1B] hover:bg-[#7C2D12] text-white font-semibold py-4 rounded-2xl shadow-lg shadow-[#991B1B]/20 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('updatePassword')}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
