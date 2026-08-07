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
import { Bell, Camera, Pencil, LogOut, Check, Award, Shield, Moon } from 'lucide-react';

export default function PerfilPage() {
  const router = useRouter();
  const { session, profile, loading, signOut, refreshProfile } = useAuth();
  const { dark, toggle } = useTheme();
  const [mine, setMine] = useState<Match[]>([]);
  const [pushStatus, setPushStatus] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState('');

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [ageDraft, setAgeDraft] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !session) router.replace('/auth?next=/perfil');
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

  if (loading || !session || !profile) return <SplashLoading />;

  return (
    <div className="pb-10">
      <div className="border-b border-line bg-brand-dark px-5 pb-5 pt-8 text-center text-white">
        <div className="relative mx-auto mb-3 h-[76px] w-[76px]">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="h-[76px] w-[76px] rounded-full object-cover ring-2 ring-white/30"
            />
          ) : (
            <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white/15 font-display text-3xl font-extrabold text-white ring-2 ring-white/30">
              {profile.name.charAt(0)}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="press-fx absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-brand-dark bg-brand text-white"
          >
            <Camera size={13} />
          </button>
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

        <p className="mb-4 text-[13px] text-white/70">{profile.position || 'Jugador'} · {profile.city || 'Sin ciudad'}</p>
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
          </div>
        )}
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
        <h2 className="mb-3 font-display text-[15.5px] font-extrabold">Mis partidos organizados</h2>
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          {mine.length === 0 ? (
            <p className="p-4 text-sm text-inksoft">Todavía no organizaste partidos.</p>
          ) : (
            mine.map((m) => (
              <button
                key={m.id}
                onClick={() => router.push(`/partido/${m.id}`)}
                className="press-fx flex w-full items-center justify-between border-b border-line px-4 py-3 text-left text-sm last:border-0"
              >
                <span>{m.zone} · {m.match_time.slice(0, 5)}</span>
                <span className="rounded-full bg-brand-pale px-2.5 py-1 text-[11px] font-bold text-brand-dark">
                  {m.status === 'open' ? `Faltan ${m.missing_players}` : m.status}
                </span>
              </button>
            ))
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
        <button onClick={() => signOut()} className="press-fx flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3.5 text-sm font-bold text-red-600">
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </div>
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
