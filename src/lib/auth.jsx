/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabase";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(isSupabaseConfigured);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(next),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let active = true;
    const userId = session?.user?.id;
    if (!supabase || !userId) {
      setIsAdmin(false);
      setRoleLoading(false);
      return () => {
        active = false;
      };
    }
    setRoleLoading(true);
    supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setIsAdmin(!error && Boolean(data));
        setRoleLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id]);
  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      isAdmin,
      roleLoading,
      configured: isSupabaseConfigured,
      signOut: () => supabase?.auth.signOut(),
    }),
    [session, loading, isAdmin, roleLoading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
