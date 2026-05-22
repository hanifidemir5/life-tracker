"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/app/lib/supebaseClient";
import { Search, X, Loader2, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { getIconComponent, colorOptions } from "@/app/lib/iconMap";

type SearchResult = {
    id: number;
    title: string;
    description: string;
    category: string;
    status: boolean;
    category_name?: string;
    category_icon?: string;
    category_color?: string;
};

type Category = {
    key: string;
    name: string;
    icon_name: string;
    color_class: string;
};

export default function GlobalSearch() {
    const { t } = useLanguage();
    const [query, setQuery] = useState("");
    const [searchCategory, setSearchCategory] = useState("all");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [categoryList, setCategoryList] = useState<Category[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch categories for mapping and dropdown
    useEffect(() => {
        const fetchCategories = async () => {
            const { data } = await supabase
                .from("categories")
                .select("key, name, icon_name, color_class");

            if (data) {
                const catMap: Record<string, Category> = {};
                data.forEach((cat: Category) => {
                    catMap[cat.key] = cat;
                });
                setCategories(catMap);
                setCategoryList(data);
            }
        };
        fetchCategories();
    }, []);

    // Search when query or category changes
    useEffect(() => {
        const searchItems = async () => {
            if (query.trim().length < 2) {
                setResults([]);
                return;
            }

            setIsLoading(true);

            let queryBuilder = supabase
                .from("items")
                .select("id, title, description, category, status")
                .order("created_at", { ascending: false })
                .limit(500);

            if (searchCategory !== "all") {
                queryBuilder = queryBuilder.eq("category", searchCategory);
            }

            const { data, error } = await queryBuilder;

            if (!error && data) {
                const lowerQuery = query.toLocaleLowerCase('tr-TR');

                const filtered = data.filter((item: SearchResult) =>
                    item.title?.toLocaleLowerCase('tr-TR').includes(lowerQuery)
                ).slice(0, 10);

                const enrichedResults = filtered.map((item: SearchResult) => ({
                    ...item,
                    category_name: categories[item.category]?.name || item.category,
                    category_icon: categories[item.category]?.icon_name || "Circle",
                    category_color: categories[item.category]?.color_class || "bg-gray-100",
                }));
                setResults(enrichedResults);
            }

            setIsLoading(false);
        };

        const debounce = setTimeout(searchItems, 300);
        return () => clearTimeout(debounce);
    }, [query, searchCategory, categories]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsFocused(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getIconColorClass = (bgClass: string) => {
        const colorOpt = colorOptions.find((c) => c.value === bgClass);
        return colorOpt ? colorOpt.iconColor : "text-gray-500";
    };

    const handleClear = () => {
        setQuery("");
        setResults([]);
        inputRef.current?.focus();
    };

    const handleResultClick = () => {
        setIsFocused(false);
        setQuery("");
        setResults([]);
    };

    return (
        <div ref={containerRef} className="relative flex-1 max-w-xl">
            {/* Always visible search input */}
            <div className="relative flex items-center w-full bg-rose-600/5 rounded-full border border-rose-600/10 focus-within:ring-2 focus-within:ring-rose-600/20 transition-all overflow-hidden">
                <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    placeholder={t('searchPlaceholder') || 'Search collections...'}
                    className="w-full bg-transparent py-2 pl-9 pr-2 text-sm focus:outline-none text-gray-800"
                />

                <div className="flex items-center pr-1 border-l border-rose-600/10">
                    <select
                        value={searchCategory}
                        onChange={(e) => {
                            setSearchCategory(e.target.value);
                            inputRef.current?.focus();
                        }}
                        className="bg-transparent text-xs text-gray-600 py-2 pl-2 pr-6 outline-none cursor-pointer appearance-none relative"
                    >
                        <option value="all">{t('all') || 'All'}</option>
                        {categoryList.map(cat => (
                            <option key={cat.key} value={cat.key}>{cat.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 pointer-events-none" />
                </div>

                {isLoading ? (
                    <Loader2 className="absolute right-28 w-4 h-4 text-rose-500 animate-spin" />
                ) : query ? (
                    <button onClick={handleClear} className="absolute right-28 text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                ) : null}
            </div>

            {/* Results Dropdown */}
            {isFocused && (results.length > 0 || (query.length >= 2 && !isLoading)) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-[100] max-h-[400px] overflow-y-auto">
                    {results.length > 0 ? (
                        results.map((item) => (
                            <Link
                                key={item.id}
                                href={`/detail/${item.id}`}
                                onClick={handleResultClick}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                            >
                                <div className={`p-2 rounded-full ${item.category_color?.replace("hover:", "")} bg-opacity-50`}>
                                    {getIconComponent(item.category_icon || "Circle", `w-4 h-4 ${getIconColorClass(item.category_color || "")}`)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={`font-semibold truncate ${item.status ? "text-gray-400 line-through" : "text-gray-800"}`}>
                                        {item.title}
                                    </p>
                                </div>

                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full shrink-0">
                                    {item.category_name}
                                </span>

                                <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${item.status ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                    }`}>
                                    {item.status ? "✓" : "○"}
                                </span>
                            </Link>
                        ))
                    ) : (
                        <div className="px-4 py-8 text-center text-gray-500">
                            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="font-medium">{t('noResults') || 'No results found'}</p>
                            <p className="text-sm">{t('tryDifferentSearch') || 'Try a different search term'}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
