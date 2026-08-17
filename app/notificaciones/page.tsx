'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { AppNotification } from '@/lib/types';
import { Bell } from 'lucide-react';
import EmptyState from '@/components/EmptyState';

import Link from 'next/link';

export default function NotificacionesPage() {
  const router = useRouter();
  const { session, loading, clearUnreadNotifications } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    // Guest access allowed, handled in render
  }, [loading, session, router]);

  useEffect(() => {
    if (!session) return;

    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setItems((data as AppNotification[]) || []);

      // Mark all as read locally and in DB
      clearUnreadNotifications();
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', session!.user.id)
        .eq('read', false);
    }
    load();

    const channel = supabase
      .channel('my-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
        (payload) => setItems((prev) => [payload.new as AppNotification, ...prev])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  async function openNotification(n: AppNotification) {
    if (!n.read) await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    if (n.match_id) router.push(`/partido/${n.match_id}`);
  }

  if (loading) return null;
  
  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-5 text-center bg-bg pb-24">
        <Bell size={48} className="mb-4 text-inksoft opacity-20" />
        <h2 className="mb-2 font-display text-xl font-bold">Iniciá sesión</h2>
        <p className="text-sm text-inksoft">Necesitás una cuenta para ver tus notificaciones.</p>
        <Link href="/auth?next=/notificaciones" className="mt-6 rounded-xl bg-brand px-6 py-3 font-bold text-white shadow-lg">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-10 pt-4">
      <h2 className="mb-3 px-5 font-display text-[15.5px] font-extrabold text-center">Notificaciones</h2>
      {items.length === 0 && (
        <div className="px-5">
          <EmptyState icon="bell" title="Todavía no tenés notificaciones" subtitle="Te vamos a avisar cuando algo pase con tus partidos." />
        </div>
      )}
      {items.map((n) => (
        <button
          key={n.id}
          onClick={() => openNotification(n)}
          className={`press-fx mx-5 mb-2.5 flex w-[calc(100%-40px)] gap-3 rounded-2xl border border-line bg-white p-3.5 text-left ${
            !n.read ? 'ring-1 ring-brand/30' : ''
          }`}
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-pale text-brand-dark">
            <Bell size={17} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm leading-snug">{n.body}</p>
            <small className="text-[11px] text-inksoft">{new Date(n.created_at).toLocaleString('es-AR')}</small>
          </div>
        </button>
      ))}
    </div>
  );
}
