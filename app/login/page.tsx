"use client";

import { useState } from "react";
import { login, signup } from "@/app/actions/auth"; // Server actions
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { toast } from "react-toastify";

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showEmailConfirmModal, setShowEmailConfirmModal] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        try {
            if (isLogin) {
                await login(formData);
            } else {
                // REGISTER LOGIC
                const password = formData.get("password") as string;
                const confirmPassword = formData.get("confirmPassword") as string;

                if (password !== confirmPassword) {
                    toast.error("Şifreler eşleşmiyor!");
                    setLoading(false);
                    return;
                }

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

    // Signup işlemini özel fonksiyonla sarıyoruz ki modalı tetikleyebilelim
    // Bu fonksiyon artık kullanılmıyor, handleSubmit her iki durumu da yönetiyor.
    // const handleClientSignup = async (formData: FormData) => {
    //     setLoading(true);
    //     const password = formData.get("password") as string;
    //     const confirmPassword = formData.get("confirmPassword") as string;

    //     if (password !== confirmPassword) {
    //         toast.error("Şifreler eşleşmiyor!");
    //         setLoading(false);
    //         return;
    //     }

    //     try {
    //         await signup(formData);
    //         setShowSuccessModal(true);
    //     } catch (e: any) {
    //         console.error(e);
    //         toast.error("Kayıt başarısız: " + e.message);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
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

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transition-all">
                <div className={`p-8 ${!isLogin ? "bg-indigo-50/50" : ""}`}>
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {isLogin ? "Tekrar Hoşgeldin!" : "Hesap Oluştur"}
                        </h1>
                        <p className="text-gray-500">
                            {isLogin
                                ? "Life Tracker'a devam etmek için giriş yap."
                                : "Yeni bir macera için kayıt ol."}
                        </p>
                    </div>

                    <form
                        action={handleSubmit}
                        className="space-y-4"
                    >
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-black"
                                placeholder="ornek@email.com"
                            />
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
                                name="password"
                                type="password"
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-black"
                                placeholder="********"
                            />
                        </div>

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
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-black"
                                    placeholder="********"
                                />
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2
                  ${isLogin
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                        : "bg-green-600 hover:bg-green-700 text-white"
                                    }
                `}
                            >
                                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                {isLogin ? "Giriş Yap" : "Kayıt Ol"}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                // Clear validation errors or inputs if needed
                            }}
                            className="text-sm font-medium hover:underline transition-colors text-gray-600 hover:text-gray-900"
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
