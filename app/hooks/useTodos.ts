import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/lib/supebaseClient";

export type TodoPeriod = "one-time" | "daily" | "monthly" | "yearly";

export type Todo = {
    id: number;
    user_id: string;
    text: string;
    done: boolean;
    period: TodoPeriod;
    due_date: string | null; // ISO "YYYY-MM-DD" anchor date (the date the user created it on)
    created_at: string;
};

// Format a Date to "YYYY-MM-DD" in local timezone
export const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function isTodoDueOn(todo: Pick<Todo, "period" | "due_date">, targetIso: string): boolean {
    if (!todo.due_date || !targetIso || targetIso.length !== 10) return false;
    
    // In case Supabase returns a timestamp like "2026-05-22T00:00:00Z", extract just the date part.
    const dueDateStr = todo.due_date.substring(0, 10);
    if (dueDateStr.length !== 10) return false;
    
    const [tY, tM, tD] = dueDateStr.split("-").map(Number);
    const [tarY, tarM, tarD] = targetIso.split("-").map(Number);

    const tDate = new Date(tY, tM - 1, tD);
    const targetDate = new Date(tarY, tarM - 1, tarD);

    // Can't be due before it's created anchor date
    if (targetDate < tDate) return false; 
    
    switch (todo.period) {
        case "one-time":
            return dueDateStr === targetIso;
        case "daily":
            return true;
        case "monthly":
            return tarD === tD;
        case "yearly":
            return tarD === tD && tarM === tM;
        default:
            return false;
    }
}

/**
 * Fetch ALL todos that are due on the selected date.
 * - daily:   due_date === selectedISO
 * - monthly: due_date + 1 month === selectedISO
 * - yearly:  due_date + 1 year  === selectedISO
 */
export function useTodosDueOn(userId: string | null, selectedDate: Date) {
    const iso = toISO(selectedDate);

    return useQuery({
        queryKey: ["todos-due", userId, iso],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("todos")
                .select("*")
                .order("created_at", { ascending: true });

            if (error) throw error;

            return ((data || []) as Todo[]).filter((t) => isTodoDueOn(t, iso));
        },
        enabled: !!userId,
    });
}

/**
 * Returns all active todos to compute calendar dots on the client
 */
export function useCalendarDots(userId: string | null) {
    return useQuery({
        queryKey: ["todos-dots", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("todos")
                .select("period, due_date")
                .not("due_date", "is", null);

            if (error) throw error;

            return (data || []) as Pick<Todo, "period" | "due_date">[];
        },
        enabled: !!userId,
    });
}

// Add a new todo
export function useAddTodo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            userId, text, period, dueDate,
        }: {
            userId: string;
            text: string;
            period: TodoPeriod;
            dueDate: string;
        }) => {
            const { error } = await supabase.from("todos").insert([
                { user_id: userId, text, period, done: false, due_date: dueDate },
            ]);
            if (error) throw error;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["todos-due", variables.userId] });
            queryClient.invalidateQueries({ queryKey: ["todos-dots", variables.userId] });
        },
    });
}

// Toggle done state
export function useToggleTodo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id, done,
        }: { id: number; done: boolean; userId: string; selectedISO: string }) => {
            const { error } = await supabase.from("todos").update({ done }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["todos-due", variables.userId, variables.selectedISO] });
        },
    });
}

// Delete a todo
export function useDeleteTodo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
        }: { id: number; userId: string; selectedISO: string }) => {
            const { error } = await supabase.from("todos").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["todos-due", variables.userId, variables.selectedISO] });
            queryClient.invalidateQueries({ queryKey: ["todos-dots", variables.userId] });
        },
    });
}

// Fetch profiles for a list of user IDs to display real names
export function useProfiles(userIds: string[]) {
    return useQuery({
        queryKey: ["profiles", userIds.sort().join(",")],
        queryFn: async () => {
            if (userIds.length === 0) return {};
            const { data, error } = await supabase
                .from("profiles")
                .select("id, display_name")
                .in("id", userIds);

            if (error) throw error;
            
            const profileMap: Record<string, string> = {};
            for (const row of data || []) {
                if (row.display_name) profileMap[row.id] = row.display_name;
            }
            return profileMap;
        },
        enabled: userIds.length > 0,
    });
}
