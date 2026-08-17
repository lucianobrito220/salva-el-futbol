'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Level, MatchType, TeamFormat, Gender } from '@/lib/types';
import SuccessCheck from '@/components/SuccessCheck';
import SplashLoading from '@/components/SplashLoading';
import PitchPattern from '@/components/PitchPattern';
import { MapPin, Check, ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';

const AddressAutocomplete = dynamic(() => import('@/components/AddressAutocomplete'), { ssr: false });

const genderStyles: Record<Gender, string> = {
  Masculino: 'border-blue-400 bg-blue-50 text-blue-700',
  Femenino: 'border-pink-400 bg-pink-50 text-pink-700',
  Mixto: 'border-purple-400 bg-purple-50 text-purple-700',
};

export default function PublicarPage() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();

  const [city, setCity] = useState('');
  const [court, setCourt] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationCoords, setLocationCoords] = useState<{lat: number, lng: number} | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('21:00');
  const [matchType, setMatchType] = useState<MatchType>('jugadores_sueltos');
  const [teamFormat, setTeamFormat] = useState<TeamFormat>('F5');
  const [missing, setMissing] = useState(2);
  const [price, setPrice] = useState('');
  const [level, setLevel] = useState<Level>('Intermedio');
  const [gender, setGender] = useState<Gender>('Masculino');
  const [needsReferee, setNeedsReferee] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Guest access allowed, handled in render
  }, [loading, session, router]);

  useEffect(() => {
    if (profile?.city) setCity(profile.city);
  }, [profile]);

  async function publish() {
    setError('');
    if (!city.trim() || !court.trim() || !date || !time || !price) {
      setError('Completá todos los campos.');
      return;
    }
    if (!session) return;

    setSubmitting(true);
    const { data, error: insertError } = await supabase
      .from('matches')
      .insert({
        organizer_id: session.user.id,
        city: city.trim(),
        zone: city.trim(),
        court: court.trim(),
        location_address: locationAddress.trim() 
          ? `${locationAddress.trim()}${locationCoords ? `|${locationCoords.lat}|${locationCoords.lng}` : ''}`
          : null,
        match_date: date,
        match_time: time,
        match_type: matchType,
        team_format: teamFormat,
        missing_players: matchType === 'equipo_rival' ? 0 : missing,
        level,
        gender,
        description: description.trim() || null,
        price: Number(price),
        needs_referee: needsReferee,
      })
      .select('id')
      .single();

    if (insertError || !data) {
      setSubmitting(false);
      console.error(insertError);
      setError(`Error: ${insertError?.message || 'No se pudo publicar'}`);
      return;
    }

    // Dispara notificaciones + push reales a jugadores de la misma ciudad.
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: data.id }),
    }).catch(() => {});

    setSubmitting(false);
    setShowSuccess(true);
    setTimeout(() => router.push(`/partido/${data.id}`), 2200);
  }

  if (loading) return <SplashLoading />;

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-5 text-center bg-bg pb-24">
        <h2 className="mb-2 font-display text-xl font-bold">Iniciá sesión</h2>
        <p className="text-sm text-inksoft">Necesitás una cuenta para armar un partido.</p>
        <Link href="/auth?next=/publicar" className="mt-6 rounded-xl bg-brand px-6 py-3 font-bold text-white shadow-lg">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <Suspense fallback={<SplashLoading />}>
      <PublicarForm 
        router={router} 
        session={session} 
        profile={profile} 
        city={city} setCity={setCity}
        court={court} setCourt={setCourt}
        locationAddress={locationAddress} setLocationAddress={setLocationAddress}
        setLocationCoords={setLocationCoords}
        date={date} setDate={setDate}
        time={time} setTime={setTime}
        matchType={matchType} setMatchType={setMatchType}
        teamFormat={teamFormat} setTeamFormat={setTeamFormat}
        missing={missing} setMissing={setMissing}
        price={price} setPrice={setPrice}
        level={level} setLevel={setLevel}
        gender={gender} setGender={setGender}
        description={description} setDescription={setDescription}
        needsReferee={needsReferee} setNeedsReferee={setNeedsReferee}
        submitting={submitting} setSubmitting={setSubmitting}
        error={error} setError={setError}
        showSuccess={showSuccess} setShowSuccess={setShowSuccess}
        publish={publish}
      />
    </Suspense>
  );
}

