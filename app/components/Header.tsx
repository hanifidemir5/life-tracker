"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, User, Heart, LogOut, Loader2, Search, X, Menu } from "lucide-react";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { logout } from "@/app/actions/auth";
import GlobalSearch from "@/app/components/GlobalSearch";

export default function Header() {
    const pathname = usePathname();
    const { t, language, setLanguage } = useLanguage();
    const router = useRouter();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Close settings on route change (just in case)
    useEffect(() => {
        setIsSettingsOpen(false);
        setIsMobileSearchOpen(false);
        setIsMobileMenuOpen(false);
    }, [pathname]);

    // Hide header on login page
    if (pathname === "/login") return null;

    const handleLogout = async () => {
        try {
            setLoggingOut(true);
            await logout();
        } catch (error) {
            console.error("Logout failed", error);
            setLoggingOut(false);
        }
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20 transition-all">
            <div className="px-4 py-4 sm:px-6 sm:py-8 flex justify-between items-center max-w-5xl mx-auto w-full gap-2 sm:gap-4">
                <Link href="/" className="group shrink-0">
                    <h1 className="text-xl sm:text-3xl font-bold bg-linear-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-1 sm:gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {t('appNameHeartSync')} <Heart className="fill-rose-600 text-rose-600 w-4 h-4 sm:w-6 sm:h-6 animate-pulse" />
                    </h1>
                    <p className="text-purple-400 text-[10px] sm:text-lg mt-0.5 sm:mt-1 font-cursive transform -rotate-2 group-hover:rotate-0 transition-transform whitespace-nowrap">
                        {t('appSubtitle')}
                    </p>
                </Link>

                {/* Desktop Search Bar - hidden on mobile */}
                <div className="hidden sm:flex flex-1 justify-center max-w-md">
                    <GlobalSearch />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 sm:gap-3 relative z-50 shrink-0 items-center">
                    {/* Mobile Search Toggle - visible only on mobile */}
                    <button
                        onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                        className="sm:hidden p-2 bg-white border-2 border-blue-100 rounded-full text-blue-400 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm"
                    >
                        {isMobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                    </button>

                    {/* Desktop Language Toggle */}
                    <button
                        onClick={() => setLanguage(language === "tr" ? "en" : "tr")}
                        className="hidden sm:flex w-12 h-12 items-center justify-center bg-white border-2 border-blue-100 rounded-full text-blue-400 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm font-bold text-sm"
                        title={language === "tr" ? "Switch to English" : "Türkçe'ye Geç"}
                    >
                        {language === "tr" ? "EN" : "TR"}
                    </button>

                    {/* Settings/Logout Dropdown (Keep Logout visible on mobile as requested) */}
                    <div className="relative">
                        <button
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className="p-2 sm:p-3 bg-white border-2 border-rose-100 rounded-full text-rose-400 hover:border-rose-300 hover:text-rose-600 transition-colors shadow-sm relative focus:outline-none focus:ring-2 focus:ring-rose-200"
                        >
                            <LogOut className="w-4 h-4 sm:w-6 sm:h-6" />
                        </button>

                        {isSettingsOpen && (
                            <>
                                {/* Backdrop to close */}
                                <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />

                                <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-rose-100 p-2 min-w-[200px] animate-in fade-in zoom-in-95 origin-top-right z-50">
                                    <button
                                        onClick={handleLogout}
                                        disabled={loggingOut}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors font-medium text-sm"
                                    >
                                        {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                                        {t('logout')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Desktop Profile Link */}
                    <Link href="/profile" className="hidden sm:block p-3 bg-white border-2 border-purple-100 rounded-full text-purple-400 hover:border-purple-300 hover:text-purple-600 transition-colors shadow-sm cursor-pointer">
                        <User className="w-6 h-6" />
                    </Link>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="sm:hidden p-2 bg-white border-2 border-purple-100 rounded-full text-purple-400 hover:border-purple-300 hover:text-purple-600 transition-colors shadow-sm"
                    >
                        {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Mobile Search Bar - conditionally rendered */}
            {isMobileSearchOpen && (
                <div className="sm:hidden px-4 pb-4 animate-in slide-in-from-top-2">
                    <GlobalSearch />
                </div>
            )}

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="sm:hidden absolute top-full left-0 right-0 p-4 bg-white/95 backdrop-blur-xl border-b border-white/20 shadow-xl animate-in slide-in-from-top-2 flex flex-col gap-3 z-40">
                    <Link
                        href="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 text-purple-700 font-medium"
                    >
                        <User className="w-5 h-5" />
                        {t('profile') || "Profil"}
                    </Link>

                    <button
                        onClick={() => {
                            setLanguage(language === "tr" ? "en" : "tr");
                            setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 text-blue-700 font-medium w-full text-left"
                    >
                        <span className="w-5 h-5 flex items-center justify-center font-bold text-xs ring-2 ring-blue-200 rounded-full">
                            {language === "tr" ? "EN" : "TR"}
                        </span>
                        {language === "tr" ? "Switch to English" : "Türkçe'ye Geç"}
                    </button>
                </div>
            )}
        </header>
    );
}
