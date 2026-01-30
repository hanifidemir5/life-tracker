"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Globe, LogOut, Users, BookOpen, Menu, X } from "lucide-react";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { logout } from "@/app/actions/auth";
import GlobalSearch from "@/app/components/GlobalSearch";

export default function Header() {
    const pathname = usePathname();
    const { t, language, setLanguage } = useLanguage();
    const { isPaired } = useTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Hide header on login page
    if (pathname === "/login") return null;

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 pt-6 ">
            <div className="flex items-center justify-between gap-3 mb-8">
                {/* TITLE (Desktop only) */}
                <div className="hidden lg:block shrink-0 mr-4">
                    <Link href="/">
                        <h1 className="text-2xl font-extrabold text-gray-900 truncate max-w-xs cursor-pointer">
                            {isPaired ? t('appName') : t('appNameSingle')}
                        </h1>
                    </Link>
                </div>

                {/* Left: Search (always visible) */}
                <div className="flex-1 flex justify-start lg:justify-center px-0 lg:px-4 max-w-2xl lg:mx-auto">
                    <GlobalSearch />
                </div>

                {/* Right: Desktop buttons (hidden on mobile) */}
                <div className="hidden lg:flex items-center gap-3">
                    {/* Language Toggle */}
                    <button
                        onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
                        className={`flex items-center gap-2 px-5 py-2.5 bg-white ${isPaired ? 'text-purple-600 hover:bg-purple-50 border-purple-100 hover:border-purple-200' : 'text-indigo-600 hover:bg-indigo-50 border-indigo-100 hover:border-indigo-200'} rounded-full transition-all font-bold text-sm border-2 shadow-lg hover:shadow-xl`}
                        title={language === 'tr' ? 'Switch to English' : 'Türkçeye geç'}
                    >
                        <Globe className="w-5 h-5" />
                        <span>{language === 'tr' ? 'EN' : 'TR'}</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-600 rounded-full hover:bg-gray-100 transition-all font-bold text-sm border-2 border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl"
                        title={t('logout')}
                    >
                        <LogOut className="w-5 h-5" />
                        <span>{t('logout')}</span>
                    </button>

                    <Link
                        href="/settings"
                        className={`flex items-center gap-2 px-5 py-2.5 bg-white ${isPaired ? 'text-rose-600 hover:bg-rose-50 border-rose-100 hover:border-rose-200' : 'text-blue-600 hover:bg-blue-50 border-blue-100 hover:border-blue-200'} rounded-full transition-all font-bold text-sm border-2 shadow-lg hover:shadow-xl`}
                        title={t('settings')}
                    >
                        {isPaired ? <Users className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                        <span>{t('settings')}</span>
                    </Link>
                </div>

                {/* Mobile: Burger Menu Button */}
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="lg:hidden flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg border-2 border-gray-200 hover:border-gray-300 transition-colors"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6 text-gray-600" /> : <Menu className="w-6 h-6 text-gray-600" />}
                </button>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Menu */}
                    <div className="fixed top-20 right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 lg:hidden overflow-hidden min-w-[200px]">
                        <button
                            onClick={() => {
                                setLanguage(language === 'tr' ? 'en' : 'tr');
                                setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-5 py-4 ${isPaired ? 'text-purple-600 hover:bg-purple-50' : 'text-indigo-600 hover:bg-indigo-50'} transition-colors border-b border-gray-100`}
                        >
                            <Globe className="w-5 h-5" />
                            <span className="font-semibold">{language === 'tr' ? 'English' : 'Türkçe'}</span>
                        </button>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-5 py-4 text-gray-600 hover:bg-gray-50 transition-colors border-b border-gray-100"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-semibold">{t('logout')}</span>
                        </button>

                        <Link
                            href="/settings"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`w-full flex items-center gap-3 px-5 py-4 ${isPaired ? 'text-rose-600 hover:bg-rose-50' : 'text-blue-600 hover:bg-blue-50'} transition-colors`}
                        >
                            {isPaired ? <Users className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                            <span className="font-semibold">{t('settings')}</span>
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
