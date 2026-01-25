import { createClient as createBrowserClient } from "@/app/lib/supabase/client";

// Backward compatibility: export a singleton instance
export const supabase = createBrowserClient();

