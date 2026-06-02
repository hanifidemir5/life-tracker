"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, User, Heart, LogOut, Loader2, Search, X, Menu, CalendarClock } from "lucide-react";
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
        <header className="sticky top-0 z-50 flex items-center justify-between border-b border-rose-600/10 bg-[#f8f5f6] backdrop-blur-md px-6 py-3 lg:px-12 transition-all">
            <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-2 text-rose-600">
                    <Heart className="w-8 h-8 font-bold fill-rose-600" />
                    <h2 className="text-xl font-black tracking-tight">{t('appNameHeartSync') || "HeartSync"}</h2>
                </Link>
                <div className="hidden md:flex items-center">
                    <GlobalSearch />
                </div>
            </div>

            <div className="flex items-center gap-4 lg:gap-6">
                <button
                    onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                    className="md:hidden flex items-center gap-1 text-sm font-medium hover:text-rose-600 transition-colors"
                >
                    <Search className="w-5 h-5" />
                </button>

                <button
                    onClick={() => setLanguage(language === "tr" ? "en" : "tr")}
                    className="flex items-center gap-1 text-sm font-medium hover:text-rose-600 transition-colors"
                    title={language === "tr" ? "Switch to English" : "Türkçe'ye Geç"}
                >
                    <span className="font-bold">{language === "tr" ? "EN" : "TR"}</span>
                    <span className="hidden sm:inline">Language</span>
                </button>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-rose-600/20 hover:opacity-90 transition-opacity"
                >
                    {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    <span className="hidden sm:inline">{t('logout') || "Sign out"}</span>
                </button>

                <Link href="/profile" className="flex items-center justify-center size-10 rounded-full border-2 border-rose-600/20 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition-colors shadow-sm" title={t('profile') || "Profile"}>
                    <User className="w-5 h-5 fill-current" />
                </Link>
            </div>

            {/* Mobile Search Bar - conditionally rendered */}
            {isMobileSearchOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 p-4 bg-white/95 backdrop-blur-xl border-b border-rose-600/10 shadow-xl animate-in slide-in-from-top-2 z-40">
                    <GlobalSearch />
                </div>
            )}
        </header>
    );
}
