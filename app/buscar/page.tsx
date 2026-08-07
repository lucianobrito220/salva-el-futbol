'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Match, Level } from '@/lib/types';
import MatchCard from '@/components/MatchCard';
import MatchCardSkeleton from '@/components/MatchCardSkeleton';
import SplashLoading from '@/components/SplashLoading';
import PhotoHero from '@/components/PhotoHero';

export default function BuscarPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [city, setCity] = useState('');
  const [zone, setZone] = useState('');
  const [date, setDate] = useState('');
  const [level, setLevel] = useState<Level | ''>('');
  const [sort, setSort] = useState<'soon' | 'urgent'>('soon');

  useEffect(() => {
    // Buscar es público: no hace falta estar logueado para ver los partidos.
    async function load() {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'open')
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true });
      setMatches((data as Match[]) || []);
      setMatchesLoading(false);
    }
    load();

    const channel = supabase
      .channel('search-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const cities = useMemo(() => [...new Set(matches.map((m) => m.city))], [matches]);
  const zones = useMemo(() => [...new Set(matches.map((m) => m.zone))], [matches]);
  const dates = useMemo(() => [...new Set(matches.map((m) => m.match_date))], [matches]);

  const filtered = matches
    .filter(
      (m) =>
        (!city || m.city === city) &&
        (!zone || m.zone === zone) &&
        (!date || m.match_date === date) &&
        (!level || m.level === level)
    )
    .sort((a, b) => {
      if (sort === 'urgent') {
        if (a.missing_players !== b.missing_players) return a.missing_players - b.missing_players;
      }
      const da = `${a.match_date}T${a.match_time}`;
      const db = `${b.match_date}T${b.match_time}`;
      return da.localeCompare(db);
    });

  if (loading) return <SplashLoading />;

  return (
    <div>
      <div className="relative overflow-hidden px-5 pb-5 pt-6 text-white">
        <PhotoHero />
        <div className="relative">
          <h1 className="mb-1 font-display text-lg font-extrabold">Buscar partidos</h1>
          <p className="text-xs text-white/75">Encontrá un lugar cerca tuyo, hoy mismo.</p>
        </div>
      </div>
      <div className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-line bg-white px-5 py-3.5">
        <select className="filter-select" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Ciudad</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={zone} onChange={(e) => setZone(e.target.value)}>
          <option value="">Zona</option>
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <select className="filter-select" value={date} onChange={(e) => setDate(e.target.value)}>
          <option value="">Fecha</option>
          {dates.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="filter-select" value={level} onChange={(e) => setLevel(e.target.value as Level | '')}>
          <option value="">Nivel</option>
          <option value="Recreativo">Recreativo</option>
          <option value="Intermedio">Intermedio</option>
          <option value="Competitivo">Competitivo</option>
        </select>
        <select className="filter-select" value={sort} onChange={(e) => setSort(e.target.value as 'soon' | 'urgent')}>
          <option value="soon">Más próximos</option>
          <option value="urgent">Más urgentes</option>
        </select>
      </div>

      <div className="px-5 pt-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-[15.5px] font-extrabold">Partidos disponibles</h2>
          <span className="text-xs text-inksoft">{filtered.length} {filtered.length === 1 ? 'partido' : 'partidos'}</span>
        </div>
        {matchesLoading ? (
          <>
            <MatchCardSkeleton />
            <MatchCardSkeleton />
            <MatchCardSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <div className="fade-slide-up rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-inksoft">
            No encontramos partidos con esos filtros.
          </div>
        ) : (
          <div className="fade-slide-up">
            {filtered.map((m) => (
              <MatchCard key={m.id} match={m} isMine={!!session && m.organizer_id === session.user.id} />
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        .filter-select {
          flex-shrink: 0;
          border: 1.5px solid #e7e9ec;
          border-radius: 100px;
          padding: 8px 12px;
          font-size: 12.5px;
          background: white;
        }
      `}</style>
    </div>
  );
}
