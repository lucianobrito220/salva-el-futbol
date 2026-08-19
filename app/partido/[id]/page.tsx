'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Match, JoinRequest, Message, Level } from '@/lib/types';
import SuccessCheck from '@/components/SuccessCheck';
import SplashLoading from '@/components/SplashLoading';
import dynamic from 'next/dynamic';
import {
  ChevronLeft, Check, X, Send, MessageCircle, Pencil,
  Flag, Star, UserPlus, Repeat, MapPin, Gift
} from 'lucide-react';
import { getLocalISODate } from '@/lib/dateUtils';
import QRCode from 'react-qr-code';
import Avatar from '@/components/Avatar';
import WeatherWidget from '@/components/WeatherWidget';
import MatchChat from './components/MatchChat';

const MapModal = dynamic(() => import('@/components/MapModal'), { ssr: false });
const AddressAutocomplete = dynamic(() => import('@/components/AddressAutocomplete'), { ssr: false });

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session, profile, loading } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [organizerProfile, setOrganizerProfile] = useState<{ name: string; avatar_url: string | null; age: number | null } | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null);
  const [toast, setToast] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'jugadores' | 'chat'>('info');

  const PROMOS = [
    '2x1 en Cerveza Imperial',
    '15% OFF en Hamburguesas',
    'Papas Fritas Gratis con tu pinta',
    '3x2 en Tragos',
    'Descuento 10% en próxima cancha'
  ];
  const promoIndex = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % PROMOS.length;
  const matchPromo = PROMOS[promoIndex];
  const qrValue = `SALVA-FUTBOL-${id.substring(0,8).toUpperCase()}`;

  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<Match>>({});
  const [torneoData, setTorneoData] = useState<any>({
    nombre: '', categoria: '', fechas: '', aforo: '', contacto: '', tipo: '', imagenBase64: '', descrExtra: ''
  });
  const [saving, setSaving] = useState(false);

  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const [reportReason, setReportReason] = useState('');

  const [rateTarget, setRateTarget] = useState<{ id: string; name: string } | null>(null);
  const [rateForm, setRateForm] = useState({ punctuality: 5, attendance: 5, respect: 5 });
  const [myRatings, setMyRatings] = useState<string[]>([]); // rated_id ya calificados por mí en este partido

  const isOrganizer = match && session && match.organizer_id === session.user.id;
  const iAmAccepted = myRequest?.status === 'accepted';
  const chatUnlocked = isOrganizer ? requests.some((r) => r.status === 'accepted') : iAmAccepted;
  const confirmedPlayers = requests.filter((r) => r.status === 'accepted');

  // Mapa rápido id -> {nombre, foto} para mostrar quién es quién en el chat grupal.
  const participants: Record<string, { name: string; avatar_url: string | null }> = {};
  if (match && organizerProfile) participants[match.organizer_id] = organizerProfile;
  confirmedPlayers.forEach((r) => {
    if (r.player) participants[r.player_id] = { name: r.player.name, avatar_url: r.player.avatar_url };
  });

  useEffect(() => {
    // Only redirect if they explicitly try to join, see requestJoin
  }, [loading, session, router, id]);

  async function loadAll() {
    const { data: m } = await supabase.from('matches').select('*').eq('id', id).single();
    setMatch(m as Match);

    if (m) {
      supabase
        .from('profiles')
        .select('name, avatar_url, age')
        .eq('id', (m as Match).organizer_id)
        .single()
        .then(({ data }) => setOrganizerProfile(data as any));
    }

    const { data: reqs } = await supabase
      .from('join_requests')
      .select('*, player:profiles(name, avatar_url, age)')
      .eq('match_id', id);
    setRequests((reqs as JoinRequest[]) || []);

    if (session) {
      const mine = (reqs as JoinRequest[] | null)?.find((r) => r.player_id === session.user.id) || null;
      setMyRequest(mine);

      const { data: myRatingsData } = await supabase
        .from('ratings')
        .select('rated_id')
        .eq('match_id', id)
        .eq('rater_id', session.user.id);
      setMyRatings((myRatingsData || []).map((r: any) => r.rated_id));
    }
  }

  useEffect(() => {
    if (!session || !id) return;
    loadAll();

    const channel = supabase
      .channel(`match-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'join_requests', filter: `match_id=eq.${id}` }, loadAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id]);



  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  async function requestJoin() {
    if (!match) return;
    if (!session) {
      router.push(`/auth?next=/partido/${id}`);
      return;
    }
    const isRefereeMode = profile?.is_referee && match.needs_referee;
    const { error } = await supabase.from('join_requests').insert({ match_id: id, player_id: session.user.id, is_referee_request: isRefereeMode || false });
    if (error) {
      console.error('Error in requestJoin:', error);
      showToast(`Error: ${error.message || error.details || 'Desconocido'}`);
      return;
    }
    if (match.match_type === 'equipo_rival') {
      await fetch('/api/notify/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: match.organizer_id,
          matchId: id,
          body: `⚔️ ¡${profile?.name || 'Un usuario'} postuló a su equipo para jugar contra ustedes en ${match.court}!`
        })
      }).catch(console.error);
    } else if (isRefereeMode) {
      await fetch('/api/notify/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: match.organizer_id,
          matchId: id,
          body: `🏁 ¡${profile?.name || 'Un árbitro'} se postuló como árbitro oficial para tu partido en ${match.court}!`
        })
      }).catch(console.error);
    } else {
      await fetch('/api/notify/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: match.organizer_id,
          matchId: id,
          body: `⚽ ¡${profile?.name || 'Un jugador'} quiere unirse a tu partido en ${match.court}!`
        })
      }).catch(console.error);
    }
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1100);
  }

  async function cancelMyRequest() {
    if (!myRequest) return;
    await supabase.from('join_requests').delete().eq('id', myRequest.id);
    showToast('Solicitud cancelada');
  }

  async function respond(reqId: string, accept: boolean) {
    if (accept) {
      await supabase.from('join_requests').update({ status: 'accepted' }).eq('id', reqId);
      const req = requests.find((r) => r.id === reqId);
      if (match && req) {
        if (req.is_referee_request) {
          await supabase.from('matches').update({ referee_id: req.player_id, needs_referee: false }).eq('id', match.id);
          
          const otherPending = requests.filter(r => r.id !== reqId && r.status === 'pending' && r.is_referee_request);
          if (otherPending.length > 0) {
            await supabase.from('join_requests').update({ status: 'rejected' }).in('id', otherPending.map(r => r.id));
          }

          showToast('Árbitro confirmado ✓');
          await fetch('/api/notify/direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: req.player_id,
              matchId: id,
              body: `🏁 ¡Felicidades! Fuiste aceptado como Árbitro Oficial para el partido en ${match.court}.`
            })
          }).catch(console.error);
        } else if (match.match_type === 'equipo_rival') {
          await supabase.from('matches').update({ status: 'complete', missing_players: 0 }).eq('id', match.id);
          
          const otherPending = requests.filter(r => r.id !== reqId && r.status === 'pending');
          if (otherPending.length > 0) {
            await supabase.from('join_requests').update({ status: 'rejected' }).in('id', otherPending.map(r => r.id));
          }

          showToast('¡Rival confirmado! Partido cerrado ✓');
          await fetch('/api/notify/direct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: req.player_id,
              matchId: id,
              body: `⚔️ ¡Felicidades! Aceptaron el reto de tu equipo para jugar en ${match.court}.`
            })
          }).catch(console.error);
        } else {
          await supabase
            .from('matches')
            .update({ missing_players: Math.max(0, match.missing_players - 1) })
            .eq('id', match.id);
          showToast('Jugador confirmado ✓');
        }
      }
    } else {
      await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', reqId);
      showToast('Solicitud rechazada');
    }
  }

  async function markComplete() {
    await supabase.from('matches').update({ status: 'complete' }).eq('id', id);
  }
  async function cancelMatch() {
    await supabase.from('matches').update({ status: 'cancelled' }).eq('id', id);
    showToast('Partido cancelado');
  }



  function startEdit() {
    if (!match) return;
    setEditDraft({
      zone: match.zone,
      court: match.court,
      location_address: match.location_address ? match.location_address.split('|')[0] : '',
      match_date: match.match_date,
      match_time: match.match_time.slice(0, 5),
      price: match.price,
      level: match.level,
      gender: match.gender,
      description: match.description || '',
    });
    if (match.zone === 'Torneo') {
      const d = match.description || '';
      const getLine = (prefix: string) => d.split('\n').find(l => l.startsWith(prefix))?.replace(prefix, '') || '';
      setTorneoData({
        nombre: getLine('TORNEO: '),
        categoria: getLine('CATEGORÍA: '),
        fechas: getLine('FECHAS: '),
        aforo: getLine('AFORO: ').replace(' equipos', ''),
        contacto: getLine('CONTACTO (WhatsApp): '),
        tipo: getLine('TIPO: '),
        imagenBase64: getLine('IMAGEN: '),
        descrExtra: d.includes('---') ? d.split('---')[1].trim() : ''
      });
    }
    setEditing(true);
  }
  async function saveEdit() {
    if (!match) return;
    setSaving(true);
    let finalDesc = editDraft.description || '';
    if (match.zone === 'Torneo') {
      finalDesc = `${torneoData.imagenBase64 ? `IMAGEN: ${torneoData.imagenBase64}\n` : ''}TIPO: ${torneoData.tipo || 'Inscripción de equipos'}
TORNEO: ${torneoData.nombre}
GÉNERO: ${editDraft.gender}
NIVEL: ${editDraft.level}
CATEGORÍA: ${torneoData.categoria}
FECHAS: ${torneoData.fechas}
AFORO: ${torneoData.aforo} equipos
COSTO INSCRIPCIÓN: $${editDraft.price}
CONTACTO (WhatsApp): ${torneoData.contacto}
---
${torneoData.descrExtra}`.trim();
    }
    await supabase
      .from('matches')
      .update({
        zone: editDraft.zone,
        court: editDraft.court,
        location_address: editDraft.location_address || null,
        match_date: editDraft.match_date,
        match_time: editDraft.match_time,
        price: editDraft.price,
        level: editDraft.level,
        gender: editDraft.gender,
        description: finalDesc,
      })
      .eq('id', match.id);
    setSaving(false);
    setEditing(false);
    showToast('Actualizado ✓');
  }

  const [repeating, setRepeating] = useState(false);

  async function repeatNextWeek() {
    if (!match || !session) return;
    setRepeating(true);
    const totalNeeded = match.missing_players + accepted.length;
    const newDate = new Date(`${match.match_date}T00:00:00`);
    newDate.setDate(newDate.getDate() + 7);
    const newDateStr = getLocalISODate(newDate);

    const { data, error } = await supabase
      .from('matches')
      .insert({
        organizer_id: session.user.id,
        city: match.city,
        zone: match.zone,
        court: match.court,
        location_address: match.location_address,
        match_date: newDateStr,
        match_time: match.match_time,
        match_type: match.match_type,
        team_format: match.team_format,
        gender: match.gender,
        description: match.description,
        missing_players: match.match_type === 'equipo_rival' ? 0 : totalNeeded,
        level: match.level,
        price: match.price,
      })
      .select('id')
      .single();

    setRepeating(false);
    if (error || !data) {
      showToast('No se pudo repetir el partido.');
      return;
    }
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: data.id }),
    }).catch(() => {});
    router.push(`/partido/${data.id}`);
  }

  function shareMatch() {
    if (!match) return;
    const url = typeof window !== 'undefined' ? `${window.location.origin}/p/${match.id}` : '';
    const text = `⚽ ${match.status === 'open' ? `Faltan ${match.missing_players} jugadores` : 'Partido'} para hoy ${match.match_time.slice(0, 5)} en ${match.zone}, ${match.city}. ¿Te sumás? ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  async function submitReport() {
    if (!session || !reportTarget || !reportReason.trim()) return;
    await supabase.from('reports').insert({
      reporter_id: session.user.id,
      reported_id: reportTarget.id,
      reason: reportReason.trim(),
    });
    setReportTarget(null);
    setReportReason('');
    showToast('Denuncia enviada. Gracias por avisarnos.');
  }

  async function submitRating() {
    if (!session || !rateTarget || !match) return;
    await supabase.from('ratings').insert({
      match_id: match.id,
      rater_id: session.user.id,
      rated_id: rateTarget.id,
      punctuality: rateForm.punctuality,
      attendance: rateForm.attendance,
      respect: rateForm.respect,
    });
    setMyRatings((prev) => [...prev, rateTarget.id]);
    setRateTarget(null);
    setRateForm({ punctuality: 5, attendance: 5, respect: 5 });
    showToast('¡Gracias por calificar!');
  }

  if (loading || !match) return <SplashLoading />;

  const pending = requests.filter((r) => r.status === 'pending');
  const accepted = requests.filter((r) => r.status === 'accepted');

  return (
    <div className="pb-32">
      {showSuccess && <SuccessCheck message="¡Solicitud enviada!" />}

      {match.zone === 'Torneo' ? (
        <div 
          className="relative h-48 w-full bg-cover bg-center"
          style={{ backgroundImage: `url("${match.description?.split('\n').find((l: string) => l.startsWith('IMAGEN:'))?.replace('IMAGEN: ', '') || 'https://images.unsplash.com/photo-1518605368461-1e1e38ce8058?auto=format&fit=crop&q=80&w=800'}")` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/90 via-purple-900/40 to-black/40"></div>
          <div className="absolute top-4 left-4 z-10">
            <button onClick={() => router.back()} className="press-fx flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md">
              <ChevronLeft size={24} />
            </button>
          </div>
          <div className="absolute bottom-5 left-5 right-5 text-white z-10">
            <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
              🏆 Torneo Local
            </div>
            <div className="font-display text-[22px] font-extrabold leading-tight shadow-black drop-shadow-lg">
              {match.description?.split('\n').find((l: string) => l.startsWith('TORNEO:'))?.replace('TORNEO: ', '') || 'Torneo Relámpago'}
            </div>
            <div className="text-xs font-medium opacity-90 drop-shadow-md mt-1">
              {match.court} · {match.city}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 border-b border-line bg-white dark:bg-charcoal px-5 py-4">
          <button onClick={() => router.back()} className="press-fx text-ink dark:text-white">
            <ChevronLeft size={24} />
          </button>
          <div>
            <div className="font-display text-[15px] font-bold text-ink dark:text-white">{match.zone} · {match.match_time.slice(0, 5)}</div>
            <div className="text-[11px] text-inksoft dark:text-gray-400">{match.court} · {match.city}</div>
          </div>
        </div>
      )}

      <div className="sticky top-[68px] z-20 px-4 py-2 bg-white/90 dark:bg-charcoal/90 backdrop-blur-md border-b border-line dark:border-charcoal-line">
        <div className="flex bg-neutral-100 dark:bg-charcoal rounded-xl p-1 relative">
          <button onClick={() => setActiveTab('info')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all z-10 ${activeTab === 'info' ? 'bg-white dark:bg-charcoal-soft shadow-sm text-ink dark:text-white' : 'text-inksoft dark:text-gray-400 hover:text-ink dark:hover:text-white'}`}>Detalles</button>
          <button onClick={() => setActiveTab('jugadores')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all z-10 ${activeTab === 'jugadores' ? 'bg-white dark:bg-charcoal-soft shadow-sm text-ink dark:text-white' : 'text-inksoft dark:text-gray-400 hover:text-ink dark:hover:text-white'}`}>Jugadores</button>
          {(chatUnlocked || isOrganizer) && (
            <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all z-10 ${activeTab === 'chat' ? 'bg-white dark:bg-charcoal-soft shadow-sm text-ink dark:text-white' : 'text-inksoft dark:text-gray-400 hover:text-ink dark:hover:text-white'}`}>Vestuario</button>
          )}
        </div>
      </div>

      <div className="px-5 py-5">
        <div style={{ display: activeTab === 'info' ? 'block' : 'none' }}>
        {!isOrganizer && organizerProfile && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl shadow-card bg-white dark:bg-charcoal p-4 transition">
            <Avatar name={organizerProfile.name} url={organizerProfile.avatar_url} size={40} />
            <div>
              <p className="text-xs text-inksoft dark:text-gray-400">Organiza</p>
              <p className="text-sm font-semibold dark:text-white">
                {organizerProfile.name}
                {organizerProfile.age ? <span className="text-inksoft dark:text-gray-400"> · {organizerProfile.age} años</span> : null}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={shareMatch}
          className={`press-fx mb-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold transition-colors ${
            match.zone === 'Torneo' 
              ? 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-900/50 dark:bg-purple-900/20 dark:text-purple-300' 
              : 'border-line dark:border-charcoal-line bg-white dark:bg-charcoal text-brand-dark dark:text-brand hover:bg-neutral-50 dark:hover:bg-charcoal-soft'
          }`}
        >
          <UserPlus size={17} /> {match.zone === 'Torneo' ? 'Compartir torneo con amigos' : 'Invitar a un amigo'}
        </button>

        {isOrganizer && (
          <button
            onClick={repeatNextWeek}
            disabled={repeating}
            className="press-fx mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-brand/40 bg-brand-pale dark:bg-brand/10 py-3 text-sm font-bold text-brand-dark dark:text-brand disabled:opacity-60"
          >
            <Repeat size={17} /> {repeating ? 'Creando…' : 'Repetir la semana que viene'}
          </button>
        )}
        {!editing ? (
          <>
            
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <Info label="Fecha" value={match.match_date} />
              <Info label="Nivel" value={match.level} />
              <Info label="Formato" value={match.team_format || '—'} />
              <Info label="Fútbol" value={match.gender} />
              <Info label="Precio" value={`$${match.price} por jugador`} />
              <Info
                label="Estado"
                value={
                  match.status !== 'open'
                    ? match.status === 'complete' ? 'Completo' : 'Cancelado'
                    : match.match_type === 'equipo_rival'
                    ? 'Busca equipo rival'
                    : `Faltan ${match.missing_players}`
                }
              />
            </div>
            {(match.location_address || match.court) && (
              <button
                onClick={() => setShowMap(true)}
                className="press-fx mb-4 flex w-full items-center gap-2 rounded-2xl shadow-card bg-white dark:bg-charcoal p-4 transition text-left text-sm"
              >
                <MapPin size={16} className="flex-shrink-0 text-brand-dark dark:text-brand" />
                <span className="flex-1 text-sm dark:text-white">{match.location_address ? match.location_address.split('|')[0] : `${match.court}, ${match.zone}`}</span>
                <span className="text-xs font-bold text-brand-dark dark:text-brand">Ver mapa</span>
              </button>
            )}
            {(() => {
              let displayDesc = match.description || '';
              if (match.zone === 'Torneo' && displayDesc.includes('---')) {
                displayDesc = displayDesc.split('---')[1].trim();
              }
              if (!displayDesc) return null;
              return (
                <div className="mb-4 rounded-2xl shadow-card bg-white dark:bg-charcoal p-4 transition text-sm text-inksoft dark:text-gray-300 whitespace-pre-wrap">
                  {displayDesc}
                </div>
              );
            })()}
            {match.status === 'open' && match.zone !== 'Torneo' && (
              <WeatherWidget 
                date={match.match_date} 
                lat={match.location_address ? parseFloat(match.location_address.split('|')[1] || '0') || undefined : undefined}
                lon={match.location_address ? parseFloat(match.location_address.split('|')[2] || '0') || undefined : undefined}
              />
            )}
          </>
        ) : (
          <div className="mb-4 space-y-3 rounded-2xl shadow-card bg-white dark:bg-charcoal p-4 transition">
            {match.zone === 'Torneo' ? (
              <>
                <EditField label="Nombre del Torneo">
                  <input className="edit-input bg-transparent dark:text-white dark:border-charcoal-line" value={torneoData.nombre || ''} onChange={(e) => setTorneoData((d: any) => ({ ...d, nombre: e.target.value }))} />
                </EditField>
                <div className="grid grid-cols-2 gap-2">
                  <EditField label="Categoría">
                    <input className="edit-input bg-transparent dark:text-white dark:border-charcoal-line" value={torneoData.categoria || ''} onChange={(e) => setTorneoData((d: any) => ({ ...d, categoria: e.target.value }))} />
                  </EditField>
                  <EditField label="Fechas">
                    <input className="edit-input bg-transparent dark:text-white dark:border-charcoal-line" value={torneoData.fechas || ''} onChange={(e) => setTorneoData((d: any) => ({ ...d, fechas: e.target.value }))} />
                  </EditField>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <EditField label="Aforo (Equipos)">
                    <input type="number" className="edit-input bg-transparent dark:text-white dark:border-charcoal-line" value={torneoData.aforo || ''} onChange={(e) => setTorneoData((d: any) => ({ ...d, aforo: e.target.value }))} />
                  </EditField>
                  <EditField label="Costo Inscripción">
                    <input type="number" className="edit-input bg-transparent dark:text-white dark:border-charcoal-line" value={editDraft.price ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, price: Number(e.target.value) }))} />
                  </EditField>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <EditField label="Género">
                    <select className="edit-input bg-transparent dark:text-white dark:border-charcoal-line dark:bg-charcoal" value={editDraft.gender || 'Mixto'} onChange={(e) => setEditDraft((d) => ({ ...d, gender: e.target.value as any }))}>
                      <option value="Mixto">Mixto</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                  </EditField>
                  <EditField label="Nivel">
                    <select className="edit-input bg-transparent dark:text-white dark:border-charcoal-line dark:bg-charcoal" value={editDraft.level || 'Competitivo'} onChange={(e) => setEditDraft((d) => ({ ...d, level: e.target.value as any }))}>
                      <option value="Recreativo">Recreativo</option>
                      <option value="Intermedio">Intermedio</option>
                      <option value="Competitivo">Competitivo</option>
                    </select>
                  </EditField>
                </div>
                <EditField label="Sede (Ubicación)">
                  <input className="edit-input bg-transparent dark:text-white dark:border-charcoal-line" value={editDraft.court || ''} onChange={(e) => setEditDraft((d) => ({ ...d, court: e.target.value }))} />
                </EditField>
                <EditField label="Contacto (WhatsApp)">
                  <input className="edit-input bg-transparent dark:text-white dark:border-charcoal-line" value={torneoData.contacto || ''} onChange={(e) => setTorneoData((d: any) => ({ ...d, contacto: e.target.value }))} />
                </EditField>
                <EditField label="Descripción adicional">
                  <textarea
                    className="edit-input bg-transparent dark:text-white dark:border-charcoal-line h-20 resize-none"
                    value={torneoData.descrExtra || ''}
                    onChange={(e) => setTorneoData((d: any) => ({ ...d, descrExtra: e.target.value }))}
                  />
                </EditField>
              </>
            ) : (
              <>
                <EditField label="Zona">
                  <input className="edit-input bg-transparent dark:text-white dark:border-charcoal-line" value={editDraft.zone || ''} onChange={(e) => setEditDraft((d) => ({ ...d, zone: e.target.value }))} />
                </EditField>
                <EditField label="Cancha">
                  <input className="edit-input bg-transparent dark:text-white dark:border-charcoal-line" value={editDraft.court || ''} onChange={(e) => setEditDraft((d) => ({ ...d, court: e.target.value }))} />
                </EditField>
                <EditField label="Ubicación (dirección)">
                  <AddressAutocomplete
                    value={editDraft.location_address || ''}
                    onChange={(v) => setEditDraft((d) => ({ ...d, location_address: v }))}
                    placeholder="Ej: Av. Aconquija 1200"
                  />
                </EditField>
                <div className="grid grid-cols-2 gap-2">
                  <EditField label="Fecha">
                    <input type="date" className="edit-input bg-transparent dark:text-white dark:border-charcoal-line" value={editDraft.match_date || ''} onChange={(e) => setEditDraft((d) => ({ ...d, match_date: e.target.value }))} />
                  </EditField>
                  <EditField label="Hora">
                    <input type="time" className="edit-input bg-transparent dark:text-white dark:border-charcoal-line" value={editDraft.match_time || ''} onChange={(e) => setEditDraft((d) => ({ ...d, match_time: e.target.value }))} />
                  </EditField>
                </div>
                <EditField label="Precio">
                  <input type="number" className="edit-input bg-transparent dark:text-white dark:border-charcoal-line" value={editDraft.price ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, price: Number(e.target.value) }))} />
                </EditField>
                <EditField label="Nivel">
                  <div className="grid grid-cols-3 gap-2">
                    {(['Recreativo', 'Intermedio', 'Competitivo'] as Level[]).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setEditDraft((d) => ({ ...d, level: l }))}
                        className={`rounded-xl border px-1 py-2 text-xs font-bold transition ${editDraft.level === l ? 'border-brand bg-brand-pale dark:bg-brand/10 text-brand-dark dark:text-brand' : 'border-line dark:border-charcoal-line bg-transparent dark:text-gray-300 text-inksoft'}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </EditField>
                <EditField label="Descripción">
                  <textarea
                    className="edit-input bg-transparent dark:text-white dark:border-charcoal-line h-20 resize-none"
                    value={editDraft.description || ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
                  />
                </EditField>
              </>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit} disabled={saving} className="press-fx flex-1 rounded-xl bg-brand py-2.5 text-xs font-bold text-white shadow-glow-brand">
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button onClick={() => setEditing(false)} className="press-fx rounded-xl border border-line dark:border-charcoal-line px-4 text-xs font-bold dark:text-white">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {isOrganizer && match.status === 'open' && !editing && (
          <button onClick={startEdit} className="press-fx mb-4 flex items-center gap-1.5 text-xs font-bold text-brand-dark dark:text-brand hover:brightness-110 transition">
            <Pencil size={13} /> Editar datos del partido
          </button>
        )}
        </div>

        <div style={{ display: activeTab === 'jugadores' ? 'block' : 'none' }}>

        {!isOrganizer && confirmedPlayers.length > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl shadow-card bg-white dark:bg-charcoal p-4 transition">
            <div className="flex -space-x-2">
              {confirmedPlayers.slice(0, 5).map((p) => (
                <div key={p.id} className="rounded-full ring-2 ring-white dark:ring-charcoal">
                  <Avatar name={p.player?.name || 'Jugador'} url={p.player?.avatar_url} size={30} />
                </div>
              ))}
            </div>
            <p className="text-xs text-inksoft dark:text-gray-400">
              Ya confirmaron: <span className="font-semibold text-ink dark:text-white">{confirmedPlayers.map((p) => p.player?.name || 'Jugador').join(', ')}</span>
            </p>
          </div>
        )}



        {isOrganizer && (
          <div className="mt-2 rounded-2xl shadow-card bg-white dark:bg-charcoal p-4 transition">
            <h3 className="mb-3 font-display font-bold dark:text-white">Panel del organizador</h3>
            {(() => {
              const pendingPlayers = pending.filter(r => !r.is_referee_request);
              const pendingReferees = pending.filter(r => r.is_referee_request);
              
              return (
                <div className="space-y-1">
                  {pendingReferees.length > 0 && (
                    <div className="mb-4">
                      <div className="mb-2 flex items-center gap-2">
                        <p className="text-xs font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-wide">Árbitros postulados 🏁</p>
                      </div>
                      {pendingReferees.map((r, i) => (
                        <div key={r.id} className={`flex items-center justify-between rounded-xl border border-yellow-300 dark:border-yellow-700/50 bg-yellow-50 dark:bg-yellow-900/20 py-3 px-3 mb-2 shadow-sm slide-up-sm stagger-${i + 1}`}>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={r.player?.name || 'Árbitro'} url={r.player?.avatar_url} size={38} />
                            <span className="text-sm font-bold text-yellow-900 dark:text-yellow-400">
                              {r.player?.name || 'Árbitro'}
                              {r.player?.age ? <span className="text-yellow-700/60 dark:text-yellow-600/80 font-medium"> · {r.player.age}</span> : null}
                            </span>
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => respond(r.id, true)} className="press-fx flex items-center gap-1 rounded-lg bg-yellow-500 hover:bg-yellow-400 px-3 py-2 text-xs font-bold text-yellow-950 shadow-sm transition">
                              <Check size={14} /> Aceptar
                            </button>
                            <button onClick={() => respond(r.id, false)} className="press-fx flex items-center gap-1 rounded-lg bg-white dark:bg-transparent border border-yellow-200 dark:border-yellow-700/50 px-3 py-2 text-xs font-bold text-yellow-700 dark:text-yellow-500 transition hover:bg-yellow-100 dark:hover:bg-yellow-900/40">
                              <X size={14} /> Rechazar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {pendingPlayers.length > 0 && (
                    <>
                      <p className="mb-2 mt-4 text-xs font-bold text-inksoft dark:text-gray-400">{match.match_type === 'equipo_rival' ? 'Equipos/Capitanes postulados' : 'Jugadores postulados'}</p>
                      {pendingPlayers.map((r, i) => (
                        <div key={r.id} className={`flex items-center justify-between shadow-card rounded-xl p-3 bg-white dark:bg-charcoal border border-line dark:border-charcoal-line mb-2 slide-up-sm stagger-${i + 1}`}>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={r.player?.name || 'Jugador'} url={r.player?.avatar_url} size={34} />
                            <span className="text-sm font-medium dark:text-white">
                              {r.player?.name || 'Jugador'}
                              {r.player?.age ? <span className="text-inksoft dark:text-gray-400"> · {r.player.age}</span> : null}
                            </span>
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => respond(r.id, true)} className="press-fx flex items-center gap-1 rounded-lg bg-brand hover:brightness-110 px-3 py-1.5 text-xs font-bold text-white transition">
                              <Check size={14} /> Aceptar
                            </button>
                            <button onClick={() => respond(r.id, false)} className="press-fx flex items-center gap-1 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-xs font-bold text-red-700 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/40">
                              <X size={14} /> Rechazar
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })()}
            {accepted.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-bold text-inksoft dark:text-gray-400">Confirmados</p>
                {accepted.map((r, i) => (
                  <div key={r.id} className={`flex items-center justify-between py-2.5 px-3 mb-2 shadow-card rounded-xl bg-white dark:bg-charcoal border border-line dark:border-charcoal-line text-sm slide-up-sm stagger-${i + 1}`}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.player?.name || 'Jugador'} url={r.player?.avatar_url} size={34} />
                      <span className="font-medium dark:text-white">
                        {r.player?.name || 'Jugador'}
                        {r.player?.age ? <span className="text-inksoft dark:text-gray-400"> · {r.player.age}</span> : null}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-brand-dark dark:text-brand">✅</span>
                      <button onClick={() => setReportTarget({ id: r.player_id, name: r.player?.name || 'Jugador' })} className="press-fx text-inksoft dark:text-gray-400 hover:text-red-500 transition">
                        <Flag size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {requests.length === 0 && <p className="text-sm text-inksoft dark:text-gray-400">Todavía no recibiste solicitudes.</p>}

            {match.status === 'open' && (
              <div className="mt-4 flex gap-2">
                <button onClick={markComplete} className="press-fx flex-1 rounded-xl border border-line dark:border-charcoal-line py-2.5 text-xs font-bold dark:text-white hover:bg-neutral-50 dark:hover:bg-charcoal-soft transition">Marcar completo</button>
                <button onClick={cancelMatch} className="press-fx flex-1 rounded-xl bg-red-50 dark:bg-red-900/20 py-2.5 text-xs font-bold text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition">Cancelar partido</button>
              </div>
            )}
          </div>
        )}

        {!isOrganizer && iAmAccepted && (
          <button
            onClick={() => setReportTarget({ id: match.organizer_id, name: 'el organizador' })}
            className="press-fx mt-3 flex items-center gap-1.5 text-xs font-bold text-inksoft dark:text-gray-400 hover:text-red-500 transition"
          >
            <Flag size={13} /> Denunciar al organizador
          </button>
        )}

        {match.status === 'complete' && (
          <div className="mt-4 rounded-2xl shadow-card bg-white dark:bg-charcoal p-4 transition">
            <h3 className="mb-3 flex items-center gap-1.5 font-display font-bold dark:text-white"><Star size={16} className="text-amber-500" /> Calificar</h3>
            {isOrganizer &&
              accepted
                .filter((r) => !myRatings.includes(r.player_id))
                .map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRateTarget({ id: r.player_id, name: r.player?.name || 'Jugador' })}
                    className="press-fx mb-2 flex w-full items-center justify-between rounded-xl border border-line dark:border-charcoal-line px-3.5 py-2.5 text-sm dark:text-white hover:bg-neutral-50 dark:hover:bg-charcoal-soft transition"
                  >
                    Calificar a {r.player?.name || 'Jugador'}
                    <Star size={15} className="text-amber-500" />
                  </button>
                ))}
            {!isOrganizer && iAmAccepted && !myRatings.includes(match.organizer_id) && (
              <button
                onClick={() => setRateTarget({ id: match.organizer_id, name: 'el organizador' })}
                className="press-fx flex w-full items-center justify-between rounded-xl border border-line dark:border-charcoal-line px-3.5 py-2.5 text-sm dark:text-white hover:bg-neutral-50 dark:hover:bg-charcoal-soft transition"
              >
                Calificar al organizador
                <Star size={15} className="text-amber-500" />
              </button>
            )}
            {((isOrganizer && accepted.every((r) => myRatings.includes(r.player_id))) ||
              (!isOrganizer && myRatings.includes(match.organizer_id))) && (
              <p className="text-sm text-inksoft dark:text-gray-400">Ya calificaste. ¡Gracias!</p>
            )}
          </div>
        )}
        </div>

        <div style={{ display: activeTab === 'chat' ? 'block' : 'none' }}>
        <MatchChat matchId={id} chatUnlocked={chatUnlocked} session={session} participants={participants} />
        </div>
      </div>

      {!isOrganizer && match.status === 'open' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-line dark:border-charcoal-line bg-white/95 dark:bg-charcoal/95 p-4 pb-safe backdrop-blur-md shadow-card-hover">
          <div className="space-y-2 max-w-[600px] mx-auto">
            <button
              onClick={requestJoin}
              disabled={!!myRequest}
              className={`press-fx w-full rounded-2xl py-4 font-display font-bold text-white transition disabled:opacity-50 ${profile?.is_referee && match.needs_referee ? 'bg-yellow-500 shadow-lg text-yellow-950 hover:bg-yellow-400' : 'bg-brand shadow-glow-brand hover:brightness-110'}`}
            >
              {myRequest ? (myRequest.status === 'accepted' ? 'Ya estás confirmado ✓' : myRequest.status === 'rejected' ? 'Solicitud rechazada' : 'Solicitud enviada ✓') : (profile?.is_referee && match.needs_referee ? 'Postularme como Árbitro 🏁' : match.match_type === 'equipo_rival' ? 'Postular a mi equipo ⚔️' : 'Quiero unirme')}
            </button>
            {myRequest?.status === 'pending' && (
              <button onClick={cancelMyRequest} className="press-fx w-full rounded-2xl border border-line dark:border-charcoal-line py-2.5 text-xs font-bold text-inksoft dark:text-gray-300 bg-white dark:bg-charcoal hover:bg-neutral-50 dark:hover:bg-charcoal-soft transition">
                Cancelar mi solicitud
              </button>
            )}
          </div>
        </div>
      )}

      {reportTarget && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 dark:bg-black/60 modal-backdrop-in" onClick={() => setReportTarget(null)}>
          <div className="w-full max-w-[440px] rounded-t-2xl bg-white dark:bg-charcoal p-6 pb-8 modal-enter" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line dark:bg-charcoal-line" />
            <h3 className="mb-1 font-display text-base font-bold dark:text-white">Denunciar a {reportTarget.name}</h3>
            <p className="mb-3 text-xs text-inksoft dark:text-gray-400">Contanos qué pasó. Lo revisamos nosotros, no se lo mostramos a nadie más.</p>
            <textarea
              className="edit-input bg-transparent dark:text-white dark:border-charcoal-line mb-3 h-24 resize-none"
              placeholder="Ej: no se presentó al partido sin avisar."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            <button onClick={submitReport} disabled={!reportReason.trim()} className="press-fx w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white disabled:opacity-50 shadow-sm">
              Enviar denuncia
            </button>
          </div>
        </div>
      )}

      {rateTarget && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 dark:bg-black/60 modal-backdrop-in" onClick={() => setRateTarget(null)}>
          <div className="w-full max-w-[440px] rounded-t-2xl bg-white dark:bg-charcoal p-6 pb-8 modal-enter" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line dark:bg-charcoal-line" />
            <h3 className="mb-4 font-display text-base font-bold dark:text-white">Calificar a {rateTarget.name}</h3>
            <RatingRow label="Puntualidad" value={rateForm.punctuality} onChange={(v) => setRateForm((f) => ({ ...f, punctuality: v }))} />
            <RatingRow label="Asistencia" value={rateForm.attendance} onChange={(v) => setRateForm((f) => ({ ...f, attendance: v }))} />
            <RatingRow label="Respeto" value={rateForm.respect} onChange={(v) => setRateForm((f) => ({ ...f, respect: v }))} />
            <button onClick={submitRating} className="press-fx mt-2 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-glow-brand">
              Enviar calificación
            </button>
          </div>
        </div>
      )}

      {showMap && match && (
        <MapModal
          query={match.location_address ? match.location_address.split('|')[0] : `${match.court}, ${match.zone}, ${match.city}`}
          label={match.court}
          onClose={() => setShowMap(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}



      <style jsx global>{`
        .edit-input {
          width: 100%;
          border-radius: 12px;
          border: 1.5px solid #e7e9ec;
          padding: 10px 12px;
          font-size: 13.5px;
        }
      `}</style>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line dark:border-charcoal-line bg-white dark:bg-charcoal p-3 shadow-sm transition">
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-inksoft dark:text-gray-400">{label}</div>
      <div className="text-sm font-semibold dark:text-white">{value}</div>
    </div>
  );
}
function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold text-inksoft dark:text-gray-400">{label}</label>
      {children}
    </div>
  );
}
function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <span className="text-sm font-medium dark:text-white">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onChange(n)} className="press-fx icon-bounce">
            <Star size={22} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-line dark:text-charcoal-line'} />
          </button>
        ))}
      </div>
    </div>
  );
}
