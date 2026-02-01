"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/app/lib/supebaseClient";

type ThemeMode = "romantic" | "normal";

interface ThemeColors {
    // Backgrounds
    pageBg: string;
    cardBg: string;
    // Gradients
    headerGradient: string;
    buttonGradient: string;
    // Primary colors
    primary: string;
    primaryHover: string;
    primaryLight: string;
    // Accent
    accent: string;
    accentLight: string;
    // Borders
    border: string;
    borderLight: string;
}

const romanticTheme: ThemeColors = {
    pageBg: "bg-gradient-to-br from-pink-50 via-rose-50 to-red-50",
    cardBg: "bg-white border-pink-100",
    headerGradient: "from-pink-500 to-rose-500",
    buttonGradient: "from-pink-500 to-rose-600",
    primary: "text-pink-600",
    primaryHover: "hover:bg-pink-50",
    primaryLight: "bg-pink-50",
    accent: "text-rose-500",
    accentLight: "bg-rose-50",
    border: "border-pink-200",
    borderLight: "border-pink-100",
};

const normalTheme: ThemeColors = {
    pageBg: "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50",
    cardBg: "bg-white border-slate-100",
    headerGradient: "from-blue-500 to-indigo-500",
    buttonGradient: "from-blue-500 to-indigo-600",
    primary: "text-blue-600",
    primaryHover: "hover:bg-blue-50",
    primaryLight: "bg-blue-50",
    accent: "text-indigo-500",
    accentLight: "bg-indigo-50",
    border: "border-blue-200",
    borderLight: "border-blue-100",
};

interface ThemeContextType {
    themeMode: ThemeMode;
    isPaired: boolean;
    colors: ThemeColors;
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    // Initialize from localStorage cache to prevent flash on returning visits
    const [isPaired, setIsPaired] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('heartsync_isPaired') === 'true';
        }
        return false;
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkPairingStatus = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setIsPaired(false);
                    setIsLoading(false);
                    return;
                }

                // Check if user is in a couple
                const { data: coupleData } = await supabase
                    .from("couples")
                    .select("*")
                    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                    .maybeSingle();

                const pairedStatus = !!coupleData;
                setIsPaired(pairedStatus);
                // Cache for next visit
                localStorage.setItem('heartsync_isPaired', pairedStatus.toString());
            } catch (error) {
                console.error("Error checking pairing status:", error);
                setIsPaired(false);
                localStorage.setItem('heartsync_isPaired', 'false');
            } finally {
                setIsLoading(false);
            }
        };

        checkPairingStatus();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            checkPairingStatus();
        });

        return () => subscription.unsubscribe();
    }, []);

    const themeMode: ThemeMode = isPaired ? "romantic" : "normal";
    const colors = isPaired ? romanticTheme : normalTheme;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    return (
        <ThemeContext.Provider value={{ themeMode, isPaired, colors, isLoading }}>
            <div className={`min-h-screen flex flex-col ${colors.pageBg} transition-colors duration-500`}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
