'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import SplashLoading from '@/components/SplashLoading';
import Link from 'next/link';
import { ArrowLeft, Shield, Users, Trophy, Settings, Share2 } from 'lucide-react';
import { Team, TeamMember } from '@/lib/types';

export default function TeamProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { session, loading } = useAuth();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editCover, setEditCover] = useState('');
  const [editWins, setEditWins] = useState(0);
  const [editDraws, setEditDraws] = useState(0);
  const [editLosses, setEditLosses] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [fetching, setFetching] = useState(true);
  const [joining, setJoining] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && session && params.id) {
      fetchTeam();
    }
  }, [loading, session, params.id]);

  async function fetchTeam() {
    setFetching(true);
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', params.id)
      .single();

    if (teamData) {
      setTeam(teamData as Team);
      
      const { data: membersData } = await supabase
        .from('team_members')
        .select('*, profile:profiles(*)')
        .eq('team_id', params.id);
        
      if (membersData) {
        setMembers(membersData as TeamMember[]);
      }
    }
    setFetching(false);
  }

  async function handleJoin() {
    if (!session || !team) return;
    setJoining(true);
    const { error } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: session.user.id
      });
      
    if (!error) {
      await fetchTeam();
    }
    setJoining(false);
  }

  async function handleSaveSettings() {
    if (!team) return;
    if (!editName.trim()) {
      alert("El nombre del equipo no puede estar vacío.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('teams')
      .update({
        name: editName.trim(),
        logo_url: editLogo.trim() || null,
        cover_url: editCover.trim() || null,
        wins: editWins,
        draws: editDraws,
        losses: editLosses
      })
      .eq('id', team.id);

    if (!error) {
      await fetchTeam();
      setShowSettings(false);
    } else {
      alert("Error al actualizar: " + error.message);
    }
    setSaving(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') {
    const file = e.target.files?.[0];
    if (!file || !session || !team) return;
    if (!file.type.startsWith('image/')) return;

    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingCover;
    const setUrl = type === 'logo' ? setEditLogo : setEditCover;
    
    setUploading(true);
    const path = `${session.user.id}/team_${team.id}_${type}_${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setUrl(data.publicUrl);
    } else {
      alert("Error al subir imagen");
    }
    setUploading(false);
  }

  if (loading || fetching) return <SplashLoading />;

  if (!team) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-5 text-center">
        <Shield size={48} className="mb-4 text-inksoft opacity-20" />
        <h2 className="mb-2 font-display text-xl font-bold">Equipo no encontrado</h2>
        <button onClick={() => router.push('/equipos')} className="mt-6 font-bold text-brand">
          Volver a mis equipos
        </button>
      </div>
    );
  }

  const isMember = session && members.some(m => m.user_id === session.user.id);
  const isCaptain = session && team.captain_id === session.user.id;

  return (
      <div className="min-h-screen bg-bg pb-24">
      <div className="relative h-48 w-full bg-brand overflow-hidden">
        {team.cover_url && (
          <img src={team.cover_url} alt="Cover" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <button onClick={() => router.back()} className="rounded-full bg-black/30 p-2 text-white backdrop-blur-md">
            <ArrowLeft size={20} />
          </button>
          <div className="flex gap-2">
            <button onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: team.name,
                  text: `¡Sumate a ${team.name} en Salva el Fútbol!`,
                  url: window.location.href,
                }).catch(console.error);
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Enlace copiado al portapapeles');
              }
            }} className="rounded-full bg-black/30 p-2 text-white backdrop-blur-md press-fx">
              <Share2 size={20} />
            </button>
            {isCaptain && (
              <button onClick={() => {
                setEditName(team.name);
                setEditLogo(team.logo_url || '');
                setEditCover(team.cover_url || '');
                setEditWins(team.wins || 0);
                setEditDraws(team.draws || 0);
                setEditLosses(team.losses || 0);
                setShowSettings(true);
              }} className="rounded-full bg-black/30 p-2 text-white backdrop-blur-md press-fx">
                <Settings size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-5 backdrop-blur-sm fade-in">
          <div className="my-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl scale-in">
            <h3 className="mb-4 text-center font-display text-lg font-bold text-ink">Configuración del Equipo</h3>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-ink">Nombre del equipo</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-line px-3 py-2 text-sm focus:border-brand outline-none"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-bold text-inksoft uppercase">Victorias</label>
                  <input type="number" value={editWins} onChange={e => setEditWins(Number(e.target.value))} className="w-full rounded-xl border border-line px-3 py-2 text-sm text-center focus:border-brand outline-none font-bold" />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-bold text-inksoft uppercase">Empates</label>
                  <input type="number" value={editDraws} onChange={e => setEditDraws(Number(e.target.value))} className="w-full rounded-xl border border-line px-3 py-2 text-sm text-center focus:border-brand outline-none font-bold" />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-bold text-inksoft uppercase">Derrotas</label>
                  <input type="number" value={editLosses} onChange={e => setEditLosses(Number(e.target.value))} className="w-full rounded-xl border border-line px-3 py-2 text-sm text-center focus:border-brand outline-none font-bold" />
                </div>
              </div>

              <div className="rounded-xl border border-line p-3 bg-neutral-50 flex flex-col gap-2 items-center text-center">
                <label className="block text-xs font-bold text-ink">Escudo</label>
                {editLogo && <img src={editLogo} alt="Logo" className="w-16 h-16 rounded-full object-cover shadow" />}
                <button 
                  onClick={() => logoInputRef.current?.click()} 
                  disabled={uploadingLogo}
                  className="rounded-lg bg-white border border-line px-4 py-2 text-xs font-bold shadow-sm"
                >
                  {uploadingLogo ? 'Subiendo...' : 'Seleccionar desde Galería'}
                </button>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'logo')} />
              </div>

              <div className="rounded-xl border border-line p-3 bg-neutral-50 flex flex-col gap-2 items-center text-center">
                <label className="block text-xs font-bold text-ink">Foto de Portada</label>
                {editCover && <img src={editCover} alt="Cover" className="h-16 w-full rounded-lg object-cover shadow" />}
                <button 
                  onClick={() => coverInputRef.current?.click()} 
                  disabled={uploadingCover}
                  className="rounded-lg bg-white border border-line px-4 py-2 text-xs font-bold shadow-sm"
                >
                  {uploadingCover ? 'Subiendo...' : 'Seleccionar desde Galería'}
                </button>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'cover')} />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => setShowSettings(false)}
                className="flex-1 rounded-xl bg-neutral-100 py-3 text-sm font-bold text-inksoft"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 relative z-10 -mt-12 mb-6 flex flex-col items-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-bg bg-white shadow-md overflow-hidden">
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} className="h-full w-full object-cover" />
          ) : (
            <Shield size={40} className="text-brand opacity-80" />
          )}
        </div>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-ink text-center">
          {team.name}
        </h1>
        <p className="text-sm text-inksoft mt-1 flex items-center gap-1">
          <Users size={14} /> {members.length} Jugadores
        </p>

        {!isMember && (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="mt-4 rounded-xl bg-brand px-8 py-3 font-bold text-white shadow-lg disabled:opacity-50 press-fx"
          >
            {joining ? 'Uniéndose...' : 'Unirse al Equipo'}
          </button>
        )}
      </div>

      <div className="px-5 flex gap-3 mb-6">
        <div className="flex-1 rounded-2xl bg-white p-4 text-center border border-line shadow-sm">
          <div className="font-display text-2xl font-black text-green-600">{team.wins}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-inksoft">Victorias</div>
        </div>
        <div className="flex-1 rounded-2xl bg-white p-4 text-center border border-line shadow-sm">
          <div className="font-display text-2xl font-black text-neutral-500">{team.draws}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-inksoft">Empates</div>
        </div>
        <div className="flex-1 rounded-2xl bg-white p-4 text-center border border-line shadow-sm">
          <div className="font-display text-2xl font-black text-red-500">{team.losses}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-inksoft">Derrotas</div>
        </div>
      </div>

      <div className="px-5">
        <h2 className="font-bold text-ink mb-3">Plantel</h2>
        <div className="rounded-2xl border border-line bg-white overflow-hidden shadow-sm">
          {members.map((m, i) => (
            <div key={m.user_id} className={`flex items-center gap-3 p-4 ${i !== members.length - 1 ? 'border-b border-line' : ''}`}>
              <div className="h-10 w-10 overflow-hidden rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                {m.profile?.avatar_url ? (
                  <img src={m.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-bold text-neutral-400">{m.profile?.name.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-ink flex items-center gap-2">
                  {m.profile?.name} 
                  {team.captain_id === m.user_id && (
                    <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-yellow-700">
                      Capitán
                    </span>
                  )}
                </div>
                <div className="text-xs text-inksoft">{m.profile?.position || 'Jugador'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
