'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  unreadNotifications: number;
  globalToast: string | null;
  setGlobalToast: (msg: string | null) => void;
  clearUnreadNotifications: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  unreadNotifications: 0,
  globalToast: null,
  setGlobalToast: () => {},
  clearUnreadNotifications: () => {},
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [globalToast, setGlobalToast] = useState<string | null>(null);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    // Nota: "phone" se omite a propósito de esta consulta general.
    setProfile(data as Profile | null);
    
    // Load unread count
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    setUnreadNotifications(count || 0);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) loadProfile(newSession.user.id);
      else {
        setProfile(null);
        setUnreadNotifications(0);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel('global-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
        (payload) => {
          setUnreadNotifications((prev) => prev + 1);
          setGlobalToast((payload.new as any).body || '¡Tenés una nueva notificación!');
          setTimeout(() => setGlobalToast(null), 3500); // 3.5s toast
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id);
  }

  async function clearUnreadNotifications() {
    setUnreadNotifications(0);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, unreadNotifications, globalToast, setGlobalToast, clearUnreadNotifications, refreshProfile, signOut }}>
      {globalToast && (
        <div className="fixed top-4 left-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="rounded-2xl bg-charcoal/95 backdrop-blur-md px-4 py-3 shadow-xl border border-white/10 flex items-center justify-between">
            <span className="text-white text-sm font-semibold">{globalToast}</span>
            <button onClick={() => setGlobalToast(null)} className="text-white/50 hover:text-white press-fx">✕</button>
          </div>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
