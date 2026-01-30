"use client";

import { useEffect, useRef } from "react";
import { X, AlertTriangle, Trash2, Info } from "lucide-react";
import { useLanguage } from "@/app/contexts/LanguageContext";

type ModalType = "confirm" | "warning" | "info" | "delete";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: ModalType;
    loading?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    type = "confirm",
    loading = false,
}: ConfirmModalProps) {
    const { t } = useLanguage();
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const getTypeStyles = () => {
        switch (type) {
            case "delete":
                return {
                    iconBg: "bg-red-100",
                    iconColor: "text-red-600",
                    icon: <Trash2 className="w-6 h-6" />,
                    buttonBg: "bg-red-600 hover:bg-red-700",
                };
            case "warning":
                return {
                    iconBg: "bg-amber-100",
                    iconColor: "text-amber-600",
                    icon: <AlertTriangle className="w-6 h-6" />,
                    buttonBg: "bg-amber-600 hover:bg-amber-700",
                };
            case "info":
                return {
                    iconBg: "bg-blue-100",
                    iconColor: "text-blue-600",
                    icon: <Info className="w-6 h-6" />,
                    buttonBg: "bg-blue-600 hover:bg-blue-700",
                };
            default:
                return {
                    iconBg: "bg-indigo-100",
                    iconColor: "text-indigo-600",
                    icon: <AlertTriangle className="w-6 h-6" />,
                    buttonBg: "bg-indigo-600 hover:bg-indigo-700",
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                ref={modalRef}
                className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 fade-in duration-200"
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="p-6 pt-8 text-center">
                    {/* Icon */}
                    <div className={`w-16 h-16 ${styles.iconBg} ${styles.iconColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        {styles.icon}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>

                    {/* Message */}
                    <p className="text-gray-600 mb-6 whitespace-pre-wrap">{message}</p>

                    {/* Buttons */}
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors disabled:opacity-50"
                        >
                            {cancelText || t('cancel')}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className={`px-6 py-2.5 ${styles.buttonBg} text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2`}
                        >
                            {loading && (
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            )}
                            {confirmText || t('confirm')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
