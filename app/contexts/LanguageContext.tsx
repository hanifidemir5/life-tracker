"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { translations, Language, TranslationKey } from "@/app/lib/translations";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>("tr");

    // Load language from localStorage on mount, or auto-detect from browser
    useEffect(() => {
        const savedLang = localStorage.getItem("language") as Language;
        if (savedLang && (savedLang === "tr" || savedLang === "en")) {
            setLanguageState(savedLang);
        } else {
            // Auto-detect language from browser/user location
            const browserLang = navigator.language.toLowerCase();
            const detectedLang = browserLang.startsWith('tr') ? 'tr' : 'en';
            setLanguageState(detectedLang);
            localStorage.setItem("language", detectedLang);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("language", lang);
    };

    const t = (key: TranslationKey): string => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within LanguageProvider");
    }
    return context;
}
