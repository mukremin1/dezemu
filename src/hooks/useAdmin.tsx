import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

function adminEmails(): string[] {
  const raw = import.meta.env.VITE_ADMIN_EMAILS as string | undefined;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const useAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      const emailAllowed = !!(user.email && adminEmails().includes(user.email.toLowerCase()));

      try {
        if (emailAllowed) {
          await supabase.rpc("claim_allowlisted_admin");
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(emailAllowed);
        } else {
          setIsAdmin(!!data || emailAllowed);
        }
      } catch (err) {
        console.error("Error checking admin status:", err);
        if (!cancelled) setIsAdmin(emailAllowed);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isAdmin, isLoading: authLoading || isLoading };
};
