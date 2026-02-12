"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { login, signup } from "@/app/actions/auth"; // Server actions
import { Loader2, Mail, CheckCircle, Heart } from "lucide-react";
import { toast } from "react-toastify";
import { supabase } from "@/app/lib/supebaseClient";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { loginSchema, registerSchema, LoginFormData, RegisterFormData } from "@/app/lib/schemas";

export default function LoginPage() {
    const router = useRouter();
    const { t, language } = useLanguage();
    const { isPaired } = useTheme();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showEmailConfirmModal, setShowEmailConfirmModal] = useState(false);
    const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [sendingReset, setSendingReset] = useState(false);

    // React Hook Form
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        clearErrors,
    } = useForm<RegisterFormData>({
        resolver: zodResolver(isLogin ? loginSchema : registerSchema) as any,
        mode: "onBlur",
    });

    // Check if user is already logged in
    useEffect(() => {
        const checkSession = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                router.replace("/");
            }
        };
        checkSession();
    }, [router]);

    // Reset form when mode changes
    useEffect(() => {
        reset();
        clearErrors();
    }, [isLogin, reset, clearErrors]);

    const handleForgotPassword = async () => {
        if (!resetEmail) {
            toast.error("Lütfen email adresinizi girin.");
            return;
        }
        setSendingReset(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            toast.success("Şifre sıfırlama bağlantısı email adresinize gönderildi!");
            setForgotPasswordMode(false);
            setResetEmail("");
        } catch (error: any) {
            toast.error("Hata: " + error.message);
        } finally {
            setSendingReset(false);
        }
    };

    const onSubmit = async (data: RegisterFormData) => {
        setLoading(true);
        // Create FormData object to match existing server actions
        const formData = new FormData();
        formData.append("email", data.email);
        formData.append("password", data.password);
        if (!isLogin && data.fullName) {
            formData.append("fullName", data.fullName);
            formData.append("confirmPassword", data.confirmPassword);
        }

        try {
            if (isLogin) {
                // Pre-check pairing status before login redirects
                const { data: authData, error } = await supabase.auth.signInWithPassword({
                    email: data.email,
                    password: data.password,
                });

                if (error) throw error;

                const user = authData.user;

                if (user) {
                    // Check pairing status and cache it
                    const { data: coupleData } = await supabase
                        .from("couples")
                        .select("*")
                        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                        .maybeSingle();

                    localStorage.setItem('heartsync_isPaired', (!!coupleData).toString());
                }

                // Now redirect
                router.refresh(); // Refresh server components to update session
                router.push('/');
                return;
            } else {
                // REGISTER LOGIC
                // Note: We already validated password match with Zod
                await signup(formData);
                // Eğer action başarılı dönerse:
                setShowSuccessModal(true);
            }
        } catch (error: any) {
            console.error(error);
            // Supabase'den gelen hata mesajlarını kontrol et
            if (error.message && error.message.includes("NEXT_REDIRECT")) {
                // Redirect error, ignore
                return;
            } else if (error.message && error.message.includes("Email not confirmed")) {
                setShowEmailConfirmModal(true);
            } else if (error.message && error.message.includes("Invalid login")) {
                toast.error("Hatalı email veya şifre.");
            } else {
                toast.error("Bir hata oluştu: " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="bg-gradient-auth min-h-[100vh - 9rem] flex items-center justify-center p-6">
            {/* SUCCESS MODAL (Kayıt Başarılı) */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {t('registrationSuccessTitle')}
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {t('registrationSuccessDesc')}
                        </p>

                        <a
                            href="https://mail.google.com"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full bg-[#991B1B] hover:bg-[#7C2D12] text-white font-semibold py-3 rounded-2xl mb-3 flex items-center justify-center gap-2 transition-all"
                        >
                            <Mail className="w-5 h-5" />
                            {t('openGmail')}
                        </a>

                        <button
                            onClick={() => {
                                setShowSuccessModal(false);
                                setIsLogin(true);
                            }}
                            className="block w-full bg-violet-50 hover:bg-violet-100 text-slate-700 font-semibold py-3 rounded-2xl transition-colors"
                        >
                            Giriş Yap
                        </button>
                    </div>
                </div>
            )}

            {/* FORGOT PASSWORD MODAL */}
            {forgotPasswordMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                        <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {t('forgotPasswordTitle')}
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {t('forgotPasswordDesc')}
                        </p>

                        <div className="relative group mb-4">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="w-4 h-4 text-violet-300 group-focus-within:text-[#991B1B] transition-colors" />
                            </div>
                            <input
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                placeholder="ornek@email.com"
                                className="w-full pl-11 pr-4 py-3.5 bg-white/70 border border-violet-100 rounded-2xl focus:ring-2 focus:ring-[#991B1B] focus:border-[#991B1B] outline-none transition-all text-gray-900 placeholder-gray-400"
                            />
                        </div>

                        <button
                            onClick={handleForgotPassword}
                            disabled={sendingReset}
                            className="w-full bg-[#991B1B] hover:bg-[#7C2D12] text-white font-semibold py-3.5 rounded-2xl mb-3 flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-[#991B1B]/20 transition-all"
                        >
                            {sendingReset && <Loader2 className="w-5 h-5 animate-spin" />}
                            {sendingReset ? t('sending') : t('sendLink')}
                        </button>

                        <button
                            onClick={() => {
                                setForgotPasswordMode(false);
                                setResetEmail("");
                            }}
                            className="block w-full bg-violet-50 hover:bg-violet-100 text-slate-700 font-semibold py-3 rounded-2xl transition-colors"
                        >
                            {t('cancel')}
                        </button>
                    </div>
                </div>
            )}

            {/* EMAIL CONFIRM MODAL */}
            {showEmailConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {t('emailUnverifiedTitle')}
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {t('emailUnverifiedDesc')}
                        </p>

                        <a
                            href="https://mail.google.com"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full bg-[#991B1B] hover:bg-[#7C2D12] text-white font-semibold py-3 rounded-2xl mb-3 flex items-center justify-center gap-2 transition-all"
                        >
                            <Mail className="w-5 h-5" />
                            {t('checkGmail')}
                        </a>

                        <button
                            onClick={() => setShowEmailConfirmModal(false)}
                            className="block w-full bg-violet-50 hover:bg-violet-100 text-slate-700 font-semibold py-3 rounded-2xl transition-colors"
                        >
                            {t('ok')}
                        </button>
                    </div>
                </div>
            )}

            <div className="w-full max-w-md space-y-8">
                {/* Hero Section */}
                <div className="text-center space-y-4">
                    <div className="relative inline-block">
                        <div className="bg-violet-200/60 p-5 rounded-full inline-flex items-center justify-center mb-2">
                            <Heart className="w-9 h-9 text-[#991B1B] fill-current" />
                        </div>
                        <Heart className="w-4 h-4 text-[#991B1B]/40 fill-current absolute -top-1 -right-2" />
                        <Heart className="w-3 h-3 text-violet-500/60 fill-current absolute top-4 -left-3" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {t('heartSyncWelcome')} <br />
                        <span className="italic text-[#991B1B]">{t('heartSyncWelcomeSpan')}</span>
                    </h1>
                    <p className="text-slate-500 font-light max-w-xs mx-auto">
                        {t('heartSyncSubtitle')}
                    </p>
                </div>

                {/* Glass Card Form */}
                <div className="glass-card p-8 rounded-2xl soft-shadow space-y-6">
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-5"
                        noValidate
                    >
                        {/* Full Name (Register only) */}
                        {!isLogin && (
                            <div className="space-y-2">
                                <label
                                    htmlFor="fullName"
                                    className="block text-sm font-medium text-slate-700 ml-1"
                                >
                                    {t('fullName')}
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Heart className="w-4 h-4 text-violet-300 group-focus-within:text-[#991B1B] transition-colors" />
                                    </div>
                                    <input
                                        id="fullName"
                                        type="text"
                                        className={`block w-full pl-11 pr-4 py-3.5 bg-white/70 border rounded-2xl focus:ring-2 focus:ring-[#991B1B] focus:border-[#991B1B] outline-none transition-all text-slate-900 placeholder:text-slate-400
                                            ${errors.fullName
                                                ? "border-red-400"
                                                : "border-violet-100"}`}
                                        placeholder={t('fullName')}
                                        {...register("fullName")}
                                    />
                                </div>
                                {errors.fullName && (
                                    <p className="text-xs text-red-500 ml-1">{errors.fullName.message}</p>
                                )}
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-2">
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-slate-700 ml-1"
                            >
                                {t('email')}
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="w-4 h-4 text-violet-300 group-focus-within:text-[#991B1B] transition-colors" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    className={`block w-full pl-11 pr-4 py-3.5 bg-white/70 border rounded-2xl focus:ring-2 focus:ring-[#991B1B] focus:border-[#991B1B] outline-none transition-all text-slate-900 placeholder:text-slate-400
                                        ${errors.email
                                            ? "border-red-400"
                                            : "border-violet-100"}`}
                                    placeholder="ornek@email.com"
                                    {...register("email")}
                                />
                            </div>
                            {errors.email && (
                                <p className="text-xs text-red-500 ml-1">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-slate-700"
                                >
                                    {t('password')}
                                </label>
                                {isLogin && (
                                    <button
                                        type="button"
                                        onClick={() => setForgotPasswordMode(true)}
                                        className="text-xs text-violet-600 hover:text-[#991B1B] font-medium transition-colors"
                                    >
                                        {t('forgotPasswordTitle')}
                                    </button>
                                )}
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-violet-300 group-focus-within:text-[#991B1B] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    className={`block w-full pl-11 pr-4 py-3.5 bg-white/70 border rounded-2xl focus:ring-2 focus:ring-[#991B1B] focus:border-[#991B1B] outline-none transition-all text-slate-900 placeholder:text-slate-400
                                        ${errors.password
                                            ? "border-red-400"
                                            : "border-violet-100"}`}
                                    placeholder="••••••••"
                                    {...register("password")}
                                />
                            </div>
                            {errors.password && (
                                <p className="text-xs text-red-500 ml-1">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Confirm Password (Register only) */}
                        {!isLogin && (
                            <div className="space-y-2">
                                <label
                                    htmlFor="confirmPassword"
                                    className="block text-sm font-medium text-slate-700 ml-1"
                                >
                                    {t('confirmPassword')}
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-violet-300 group-focus-within:text-[#991B1B] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>
                                    </div>
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        className={`block w-full pl-11 pr-4 py-3.5 bg-white/70 border rounded-2xl focus:ring-2 focus:ring-[#991B1B] focus:border-[#991B1B] outline-none transition-all text-slate-900 placeholder:text-slate-400
                                            ${errors.confirmPassword
                                                ? "border-red-400"
                                                : "border-violet-100"}`}
                                        placeholder="••••••••"
                                        {...register("confirmPassword")}
                                    />
                                </div>
                                {errors.confirmPassword && (
                                    <p className="text-xs text-red-500 ml-1">{errors.confirmPassword.message}</p>
                                )}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#991B1B] hover:bg-[#7C2D12] text-white font-semibold py-4 rounded-2xl shadow-lg shadow-[#991B1B]/20 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                            <span>
                                {loading
                                    ? (isLogin ? t('loggingIn') : t('registering'))
                                    : (isLogin ? t('loginButton') : t('registerButton'))
                                }
                            </span>
                            {!loading && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                            )}
                        </button>
                    </form>
                </div>

                {/* Toggle Login / Register */}
                <p className="text-center text-slate-500 text-sm">
                    {isLogin ? (
                        <>
                            {t('noAccount')}
                            <button
                                type="button"
                                onClick={() => setIsLogin(false)}
                                className="text-[#991B1B] font-bold hover:underline underline-offset-4 ml-1 transition-colors"
                            >
                                {t('registerButton')}
                            </button>
                        </>
                    ) : (
                        <>
                            {t('haveAccount')}
                            <button
                                type="button"
                                onClick={() => setIsLogin(true)}
                                className="text-[#991B1B] font-bold hover:underline underline-offset-4 ml-1 transition-colors"
                            >
                                {t('loginButton')}
                            </button>
                        </>
                    )}
                </p>
            </div>
        </main>
    );
}
