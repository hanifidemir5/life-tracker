import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/lib/supebaseClient";

export const ITEMS_PER_PAGE = 10;

export type Item = {
    id: number;
    title: string;
    description: string;
    category: string;
    status: boolean;
    owner?: string;
    image_urls?: string[];
    created_at?: string;
};

export type PaginatedItems = {
    items: Item[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
};

// Fetch paginated items for a category
export function useItems(categoryKey: string, page: number = 1) {
    return useQuery({
        queryKey: ["items", categoryKey, page],
        queryFn: async (): Promise<PaginatedItems> => {
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data, error, count } = await supabase
                .from("items")
                .select("*", { count: "exact" })
                .eq("category", categoryKey)
                .order("id", { ascending: false })
                .range(from, to);

            if (error) throw error;

            const totalCount = count || 0;
            const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

            return {
                items: data || [],
                totalCount,
                totalPages,
                currentPage: page,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            };
        },
        enabled: !!categoryKey,
        placeholderData: (previousData) => previousData, // Keep previous data while loading new page
    });
}

// Fetch all items for a category (no pagination - for dropdown, etc.)
export function useAllItems(categoryKey: string) {
    return useQuery({
        queryKey: ["allItems", categoryKey],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("items")
                .select("*")
                .eq("category", categoryKey)
                .order("id", { ascending: false });

            if (error) throw error;
            return data as Item[];
        },
        enabled: !!categoryKey,
    });
}

// Invalidate items cache (call after mutations)
export function useInvalidateItems() {
    const queryClient = useQueryClient();
    return (categoryKey?: string) => {
        if (categoryKey) {
            queryClient.invalidateQueries({ queryKey: ["items", categoryKey] });
            queryClient.invalidateQueries({ queryKey: ["allItems", categoryKey] });
        } else {
            queryClient.invalidateQueries({ queryKey: ["items"] });
            queryClient.invalidateQueries({ queryKey: ["allItems"] });
        }
    };
}
