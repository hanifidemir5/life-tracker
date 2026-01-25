"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/app/lib/supabase/server";

export async function login(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("Login Error:", error);
        throw error;
    }

    revalidatePath("/", "layout");
    redirect("/");
}

export async function signup(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error(error);
        // Hata durumunda da redirect yerine hata fırlatabiliriz veya status dönebiliriz.
        // Ancak şimdilik basitlik adına redirect("/error")'ı kaldırıp error throw edelim
        throw error;
    }

    // Başarılı olduğunda redirect ETMİYORUZ.
    // Client tarafı modal gösterecek.
    // revalidatePath("/", "layout"); // Gerekirse
}

export async function logout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    redirect("/login");
}
