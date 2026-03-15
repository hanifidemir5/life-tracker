import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/lib/supebaseClient";

export type TodoPeriod = "daily" | "monthly" | "yearly";

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

// Add exactly N months to an ISO date string (handles month-length edge cases)
function addMonths(iso: string, n: number): string {
    const [y, m, d] = iso.split("-").map(Number);
    const result = new Date(y, m - 1 + n, d);
    return toISO(result);
}

// Add exactly N years to an ISO date string
function addYears(iso: string, n: number): string {
    const [y, m, d] = iso.split("-").map(Number);
    return `${y + n}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Next due date for a todo:
 *  - daily   → same date (the due_date itself)
 *  - monthly → due_date + 1 month
 *  - yearly  → due_date + 1 year
 */
export function nextDueDate(todo: Pick<Todo, "period" | "due_date">): string | null {
    if (!todo.due_date) return null;
    if (todo.period === "daily") return todo.due_date;
    if (todo.period === "monthly") return addMonths(todo.due_date, 1);
    if (todo.period === "yearly") return addYears(todo.due_date, 1);
    return null;
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

            return ((data || []) as Todo[]).filter((t) => {
                const due = nextDueDate(t);
                return due === iso;
            });
        },
        enabled: !!userId,
    });
}

/**
 * Returns three Sets of ISO date strings for calendar highlights:
 *  - dailyDates:   exact dates with daily todos
 *  - monthlyDates: next-month due dates (due_date + 1 month)
 *  - yearlyDates:  next-year due dates  (due_date + 1 year)
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

            const dailyDates = new Set<string>();
            const monthlyDates = new Set<string>();
            const yearlyDates = new Set<string>();

            for (const row of data || []) {
                if (!row.due_date) continue;
                if (row.period === "daily") dailyDates.add(row.due_date);
                if (row.period === "monthly") monthlyDates.add(addMonths(row.due_date, 1));
                if (row.period === "yearly") yearlyDates.add(addYears(row.due_date, 1));
            }

            return { dailyDates, monthlyDates, yearlyDates };
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
