'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import SplashLoading from '@/components/SplashLoading';
import BottomNav from '@/components/BottomNav';
import { Activity, Clock, Trophy, MapPin, CheckCircle, HelpCircle } from 'lucide-react';

type MatchData = {
  id: string;
  court: string;
  match_date: string;
  match_time: string;
  status: string;
  price: number;
};

type TabType = 'pendientes' | 'organizados' | 'jugados';

export default function MisPartidosPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('pendientes');
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && session) {
      loadMatches();
    } else if (!loading && !session) {
      setFetching(false);
    }
  }, [loading, session, activeTab]);

  async function loadMatches() {
    if (!session) return;
    setFetching(true);
    try {
      if (activeTab === 'pendientes') {
        const { data } = await supabase
          .from('join_requests')
          .select('match:matches(id, court, match_date, match_time, status, price)')
          .eq('player_id', session.user.id)
          .eq('status', 'pending');
        
        setMatches((data || []).map(r => r.match as unknown as MatchData).filter(Boolean));
      } else if (activeTab === 'organizados') {
        const { data } = await supabase
          .from('matches')
          .select('id, court, match_date, match_time, status, price')
          .eq('organizer_id', session.user.id)
          .order('match_date', { ascending: false });
        
        setMatches(data || []);
      } else if (activeTab === 'jugados') {
        const { data: playedData } = await supabase
          .from('join_requests')
          .select('match:matches(id, court, match_date, match_time, status, price)')
          .eq('player_id', session.user.id)
          .eq('status', 'accepted');
        
        const playedMatches = (playedData || []).map(r => r.match as unknown as MatchData).filter(m => m && m.status === 'complete');
        
        const { data: orgData } = await supabase
          .from('matches')
          .select('id, court, match_date, match_time, status, price')
          .eq('organizer_id', session.user.id)
          .eq('status', 'complete');
        
        const allPlayed = [...playedMatches, ...(orgData || [])];
        const unique = Array.from(new Map(allPlayed.map(m => [m.id, m])).values());
        
        setMatches(unique.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  }

  if (loading) return <SplashLoading />;

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-5 text-center bg-bg dark:bg-bg-dark pb-24">
        <Activity size={48} className="mb-4 text-inksoft dark:text-inksoft-dark opacity-20" />
        <h2 className="mb-2 font-display text-xl font-bold dark:text-white">Iniciá sesión</h2>
        <p className="text-sm text-inksoft dark:text-inksoft-dark">Necesitás una cuenta para ver tus partidos.</p>
        <Link href="/auth?next=/mis-partidos" className="mt-6 rounded-xl bg-brand px-6 py-3 font-bold text-white shadow-glow-brand press-fx">
          Iniciar sesión
        </Link>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg dark:bg-bg-dark pb-24">
      <header className="sticky top-0 z-20 border-b border-line dark:border-line-dark bg-white dark:bg-bg-dark px-5 py-4 shadow-card">
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold text-ink dark:text-white">
          <Activity size={28} className="text-brand" /> Mis Partidos
        </h1>
      </header>

      <div className="sticky top-[68px] z-20 bg-white/90 dark:bg-bg-dark/90 backdrop-blur-md px-5 pt-3 pb-2 border-b border-line dark:border-line-dark overflow-x-auto hide-scrollbar">
        <div className="flex gap-1 min-w-max bg-neutral-100 dark:bg-charcoal rounded-xl p-1">
          <button
            onClick={() => setActiveTab('pendientes')}
            className={`press-fx flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'pendientes'
                ? 'bg-white dark:bg-charcoal-soft text-ink dark:text-white shadow-sm'
                : 'text-inksoft dark:text-inksoft-dark hover:text-ink dark:hover:text-white'
            }`}
          >
            <Clock size={16} /> Pendientes
          </button>
          <button
            onClick={() => setActiveTab('organizados')}
            className={`press-fx flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'organizados'
                ? 'bg-white dark:bg-charcoal-soft text-ink dark:text-white shadow-sm'
                : 'text-inksoft dark:text-inksoft-dark hover:text-ink dark:hover:text-white'
            }`}
          >
            <Trophy size={16} /> Organizados
          </button>
          <button
            onClick={() => setActiveTab('jugados')}
            className={`press-fx flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'jugados'
                ? 'bg-white dark:bg-charcoal-soft text-ink dark:text-white shadow-sm'
                : 'text-inksoft dark:text-inksoft-dark hover:text-ink dark:hover:text-white'
            }`}
          >
            <CheckCircle size={16} /> Historial
          </button>
        </div>
      </div>

      <div className="px-5 pt-6">
        {fetching ? (
          <div className="flex justify-center p-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-line dark:border-line-dark bg-white/50 dark:bg-bg-dark/50 p-10 text-center scale-in-sm">
            <HelpCircle size={48} className="mb-4 text-neutral-300 dark:text-neutral-600" />
            <h3 className="mb-2 font-display text-lg font-bold text-ink dark:text-white">No hay partidos acá</h3>
            <p className="text-sm text-inksoft dark:text-inksoft-dark">
              {activeTab === 'pendientes' && 'No estás anotado en ningún partido por ahora.'}
              {activeTab === 'organizados' && 'Aún no creaste ningún partido.'}
              {activeTab === 'jugados' && 'Todavía no tenés un historial de partidos jugados.'}
            </p>
            {activeTab === 'pendientes' && (
              <Link href="/buscar" className="mt-6 font-bold text-brand hover:underline press-fx">
                Buscar partidos para jugar
              </Link>
            )}
            {activeTab === 'organizados' && (
              <Link href="/publicar" className="mt-6 font-bold text-brand hover:underline press-fx">
                Crear tu primer partido
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {matches.map((m, i) => (
              <Link key={m.id} href={`/partido/${m.id}`} className={`press-fx block rounded-2xl border border-line dark:border-line-dark bg-white dark:bg-charcoal p-4 shadow-sm hover:shadow-card hover:border-brand/50 transition-all slide-up-sm stagger-${(i % 8) + 1}`}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand">
                    <MapPin size={14} />
                    {m.court}
                  </div>
                  <div className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                    m.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    m.status === 'complete' ? 'bg-ink text-white dark:bg-white dark:text-ink' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {m.status === 'open' ? 'Abierto' : m.status === 'complete' ? 'Cerrado' : 'Cancelado'}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-black text-ink dark:text-white">{new Date(`${m.match_date}T${m.match_time}`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                    <p className="text-sm text-inksoft dark:text-inksoft-dark">{m.match_time.slice(0, 5)} hs</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
