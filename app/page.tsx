'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Match } from '@/lib/types';
import MatchCard from '@/components/MatchCard';
import MatchCardSkeleton from '@/components/MatchCardSkeleton';
import SplashLoading from '@/components/SplashLoading';
import { Search, Megaphone, Gift, List, Map as MapIcon, RefreshCcw, Bell, ChevronDown } from 'lucide-react';
import PhotoHero from '@/components/PhotoHero';
import WeatherWidget from '@/components/WeatherWidget';
import EmptyState from '@/components/EmptyState';
import PullToRefresh from '@/components/PullToRefresh';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { getLocalISODate } from '@/lib/dateUtils';

const FeedMap = dynamic(() => import('@/components/MapLayer'), { ssr: false });

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function today() {
  return getLocalISODate();
}
function addDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function buildWeek() {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(i);
    return { iso: getLocalISODate(d), label: DAY_NAMES[d.getDay()], num: d.getDate() };
  });
}

export default function HomePage() {
  const router = useRouter();
  const { session, profile, loading, unreadNotifications } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(today());
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isAvailable, setIsAvailable] = useState(true);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const week = useMemo(buildWeek, []);

  const fetcher = async () => {
    let query = supabase
      .from('matches')
      .select('*')
      .gte('match_date', week[0].iso)
      .lte('match_date', week[week.length - 1].iso)
      .order('match_time', { ascending: true });
      
    if (profile?.is_referee && profile.id) {
      query = query.or(`and(needs_referee.eq.true,referee_id.is.null),organizer_id.eq.${profile.id}`);
    } else {
      query = query.eq('status', 'open');
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as Match[]) || [];
  };

  const { data: weekMatches = [], isLoading: matchesLoading, mutate } = useSWR(
    ['home_matches', profile?.is_referee, week[0].iso],
    fetcher
  );

  useEffect(() => {
    // Suscripción en tiempo real: cualquier partido nuevo/actualizado
    // de la semana aparece al instante en todos los celulares conectados.
    const channel = supabase
      .channel('home-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        mutate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);

  if (loading) return <SplashLoading />;

  // Los partidos cuyo horario ya pasó no se muestran más.
  const now = new Date();
  
  const isLastMinute = (m: Match) => {
    const matchDate = new Date(`${m.match_date}T${m.match_time}`);
    const diffHours = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= 2 && m.status === 'open';
  };

  const matches = weekMatches.filter(
    (m) => m.match_date === selectedDate && new Date(`${m.match_date}T${m.match_time}`) >= now
  );
  
  const urgentMatches = matches.filter(isLastMinute);
  const normalMatches = matches.filter(m => !isLastMinute(m));

  const hasMatch = (iso: string) =>
    weekMatches.some((m) => m.match_date === iso && new Date(`${m.match_date}T${m.match_time}`) >= now);
  const selectedLabel = week.find((d) => d.iso === selectedDate);
  const heading = selectedDate === today() ? 'Partidos de hoy' : `Partidos del ${selectedLabel?.label} ${selectedLabel?.num}`;

  return (
    <PullToRefresh onRefresh={async () => { await mutate(); }}>
      <header className="sticky top-0 z-20 flex items-center justify-center border-b border-line dark:border-charcoal-line bg-white dark:bg-charcoal/90 px-5 py-4 backdrop-blur-xl relative">
        <div className="flex items-center gap-2 pr-6">
          <img src="/brand/logo.png" alt="Salvá el Fútbol" className="h-8 w-8 rounded-full" />
          <span className="font-display text-[16px] font-extrabold text-ink dark:text-white">Salvá el Fútbol</span>
        </div>
        <div className="absolute right-5">
          <Link href="/notificaciones" className="relative flex items-center justify-center p-1 text-ink dark:text-white transition-transform hover:scale-110 active:scale-95">
            <Bell size={24} strokeWidth={2} />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-charcoal"></span>
            )}
          </Link>
        </div>
      </header>

      {/* Greeting Bar */}
      {session && profile && (
        <div className="flex items-center gap-3.5 bg-bg px-5 py-5 border-b border-line/60">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#00d65f] text-white text-[22px] font-bold shadow-sm ring-4 ring-white/50">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              profile.name?.charAt(0).toUpperCase() || 'J'
            )}
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="font-display text-[22px] font-bold text-[#333333] leading-none tracking-tight mb-1.5">
              ¡Hola, <span className="text-[#1a1a1a]">{profile.name?.split(' ')[0] || 'Jugador'}</span>!
            </h2>
            <div className="relative">
              <button 
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="flex items-center gap-1.5 press-fx"
              >
                <span className={`h-2.5 w-2.5 rounded-full transition-colors ${isAvailable ? 'bg-[#00d65f] shadow-[0_0_8px_rgba(0,214,95,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
                <span className="text-[14px] font-medium text-[#8a8a8a] transition-all">
                  {isAvailable ? 'Listo para jugar' : 'No disponible'}
                </span>
                <ChevronDown size={16} strokeWidth={2.5} className={`text-[#8a8a8a] ml-0.5 transition-transform duration-300 ${showStatusMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Status Dropdown Menu with fade-slide-up animation */}
              {showStatusMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                  <div className="absolute left-0 top-full mt-2 w-48 z-50 origin-top-left rounded-2xl border border-line bg-white p-1.5 shadow-lg fade-slide-up dark:border-charcoal-line dark:bg-charcoal">
                    <button 
                      onClick={() => { setIsAvailable(true); setShowStatusMenu(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-all ${isAvailable ? 'bg-brand/10 text-brand scale-[1.02]' : 'text-inksoft hover:bg-neutral-50 dark:hover:bg-charcoal-light'}`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-[#00d65f] shadow-sm" />
                      Listo para jugar
                    </button>
                    <button 
                      onClick={() => { setIsAvailable(false); setShowStatusMenu(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-bold transition-all mt-1 ${!isAvailable ? 'bg-red-50 text-red-600 scale-[1.02] dark:bg-red-500/10' : 'text-inksoft hover:bg-neutral-50 dark:hover:bg-charcoal-light'}`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" />
                      No disponible
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden px-5 pb-7 pt-0 text-white">
        <PhotoHero />
        <div className="relative">
          {profile?.is_referee ? (
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-bold text-yellow-300 border border-yellow-400/30 mb-2">
                <span className="text-sm">🧑‍⚖️</span> Modo Árbitro Oficial
              </div>
              <h1 className="mb-2 font-display text-[24px] font-extrabold leading-tight shadow-black drop-shadow-md">
                Bolsa de Árbitros
              </h1>
              <p className="text-[13.5px] text-white/90 shadow-black drop-shadow-md">
                Postulate a los partidos que solicitan arbitraje en tu ciudad y ganá dinero por cada encuentro.
              </p>
            </div>
          ) : (
            <>
              <div>
                <h1 className="mt-2 mb-1 font-display text-[24px] font-extrabold shadow-black drop-shadow-md">¿Qué necesitás hoy?</h1>
                <p className="mb-6 text-[13.5px] text-white/90 shadow-black drop-shadow-md">Conectamos partidos con jugadores en segundos.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push('/publicar')}
                  className="press-fx flex items-center gap-3 rounded-[20px] bg-white/10 p-2 pr-4 text-left text-white shadow-sm backdrop-blur-md h-[56px] border border-white/20"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-brand text-white shadow-inner">
                    <Megaphone size={18} strokeWidth={2.5} />
                  </div>
                  <span className="font-display text-[12.5px] font-bold leading-tight drop-shadow-md">Armar<br/>Partido</span>
                </button>
                <button
                  onClick={() => router.push('/buscar')}
                  className="press-fx flex items-center gap-3 rounded-[20px] bg-white/10 p-2 pr-4 text-left text-white shadow-sm backdrop-blur-md h-[56px] border border-white/20"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-ink shadow-inner">
                    <Search size={18} strokeWidth={2.5} />
                  </div>
                  <span className="font-display text-[12.5px] font-bold leading-tight drop-shadow-md">Sumarme<br/>a uno</span>
                </button>
                <button
                  onClick={() => router.push('/publicar?tipo=equipo_rival')}
                  className="press-fx flex items-center gap-3 rounded-[20px] bg-white/10 p-2 pr-4 text-left text-white shadow-sm backdrop-blur-md h-[56px] border border-white/20"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-blue-500 text-white text-lg shadow-inner z-10">
                    🤝
                  </div>
                  <span className="font-display text-[12.5px] font-bold leading-tight drop-shadow-md z-10">Buscar<br/>Rival</span>
                </button>
                <button
                  onClick={() => router.push('/torneos')}
                  className="press-fx flex items-center gap-3 rounded-[20px] bg-white/10 p-2 pr-4 text-left text-white shadow-sm backdrop-blur-md h-[56px] border border-white/20"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-purple-500 text-white text-lg shadow-inner z-10">
                    🏆
                  </div>
                  <span className="font-display text-[12.5px] font-bold leading-tight drop-shadow-md z-10">Explorar<br/>Torneos</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-line bg-white px-5 py-3.5">
        {week.map((d) => {
          const active = d.iso === selectedDate;
          return (
            <button
              key={d.iso}
              onClick={() => setSelectedDate(d.iso)}
              className={`press-fx flex flex-shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 ${
                active ? 'bg-brand text-white' : 'bg-neutral-50 text-inksoft'
              }`}
            >
              <span className="text-[10px] font-bold uppercase">{d.label}</span>
              <span className="font-display text-sm font-extrabold">{d.num}</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hasMatch(d.iso) ? (active ? 'bg-white' : 'bg-brand') : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>


      <div className="px-5 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-[15.5px] font-extrabold leading-tight">{heading}</h2>
            <span className="text-xs text-inksoft font-medium">{matches.length} {matches.length === 1 ? 'partido' : 'partidos'}</span>
          </div>
          
          <div className="flex bg-neutral-100 p-[3px] rounded-xl border border-line">
            <button 
              onClick={() => setViewMode('list')} 
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-ink' : 'text-inksoft hover:text-ink'}`}
            >
              <List size={12} />
              Lista
            </button>
            <button 
              onClick={() => setViewMode('map')} 
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${viewMode === 'map' ? 'bg-white shadow-sm text-ink' : 'text-inksoft hover:text-ink'}`}
            >
              <MapIcon size={12} />
              Mapa
            </button>
          </div>
        </div>
        {matchesLoading ? (
          <>
            <MatchCardSkeleton />
            <MatchCardSkeleton />
          </>
        ) : matches.length === 0 ? (
          <EmptyState icon="ball" title="Todavía no hay partidos para este día" subtitle="¡Sé el primero en publicar uno!" />
        ) : viewMode === 'map' ? (
          <div className="fade-in mb-6">
            <FeedMap matches={matches} />
          </div>
        ) : (
          <div>
            {urgentMatches.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-1.5 text-[13px] font-bold text-red-600">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">🔥</span> Último Minuto
                </div>
                {urgentMatches.map((m, i) => (
                  <div key={m.id} className="fade-slide-up" style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}>
                    <MatchCard match={m} isMine={!!session && m.organizer_id === session.user.id} asRefereeMode={!!profile?.is_referee} />
                  </div>
                ))}
              </div>
            )}
            
            {normalMatches.length > 0 && (
              <div>
                {normalMatches.map((m, i) => (
                  <div key={m.id} className="fade-slide-up" style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}>
                    <MatchCard match={m} isMine={!!session && m.organizer_id === session.user.id} asRefereeMode={!!profile?.is_referee} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>


    </PullToRefresh>
  );
}