function PublicarForm({
  router, session, profile,
  city, setCity, court, setCourt,
  locationAddress, setLocationAddress, setLocationCoords, date, setDate,
  time, setTime, matchType, setMatchType,
  teamFormat, setTeamFormat, missing, setMissing,
  price, setPrice, level, setLevel,
  gender, setGender, description, setDescription,
  needsReferee, setNeedsReferee,
  submitting, error, showSuccess, publish
}: any) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    if (searchParams.get('tipo') === 'equipo_rival') {
      setMatchType('equipo_rival');
    }
  }, [searchParams, setMatchType]);

  return (
    <div className="pb-10">
      {showSuccess && <SuccessCheck message="¡Partido publicado!" donate />}
      <div 
        className="relative overflow-hidden px-5 pb-6 pt-7 text-white bg-cover bg-center"
        style={{ backgroundImage: 'url("/brand/publicar-partido-bg.jpg")' }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <button onClick={() => router.back()} className="absolute top-4 left-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-white transition-colors hover:bg-black/50 press-fx">
          <ArrowLeft size={20} />
        </button>
        <div className="relative z-10 mt-6">
          <h1 className="mb-1 font-display text-lg font-extrabold">Publicar partido</h1>
          <p className="text-xs text-white/75">Completalo en menos de 30 segundos.</p>
        </div>
      </div>
      <div className="px-5 pt-6">
      <div className="space-y-4">
        <Field label="¿Qué necesitás?">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMatchType('jugadores_sueltos')}
              className={`rounded-xl border px-2 py-2.5 text-xs font-bold ${
                matchType === 'jugadores_sueltos' ? 'border-brand bg-brand-pale text-brand-dark' : 'border-line bg-white text-inksoft'
              }`}
            >
              Jugadores sueltos
            </button>
            <button
              type="button"
              onClick={() => setMatchType('equipo_rival')}
              className={`rounded-xl border px-2 py-2.5 text-xs font-bold ${
                matchType === 'equipo_rival' ? 'border-brand bg-brand-pale text-brand-dark' : 'border-line bg-white text-inksoft'
              }`}
            >
              Equipo rival
            </button>
          </div>
          {matchType === 'equipo_rival' && (
            <p className="mt-1.5 text-[11px] text-inksoft">Ya tenés tu equipo armado y buscás otro equipo completo para jugar.</p>
          )}
          
          <button
            type="button"
            onClick={() => router.push('/publicar-torneo')}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 py-2.5 text-xs font-bold text-purple-700 hover:bg-purple-100 press-fx"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-200 text-purple-700">🏆</span>
            Publicar Torneo
          </button>
        </Field>

        <Field label="Formato">
          <div className="grid grid-cols-3 gap-2">
            {(['F5', 'F7', 'F11'] as TeamFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setTeamFormat(f)}
                className={`rounded-xl border px-1 py-2.5 text-xs font-bold ${
                  teamFormat === f ? 'border-brand bg-brand-pale text-brand-dark' : 'border-line bg-white text-inksoft'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Ciudad">
          <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej: Yerba Buena" />
        </Field>
        <Field label="Cancha">
          <input className="input" value={court} onChange={(e) => setCourt(e.target.value)} placeholder="Ej: Complejo La 10" />
        </Field>
        <Field label="Ubicación (dirección)">
          <AddressAutocomplete
            value={locationAddress}
            onChange={setLocationAddress}
            onLocationSelect={(lat, lng) => setLocationCoords({ lat, lng })}
            placeholder="Ej: Av. Aconquija 1200, Yerba Buena"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Hora">
            <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>

        {matchType === 'jugadores_sueltos' && (
          <Field label="Jugadores faltantes">
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setMissing((m: number) => Math.max(1, m - 1))} className="stepper-btn">−</button>
              <span className="font-display text-xl font-extrabold">{missing}</span>
              <button type="button" onClick={() => setMissing((m: number) => Math.min(10, m + 1))} className="stepper-btn">+</button>
            </div>
          </Field>
        )}

        <Field label="Precio por jugador">
          <input type="number" min={0} className="input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ej: 3500" />
        </Field>

        <Field label="Nivel">
          <div className="grid grid-cols-3 gap-2">
            {(['Recreativo', 'Intermedio', 'Competitivo'] as Level[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className={`rounded-xl border px-1 py-2.5 text-xs font-bold ${
                  level === l ? 'border-brand bg-brand-pale text-brand-dark' : 'border-line bg-white text-inksoft'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Fútbol">
          <div className="grid grid-cols-3 gap-2">
            {(['Masculino', 'Femenino', 'Mixto'] as Gender[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`rounded-xl border px-1 py-2.5 text-xs font-bold ${
                  gender === g ? genderStyles[g] : 'border-line bg-white text-inksoft'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Descripción (opcional)">
          <textarea
            className="input h-24 resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Cancha techada, llevar pechera clara y oscura."
          />
        </Field>

        <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4">
          <div>
            <div className="font-bold text-ink">Solicitar Árbitro</div>
            <div className="text-xs text-inksoft">Se publicará en el mercado de árbitros</div>
          </div>
          <button
            type="button"
            onClick={() => setNeedsReferee(!needsReferee)}
            className={`relative h-7 w-12 rounded-full transition-colors ${needsReferee ? 'bg-brand' : 'bg-neutral-200'}`}
          >
            <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${needsReferee ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <button
          onClick={publish}
          disabled={submitting}
          className="press-fx mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 font-display font-bold text-white shadow-lg shadow-brand/30 disabled:opacity-60"
        >
          {submitting ? 'Publicando…' : 'Publicar partido'} <Check size={20} />
        </button>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 12px;
          border: 1.5px solid #e7e9ec;
          padding: 13px 14px;
          font-size: 14.5px;
        }
        .stepper-btn {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1.5px solid #e7e9ec;
          background: white;
          font-size: 18px;
          font-weight: 700;
          color: #157135;
        }
      `}</style>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold">{label}</label>
      {children}
    </div>
  );
}
