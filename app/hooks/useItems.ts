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

// Fetch paginated items for search query
export function useSearchItems(searchQuery: string, categoryFilter: string, page: number = 1) {
    return useQuery({
        queryKey: ["searchItems", searchQuery, categoryFilter, page],
        queryFn: async (): Promise<PaginatedItems> => {
            const from = (page - 1) * ITEMS_PER_PAGE;

            let queryBuilder = supabase
                .from("items")
                .select("*")
                .order("created_at", { ascending: false });
                
            if (categoryFilter && categoryFilter !== "all") {
                queryBuilder = queryBuilder.eq("category", categoryFilter);
            }
            
            // We fetch all matching the category (or all items) and filter in memory 
            // to correctly support Turkish characters which Supabase ilike doesn't handle well.
            const { data, error } = await queryBuilder;

            if (error) throw error;

            let filteredData = data || [];

            if (searchQuery) {
                const lowerQuery = searchQuery.toLocaleLowerCase('tr-TR');
                
                // Helper to remove accents if user types english chars, but basically we do a robust match
                const normalize = (text: string) => text.toLocaleLowerCase('tr-TR')
                    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c');

                const normalizedQuery = normalize(searchQuery);

                filteredData = filteredData.filter(item => {
                    if (!item.title) return false;
                    const titleTr = item.title.toLocaleLowerCase('tr-TR');
                    const normalizedTitle = normalize(item.title);
                    
                    // Match either strict turkish lowercase or accent-folded version
                    return titleTr.includes(lowerQuery) || normalizedTitle.includes(normalizedQuery);
                });
            }

            const totalCount = filteredData.length;
            const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
            const paginatedData = filteredData.slice(from, from + ITEMS_PER_PAGE);

            return {
                items: paginatedData,
                totalCount,
                totalPages,
                currentPage: page,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            };
        },
        enabled: !!searchQuery,
        placeholderData: (previousData) => previousData,
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

// Fetch a single item by ID
export function useItem(id: number) {
    return useQuery({
        queryKey: ["item", id],
        queryFn: async (): Promise<Item> => {
            const { data, error } = await supabase
                .from("items")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            return data as Item;
        },
        enabled: !!id && !isNaN(id),
    });
}
