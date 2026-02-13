"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, User, Heart, LogOut, Loader2, Search, X } from "lucide-react";
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

    // Close settings on route change (just in case)
    useEffect(() => {
        setIsSettingsOpen(false);
        setIsMobileSearchOpen(false);
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
            <div className="px-6 py-8 flex justify-between items-center max-w-5xl mx-auto w-full gap-4">
                {/* Logo */}
                <Link href="/" className="group shrink-0">
                    <h1 className="text-3xl font-bold bg-linear-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {t('appNameHeartSync')} <Heart className="fill-rose-600 text-rose-600 w-6 h-6 animate-pulse" />
                    </h1>
                    <p className="text-purple-400 text-xs sm:text-lg mt-1 font-cursive transform -rotate-2 group-hover:rotate-0 transition-transform whitespace-nowrap">
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
                        className="sm:hidden p-3 bg-white border-2 border-blue-100 rounded-full text-blue-400 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm"
                    >
                        {isMobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                    </button>

                    {/* Language Toggle */}
                    <button
                        onClick={() => setLanguage(language === "tr" ? "en" : "tr")}
                        className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white border-2 border-blue-100 rounded-full text-blue-400 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm font-bold text-xs sm:text-sm"
                        title={language === "tr" ? "Switch to English" : "Türkçe'ye Geç"}
                    >
                        {language === "tr" ? "EN" : "TR"}
                    </button>

                    {/* Settings Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className="p-2.5 sm:p-3 bg-white border-2 border-rose-100 rounded-full text-rose-400 hover:border-rose-300 hover:text-rose-600 transition-colors shadow-sm relative focus:outline-none focus:ring-2 focus:ring-rose-200"
                        >
                            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
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

                    {/* Profile Link */}
                    <Link href="/profile" className="p-2.5 sm:p-3 bg-white border-2 border-purple-100 rounded-full text-purple-400 hover:border-purple-300 hover:text-purple-600 transition-colors shadow-sm cursor-pointer">
                        <User className="w-5 h-5 sm:w-6 sm:h-6" />
                    </Link>
                </div>
            </div>

            {/* Mobile Search Bar - conditionally rendered */}
            {isMobileSearchOpen && (
                <div className="sm:hidden px-4 pb-4">
                    <GlobalSearch />
                </div>
            )}
        </header>
    );
}
