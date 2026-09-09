// src/integrations/supabase/client.ts
// ESM-friendly supabase client wrapper — export'lar top-level olacak şekilde yazıldı.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "";

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    "[supabase/client] VITE_SUPABASE_URL veya VITE_SUPABASE_PUBLISHABLE_KEY tanımlı değil. " +
      "Lütfen .env'e ekleyip dev server'ı yeniden başlatın. (Anahtarları repoya commit etmeyin.)"
  );
}

function unavailable(action: string) {
  return Promise.resolve({ data: null, error: new Error(`Supabase yapılandırılmadı. ${action}`) });
}

function chain(table: string) {
  const query: any = {
    select: () => query,
    insert: () => unavailable(`${table} insert`),
    update: () => query,
    delete: () => query,
    upsert: () => unavailable(`${table} upsert`),
    eq: () => query,
    in: () => query,
    order: () => query,
    maybeSingle: () => unavailable(`${table} select`),
    single: () => unavailable(`${table} select`),
    then: (resolve: (value: any) => void) => resolve({ data: [], error: null }),
  };
  return query;
}

/** Geçici stub (supabase konfigüre edilmemişse hata yerine çalışsın) */
const stub = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ data: null, error: new Error("Supabase yapılandırılmadı") }),
    signOut: async () => ({ error: new Error("Supabase yapılandırılmadı") }),
  },
  from: (table: string) => chain(table),
  functions: {
    invoke: async () => ({ data: null, error: new Error("Supabase yapılandırılmadı") }),
  },
} as unknown as ReturnType<typeof createClient>;

let supabase: any;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  supabase = stub;
} else {
  const authOptions: Record<string, any> = { persistSession: true, autoRefreshToken: true };
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    authOptions.storage = window.localStorage;
  }

  supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: authOptions,
  });
}

export { supabase };
export default supabase;
