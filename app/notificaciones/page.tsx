'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { AppNotification } from '@/lib/types';
import { Bell } from 'lucide-react';

export default function NotificacionesPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!loading && !session) router.replace('/auth?next=/notificaciones');
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

  if (loading || !session) return null;

  return (
    <div className="pb-10 pt-6">
      <h2 className="mb-3 px-5 font-display text-[15.5px] font-extrabold">Notificaciones</h2>
      {items.length === 0 && <p className="px-5 text-sm text-inksoft">Todavía no tenés notificaciones.</p>}
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
