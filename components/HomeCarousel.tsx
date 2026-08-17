'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Match } from '@/lib/types';
import { AlertCircle, TrendingUp, MapPin, Trophy } from 'lucide-react';
import CountUp from '@/components/CountUp';

interface ZoneCount {
  zone: string;
  count: number;
}
interface TopOrganizer {
  id: string;
  name: string;
  avatar_url: string | null;
  count: number;
}

export default function HomeCarousel() {
  const [urgent, setUrgent] = useState<Match[]>([]);
  const [stats, setStats] = useState<{ completed: number; players: number; today: number } | null>(null);
  const [zones, setZones] = useState<ZoneCount[]>([]);
  const [topOrganizers, setTopOrganizers] = useState<TopOrganizer[]>([]);

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    supabase
      .from('matches')
      .select('*')
      .eq('status', 'open')
      .lte('missing_players', 1)
      .gte('match_date', todayStr)
      .order('match_date', { ascending: true })
      .limit(4)
      .then(({ data }) => setUrgent((data as Match[]) || []));

    (async () => {
      const [{ count: completed }, { count: players }, { count: today }] = await Promise.all([
        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'complete'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('match_date', todayStr).eq('status', 'open'),
      ]);
      setStats({ completed: completed || 0, players: players || 0, today: today || 0 });
    })();

    supabase
      .from('matches')
      .select('zone')
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        (data || []).forEach((m: any) => {
          counts[m.zone] = (counts[m.zone] || 0) + 1;
        });
        const arr = Object.entries(counts)
          .map(([zone, count]) => ({ zone, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);
        setZones(arr);
      });

    (async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase.from('matches').select('organizer_id').gte('created_at', since);
      const counts: Record<string, number> = {};
      (data || []).forEach((m: any) => {
        counts[m.organizer_id] = (counts[m.organizer_id] || 0) + 1;
      });
      const topIds = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id);
      if (topIds.length === 0) return;
      const { data: profs } = await supabase.from('profiles').select('id,name,avatar_url').in('id', topIds);
      const merged = topIds.map((id) => {
        const p = (profs || []).find((x: any) => x.id === id);
        return { id, name: p?.name || 'Jugador', avatar_url: p?.avatar_url || null, count: counts[id] };
      });
      setTopOrganizers(merged);
    })();
  }, []);

  const cards: string[] = [];
  if (urgent.length > 0) cards.push('urgent');
  if (stats && (stats.completed > 0 || stats.players > 0)) cards.push('stats');
  if (zones.length > 0) cards.push('zones');
  if (topOrganizers.length > 0) cards.push('ranking');

  if (cards.length === 0) return null;

  return (
    <div className="pt-2">
      <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
        {cards.includes('urgent') && (
          <div className="snap-start flex w-[82%] flex-shrink-0 flex-col rounded-2xl bg-gradient-to-br from-red-500 to-red-600 p-4 text-white">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide opacity-90">
              <AlertCircle size={14} /> Últimos lugares
            </div>
            {urgent.slice(0, 2).map((m) => (
              <Link key={m.id} href={`/partido/${m.id}`} className="press-fx mb-1 block text-[13px] font-semibold leading-snug">
                {m.zone} · {m.match_time.slice(0, 5)} — falta {m.missing_players === 0 ? '¡completo!' : `${m.missing_players} jugador${m.missing_players > 1 ? 'es' : ''}`}
              </Link>
            ))}
          </div>
        )}

        {cards.includes('stats') && stats && (
          <div className="snap-start flex w-[82%] flex-shrink-0 flex-col justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-4 text-white">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide opacity-90">
              <TrendingUp size={14} /> En números
            </div>
            <div className="flex justify-between text-center">
              <Stat value={stats.completed} label="jugados" />
              <Stat value={stats.players} label="jugadores" />
              <Stat value={stats.today} label="hoy" />
            </div>
          </div>
        )}

        {cards.includes('zones') && (
          <div className="snap-start flex w-[82%] flex-shrink-0 flex-col rounded-2xl border border-line bg-white p-4">
            <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-inksoft">
              <MapPin size={14} /> Zonas populares
            </div>
            <div className="flex flex-wrap gap-1.5">
              {zones.map((z) => (
                <Link key={z.zone} href="/buscar" className="press-fx rounded-full bg-brand-pale px-2.5 py-1 text-xs font-semibold text-brand-dark">
                  {z.zone}
                </Link>
              ))}
            </div>
          </div>
        )}

        {cards.includes('ranking') && (
          <div className="snap-start flex w-[82%] flex-shrink-0 flex-col rounded-2xl border border-line bg-white p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-inksoft">
              <Trophy size={14} /> Top organizadores · 7 días
            </div>
            {topOrganizers.map((o, i) => (
              <div key={o.id} className="flex items-center gap-2 py-1">
                <span className="w-3.5 text-xs font-bold text-inksoft">{i + 1}</span>
                {o.avatar_url ? (
                  <img src={o.avatar_url} alt={o.name} className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-pale text-[10px] font-bold text-brand-dark">
                    {o.name.charAt(0)}
                  </div>
                )}
                <span className="flex-1 truncate text-[13px] font-medium">{o.name}</span>
                <span className="text-[11px] text-inksoft">{o.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <b className="block font-display text-xl"><CountUp value={value} /></b>
      <span className="text-[10px] opacity-80">{label}</span>
    </div>
  );
}
