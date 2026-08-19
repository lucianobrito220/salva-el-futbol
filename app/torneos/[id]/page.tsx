'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import SplashLoading from '@/components/SplashLoading';
import { ArrowLeft, Trophy, Users, Shield, Plus, Share2, Crown, Activity, Settings, Play } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Tournament, TournamentTeam, Match } from '@/lib/types';
import Link from 'next/link';
import Avatar from '@/components/Avatar';

export default function TorneoDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { session, loading } = useAuth();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [fetching, setFetching] = useState(true);

  const [showAddTeam, setShowAddTeam] = useState(false);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && session && params.id) {
      fetchTournament();
    }
  }, [loading, session, params.id]);

  async function fetchTournament() {
    setFetching(true);
    // 1. Torneo
    const { data: tData } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', params.id)
      .single();

    if (tData) {
      setTournament(tData as Tournament);
      
      // 2. Equipos
      const { data: teamsData } = await supabase
        .from('tournament_teams')
        .select('*, team:teams(*)')
        .eq('tournament_id', params.id)
        .order('points', { ascending: false });
        
      if (teamsData) {
        setTeams(teamsData as TournamentTeam[]);
      }

      // 3. Fixture
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', params.id)
        .order('round', { ascending: true });
        
      if (matchesData) {
        setMatches(matchesData as Match[]);
      }
    }
    setFetching(false);
  }

  async function loadAllTeams() {
    setShowAddTeam(true);
    const { data } = await supabase.from('teams').select('*').limit(50);
    if (data) setAllTeams(data);
  }

  async function addTeamToTournament(teamId: string) {
    setAdding(true);
    await supabase.from('tournament_teams').insert({
      tournament_id: params.id,
      team_id: teamId,
      points: 0,
      goals_for: 0,
      goals_against: 0
    });
    setAdding(false);
    setShowAddTeam(false);
    fetchTournament();
  }

  async function generateFixture() {
    if (teams.length < 2) {
      showToast.error("Se necesitan al menos 2 equipos para iniciar el torneo.");
      return;
    }
    setAdding(true);

    // Shuffle teams for random pairing
    const shuffled = [...teams].sort(() => 0.5 - Math.random());
    const matchesToInsert = [];

    // Pair them up
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      const t1 = shuffled[i].team;
      const t2 = shuffled[i + 1].team;

      if (t1 && t2) {
        matchesToInsert.push({
          tournament_id: params.id,
          organizer_id: session?.user.id,
          city: 'Local',
          zone: 'Torneo',
          court: tournament?.name,
          match_date: new Date().toISOString().slice(0,10),
          match_time: '20:00:00',
          missing_players: 0,
          match_type: 'equipo_rival',
          gender: 'Masculino',
          level: 'Competitivo',
          price: 0,
          status: 'open',
          description: `TORNEO: ${t1.name} vs ${t2.name}`
        });
      }
    }

    if (matchesToInsert.length > 0) {
      await supabase.from('matches').insert(matchesToInsert);
    }
    
    // Update tournament status
    await supabase.from('tournaments').update({ status: 'en_curso' }).eq('id', params.id);
    
    fetchTournament();
    setAdding(false);
  }

  async function saveTournamentSettings() {
    if (!editName.trim()) return;
    setSaving(true);
    await supabase.from('tournaments').update({ name: editName.trim() }).eq('id', params.id);
    setSaving(false);
    setShowSettings(false);
    fetchTournament();
  }

  async function deleteTournament() {
    if (!confirm('¿Estás seguro de que querés eliminar este torneo? Esta acción no se puede deshacer.')) return;
    await supabase.from('tournament_teams').delete().eq('tournament_id', params.id);
    await supabase.from('tournaments').delete().eq('id', params.id);
    router.push('/torneos');
  }

  if (loading || fetching) return <SplashLoading />;

  if (!tournament) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-5 text-center">
        <Trophy size={48} className="mb-4 text-inksoft opacity-20" />
        <h2 className="mb-2 font-display text-xl font-bold">Torneo no encontrado</h2>
        <button onClick={() => router.push('/torneos')} className="mt-6 font-bold text-purple-600">
          Volver a torneos
        </button>
      </div>
    );
  }

  const isOrganizer = session && tournament.organizer_id === session.user.id;

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* ADD TEAM MODAL */}
      {showAddTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm modal-backdrop-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-neutral-900 dark:border dark:border-neutral-800 p-6 shadow-2xl modal-enter max-h-[80vh] overflow-y-auto">
            <h3 className="mb-4 text-center font-display text-lg font-bold dark:text-white">Inscribir Equipo</h3>
            <div className="flex flex-col gap-2">
              {allTeams.length === 0 ? (
                <p className="text-center text-sm text-inksoft py-4">No hay equipos disponibles en el sistema.</p>
              ) : (
                allTeams.map((t, index) => {
                  const isAdded = teams.some(tt => tt.team_id === t.id);
                  return (
                    <div key={t.id} className={`flex items-center justify-between border-b border-line dark:border-neutral-800 py-3 slide-up-sm stagger-${Math.min(index + 1, 8)}`}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-pale dark:bg-brand/10 text-brand flex-shrink-0 overflow-hidden">
                          {t.logo_url ? <img src={t.logo_url} className="w-full h-full object-cover" /> : <Shield size={16} />}
                        </div>
                        <span className="font-bold text-sm truncate w-32 dark:text-white">{t.name}</span>
                      </div>
                      <button
                        disabled={isAdded || adding}
                        onClick={() => addTeamToTournament(t.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${isAdded ? 'bg-neutral-100 dark:bg-neutral-800 text-inksoft' : 'bg-brand text-white shadow-glow-brand press-fx'}`}
                      >
                        {isAdded ? 'Inscrito' : 'Agregar'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <button onClick={() => setShowAddTeam(false)} className="mt-6 w-full py-3 text-sm font-bold text-inksoft dark:text-neutral-400 hover:text-ink dark:hover:text-white transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl scale-in">
            <h3 className="mb-4 text-center font-display text-lg font-bold">Configuración del Torneo</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-ink">Nombre del torneo</label>
                <input
                  className="w-full rounded-xl border-[1.5px] border-line px-4 py-3 text-sm font-medium"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <button
                onClick={saveTournamentSettings}
                disabled={saving}
                className="press-fx w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-md disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <div className="my-3 h-px w-full bg-line" />
              <button
                onClick={deleteTournament}
                className="press-fx w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-600"
              >
                Eliminar torneo
              </button>
            </div>
            <button onClick={() => setShowSettings(false)} className="mt-4 w-full py-3 text-sm font-bold text-inksoft">
              Cerrar
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line dark:border-neutral-800 bg-white dark:bg-neutral-900 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="press-fx text-ink dark:text-white">
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-display text-lg font-extrabold text-ink dark:text-white truncate w-48">{tournament.name}</h1>
        </div>
        {isOrganizer && (
          <button onClick={() => { setEditName(tournament.name); setShowSettings(true); }} className="text-inksoft dark:text-neutral-400 hover:text-ink dark:hover:text-white press-fx">
            <Settings size={20} />
          </button>
        )}
      </header>

      <div className="px-5 pt-6 dark:bg-neutral-950 min-h-screen">
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-purple-50 to-white dark:from-neutral-900 dark:to-neutral-900 p-5 shadow-card border border-line dark:border-neutral-800 text-center relative overflow-hidden">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mb-3 shadow-inner">
            <Trophy size={32} />
          </div>
          <h2 className="font-display text-xl font-black dark:text-white">{tournament.name}</h2>
          <div className="mt-2 inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-xs font-bold uppercase tracking-wide text-inksoft dark:text-neutral-400 shadow-sm">
            {tournament.status}
          </div>
        </div>

        {isOrganizer && tournament.status === 'abierto' && (
          <div className="mb-6 flex flex-col gap-2">
            <button
              onClick={loadAllTeams}
              className="press-fx flex items-center justify-center gap-2 rounded-xl border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 py-3 text-sm font-bold text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors"
            >
              <Shield size={18} /> Inscribir Equipo
            </button>
            <button
              onClick={generateFixture}
              disabled={adding}
              className="press-fx flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-glow-brand disabled:opacity-50"
            >
              <Play size={18} /> Iniciar Torneo (Sortear Fixture)
            </button>
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-line dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-card overflow-hidden">
          <div className="bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3 font-bold text-sm text-ink dark:text-white border-b border-line dark:border-neutral-800 flex justify-between">
            <span>Posiciones</span>
            <span className="text-xs text-inksoft dark:text-neutral-400 font-medium">PTS | GF | GC</span>
          </div>
          
          {teams.length === 0 ? (
            <div className="p-6 text-center text-sm text-inksoft dark:text-neutral-400">
              No hay equipos inscriptos aún.
            </div>
          ) : (
            <div>
              {teams.map((t, i) => (
                <div key={t.team_id} className={`flex items-center justify-between px-4 py-3 ${i % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-neutral-50 dark:bg-charcoal'} ${i !== teams.length - 1 ? 'border-b border-line dark:border-neutral-800' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-4 text-center font-bold text-xs ${i === 0 ? 'text-yellow-500 drop-shadow-sm' : 'text-inksoft dark:text-neutral-400'}`}>{i + 1}</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-pale dark:bg-brand/10 text-brand flex-shrink-0 overflow-hidden shadow-sm">
                      {t.team?.logo_url ? <img src={t.team.logo_url} className="w-full h-full object-cover" /> : <Shield size={16} />}
                    </div>
                    <span className="font-bold text-sm truncate max-w-[120px] dark:text-white">{t.team?.name}</span>
                  </div>
                  <div className="flex gap-4 text-xs font-bold font-mono">
                    <span className="text-purple-600 dark:text-purple-400 w-4 text-center">{t.points}</span>
                    <span className="text-inksoft dark:text-neutral-400 w-4 text-center">{t.goals_for}</span>
                    <span className="text-inksoft dark:text-neutral-400 w-4 text-center">{t.goals_against}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-card overflow-hidden">
          <div className="bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3 font-bold text-sm text-ink dark:text-white border-b border-line dark:border-neutral-800">
            Fixture (Cruces)
          </div>
          
          {matches.length === 0 ? (
            <div className="p-6 text-center text-sm text-inksoft dark:text-neutral-400">
              El fixture aún no ha sido generado.
            </div>
          ) : (
            <div className="flex flex-col p-2 gap-2">
              {matches.map((m, i) => (
                <div key={m.id} className="flex flex-col gap-2 p-4 rounded-xl border border-line dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900 slide-up-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-inksoft dark:text-neutral-400">{m.match_date}</span>
                    <span className="text-xs font-bold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5">Torneo</span>
                  </div>
                  <div className="text-sm font-bold text-ink dark:text-white">{m.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
