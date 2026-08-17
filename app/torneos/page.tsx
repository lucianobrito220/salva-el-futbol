'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Tournament } from '@/lib/types';
import EmptyState from '@/components/EmptyState';
import { ArrowLeft, Trophy, Plus, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import SplashLoading from '@/components/SplashLoading';

export default function TorneosPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });
      
      setTournaments((data as Tournament[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-20 flex items-center justify-center border-b border-line bg-white px-5 py-4 relative">
        <button onClick={() => router.back()} className="absolute left-5 press-fx text-ink hover:text-inksoft">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-display text-lg font-extrabold text-ink">Torneos Locales</h1>
        <button
          onClick={() => router.push('/torneos/crear')}
          className="press-fx flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white absolute right-5"
        >
          <Plus size={20} />
        </button>
      </header>

      <div className="flex-1 px-5 pt-6 pb-24">
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 p-5 text-white shadow-lg relative overflow-hidden">
          <Trophy size={100} className="absolute -right-4 -bottom-4 text-white opacity-10" />
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <Trophy size={24} className="text-yellow-300" />
            <h2 className="font-display text-lg font-bold">Ligas y Relámpagos</h2>
          </div>
          <p className="text-sm text-white/80 relative z-10">
            Compite, gana premios y sube en el ranking de tu ciudad. Encuentra el próximo torneo aquí.
          </p>
          <Link
            href="/torneos/crear"
            className="mt-4 inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2 text-sm font-bold text-purple-600 shadow-sm press-fx relative z-10"
          >
            <Plus size={16} /> Crear Torneo
          </Link>
        </div>

        {loading ? (
          <SplashLoading />
        ) : tournaments.length === 0 ? (
          <EmptyState 
            icon="whistle" 
            title="Aún no hay torneos activos" 
            subtitle="¡Creá el tuyo ahora mismo!" 
          />
        ) : (
          <div className="flex flex-col gap-3 fade-slide-up">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/torneos/${t.id}`}
                className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-sm press-fx"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink">{t.name}</h4>
                    <p className="text-xs font-bold text-inksoft mt-0.5 uppercase">
                      Estado: <span className={t.status === 'abierto' ? 'text-green-600' : 'text-amber-600'}>{t.status}</span>
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-inksoft opacity-50" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
