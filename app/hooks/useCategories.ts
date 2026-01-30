import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/lib/supebaseClient";

export type Category = {
    id: number;
    key: string;
    name: string;
    icon_name: string;
    color_class: string;
    is_private?: boolean;
    user?: string;
    is_owner_required?: boolean;
};

// Fetch all categories visible to the user
export function useCategories(userId: string | null) {
    return useQuery({
        queryKey: ["categories", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("categories")
                .select("*")
                .order("id");

            if (error) throw error;

            // Filter private categories - only show if belongs to current user
            return (data || []).filter((cat: Category) => {
                if (!cat.is_private) return true;
                return cat.user === userId;
            });
        },
        enabled: userId !== undefined, // Run even if userId is null (for public data)
    });
}

// Fetch a single category by ID
export function useCategory(categoryId: number | string | null) {
    return useQuery({
        queryKey: ["category", categoryId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("categories")
                .select("*")
                .eq("id", categoryId)
                .single();

            if (error) throw error;
            return data as Category;
        },
        enabled: !!categoryId,
    });
}

// Fetch category by key
export function useCategoryByKey(categoryKey: string | null) {
    return useQuery({
        queryKey: ["categoryByKey", categoryKey],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("categories")
                .select("*")
                .eq("key", categoryKey)
                .single();

            if (error) throw error;
            return data as Category;
        },
        enabled: !!categoryKey,
    });
}

// Invalidate categories cache (call after mutations)
export function useInvalidateCategories() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: ["categories"] });
}
