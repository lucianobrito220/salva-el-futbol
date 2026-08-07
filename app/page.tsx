'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Match } from '@/lib/types';
import MatchCard from '@/components/MatchCard';
import MatchCardSkeleton from '@/components/MatchCardSkeleton';
import SplashLoading from '@/components/SplashLoading';
import { Search, Megaphone } from 'lucide-react';
import PhotoHero from '@/components/PhotoHero';
import HomeMessageCarousel from '@/components/HomeMessageCarousel';
import WeatherWidget from '@/components/WeatherWidget';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function today() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function buildWeek() {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(i);
    return { iso: d.toISOString().slice(0, 10), label: DAY_NAMES[d.getDay()], num: d.getDate() };
  });
}

export default function HomePage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [weekMatches, setWeekMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(today());

  const week = useMemo(buildWeek, []);

  useEffect(() => {
    // Inicio es público: no hace falta estar logueado para ver los partidos.
    async function load() {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .gte('match_date', week[0].iso)
        .lte('match_date', week[week.length - 1].iso)
        .eq('status', 'open')
        .order('match_time', { ascending: true });
      setWeekMatches((data as Match[]) || []);
      setMatchesLoading(false);
    }
    load();

    // Suscripción en tiempo real: cualquier partido nuevo/actualizado
    // de la semana aparece al instante en todos los celulares conectados.
    const channel = supabase
      .channel('home-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <SplashLoading />;

  const matches = weekMatches.filter((m) => m.match_date === selectedDate);
  const hasMatch = (iso: string) => weekMatches.some((m) => m.match_date === iso);
  const selectedLabel = week.find((d) => d.iso === selectedDate);
  const heading = selectedDate === today() ? 'Partidos de hoy' : `Partidos del ${selectedLabel?.label} ${selectedLabel?.num}`;

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-charcoal-line bg-charcoal px-5 py-4">
        <div className="flex items-center gap-2">
          <img src="/brand/logo.png" alt="Salvá el Fútbol" className="h-8 w-8 rounded-full" />
          <span className="font-display text-[16px] font-extrabold text-white">Salvá el Fútbol</span>
        </div>
        <WeatherWidget />
      </header>

      <div className="relative overflow-hidden px-5 pb-7 pt-8 text-white">
        <PhotoHero />
        <div className="relative">
          <h1 className="mb-1 font-display text-[24px] font-extrabold">¿Qué necesitás hoy?</h1>
          <p className="mb-6 text-[13.5px] text-white/75">Conectamos partidos con jugadores en segundos.</p>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => router.push('/publicar')}
              className="press-fx glow-fx flex items-center gap-3 rounded-[18px] bg-brand px-5 py-4 text-left text-white"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                <Megaphone size={20} strokeWidth={2.2} />
              </span>
              <span>
                <span className="block font-display font-bold">Necesito jugadores</span>
                <span className="block text-xs opacity-90">Publicá tu partido en 30 segundos</span>
              </span>
            </button>
            <button
              onClick={() => router.push('/buscar')}
              className="press-fx lift-fx flex items-center gap-3 rounded-[18px] border border-white/25 bg-white/10 px-5 py-4 text-left backdrop-blur-sm"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                <Search size={20} strokeWidth={2.2} />
              </span>
              <span>
                <span className="block font-display font-bold">Quiero jugar</span>
                <span className="block text-xs text-white/75">Encontrá un partido cerca tuyo</span>
              </span>
            </button>
          </div>
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

      <div className="px-5 pt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-[15.5px] font-extrabold">{heading}</h2>
          <span className="text-xs text-inksoft">{matches.length} {matches.length === 1 ? 'partido' : 'partidos'}</span>
        </div>
        {matchesLoading ? (
          <>
            <MatchCardSkeleton />
            <MatchCardSkeleton />
          </>
        ) : matches.length === 0 ? (
          <div className="fade-slide-up rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-inksoft">
            Todavía no hay partidos publicados para este día.
            <br />
            ¡Sé el primero en publicar uno!
          </div>
        ) : (
          <div className="fade-slide-up">
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} isMine={!!session && m.organizer_id === session.user.id} />
            ))}
          </div>
        )}
      </div>

      <div className="h-16" />
      <HomeMessageCarousel />
    </div>
  );
}
