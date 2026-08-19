'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { enablePushNotifications } from '@/lib/push';
import { Match } from '@/lib/types';
import SplashLoading from '@/components/SplashLoading';
import InstallAppButton from '@/components/InstallAppButton';
import { useTheme } from '@/context/ThemeContext';
import { Bell, Camera, Pencil, LogOut, Check, Award, Shield, Moon, HelpCircle, FileText, ChevronRight, ChevronDown, ChevronUp, Activity, Trophy, Gift, Share2, AlertCircle } from 'lucide-react';
import { showToast } from '@/lib/toast';
import Link from 'next/link';
import Avatar from '@/components/Avatar';

export default function PerfilPage() {
  const router = useRouter();
  const { session, profile, loading, signOut, refreshProfile } = useAuth();
  const { dark, toggle } = useTheme();
  const [mine, setMine] = useState<Match[]>([]);
  const [joined, setJoined] = useState<Match[]>([]);
  const [pushStatus, setPushStatus] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState('');

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [ageDraft, setAgeDraft] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isActivityExpanded, setIsActivityExpanded] = useState(false);
  const [togglingReferee, setTogglingReferee] = useState(false);
  const [showRefConfirm, setShowRefConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Guest access allowed, handled in render
  }, [loading, session, router]);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('matches')
      .select('*')
      .eq('organizer_id', session.user.id)
      .order('match_date', { ascending: false })
      .then(({ data }) => setMine((data as Match[]) || []));

    supabase
      .from('join_requests')
      .select('match:matches(*)')
      .eq('player_id', session.user.id)
      .eq('status', 'accepted')
      .then(({ data }) => {
        const matches = ((data as any[]) || []).map((r) => r.match).filter(Boolean) as Match[];
        setJoined(matches);
      });

    supabase
      .from('profiles')
      .select('phone')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.phone) {
          setPhone(data.phone);
          setPhoneSaved(true);
        }
      });
  }, [session]);

  useEffect(() => {
    if (profile) {
      setNameDraft(profile.name);
      setAgeDraft(profile.age ? String(profile.age) : '');
    }
  }, [profile]);

  async function savePhone() {
    if (!session) return;
    setPhoneMsg('');
    const cleaned = phone.trim();
    if (cleaned && !cleaned.startsWith('+')) {
      setPhoneMsg('Usá formato internacional, ej: +5493815551234');
      return;
    }
    const { error } = await supabase.from('profiles').update({ phone: cleaned || null }).eq('id', session.user.id);
    if (error) {
      setPhoneMsg('No se pudo guardar. Intentá de nuevo.');
      return;
    }
    setPhoneSaved(!!cleaned);
    setPhoneMsg(cleaned ? 'WhatsApp guardado ✓' : 'WhatsApp eliminado');
  }

  async function handleEnablePush() {
    if (!session) return;
    const result = await enablePushNotifications(session.user.id);
    setPushStatus(
      result === 'granted' ? 'Notificaciones activadas ✓' : result === 'denied' ? 'Permiso denegado' : 'No soportado en este navegador'
    );
  }

  async function saveName() {
    if (!session || !nameDraft.trim()) return;
    setSavingProfile(true);
    const ageValue = ageDraft.trim() ? Number(ageDraft) : null;
    await supabase.from('profiles').update({ name: nameDraft.trim(), age: ageValue }).eq('id', session.user.id);
    await refreshProfile();
    setSavingProfile(false);
    setEditing(false);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    if (!file.type.startsWith('image/')) return;

    setUploadingPhoto(true);
    const path = `${session.user.id}/avatar.png`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      // Se agrega un timestamp para evitar que el navegador muestre la foto vieja en caché.
      const urlWithCacheBust = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: urlWithCacheBust }).eq('id', session.user.id);
      await refreshProfile();
    }
    setUploadingPhoto(false);
  }

  async function toggleRefereeStatus() {
    if (!session || !profile) return;
    
    const newValue = !profile.is_referee;
    const actionText = newValue ? 'activar' : 'desactivar';
    // We will now show a custom modal instead of window.confirm
    setShowRefConfirm(true);
  }

  async function executeToggleReferee() {
    if (!session || !profile) return;
    const newValue = !profile.is_referee;
    setShowRefConfirm(false);

    setTogglingReferee(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({ is_referee: newValue, referee_updated_at: now })
      .eq('id', session.user.id);
      
    if (!error) {
      await refreshProfile();
    } else {
      console.error("Referee toggle error:", error);
      showToast.error(`Error al actualizar estado: ${error.message || 'Desconocido'}`);
    }
    setTogglingReferee(false);
  }

  function getRefereeCooldownHours(): number {
    if (!profile?.referee_updated_at) return 0;
    const lastUpdate = new Date(profile.referee_updated_at).getTime();
    if (isNaN(lastUpdate)) return 0;
    const now = new Date().getTime();
    const hoursPassed = (now - lastUpdate) / (1000 * 60 * 60);
    return Math.max(0, 24 - hoursPassed);
  }

  const refereeCooldown = getRefereeCooldownHours();
  const canToggleReferee = refereeCooldown <= 0;

  if (loading) return <SplashLoading />;
  
  if (!session || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-5 text-center bg-bg pb-24">
        <h2 className="mb-2 font-display text-2xl font-bold">Iniciá sesión</h2>
        <p className="text-sm text-inksoft">Necesitás una cuenta para ver y editar tu perfil.</p>
        <Link href="/auth?next=/perfil" className="mt-6 rounded-xl bg-brand px-6 py-3 font-bold text-white shadow-lg">
          Iniciar sesión o registrarse
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* Top Background & Gamified Avatar */}
      <div className="relative rounded-b-[40px] bg-gradient-to-b from-brand-dark to-brand pb-8 pt-14 text-center shadow-lg">
        <button 
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: 'Salvá el Fútbol',
                text: '¡Descargate Salvá el Fútbol y no te pierdas ningún partido!',
                url: window.location.origin
              }).catch(() => {});
            }
          }}
          className="absolute right-5 top-5 press-fx text-white/80 hover:text-white"
          aria-label="Compartir app"
        >
          <Share2 size={22} />
        </button>

        {(() => {
          const points = profile.salvapuntos || 0;
          let rank = 'Amateur';
          let nextLevel = 10;
          if (points >= 50) { rank = 'Leyenda'; nextLevel = 100; }
          else if (points >= 10) { rank = 'Titular'; nextLevel = 50; }
          
          const progress = Math.min((points / nextLevel) * 100, 100);
          const strokeDashoffset = 283 - (283 * progress) / 100; // 2 * PI * R (r=45) = ~283

          return (
            <div className="relative mx-auto mb-4 h-28 w-28">
              {/* Circular Progress Ring */}
              <svg className="absolute -inset-1 h-[120px] w-[120px] -rotate-90 drop-shadow-md">
                <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                <circle cx="60" cy="60" r="45" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" 
                  strokeDasharray="283" strokeDashoffset={strokeDashoffset} 
                  className="transition-all duration-1000 ease-out" />
              </svg>

              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-brand-dark p-1">
                <Avatar url={profile.avatar_url} name={profile.name} size={92} />
              </div>

              {/* Rank Badge */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 shadow-md border border-brand/20">
                <span className="font-display text-[10px] font-extrabold uppercase text-brand-dark flex items-center gap-1">
                  {rank === 'Leyenda' ? '👑' : rank === 'Titular' ? '⭐' : '🌱'} {rank}
                </span>
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-3 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand shadow-lg press-fx transition-transform hover:scale-110 border border-neutral-100"
              >
                <Camera size={15} strokeWidth={2.5} />
              </button>
            </div>
          );
        })()}

        <div className="hidden">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
        {uploadingPhoto && <p className="mb-1 text-[11px] text-white/70">Subiendo foto…</p>}

        {editing ? (
          <div className="mx-auto mb-2 flex max-w-[280px] items-center gap-2">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="flex-1 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-center text-sm font-bold text-white placeholder-white/50"
              placeholder="Nombre"
            />
            <input
              value={ageDraft}
              onChange={(e) => setAgeDraft(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-16 rounded-lg border border-white/30 bg-white/10 px-2 py-1.5 text-center text-sm font-bold text-white placeholder-white/50"
              placeholder="Edad"
              maxLength={2}
            />
            <button onClick={saveName} disabled={savingProfile} className="press-fx flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-brand-dark">
              <Check size={16} />
            </button>
          </div>
        ) : (
          <h2 className="flex items-center justify-center gap-1.5 font-display text-lg font-extrabold text-white">
            {profile.name}
            {profile.age ? <span className="font-body text-sm font-medium text-white/70">· {profile.age} años</span> : null}
            <button onClick={() => setEditing(true)} className="press-fx text-white/70">
              <Pencil size={13} />
            </button>
          </h2>
        )}

        <div className="mt-2 text-[12px] font-bold text-white/90">
          <Link href="/perfil/salvapuntos" className="hover:underline flex items-center justify-center gap-1.5">
            <Shield size={14} className="text-white" />
            SalvaPuntos: <span className="text-white font-extrabold bg-white/20 px-2 py-0.5 rounded-full">{profile.salvapuntos || 0}</span>
          </Link>
        </div>
        <p className="mb-5 mt-3 text-[13px] text-white/70">{profile.position || 'Jugador'} · {profile.city || 'Sin ciudad'}</p>
        <div className="flex justify-center">
          <Stat label="Jugados" value={profile.played_count} />
          <Stat label="Calificación" value={profile.rating || '—'} />
          <Stat label="Desde" value={new Date(profile.member_since).getFullYear()} last />
        </div>

        {(profile.played_count >= 5 || mine.filter((m) => m.status !== 'cancelled').length >= 5) && (
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {profile.played_count >= 5 && (
              <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-bold text-white">
                <Award size={12} /> Jugador regular
              </span>
            )}
            {profile.played_count >= 20 && (
              <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-bold text-white">
                <Award size={12} /> Veterano
              </span>
            )}
            {mine.filter((m) => m.status !== 'cancelled').length >= 5 && (
              <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-bold text-white">
                <Shield size={12} /> Organizador confiable
              </span>
            )}
            {profile.is_referee && (
              <span className="flex items-center gap-1 rounded-full bg-yellow-500/80 px-2.5 py-1 text-[10.5px] font-bold text-white">
                <Award size={12} /> Árbitro
              </span>
            )}
          </div>
        )}
      </div>

      {/* SALVAPUNTOS (FASE 3) */}
      <div className="px-5 pt-6">
        <Link href="/perfil/salvapuntos" className="press-fx relative flex flex-1 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark to-brand p-5 shadow-lg">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Gift size={16} className="text-yellow-400" />
              <h3 className="font-display text-sm font-extrabold text-white uppercase tracking-wider">SalvaPuntos</h3>
            </div>
            <span className="text-4xl font-black text-white">{profile.salvapuntos || 0}</span>
          </div>
          <Gift size={80} className="absolute -bottom-4 -right-4 text-white/10" strokeWidth={1.5} />
        </Link>
      </div>

      {/* DISCIPLINA (FASE 3) */}
      <div className="px-5 pt-6">
        <h2 className="mb-3 font-display text-[15.5px] font-extrabold">Disciplina</h2>
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 text-sm">
            <span className="flex items-center gap-2"><div className="w-3 h-4 bg-yellow-400 rounded-sm"></div> Tarjetas Amarillas</span>
            <span className="font-bold">{profile.yellow_cards || 0}</span>
          </div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3 text-sm">
            <span className="flex items-center gap-2"><div className="w-3 h-4 bg-red-500 rounded-sm"></div> Tarjetas Rojas</span>
            <span className="font-bold">{profile.red_cards || 0}</span>
          </div>
          {profile.suspended_until && new Date(profile.suspended_until) > new Date() && (
            <div className="flex items-center justify-between px-4 py-3 text-sm bg-red-50 text-red-700">
              <span className="font-bold">Suspendido hasta</span>
              <span className="font-bold">{new Date(profile.suspended_until).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        <p className="mt-2 text-[11px] text-inksoft">Acumular tarjetas rojas o faltar sin avisar puede derivar en suspensiones.</p>
      </div>

      <div className="px-5 pt-5">
        <div className="rounded-2xl border border-line bg-white p-4">
          <h3 className="mb-1 font-display text-sm font-bold">Tu WhatsApp</h3>
          <p className="mb-3 text-[11px] text-inksoft">
            Opcional. No lo validamos por SMS, solo lo guardamos para que otros usuarios te puedan contactar
            por WhatsApp una vez que aceptás o te aceptan en un partido. Nunca se muestra públicamente.
          </p>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-line px-3.5 py-2.5 text-sm"
              placeholder="+5493815551234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button onClick={savePhone} className="press-fx rounded-xl bg-brand px-4 text-sm font-bold text-white">
              Guardar
            </button>
          </div>
          {phoneMsg && <p className="mt-2 text-xs font-medium text-inksoft">{phoneMsg}</p>}
          {phoneSaved && !phoneMsg && <p className="mt-2 text-xs font-medium text-brand-dark">WhatsApp cargado ✓</p>}
        </div>
      </div>

      <div className="space-y-2.5 px-5 pt-4">
        <button
          onClick={handleEnablePush}
          className="press-fx flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white py-3.5 text-sm font-bold text-brand-dark"
        >
          <Bell size={17} /> Activar notificaciones push
        </button>
        {pushStatus && <p className="text-center text-xs text-inksoft">{pushStatus}</p>}

        <button
          onClick={toggle}
          className="press-fx flex w-full items-center justify-between rounded-2xl border border-line bg-white px-4 py-3.5 text-sm font-bold"
        >
          <span className="flex items-center gap-2 text-brand-dark">
            <Moon size={17} /> Modo oscuro
          </span>
          <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${dark ? 'bg-brand' : 'bg-neutral-200'}`}>
            <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-5' : 'translate-x-0'}`} />
          </span>
        </button>

        <InstallAppButton />
      </div>

      <div className="px-5 pt-6">
        <button 
          onClick={() => setIsActivityExpanded(!isActivityExpanded)}
          className="press-fx flex w-full items-center justify-between font-display text-[15.5px] font-extrabold"
        >
          <span className="flex items-center gap-1.5"><Activity size={16} className="text-brand-dark" /> Mi actividad</span>
          {isActivityExpanded ? <ChevronUp size={20} className="text-inksoft" /> : <ChevronDown size={20} className="text-inksoft" />}
        </button>
        
        {isActivityExpanded && (
          <div className="mt-3">
            {(() => {
              const now = new Date();
              const combined = [
                ...mine.map((m) => ({ match: m, role: 'Organizaste' as const })),
                ...joined.map((m) => ({ match: m, role: 'Jugaste' as const })),
              ];
              const upcoming = combined
                .filter((a) => new Date(`${a.match.match_date}T${a.match.match_time}`) >= now)
                .sort((a, b) => `${a.match.match_date}${a.match.match_time}`.localeCompare(`${b.match.match_date}${b.match.match_time}`));
              const past = combined
                .filter((a) => new Date(`${a.match.match_date}T${a.match.match_time}`) < now)
                .sort((a, b) => `${b.match.match_date}${b.match.match_time}`.localeCompare(`${a.match.match_date}${a.match.match_time}`));

              if (combined.length === 0) {
                return (
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <p className="text-sm text-inksoft">Todavía no organizaste ni jugaste ningún partido.</p>
                  </div>
                );
              }

              return (
                <>
                  {upcoming.length > 0 && (
                    <>
                      <p className="mb-1.5 text-xs font-bold text-inksoft">Próximos</p>
                      <div className="mb-4 overflow-hidden rounded-2xl border border-line bg-white">
                        {upcoming.map((a) => (
                          <ActivityRow key={`${a.role}-${a.match.id}`} activity={a} onClick={() => router.push(`/partido/${a.match.id}`)} />
                        ))}
                      </div>
                    </>
                  )}
                  {past.length > 0 && (
                    <>
                      <p className="mb-1.5 text-xs font-bold text-inksoft">Jugados</p>
                      <div className="overflow-hidden rounded-2xl border border-line bg-white">
                        {past.map((a) => (
                          <ActivityRow key={`${a.role}-${a.match.id}`} activity={a} onClick={() => router.push(`/partido/${a.match.id}`)} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {showRefConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-center text-yellow-500">
              <AlertCircle size={48} />
            </div>
            <h3 className="mb-2 text-center font-display text-xl font-bold">¿Estás seguro?</h3>
            <p className="mb-6 text-center text-sm text-inksoft">
              ¿Querés {profile.is_referee ? 'desactivar' : 'activar'} tu modo Árbitro?
              <br/><br/>
              <span className="font-bold text-ink">Tené en cuenta que una vez realizado el cambio, deberás esperar 24 horas para poder volver a modificarlo.</span> Esto evita que haya perfiles de prueba inactivos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRefConfirm(false)}
                className="press-fx flex-1 rounded-xl bg-neutral-100 py-3.5 font-bold text-ink hover:bg-neutral-200"
              >
                No, cancelar
              </button>
              <button
                onClick={executeToggleReferee}
                className="press-fx flex-1 rounded-xl bg-yellow-500 py-3.5 font-bold text-yellow-950 shadow-md"
              >
                Sí, confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 pt-6">
        <h2 className="mb-3 font-display text-[15.5px] font-extrabold">Modo Árbitro</h2>
        <div className="overflow-hidden rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-bold text-ink">Soy Árbitro Oficial</div>
              <div className="text-xs text-inksoft max-w-[200px]">Activá esto para acceder a la bolsa de trabajo y arbitrar partidos.</div>
            </div>
            <button
              type="button"
              disabled={!canToggleReferee || togglingReferee}
              onClick={toggleRefereeStatus}
              className={`relative h-7 w-12 rounded-full transition-colors ${profile.is_referee ? 'bg-brand' : 'bg-neutral-200'} ${!canToggleReferee ? 'opacity-50' : ''}`}
            >
              <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${profile.is_referee ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          {!canToggleReferee && (
            <div className="mt-2 text-xs font-bold text-yellow-600 bg-yellow-50 p-2 rounded-lg">
              Podrás volver a cambiar de rol en {Math.ceil(refereeCooldown)} hora(s) (por seguridad).
            </div>
          )}
          {profile.is_referee && (
            <button
              onClick={() => router.push('/')}
              className="mt-3 press-fx flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-sm"
            >
              Ir al Inicio (Bolsa de Árbitros)
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pt-6">
        <h2 className="mb-3 font-display text-[15.5px] font-extrabold">Reputación</h2>
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <RepRow label="Puntualidad" value={profile.punctuality} />
          <RepRow label="Asistencia" value={profile.attendance} />
          <RepRow label="Respeto" value={profile.respect} />
        </div>
        <p className="mt-2 text-[11px] text-inksoft">La reputación se basa en puntualidad, asistencia y respeto — nunca en nivel futbolístico.</p>
      </div>

      <div className="px-5 pt-6">
        <a
          href="https://link.mercadopago.com.ar/salvaelfutbol"
          target="_blank"
          rel="noreferrer"
          className="press-fx flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00B1EA] py-3.5 text-sm font-bold text-white"
        >
          ¿Te salvamos el fútbol? ¡Tiranos un centro! 😉
        </a>
        <p className="mt-2 text-center text-[11px] text-inksoft">Te lleva a Mercado Pago, fuera de la app.</p>
      </div>

      <div className="px-5 pt-6">
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <button
            onClick={() => router.push('/ayuda')}
            className="press-fx flex w-full items-center justify-between border-b border-line px-4 py-3.5 text-left text-sm font-semibold"
          >
            <span className="flex items-center gap-2"><HelpCircle size={16} className="text-brand-dark" /> Centro de ayuda</span>
            <ChevronRight size={16} className="text-inksoft" />
          </button>
          <button
            onClick={() => router.push('/terminos')}
            className="press-fx flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold"
          >
            <span className="flex items-center gap-2"><FileText size={16} className="text-brand-dark" /> Términos y condiciones</span>
            <ChevronRight size={16} className="text-inksoft" />
          </button>
        </div>
      </div>

      <div className="px-5 pt-6">
        <button onClick={() => signOut()} className="press-fx flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3.5 text-sm font-bold text-red-600">
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function ActivityRow({
  activity,
  onClick,
}: {
  activity: { match: Match; role: 'Organizaste' | 'Jugaste' };
  onClick: () => void;
}) {
  const { match, role } = activity;
  const statusLabel =
    match.status === 'complete' ? 'Completo' : match.status === 'cancelled' ? 'Cancelado' : match.match_type === 'equipo_rival' ? 'Equipo rival' : `Faltan ${match.missing_players}`;
  return (
    <button
      onClick={onClick}
      className="press-fx flex w-full items-center justify-between border-b border-line px-4 py-3 text-left text-sm last:border-0"
    >
      <span>
        <span className="mr-1.5 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-inksoft">{role}</span>
        {match.zone} · {match.match_date} {match.match_time.slice(0, 5)}
      </span>
      <span className="rounded-full bg-brand-pale px-2.5 py-1 text-[11px] font-bold text-brand-dark">{statusLabel}</span>
    </button>
  );
}

function Stat({ label, value, last }: { label: string; value: string | number; last?: boolean }) {
  return (
    <div className={`px-3 ${!last ? 'border-r border-white/20' : ''}`}>
      <b className="block font-display text-[17px] text-white">{value}</b>
      <span className="text-[10.5px] text-white/65">{label}</span>
    </div>
  );
}
function RepRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-4 py-3 text-sm last:border-0">
      <span>{label}</span>
      <span className="rounded-full bg-brand-pale px-2.5 py-1 text-xs font-bold text-brand-dark">{value ? `${value} ★` : 'Sin datos'}</span>
    </div>
  );
}
