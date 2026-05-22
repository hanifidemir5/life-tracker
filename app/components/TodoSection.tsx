"use client";

import { useState } from "react";
import {
    ChevronLeft, ChevronRight, Plus,
    CheckCircle2, Circle, Trash2, Lock,
    CalendarClock, PenLine, ChevronUp, ChevronDown, Calendar as CalendarIcon
} from "lucide-react";
import {
    useTodosDueOn, useCalendarDots, useProfiles,
    useAddTodo, useToggleTodo, useDeleteTodo,
    TodoPeriod, Todo, toISO, isTodoDueOn,
} from "@/app/hooks/useTodos";
import { useLanguage } from "@/app/contexts/LanguageContext";

const isPast = (d: Date) => { const m = new Date(); m.setHours(0, 0, 0, 0); return d < m; };

function ordinal(n: number) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

interface CalendarSidebarProps {
    userId: string | null;
    className?: string;
}

export default function CalendarSidebar({ userId, className = "" }: CalendarSidebarProps) {
    const { t } = useLanguage();
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [selectedDate, setSelectedDate] = useState(today);
    const [createPeriod, setCreatePeriod] = useState<TodoPeriod>("one-time");
    const [inputText, setInputText] = useState("");
    const [isCalendarOpen, setIsCalendarOpen] = useState(true);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendarCells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
        i < firstDay ? null : i - firstDay + 1
    );

    const selectedISO = toISO(selectedDate);
    const { data: dueTodos = [], isLoading } = useTodosDueOn(userId, selectedDate);
    const { data: dots } = useCalendarDots(userId);
    
    // Fetch profiles for dynamically displaying user names
    const uniqueUserIds = Array.from(new Set(dueTodos.map((t) => t.user_id)));
    const { data: profiles = {} } = useProfiles(uniqueUserIds);

    const addTodo = useAddTodo();
    const toggleTodo = useToggleTodo();
    const deleteTodo = useDeleteTodo();

    const canAdd = !isPast(selectedDate);

    const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isSelected = (d: number) => d === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
    const isFutureOrToday = (d: number) => { const c = new Date(year, month, d); c.setHours(0, 0, 0, 0); return c >= today; };

    const dayCellClass = (d: number): string => {
        if (isSelected(d)) return "bg-rose-500 text-white shadow-md scale-110";
        if (isToday(d)) return "bg-gray-100 text-rose-500 hover:bg-gray-200";
        return isFutureOrToday(d) ? "text-gray-700 hover:bg-gray-100" : "text-gray-300 hover:bg-gray-50";
    };

    const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
    const handleDayClick = (d: number) => setSelectedDate(new Date(year, month, d));

    const handleAdd = async () => {
        if (!inputText.trim() || !userId || !canAdd) return;
        try {
            await addTodo.mutateAsync({ userId, text: inputText.trim(), period: createPeriod, dueDate: selectedISO });
            setInputText("");
        } catch (err: any) {
            console.error(err);
            alert("Error adding task: " + (err.message || err));
        }
    };

    const myDueTodos = dueTodos.filter((t) => t.user_id === userId);
    const partnerDueTodos = dueTodos.filter((t) => t.user_id !== userId);

    const PERIOD_KEYS: TodoPeriod[] = ["one-time", "daily", "monthly", "yearly"];
    const periodLabels: Record<TodoPeriod, string> = { "one-time": t("oneTime") || "One Time", daily: t("daily"), monthly: t("monthly"), yearly: t("yearly") };
    const periodColors: Record<TodoPeriod, string> = {
        "one-time": "bg-gray-500 text-white border-transparent",
        daily: "bg-rose-500 text-white border-transparent",
        monthly: "bg-purple-500 text-white border-transparent",
        yearly: "bg-amber-500 text-white border-transparent",
    };
    const periodBadge: Record<TodoPeriod, string> = {
        "one-time": "border-gray-200 text-gray-600",
        daily: "border-rose-200 text-rose-600",
        monthly: "border-purple-200 text-purple-600",
        yearly: "border-amber-200 text-amber-600",
    };

    return (
        <aside className={`w-full shrink-0 lg:w-80 xl:w-[340px] self-start sticky top-24 ${className}`}>
            <div className="flex flex-col gap-6">

                {/* ── CALENDAR ── */}
                <div className="bg-white rounded-4xl shadow-sm p-5 border border-gray-100 flex flex-col">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="font-extrabold text-gray-800 text-lg tracking-tight capitalize">
                            {viewDate.toLocaleDateString(t('locale') || 'en-US', { month: 'long' })} {year}
                        </h3>
                        <div className="flex items-center gap-1">
                            <button onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                            <button onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"><ChevronRight className="w-5 h-5" /></button>
                            <button onClick={() => setIsCalendarOpen(!isCalendarOpen)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors ml-1">
                                {isCalendarOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className={`transition-all duration-300 overflow-hidden ${isCalendarOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="grid grid-cols-7 mb-2">
                            {(t('weekdays') || "Su,Mo,Tu,We,Th,Fr,Sa").split(",").map((d) => (
                                <div key={d} className="text-center text-gray-400 text-xs font-bold py-1 tracking-wider uppercase">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                            {calendarCells.map((day, i) => (
                                <div key={i} className="flex flex-col items-center justify-center relative h-10">
                                    {day ? (
                                        <>
                                            <button
                                                onClick={() => handleDayClick(day)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-all z-10 ${dayCellClass(day)}`}
                                            >
                                                {day}
                                            </button>
                                            {/* Dots under the day */}
                                            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5">
                                                {(() => {
                                                    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                                    const hasO = dots?.some(t => t.period === "one-time" && isTodoDueOn(t, iso));
                                                    const hasD = dots?.some(t => t.period === "daily" && isTodoDueOn(t, iso));
                                                    const hasM = dots?.some(t => t.period === "monthly" && isTodoDueOn(t, iso));
                                                    const hasY = dots?.some(t => t.period === "yearly" && isTodoDueOn(t, iso));
                                                    return (
                                                        <>
                                                            {hasO && <div className="w-1 h-1 rounded-full bg-gray-400" />}
                                                            {hasD && <div className="w-1 h-1 rounded-full bg-rose-400" />}
                                                            {hasM && <div className="w-1 h-1 rounded-full bg-blue-400" />}
                                                            {hasY && <div className="w-1 h-1 rounded-full bg-amber-400" />}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── UPCOMING DUE ── */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-2">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('upcomingDue') || "Upcoming Due"}</h4>
                        <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full">{myDueTodos.length + partnerDueTodos.length} {t('tasks') || "Tasks"}</span>
                    </div>

                    <div className="flex flex-col gap-3 min-h-16 max-h-64 overflow-y-auto px-1 pb-2">
                        {isLoading ? (
                            <div className="flex justify-center py-4">
                                <div className="w-5 h-5 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : myDueTodos.length === 0 && partnerDueTodos.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                                <p className="text-sm text-gray-400 font-medium">{t('nothingDueOnDay') || "Nothing due on this day"}</p>
                            </div>
                        ) : (
                            <>
                                {myDueTodos.map((todo) => (
                                    <div key={todo.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 relative overflow-hidden group">
                                        {/* Color accent left line */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${todo.period === 'one-time' ? 'bg-gray-400' : todo.period === 'daily' ? 'bg-rose-400' : todo.period === 'monthly' ? 'bg-blue-400' : 'bg-amber-400'}`} />

                                        <div className="flex-1 min-w-0 pl-2">
                                            <h5 className={`text-base font-bold truncate leading-tight mb-1 flex items-center gap-1 ${todo.done ? "text-gray-800" : "text-gray-400"}`}>
                                                {todo.text} 
                                                <span className={`text-[10px] ml-1 px-1.5 py-0.5 rounded-full ${todo.done ? "bg-gray-100 text-gray-400" : "bg-rose-50 text-rose-400"}`}>{profiles[todo.user_id] || t('me') || "Me"}</span>
                                            </h5>
                                            <p className="text-xs text-gray-400 font-medium">
                                                {todo.period === 'daily' ? (t('dueTomorrow') || 'Due Tomorrow') : `${t('due') || 'Due'} ${selectedDate.toLocaleDateString(t('locale') || "en-GB", { weekday: "long" })}`}
                                            </p>
                                        </div>
                                        <button onClick={() => toggleTodo.mutate({ id: todo.id, done: !todo.done, userId: userId!, selectedISO })} className="text-rose-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors shrink-0">
                                            {todo.done ? <CheckCircle2 className="w-6 h-6 fill-rose-100" /> : <CalendarIcon className="w-5 h-5 text-gray-300 group-hover:text-rose-400" />}
                                        </button>
                                        <button onClick={() => deleteTodo.mutate({ id: todo.id, userId: userId!, selectedISO })} className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-500 p-1">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {partnerDueTodos.map((todo) => (
                                    <div key={todo.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 relative overflow-hidden opacity-70">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${todo.period === 'one-time' ? 'bg-gray-400' : todo.period === 'daily' ? 'bg-rose-400' : todo.period === 'monthly' ? 'bg-blue-400' : 'bg-amber-400'}`} />
                                        <div className="flex-1 min-w-0 pl-2">
                                            <h5 className="text-base font-bold truncate leading-tight mb-1 flex items-center gap-1 text-gray-600">
                                                {todo.text} 
                                                <span className="text-[10px] text-purple-400 ml-1 bg-purple-50 px-1.5 py-0.5 rounded-full">{profiles[todo.user_id] || t('partnerTodos') || "Partner"}</span>
                                            </h5>
                                            <p className="text-xs text-gray-400 font-medium">{t('due') || 'Due'} {selectedDate.toLocaleDateString(t('locale') || "en-GB", { weekday: "short", day: 'numeric', month: 'short' })}</p>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* ── CREATE GOAL ── */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-2">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('createGoal') || "Create Goal"}</h4>
                    </div>

                    <div className="bg-white rounded-4xl shadow-sm p-4 border border-gray-100 flex flex-col gap-4">
                        {/* Period tabs */}
                        <div className="flex bg-rose-50/50 p-1 rounded-xl">
                            {PERIOD_KEYS.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setCreatePeriod(p)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${createPeriod === p ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                                >
                                    {periodLabels[p]}
                                </button>
                            ))}
                        </div>

                        {/* Input */}
                        {canAdd ? (
                            <>
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                                    placeholder={t('whatsTheGoal') || "What's the goal?"}
                                    disabled={!userId || addTodo.isPending}
                                    className="w-full bg-rose-50/50 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 placeholder:text-gray-400 outline-none focus:bg-rose-50/80 transition-colors border border-transparent focus:border-rose-100"
                                />
                                <button
                                    onClick={handleAdd}
                                    disabled={!inputText.trim() || !userId || addTodo.isPending}
                                    className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:hover:scale-100 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-rose-500/30 transition-all hover:scale-[1.02] flex items-center justify-center"
                                >
                                    {t('addGoal') || "Add Goal"}
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-6 justify-center">
                                <Lock className="w-4 h-4 text-gray-300" />
                                <p className="text-sm text-gray-400 font-medium">{t("pastDayLocked") || "Cannot add goals to past days"}</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </aside>
    );
}

function DueRow({ todo, isOwn, onToggle, onDelete, periodBadge }: {
    todo: Todo;
    isOwn: boolean;
    onToggle: () => void;
    onDelete: () => void;
    periodBadge: Record<TodoPeriod, string>;
}) {
    return (
        <li className="flex items-center gap-2 group rounded-lg px-1 py-0.5 hover:bg-gray-50 transition-colors">
            <button
                onClick={isOwn ? onToggle : undefined}
                className={`shrink-0 ${isOwn ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
            >
                {todo.done
                    ? <CheckCircle2 className="w-4 h-4 text-rose-400 fill-rose-100" />
                    : <Circle className="w-4 h-4 text-gray-200 group-hover:text-rose-200 transition-colors" />
                }
            </button>
            <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider border rounded px-1 py-0.5 ${periodBadge[todo.period]}`}>
                {todo.period.charAt(0).toUpperCase()}
            </span>
            <span className={`flex-1 text-sm leading-tight ${todo.done ? (isOwn ? "text-gray-600" : "text-purple-400 italic") : "text-gray-300"}`}>
                {todo.text}
            </span>
            {isOwn && (
                <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-gray-200 hover:text-rose-400 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </li>
    );
}
