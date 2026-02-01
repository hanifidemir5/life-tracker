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
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 p-4">
            {/* SUCCESS MODAL (Kayıt Başarılı) */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Kayıt Başarılı!
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Lütfen hesabınızı etkinleştirmek için email adresinize gönderilen
                            bağlantıya tıklayın.
                        </p>

                        <a
                            href="https://mail.google.com"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl mb-3 flex items-center justify-center gap-2"
                        >
                            <Mail className="w-5 h-5" />
                            Gmail'i Aç
                        </a>

                        <button
                            onClick={() => {
                                setShowSuccessModal(false);
                                setIsLogin(true); // Login ekranına dön
                            }}
                            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl"
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
                        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Şifremi Unuttum
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Email adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
                        </p>

                        <input
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="ornek@email.com"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900 placeholder-gray-400 mb-4"
                        />

                        <button
                            onClick={handleForgotPassword}
                            disabled={sendingReset}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl mb-3 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {sendingReset && <Loader2 className="w-5 h-5 animate-spin" />}
                            {sendingReset ? "Gönderiliyor..." : "Bağlantı Gönder"}
                        </button>

                        <button
                            onClick={() => {
                                setForgotPasswordMode(false);
                                setResetEmail("");
                            }}
                            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl"
                        >
                            İptal
                        </button>
                    </div>
                </div>
            )}

            {/* EMAIL CONFIRM MODAL (Login Hatası) */}
            {showEmailConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                        <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Mail className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Email Doğrulanmadı
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Giriş yapabilmek için lütfen email adresinize gönderilen doğrulama
                            bağlantısına tıklayın.
                        </p>

                        <a
                            href="https://mail.google.com"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl mb-3 flex items-center justify-center gap-2"
                        >
                            <Mail className="w-5 h-5" />
                            Gmail'i Kontrol Et
                        </a>

                        <button
                            onClick={() => setShowEmailConfirmModal(false)}
                            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl"
                        >
                            Tamam
                        </button>
                    </div>
                </div>
            )}

            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-pink-100 transition-all">
                <div className={`p-8 ${!isLogin ? "bg-gradient-to-br from-pink-50 to-rose-50" : ""}`}>
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4 relative h-16 w-24 mx-auto">
                            <Heart className="absolute bottom-0 left-4 w-10 h-10 text-rose-600 fill-current animate-pulse" />
                            <Heart className="absolute top-0 right-4 w-7 h-7 text-pink-400 fill-current animate-pulse delay-75" />
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2">
                            {language === 'tr' ? "HeartSync'e Hoşgeldiniz" : "Welcome to HeartSync"}
                        </h1>
                    </div>

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-4"
                        noValidate
                    >
                        {!isLogin && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <label
                                    htmlFor="fullName"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Ad Soyad
                                </label>
                                <input
                                    id="fullName"
                                    type="text"
                                    className={`w-full px-4 py-2 border rounded-xl focus:ring-2 outline-none transition-all placeholder-gray-400 text-gray-900
                                        ${errors.fullName
                                            ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                            : "border-gray-300 focus:ring-green-500 focus:border-green-500"}`}
                                    placeholder="Adınız Soyadınız"
                                    {...register("fullName")}
                                />
                                {errors.fullName && (
                                    <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>
                                )}
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                className={`w-full px-4 py-2 border rounded-xl focus:ring-2 outline-none transition-all placeholder-gray-400 text-gray-900
                                    ${errors.email
                                        ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                        : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"}`}
                                placeholder="ornek@email.com"
                                {...register("email")}
                            />
                            {errors.email && (
                                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Şifre
                            </label>
                            <input
                                id="password"
                                type="password"
                                className={`w-full px-4 py-2 border rounded-xl focus:ring-2 outline-none transition-all placeholder-gray-400 text-gray-900
                                    ${errors.password
                                        ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                        : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"}`}
                                placeholder="********"
                                {...register("password")}
                            />
                            {errors.password && (
                                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Forgot Password Link - Only show on login */}
                        {isLogin && (
                            <div className="text-right -mt-1">
                                <button
                                    type="button"
                                    onClick={() => setForgotPasswordMode(true)}
                                    className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                                >
                                    Şifremi Unuttum
                                </button>
                            </div>
                        )}

                        {!isLogin && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <label
                                    htmlFor="confirmPassword"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Şifre Tekrar
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    className={`w-full px-4 py-2 border rounded-xl focus:ring-2 outline-none transition-all placeholder-gray-400 text-gray-900
                                        ${errors.confirmPassword
                                            ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                            : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"}`}
                                    placeholder="********"
                                    {...register("confirmPassword")}
                                />
                                {errors.confirmPassword && (
                                    <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
                                )}
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed
                  ${isLogin
                                        ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
                                        : "bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white"
                                    }
                `}
                            >
                                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                {loading
                                    ? (isLogin ? "Giriş yapılıyor..." : "Kaydediliyor...")
                                    : (isLogin ? "Giriş Yap" : "Kayıt Ol")
                                }
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                // Validation errors cleared via useEffect
                            }}
                            className="text-sm font-medium hover:underline transition-colors text-gray-600 hover:text-rose-600"
                        >
                            {isLogin ? (
                                <span>
                                    Hesabın yok mu? <span className="text-indigo-600">Kayıt Ol</span>
                                </span>
                            ) : (
                                <span>
                                    Zaten hesabın var mı? <span className="text-green-600">Giriş Yap</span>
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
