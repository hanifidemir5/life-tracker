import { z } from "zod";

// --- LOGIN SCHEMA ---
export const loginSchema = z.object({
    email: z.string().email("Geçerli bir email adresi girin."),
    password: z.string().min(1, "Şifre gereklidir."),
});

// --- REGISTER SCHEMA ---
export const registerSchema = z
    .object({
        fullName: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır."),
        email: z.string().email("Geçerli bir email adresi girin."),
        password: z.string().min(6, "Şifre en az 6 karakter olmalıdır."),
        confirmPassword: z.string().min(6, "Şifre tekrarı gereklidir."),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Şifreler eşleşmiyor.",
        path: ["confirmPassword"],
    });

// --- ITEM SCHEMA ---
export const itemSchema = z.object({
    title: z
        .string()
        .min(1, "Başlık gereklidir.")
        .max(100, "Başlık en fazla 100 karakter olabilir."),
    description: z.string().optional(),
    category: z.string().min(1, "Lütfen bir kategori seçin."),
    status: z.boolean().default(false),
    owner: z.string().optional(),
    // Photos are handled separately as File[], but we can validate length logic here if needed
    // For now, we will inspect file array length in the component manually or via custom validation if using proper Rhf controller
});

// --- CATEGORY SCHEMA ---
export const categorySchema = z.object({
    name: z.string().min(1, "Kategori adı gereklidir."),
    key: z.string().min(1, "Kategori anahtarı gereklidir."),
    icon_name: z.string().min(1, "Lütfen bir ikon seçin."),
    color_class: z.string().min(1, "Lütfen bir renk seçin."),
    is_private: z.boolean().default(false),
    is_owner_required: z.boolean().default(false),
});


export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ItemFormData = z.infer<typeof itemSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
