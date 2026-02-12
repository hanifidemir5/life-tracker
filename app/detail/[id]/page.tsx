"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useItem } from "@/app/hooks/useItems";
import { useLanguage } from "@/app/contexts/LanguageContext";
import {
    ArrowLeft,
    Loader2,
    Calendar,
    CheckCircle2,
    Circle,
    User,
    ChevronLeft,
    ChevronRight,
    Pencil,
} from "lucide-react";

export default function ItemDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const previousPage = searchParams.get("page");
    const categoryKey = searchParams.get("category");
    const { t } = useLanguage();

    const id = params.id ? parseInt(params.id as string, 10) : 0;
    const { data: item, isLoading, error } = useItem(id);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const nextImage = () => {
        if (item?.image_urls) {
            setCurrentImageIndex((prev) => (prev + 1) % item.image_urls!.length);
        }
    };

    const prevImage = () => {
        if (item?.image_urls) {
            setCurrentImageIndex((prev) => (prev - 1 + item.image_urls!.length) % item.image_urls!.length);
        }
    };

    if (isLoading) {
        return (
            <main className="min-h-screen flex justify-center items-center">
                <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
            </main>
        );
    }

    if (error || !item) {
        return (
            <main className="min-h-screen flex flex-col justify-center items-center gap-4">
                <h2 className="text-xl font-bold text-gray-700">Item not found</h2>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                    <ArrowLeft className="w-5 h-5" /> Go Back
                </button>
            </main>
        );
    }

    return (
        <main className="min-h-[calc(100vh-140px)] p-4 flex items-center justify-center bg-transparent">
            <div className="max-w-5xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">

                {/* Left Child: Image, Back Button, Title */}
                <div className="w-full md:w-1/2 relative bg-gray-100 p-6 flex flex-col justify-end min-h-[400px] md:min-h-0">

                    {/* Back Button (Top Left of Image/Section) */}
                    <div className="absolute top-6 left-6 z-10">
                        <button
                            onClick={() => {
                                if (categoryKey) {
                                    router.push(`/${categoryKey}?page=${previousPage || 1}&highlightItem=${id}`);
                                } else {
                                    router.back();
                                }
                            }}
                            className="p-3 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full shadow-lg transition-all transform hover:scale-105"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-700" />
                        </button>
                    </div>

                    {/* Edit Button (Top Right) */}
                    <div className="absolute top-6 right-6 z-10">
                        <button
                            onClick={() => router.push(`/update/${id}`)}
                            className="p-3 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full shadow-lg transition-all transform hover:scale-105"
                        >
                            <Pencil className="w-5 h-5 text-gray-700" />
                        </button>
                    </div>

                    {/* Image Area */}
                    <div className="absolute inset-0 z-0 bg-gray-200">
                        {item.image_urls && item.image_urls.length > 0 ? (
                            <>
                                <img
                                    src={item.image_urls[currentImageIndex]}
                                    alt={item.title}
                                    className="w-full h-full object-cover object-center opacity-90 transition-opacity duration-300"
                                />
                                {item.image_urls.length > 1 && (
                                    <>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-md border border-white/30 rounded-full transition-all shadow-lg"
                                        >
                                            <ChevronLeft className="w-6 h-6" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 text-white backdrop-blur-md border border-white/30 rounded-full transition-all shadow-lg"
                                        >
                                            <ChevronRight className="w-6 h-6" />
                                        </button>
                                        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                                            {item.image_urls.map((_, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`w-1.5 h-1.5 rounded-full ${idx === currentImageIndex ? "bg-white" : "bg-white/50"}`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <span className="text-gray-400 font-medium">No Image</span>
                            </div>
                        )}
                        {/* Gradient Overlay for text readability */}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/70 to-transparent pointer-events-none" />
                    </div>

                    {/* Main Title (Below/Over Image at bottom) */}
                    <div className="relative z-10 text-white mt-auto">
                        <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold leading-tight mb-2 drop-shadow-md">
                            {item.title}
                        </h1>
                        <p className="text-white/80 text-lg font-medium flex items-center gap-2">
                            {item.owner && (
                                <>
                                    <User className="w-4 h-4" />
                                    {item.owner}
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {/* Right Child: Status, Date, Description */}
                <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col gap-6 bg-white">
                    {/* Status & Date */}
                    <div className="flex flex-wrap gap-4 items-center justify-between border-b pb-6 border-gray-100">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm uppercase tracking-wide
                            ${item.status
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                            {item.status ? (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    {t('completed') || 'Completed'}
                                </>
                            ) : (
                                <>
                                    <Circle className="w-5 h-5" />
                                    {t('pending') || 'Pending'}
                                </>
                            )}
                        </div>

                        {item.created_at && (
                            <div className="flex items-center gap-2 text-gray-500 font-medium">
                                <Calendar className="w-5 h-5" />
                                <span>
                                    {new Date(item.created_at).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="grow">
                        <h3 className="text-gray-400 uppercase tracking-widest text-xs font-bold mb-4">
                            {t('description') || 'Description'}
                        </h3>
                        <div className="prose prose-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {item.description || (
                                <span className="text-gray-400 italic">No description provided.</span>
                            )}
                        </div>
                    </div>

                    {/* Footer/Extra (Optional, e.g. category tag) */}
                    {item.category && (
                        <div className="pt-6 mt-auto border-t border-gray-100">
                            <span className="text-sm font-medium text-gray-400">Category: </span>
                            <span className="text-sm font-bold text-gray-700 capitalize">{item.category}</span>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
