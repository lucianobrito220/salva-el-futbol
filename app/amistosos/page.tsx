'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Match } from '@/lib/types';
import MatchCard from '@/components/MatchCard';
import MatchCardSkeleton from '@/components/MatchCardSkeleton';
import EmptyState from '@/components/EmptyState';
import { ArrowLeft, Plus } from 'lucide-react';

export default function AmistososPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'open')
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true });
        
      const now = new Date();
      const validMatches = ((data as Match[]) || []).filter(
        (m) => new Date(`${m.match_date}T${m.match_time}`) >= now
      );
      
      setMatches(validMatches);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="press-fx text-ink">
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-display text-lg font-extrabold">Partidos Amistosos</h1>
        </div>
        <button
          onClick={() => router.push('/publicar')}
          className="press-fx flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white"
        >
          <Plus size={20} />
        </button>
      </header>

      <div className="flex-1 px-5 pt-6 pb-24">
        <p className="mb-4 text-sm text-inksoft">Encuentra o publica partidos informales para jugar hoy o en la semana.</p>
        
        {loading ? (
          <>
            <MatchCardSkeleton />
            <MatchCardSkeleton />
          </>
        ) : matches.length === 0 ? (
          <EmptyState icon="ball" title="No hay amistosos disponibles" subtitle="¡Sé el primero en crear uno!" />
        ) : (
          <div className="fade-slide-up">
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
