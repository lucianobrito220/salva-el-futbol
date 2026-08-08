'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Match, JoinRequest, Message, Level } from '@/lib/types';
import SuccessCheck from '@/components/SuccessCheck';
import SplashLoading from '@/components/SplashLoading';
import {
  ChevronLeft, Check, X, Send, MessageCircle, Pencil,
  Flag, Star, UserPlus, Repeat, MapPin,
} from 'lucide-react';
import Avatar from '@/components/Avatar';
import RainAlert from '@/components/RainAlert';
import MapModal from '@/components/MapModal';

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session, loading } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [organizerProfile, setOrganizerProfile] = useState<{ name: string; avatar_url: string | null; age: number | null } | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<Match>>({});
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
    if (!loading && !session) router.replace(`/auth?next=/partido/${id}`);
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

  useEffect(() => {
    if (!chatUnlocked || !id) return;

    async function loadMessages() {
      const { data } = await supabase.from('messages').select('*').eq('match_id', id).order('created_at');
      setMessages((data as Message[]) || []);
    }
    loadMessages();

    const channel = supabase
      .channel(`chat-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatUnlocked, id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  async function requestJoin() {
    if (!session) return;
    const { error } = await supabase.from('join_requests').insert({ match_id: id, player_id: session.user.id });
    if (error) {
      showToast('No se pudo enviar la solicitud.');
      return;
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
      if (match) {
        await supabase
          .from('matches')
          .update({ missing_players: Math.max(0, match.missing_players - 1) })
          .eq('id', match.id);
      }
      showToast('Jugador confirmado ✓');
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

  async function sendMessage() {
    if (!chatInput.trim() || !session) return;
    await supabase.from('messages').insert({ match_id: id, sender_id: session.user.id, body: chatInput.trim() });
    setChatInput('');
  }

  async function loadWhatsApp() {
    const { data, error } = await supabase.rpc('get_contact_phone', { p_match_id: id });
    if (error || !data) {
      showToast('El contacto se habilita cuando el organizador acepta al jugador.');
      return;
    }
    setContactPhone(data as string);
  }

  function startEdit() {
    if (!match) return;
    setEditDraft({
      zone: match.zone,
      court: match.court,
      location_address: match.location_address || '',
      match_date: match.match_date,
      match_time: match.match_time.slice(0, 5),
      price: match.price,
      level: match.level,
      description: match.description || '',
    });
    setEditing(true);
  }
  async function saveEdit() {
    if (!match) return;
    setSaving(true);
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
        description: editDraft.description || null,
      })
      .eq('id', match.id);
    setSaving(false);
    setEditing(false);
    showToast('Partido actualizado ✓');
  }

  const [repeating, setRepeating] = useState(false);

  async function repeatNextWeek() {
    if (!match || !session) return;
    setRepeating(true);
    const totalNeeded = match.missing_players + accepted.length;
    const newDate = new Date(`${match.match_date}T00:00:00`);
    newDate.setDate(newDate.getDate() + 7);
    const newDateStr = newDate.toISOString().slice(0, 10);

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

  if (loading || !session || !match) return <SplashLoading />;

  const pending = requests.filter((r) => r.status === 'pending');
  const accepted = requests.filter((r) => r.status === 'accepted');

  return (
    <div className="pb-10">
      {showSuccess && <SuccessCheck message="¡Solicitud enviada!" />}

      <div className="flex items-center gap-2 border-b border-line bg-white px-5 py-4">
        <button onClick={() => router.back()} className="press-fx text-ink">
          <ChevronLeft size={24} />
        </button>
        <div>
          <div className="font-display text-[15px] font-bold">{match.zone} · {match.match_time.slice(0, 5)}</div>
          <div className="text-[11px] text-inksoft">{match.court} · {match.city}</div>
        </div>
      </div>

      <div className="px-5 py-5">
        {!isOrganizer && organizerProfile && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3">
            <Avatar name={organizerProfile.name} url={organizerProfile.avatar_url} size={40} />
            <div>
              <p className="text-xs text-inksoft">Organiza</p>
              <p className="text-sm font-semibold">
                {organizerProfile.name}
                {organizerProfile.age ? <span className="text-inksoft"> · {organizerProfile.age} años</span> : null}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={shareMatch}
          className="press-fx mb-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white py-3 text-sm font-bold text-brand-dark"
        >
          <UserPlus size={17} /> Invitar a un amigo
        </button>

        {isOrganizer && (
          <button
            onClick={repeatNextWeek}
            disabled={repeating}
            className="press-fx mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-brand/40 bg-brand-pale py-3 text-sm font-bold text-brand-dark disabled:opacity-60"
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
                className="press-fx mb-4 flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-3 text-left text-sm"
              >
                <MapPin size={16} className="flex-shrink-0 text-brand-dark" />
                <span className="flex-1">{match.location_address || `${match.court}, ${match.zone}`}</span>
                <span className="text-xs font-bold text-brand-dark">Ver mapa</span>
              </button>
            )}
            {match.description && (
              <div className="mb-4 rounded-xl border border-line bg-white px-3.5 py-3 text-sm text-inksoft">
                {match.description}
              </div>
            )}
            {match.status === 'open' && <RainAlert date={match.match_date} time={match.match_time} />}
          </>
        ) : (
          <div className="mb-4 space-y-3 rounded-2xl border border-line bg-white p-4">
            <EditField label="Zona">
              <input className="edit-input" value={editDraft.zone || ''} onChange={(e) => setEditDraft((d) => ({ ...d, zone: e.target.value }))} />
            </EditField>
            <EditField label="Cancha">
              <input className="edit-input" value={editDraft.court || ''} onChange={(e) => setEditDraft((d) => ({ ...d, court: e.target.value }))} />
            </EditField>
            <EditField label="Ubicación (dirección)">
              <input className="edit-input" value={editDraft.location_address || ''} onChange={(e) => setEditDraft((d) => ({ ...d, location_address: e.target.value }))} />
            </EditField>
            <div className="grid grid-cols-2 gap-2">
              <EditField label="Fecha">
                <input type="date" className="edit-input" value={editDraft.match_date || ''} onChange={(e) => setEditDraft((d) => ({ ...d, match_date: e.target.value }))} />
              </EditField>
              <EditField label="Hora">
                <input type="time" className="edit-input" value={editDraft.match_time || ''} onChange={(e) => setEditDraft((d) => ({ ...d, match_time: e.target.value }))} />
              </EditField>
            </div>
            <EditField label="Precio">
              <input type="number" className="edit-input" value={editDraft.price ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, price: Number(e.target.value) }))} />
            </EditField>
            <EditField label="Nivel">
              <div className="grid grid-cols-3 gap-2">
                {(['Recreativo', 'Intermedio', 'Competitivo'] as Level[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setEditDraft((d) => ({ ...d, level: l }))}
                    className={`rounded-xl border px-1 py-2 text-xs font-bold ${editDraft.level === l ? 'border-brand bg-brand-pale text-brand-dark' : 'border-line bg-white text-inksoft'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </EditField>
            <EditField label="Descripción">
              <textarea
                className="edit-input h-20 resize-none"
                value={editDraft.description || ''}
                onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </EditField>
            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit} disabled={saving} className="press-fx flex-1 rounded-xl bg-brand py-2.5 text-xs font-bold text-white">
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button onClick={() => setEditing(false)} className="press-fx rounded-xl border border-line px-4 text-xs font-bold">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {isOrganizer && match.status === 'open' && !editing && (
          <button onClick={startEdit} className="press-fx mb-4 flex items-center gap-1.5 text-xs font-bold text-brand-dark">
            <Pencil size={13} /> Editar datos del partido
          </button>
        )}

        {!isOrganizer && confirmedPlayers.length > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3">
            <div className="flex -space-x-2">
              {confirmedPlayers.slice(0, 5).map((p) => (
                <div key={p.id} className="rounded-full ring-2 ring-white">
                  <Avatar name={p.player?.name || 'Jugador'} url={p.player?.avatar_url} size={30} />
                </div>
              ))}
            </div>
            <p className="text-xs text-inksoft">
              Ya confirmaron: <span className="font-semibold text-ink">{confirmedPlayers.map((p) => p.player?.name || 'Jugador').join(', ')}</span>
            </p>
          </div>
        )}

        {!isOrganizer && match.status === 'open' && (
          <div className="space-y-2">
            <button
              onClick={requestJoin}
              disabled={!!myRequest}
              className="press-fx w-full rounded-2xl bg-brand py-4 font-display font-bold text-white disabled:opacity-50"
            >
              {myRequest ? (myRequest.status === 'accepted' ? 'Ya estás confirmado ✓' : myRequest.status === 'rejected' ? 'Solicitud rechazada' : 'Solicitud enviada ✓') : 'Quiero unirme'}
            </button>
            {myRequest?.status === 'pending' && (
              <button onClick={cancelMyRequest} className="press-fx w-full rounded-2xl border border-line py-2.5 text-xs font-bold text-inksoft">
                Cancelar mi solicitud
              </button>
            )}
          </div>
        )}

        {isOrganizer && (
          <div className="mt-2 rounded-2xl border border-line bg-white p-4">
            <h3 className="mb-3 font-display font-bold">Panel del organizador</h3>
            {pending.length > 0 && (
              <>
                <p className="mb-2 text-xs font-bold text-inksoft">Solicitudes</p>
                {pending.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border-b border-line py-2.5 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.player?.name || 'Jugador'} url={r.player?.avatar_url} size={34} />
                      <span className="text-sm font-medium">
                        {r.player?.name || 'Jugador'}
                        {r.player?.age ? <span className="text-inksoft"> · {r.player.age}</span> : null}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => respond(r.id, true)} className="press-fx flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white">
                        <Check size={14} /> Aceptar
                      </button>
                      <button onClick={() => respond(r.id, false)} className="press-fx flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                        <X size={14} /> Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
            {accepted.length > 0 && (
              <>
                <p className="mb-2 mt-3 text-xs font-bold text-inksoft">Confirmados</p>
                {accepted.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.player?.name || 'Jugador'} url={r.player?.avatar_url} size={34} />
                      <span>
                        {r.player?.name || 'Jugador'}
                        {r.player?.age ? <span className="text-inksoft"> · {r.player.age}</span> : null}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-brand-dark">✅</span>
                      <button onClick={() => setReportTarget({ id: r.player_id, name: r.player?.name || 'Jugador' })} className="press-fx text-inksoft">
                        <Flag size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
            {requests.length === 0 && <p className="text-sm text-inksoft">Todavía no recibiste solicitudes.</p>}

            {match.status === 'open' && (
              <div className="mt-4 flex gap-2">
                <button onClick={markComplete} className="press-fx flex-1 rounded-xl border border-line py-2.5 text-xs font-bold">Marcar completo</button>
                <button onClick={cancelMatch} className="press-fx flex-1 rounded-xl bg-red-50 py-2.5 text-xs font-bold text-red-700">Cancelar partido</button>
              </div>
            )}
          </div>
        )}

        {!isOrganizer && iAmAccepted && (
          <button
            onClick={() => setReportTarget({ id: match.organizer_id, name: 'el organizador' })}
            className="press-fx mt-3 flex items-center gap-1.5 text-xs font-bold text-inksoft"
          >
            <Flag size={13} /> Denunciar al organizador
          </button>
        )}

        {match.status === 'complete' && (
          <div className="mt-4 rounded-2xl border border-line bg-white p-4">
            <h3 className="mb-3 flex items-center gap-1.5 font-display font-bold"><Star size={16} className="text-amber-500" /> Calificar</h3>
            {isOrganizer &&
              accepted
                .filter((r) => !myRatings.includes(r.player_id))
                .map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRateTarget({ id: r.player_id, name: r.player?.name || 'Jugador' })}
                    className="press-fx mb-2 flex w-full items-center justify-between rounded-xl border border-line px-3.5 py-2.5 text-sm"
                  >
                    Calificar a {r.player?.name || 'Jugador'}
                    <Star size={15} className="text-amber-500" />
                  </button>
                ))}
            {!isOrganizer && iAmAccepted && !myRatings.includes(match.organizer_id) && (
              <button
                onClick={() => setRateTarget({ id: match.organizer_id, name: 'el organizador' })}
                className="press-fx flex w-full items-center justify-between rounded-xl border border-line px-3.5 py-2.5 text-sm"
              >
                Calificar al organizador
                <Star size={15} className="text-amber-500" />
              </button>
            )}
            {((isOrganizer && accepted.every((r) => myRatings.includes(r.player_id))) ||
              (!isOrganizer && myRatings.includes(match.organizer_id))) && (
              <p className="text-sm text-inksoft">Ya calificaste. ¡Gracias!</p>
            )}
          </div>
        )}

        {chatUnlocked && (
          <div className="mt-5 rounded-2xl border border-line bg-white p-4">
            <h3 className="mb-3 font-display font-bold">Chat</h3>
            <div className="mb-3 flex max-h-72 flex-col gap-2.5 overflow-y-auto">
              {messages.map((m, i) => {
                const isMe = m.sender_id === session.user.id;
                const sender = participants[m.sender_id];
                const showName = !isMe && (i === 0 || messages[i - 1].sender_id !== m.sender_id);
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {showName && (
                      <div className="mb-0.5 flex items-center gap-1.5 pl-1">
                        <Avatar name={sender?.name || 'Jugador'} url={sender?.avatar_url} size={16} />
                        <span className="text-[10.5px] font-bold text-inksoft">{sender?.name || 'Jugador'}</span>
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                        isMe ? 'bg-brand text-white' : 'border border-line'
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && <p className="text-xs text-inksoft">Todavía no hay mensajes. ¡Saludá!</p>}
            </div>
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Escribí un mensaje…"
                className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm"
              />
              <button onClick={sendMessage} className="press-fx flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white">
                <Send size={16} />
              </button>
            </div>

            {!contactPhone ? (
              <button
                onClick={loadWhatsApp}
                className="press-fx mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white"
              >
                <MessageCircle size={18} /> Contactar por WhatsApp
              </button>
            ) : (
              <a
                href={`https://wa.me/${contactPhone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="press-fx mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white"
              >
                <MessageCircle size={18} /> Abrir WhatsApp
              </a>
            )}
          </div>
        )}
      </div>

      {reportTarget && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40" onClick={() => setReportTarget(null)}>
          <div className="w-full max-w-[440px] rounded-t-2xl bg-white p-6 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <h3 className="mb-1 font-display text-base font-bold">Denunciar a {reportTarget.name}</h3>
            <p className="mb-3 text-xs text-inksoft">Contanos qué pasó. Lo revisamos nosotros, no se lo mostramos a nadie más.</p>
            <textarea
              className="edit-input mb-3 h-24 resize-none"
              placeholder="Ej: no se presentó al partido sin avisar."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            <button onClick={submitReport} disabled={!reportReason.trim()} className="press-fx w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white disabled:opacity-50">
              Enviar denuncia
            </button>
          </div>
        </div>
      )}

      {rateTarget && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40" onClick={() => setRateTarget(null)}>
          <div className="w-full max-w-[440px] rounded-t-2xl bg-white p-6 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <h3 className="mb-4 font-display text-base font-bold">Calificar a {rateTarget.name}</h3>
            <RatingRow label="Puntualidad" value={rateForm.punctuality} onChange={(v) => setRateForm((f) => ({ ...f, punctuality: v }))} />
            <RatingRow label="Asistencia" value={rateForm.attendance} onChange={(v) => setRateForm((f) => ({ ...f, attendance: v }))} />
            <RatingRow label="Respeto" value={rateForm.respect} onChange={(v) => setRateForm((f) => ({ ...f, respect: v }))} />
            <button onClick={submitRating} className="press-fx mt-2 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white">
              Enviar calificación
            </button>
          </div>
        </div>
      )}

      {showMap && match && (
        <MapModal
          query={match.location_address || `${match.court}, ${match.zone}, ${match.city}`}
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
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-inksoft">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold text-inksoft">{label}</label>
      {children}
    </div>
  );
}
function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onChange(n)} className="press-fx">
            <Star size={22} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-line'} />
          </button>
        ))}
      </div>
    </div>
  );
}
