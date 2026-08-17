'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import SplashLoading from '@/components/SplashLoading';
import Link from 'next/link';
import { Shield, Plus, Trophy, ChevronRight } from 'lucide-react';
import { Team } from '@/lib/types';

export default function EquiposPage() {
  const { session, loading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && session) {
      fetchTeams();
    }
  }, [loading, session]);

  async function fetchTeams() {
    if (!session) return;
    setFetching(true);
    
    // Fetch teams where user is a member or captain
    const { data: memberTeams, error } = await supabase
      .from('team_members')
      .select('teams(*)')
      .eq('user_id', session.user.id);

    if (!error && memberTeams) {
      const mappedTeams = memberTeams.map((t: any) => t.teams as Team);
      setTeams(mappedTeams);
    }
    setFetching(false);
  }

  if (loading || fetching) return <SplashLoading />;

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-5 text-center">
        <Shield size={48} className="mb-4 text-inksoft opacity-20" />
        <h2 className="mb-2 font-display text-xl font-bold">Iniciá sesión</h2>
        <p className="text-sm text-inksoft">Necesitás una cuenta para gestionar tus equipos.</p>
        <Link href="/auth?next=/equipos" className="mt-6 rounded-xl bg-brand px-6 py-3 font-bold text-white shadow-lg">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="sticky top-0 z-20 border-b border-line bg-white px-5 py-4">
        <h1 className="font-display text-2xl font-extrabold flex items-center gap-2 justify-center">
          <Shield size={28} className="text-brand" /> Mis Equipos
        </h1>
      </header>

      <div className="p-5">
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-brand to-green-600 p-5 text-white shadow-lg relative overflow-hidden">
          <Shield size={120} className="absolute -right-4 -top-4 opacity-10" />
          <h2 className="mb-1 font-display text-lg font-bold relative z-10">Creá tu club oficial</h2>
          <p className="mb-4 text-sm text-white/80 relative z-10 w-4/5">
            Llevá el historial de tu equipo, invitá a tus amigos y competí en torneos.
          </p>
          <Link
            href="/equipos/crear"
            className="inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2 text-sm font-bold text-brand shadow-sm press-fx relative z-10"
          >
            <Plus size={16} /> Crear Equipo
          </Link>
        </div>

        <h3 className="mb-3 font-bold text-ink">Equipos a los que pertenecés</h3>

        {teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-white/50 p-8 text-center">
            <Shield size={32} className="mb-3 text-inksoft opacity-50" />
            <p className="text-sm text-inksoft font-medium">Aún no formás parte de ningún equipo.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/equipos/${team.id}`}
                className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-sm press-fx"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-pale text-brand">
                    {team.logo_url ? (
                      <img src={team.logo_url} alt={team.name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <Shield size={24} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-ink">{team.name}</h4>
                    <p className="flex items-center gap-1 text-xs text-inksoft mt-0.5">
                      <Trophy size={12} className="text-yellow-500" /> {team.wins}V - {team.draws}E - {team.losses}D
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
