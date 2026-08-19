'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Match, Level, Gender } from '@/lib/types';
import MatchCard from '@/components/MatchCard';
import MatchCardSkeleton from '@/components/MatchCardSkeleton';
import SplashLoading from '@/components/SplashLoading';
import PhotoHero from '@/components/PhotoHero';
import EmptyState from '@/components/EmptyState';
import BottomNav from '@/components/BottomNav';
import { MapPin, Search, SlidersHorizontal, X, Loader2, Users, Trophy } from 'lucide-react';
import useSWRInfinite from 'swr/infinite';
import Link from 'next/link';
import { getLocalISODate } from '@/lib/dateUtils';

const PAGE_SIZE = 15;

export default function BuscarPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  
  const [citySearch, setCitySearch] = useState('');
  const [locating, setLocating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [zone, setZone] = useState('');
  const [date, setDate] = useState('');
  const [level, setLevel] = useState<Level | ''>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [sort, setSort] = useState<'soon' | 'urgent'>('soon');
  
  // Filtros rápidos
  const [distanceFilter, setDistanceFilter] = useState('');
  const [courtFormat, setCourtFormat] = useState('');
  const [positionNeeded, setPositionNeeded] = useState('');

  // Debounced states to prevent spamming the DB
  const [debouncedCity, setDebouncedCity] = useState(citySearch);
  const [debouncedZone, setDebouncedZone] = useState(zone);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCity(citySearch), 500);
    return () => clearTimeout(t);
  }, [citySearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedZone(zone), 500);
    return () => clearTimeout(t);
  }, [zone]);

  const getKey = (pageIndex: number, previousPageData: Match[] | null) => {
    if (previousPageData && !previousPageData.length) return null; // reached the end
    return ['buscar_matches', debouncedCity, debouncedZone, date, level, gender, courtFormat, sort, pageIndex];
  };

  const fetcher = async ([_, city, zn, dt, lvl, gen, format, srt, page]: any) => {
    let query = supabase.from('matches').select('*').eq('status', 'open');

    // Server-side filtering
    if (city) query = query.ilike('city', `%${city}%`);
    if (zn) query = query.ilike('zone', `%${zn}%`);
    if (dt) query = query.eq('match_date', dt);
    else query = query.gte('match_date', getLocalISODate()); // Solo hoy en adelante
    
    if (lvl) query = query.eq('level', lvl);
    if (gen) query = query.eq('gender', gen);
    if (format) query = query.eq('team_format', format);

    if (srt === 'urgent') {
      query = query.order('missing_players', { ascending: false });
    } else {
      query = query.order('match_date', { ascending: true }).order('match_time', { ascending: true });
    }

    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, error } = await query;
    if (error) throw error;
    
    return data as Match[];
  };

  const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite<Match[]>(getKey, fetcher);

  const matches = data ? data.flat() : [];
  const isLoadingInitialData = !data && !error;
  const isLoadingMore = isLoadingInitialData || (size > 0 && data && typeof data[size - 1] === "undefined");
  const isEmpty = data?.[0]?.length === 0;
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.length < PAGE_SIZE);

  useEffect(() => {
    const channel = supabase
      .channel('search-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        mutate();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [mutate]);

  const activeFilterCount = [zone, date, level, gender].filter(Boolean).length + (sort === 'urgent' ? 1 : 0);

  async function useMyLocation() {
    if (!('geolocation' in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const resData = await res.json();
          const c = resData?.address?.city || resData?.address?.town || resData?.address?.village || resData?.address?.county;
          if (c) setCitySearch(c);
        } catch {} finally {
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
    setDistanceFilter('');
    setCourtFormat('');
    setPositionNeeded('');
  }

  if (loading) return <SplashLoading />;

  return (
    <div>
      <div className="relative overflow-hidden px-5 pb-5 pt-6 text-white">
        <PhotoHero />
        <div className="relative z-10 px-5 pt-8 text-center">
          <h1 className="mb-1 font-display text-lg font-extrabold shadow-black drop-shadow-md">Buscar partidos</h1>
          <p className="mb-4 text-sm text-white/90 shadow-black drop-shadow-md">Sumate a jugar con otros equipos.</p>
        </div>
        <div className="relative z-10 mt-4 flex gap-3 px-2">
          <Link href="/equipos" className="press-fx flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/20 py-2.5 text-sm font-bold backdrop-blur-md border border-white/30">
            <Users size={16} /> Equipos
          </Link>
          <Link href="/torneos" className="press-fx flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/20 py-2.5 text-sm font-bold backdrop-blur-md border border-white/30">
            <Trophy size={16} /> Torneos
          </Link>
        </div>
      </div>

      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-white/85 px-5 py-3 backdrop-blur-md">
        <button
          onClick={useMyLocation}
          disabled={locating}
          className="press-fx flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-ink"
          title="Usar mi ubicación"
          aria-label="Usar mi ubicación"
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
          aria-label="Abrir filtros"
        >
          <SlidersHorizontal size={18} />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filtros rápidos horizontales */}
      <div className="flex gap-2 overflow-x-auto border-b border-line bg-white px-5 py-3 snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style dangerouslySetInnerHTML={{__html: `::-webkit-scrollbar { display: none; }`}} />
        
        {/* Distancia */}
        <button
          onClick={() => setDistanceFilter(distanceFilter === '< 5km' ? '' : '< 5km')}
          className={`press-fx flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold snap-start transition-colors ${
            distanceFilter === '< 5km' ? 'border-brand bg-brand-pale text-brand-dark' : 'border-line bg-neutral-50 text-inksoft hover:bg-neutral-100'
          }`}
        >
          📍 {'< 5km'}
        </button>
        <button
          onClick={() => setDistanceFilter(distanceFilter === '< 10km' ? '' : '< 10km')}
          className={`press-fx flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold snap-start transition-colors ${
            distanceFilter === '< 10km' ? 'border-brand bg-brand-pale text-brand-dark' : 'border-line bg-neutral-50 text-inksoft hover:bg-neutral-100'
          }`}
        >
          📍 {'< 10km'}
        </button>

        {/* Cancha */}
        {['F5', 'F7', 'F11'].map((format) => (
          <button
            key={format}
            onClick={() => setCourtFormat(courtFormat === format ? '' : format)}
            className={`press-fx flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold snap-start transition-colors ${
              courtFormat === format ? 'border-brand bg-brand-pale text-brand-dark' : 'border-line bg-neutral-50 text-inksoft hover:bg-neutral-100'
            }`}
          >
            🏟️ {format}
          </button>
        ))}
      </div>

      <div className="px-5 pt-5 pb-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-[15.5px] font-extrabold">Partidos disponibles</h2>
          {!isLoadingInitialData && (
            <span className="text-xs text-inksoft">
              {isEmpty ? '0 partidos' : `${matches.length}${!isReachingEnd ? '+' : ''} partidos`}
            </span>
          )}
        </div>
        {isLoadingInitialData ? (
          <>
            <MatchCardSkeleton />
            <MatchCardSkeleton />
            <MatchCardSkeleton />
          </>
        ) : isEmpty ? (
          <EmptyState icon="whistle" title="No encontramos partidos con esos filtros" subtitle="Probá ampliar la búsqueda o cambiar la ciudad." />
        ) : (
          <div>
            {matches.map((m, i) => (
              <div key={`${m.id}-${i}`} className="fade-slide-up" style={{ animationDelay: `${Math.min((i % PAGE_SIZE) * 0.05, 0.3)}s` }}>
                <MatchCard match={m} isMine={!!session && m.organizer_id === session.user.id} />
              </div>
            ))}
            
            {!isReachingEnd && (
              <button
                onClick={() => setSize(size + 1)}
                disabled={isLoadingMore}
                className="mt-4 w-full press-fx rounded-xl border border-line bg-neutral-50 py-3 text-sm font-bold text-inksoft hover:bg-neutral-100 disabled:opacity-50"
              >
                {isLoadingMore ? <Loader2 size={18} className="mx-auto animate-spin" /> : 'Cargar más partidos'}
              </button>
            )}
          </div>
        )}
      </div>

      <BottomNav />

      {showFilters && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/40 backdrop-blur-sm" onClick={() => setShowFilters(false)}>
          <div
            className="w-full max-w-[440px] rounded-t-2xl bg-white p-6 pb-8 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Filtros</h3>
              <button onClick={() => setShowFilters(false)} className="press-fx text-inksoft" aria-label="Cerrar filtros">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold">Zona</label>
                <input 
                  type="text" 
                  className="filter-input" 
                  value={zone} 
                  onChange={(e) => setZone(e.target.value)} 
                  placeholder="Ej: Barrio Sur" 
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold">Fecha</label>
                <input 
                  type="date" 
                  className="filter-input" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                />
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
                Aplicar filtros
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
