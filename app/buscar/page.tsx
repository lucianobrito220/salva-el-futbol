'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Match, Level, Gender } from '@/lib/types';
import MatchCard from '@/components/MatchCard';
import MatchCardSkeleton from '@/components/MatchCardSkeleton';
import SplashLoading from '@/components/SplashLoading';
import PhotoHero from '@/components/PhotoHero';
import { MapPin, Search, SlidersHorizontal, X, Loader2 } from 'lucide-react';

export default function BuscarPage() {
  const { session, loading } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  const [citySearch, setCitySearch] = useState('');
  const [locating, setLocating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [zone, setZone] = useState('');
  const [date, setDate] = useState('');
  const [level, setLevel] = useState<Level | ''>('');
  const [gender, setGender] = useState<Gender | ''>('');
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

  const zones = useMemo(() => [...new Set(matches.map((m) => m.zone))], [matches]);
  const dates = useMemo(() => [...new Set(matches.map((m) => m.match_date))], [matches]);

  const filtered = matches
    .filter(
      (m) =>
        (!citySearch || m.city.toLowerCase().includes(citySearch.toLowerCase())) &&
        (!zone || m.zone === zone) &&
        (!date || m.match_date === date) &&
        (!level || m.level === level) &&
        (!gender || m.gender === gender)
    )
    .sort((a, b) => {
      if (sort === 'urgent') {
        if (a.missing_players !== b.missing_players) return a.missing_players - b.missing_players;
      }
      const da = `${a.match_date}T${a.match_time}`;
      const db = `${b.match_date}T${b.match_time}`;
      return da.localeCompare(db);
    });

  const activeFilterCount = [zone, date, level, gender].filter(Boolean).length + (sort === 'urgent' ? 1 : 0);

  async function useMyLocation() {
    if (!('geolocation' in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const city = data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.county;
          if (city) setCitySearch(city);
        } catch {
          // Si falla, no pasa nada — el usuario puede escribir la ciudad a mano.
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { timeout: 6000 }
    );
  }

  function clearFilters() {
    setZone('');
    setDate('');
    setLevel('');
    setGender('');
    setSort('soon');
  }

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

      {/* Barra de búsqueda: ubicación + ciudad + filtros */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-white px-5 py-3">
        <button
          onClick={useMyLocation}
          disabled={locating}
          className="press-fx flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-ink"
          title="Usar mi ubicación"
        >
          {locating ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
        </button>
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-inksoft" />
          <input
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            placeholder="Buscar por ciudad, ej: Yerba Buena"
            className="w-full rounded-2xl bg-neutral-100 py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className="press-fx relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-ink"
        >
          <SlidersHorizontal size={18} />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
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

      {/* Hoja de filtros */}
      {showFilters && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/40" onClick={() => setShowFilters(false)}>
          <div
            className="w-full max-w-[440px] rounded-t-2xl bg-white p-6 pb-8 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Filtros</h3>
              <button onClick={() => setShowFilters(false)} className="press-fx text-inksoft">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold">Zona</label>
                <select className="filter-input" value={zone} onChange={(e) => setZone(e.target.value)}>
                  <option value="">Todas</option>
                  {zones.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold">Fecha</label>
                <select className="filter-input" value={date} onChange={(e) => setDate(e.target.value)}>
                  <option value="">Todas</option>
                  {dates.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold">Nivel</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Recreativo', 'Intermedio', 'Competitivo'] as Level[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLevel(level === l ? '' : l)}
                      className={`rounded-xl border px-1 py-2.5 text-xs font-bold ${
                        level === l ? 'border-brand bg-brand-pale text-brand-dark' : 'border-line bg-white text-inksoft'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold">Fútbol</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Masculino', 'Femenino', 'Mixto'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(gender === g ? '' : g)}
                      className={`rounded-xl border px-1 py-2.5 text-xs font-bold ${
                        gender === g ? 'border-brand bg-brand-pale text-brand-dark' : 'border-line bg-white text-inksoft'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold">Ordenar por</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSort('soon')}
                    className={`rounded-xl border px-1 py-2.5 text-xs font-bold ${
                      sort === 'soon' ? 'border-brand bg-brand-pale text-brand-dark' : 'border-line bg-white text-inksoft'
                    }`}
                  >
                    Más próximos
                  </button>
                  <button
                    onClick={() => setSort('urgent')}
                    className={`rounded-xl border px-1 py-2.5 text-xs font-bold ${
                      sort === 'urgent' ? 'border-brand bg-brand-pale text-brand-dark' : 'border-line bg-white text-inksoft'
                    }`}
                  >
                    Más urgentes
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button onClick={clearFilters} className="press-fx flex-1 rounded-xl border border-line py-3 text-sm font-bold text-inksoft">
                Limpiar
              </button>
              <button onClick={() => setShowFilters(false)} className="press-fx flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white">
                Ver {filtered.length} {filtered.length === 1 ? 'partido' : 'partidos'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .filter-input {
          width: 100%;
          border-radius: 12px;
          border: 1.5px solid #e7e9ec;
          padding: 11px 12px;
          font-size: 13.5px;
          background: white;
        }
      `}</style>
    </div>
  );
}
