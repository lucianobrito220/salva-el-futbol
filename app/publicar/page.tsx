'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Level, MatchType, TeamFormat, Gender } from '@/lib/types';
import SuccessCheck from '@/components/SuccessCheck';
import SplashLoading from '@/components/SplashLoading';
import { getLocalISODate } from '@/lib/dateUtils';
import { MapPin, Check, ArrowLeft, ChevronRight, ChevronLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import { showToast } from '@/lib/toast';

const AddressAutocomplete = dynamic(() => import('@/components/AddressAutocomplete'), { ssr: false });
const CourtPickerModal = dynamic(() => import('@/components/CourtPickerModal'), { ssr: false });

export default function PublicarPage() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();

  const [city, setCity] = useState('');
  const [court, setCourt] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationCoords, setLocationCoords] = useState<{lat: number, lng: number} | null>(null);
  const [date, setDate] = useState(getLocalISODate());
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
    if (profile?.city) setCity(profile.city);
  }, [profile]);

  async function publish() {
    setError('');
    if (!city.trim() || !court.trim() || !date || !time || !price) {
      showToast.error('Completá todos los campos.');
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
      showToast.error(`Error: ${insertError?.message || 'No se pudo publicar'}`);
      return;
    }

    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: data.id }),
    }).catch(() => {});

    setSubmitting(false);
    showToast.success('¡Partido publicado con éxito!');
    setShowSuccess(true);
    setTimeout(() => router.push(`/partido/${data.id}`), 2200);
  }

  if (loading) return <SplashLoading />;

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-5 text-center bg-bg pb-24">
        <h2 className="mb-2 font-display text-xl font-bold">Iniciá sesión</h2>
        <p className="text-sm text-inksoft">Necesitás una cuenta para armar un partido.</p>
        <Link href="/auth?next=/publicar" className="mt-6 rounded-xl bg-brand px-6 py-3 font-bold text-white shadow-lg press-fx">
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
  router, city, setCity, court, setCourt,
  locationAddress, setLocationAddress, setLocationCoords, date, setDate,
  time, setTime, matchType, setMatchType,
  teamFormat, setTeamFormat, missing, setMissing,
  price, setPrice, level, setLevel,
  gender, setGender, description, setDescription,
  needsReferee, setNeedsReferee,
  submitting, error, showSuccess, publish
}: any) {
  const searchParams = useSearchParams();
  const [showCourtPicker, setShowCourtPicker] = useState(false);
  const [step, setStep] = useState(1);
  
  useEffect(() => {
    if (searchParams.get('tipo') === 'equipo_rival') {
      setMatchType('equipo_rival');
    }
  }, [searchParams, setMatchType]);

  const handleNext = () => {
    if (step === 1) {
      if (!price) {
        showToast.error('Por favor, ingresá el precio de la seña/cancha.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!city || !court || !date || !time) {
        showToast.error('Completá la ciudad, cancha, fecha y hora.');
        return;
      }
      setStep(3);
    }
  };

  const cardBase = "shadow-card rounded-2xl bg-white dark:bg-charcoal border p-4 transition press-fx flex items-center justify-center text-center text-[13px] font-bold";
  const cardInactive = "border-line dark:border-charcoal-line text-inksoft dark:text-neutral-400";
  const cardActive = "border-brand bg-brand/5 shadow-glow-brand text-brand-dark dark:text-brand";

  const inputClass = "w-full rounded-xl border border-line bg-white p-3.5 text-[15px] text-ink transition-all focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 dark:border-charcoal-line dark:bg-charcoal dark:text-white";

  return (
    <div className="pb-10 bg-bg dark:bg-black min-h-screen">
      {showSuccess && <SuccessCheck message="¡Partido publicado!" donate />}
      
      {/* Header Visual */}
      <div 
        className="relative overflow-hidden px-5 pb-6 pt-7 text-white bg-cover bg-center shadow-card"
        style={{ backgroundImage: 'url("/brand/publicar-partido-bg.jpg")' }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="absolute top-4 left-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-white transition-colors hover:bg-black/50 press-fx">
          <ArrowLeft size={20} />
        </button>
        <div className="relative z-10 mt-8">
          <h1 className="mb-1 font-display text-2xl font-extrabold tracking-tight">Publicar partido</h1>
          <p className="text-[13px] text-white/80 font-medium">Paso {step} de 3</p>
        </div>
      </div>

      <div className="px-5 pt-6">
        {/* Stepper Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2 px-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-2 w-2 rounded-full transition-colors duration-500 ${step >= s ? 'bg-brand' : 'bg-neutral-200 dark:bg-charcoal'}`} />
            ))}
          </div>
          <div className="h-1.5 w-full bg-neutral-200 dark:bg-charcoal rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-5">
          {/* STEP 1: Detalles Básicos */}
          {step === 1 && (
            <div className="slide-up-sm space-y-5">
              <Field label="¿Qué necesitás?">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMatchType('jugadores_sueltos')}
                    className={`${cardBase} ${matchType === 'jugadores_sueltos' ? cardActive : cardInactive}`}
                  >
                    Jugadores sueltos
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchType('equipo_rival')}
                    className={`${cardBase} ${matchType === 'equipo_rival' ? cardActive : cardInactive}`}
                  >
                    Equipo rival
                  </button>
                </div>
                {matchType === 'equipo_rival' && (
                  <p className="mt-2 text-[11px] text-inksoft dark:text-neutral-400">Ya tenés tu equipo armado y buscás otro equipo completo para jugar.</p>
                )}
                
                <button
                  type="button"
                  onClick={() => router.push('/publicar-torneo')}
                  className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 py-4 text-[13px] font-bold text-purple-700 hover:bg-purple-100 press-fx dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300 shadow-card transition-all"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200">🏆</span>
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
                      className={`${cardBase} py-3 ${teamFormat === f ? cardActive : cardInactive}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Género">
                <div className="grid grid-cols-3 gap-2">
                  {(['Masculino', 'Femenino', 'Mixto'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`${cardBase} py-3 ${gender === g ? cardActive : cardInactive}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Nivel Requerido">
                <div className="grid grid-cols-3 gap-2">
                  {(['Recreativo', 'Intermedio', 'Competitivo'] as Level[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevel(l)}
                      className={`${cardBase} py-3 px-1 text-[12px] ${level === l ? cardActive : cardInactive}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Precio por jugador ($)">
                <input type="number" min={0} className={`${inputClass} text-lg font-bold`} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ej: 3500" />
              </Field>

              <button onClick={handleNext} className="press-fx mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink dark:bg-white text-white dark:text-ink py-4 font-display font-bold shadow-card">
                Siguiente Paso <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* STEP 2: Ubicación y Fecha */}
          {step === 2 && (
            <div className="slide-up-sm space-y-5">
              <Field label="Ciudad">
                <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej: Yerba Buena" />
              </Field>
              
              <Field label="Nombre del Complejo o Cancha">
                <input className={`${inputClass} mb-3`} value={court} onChange={(e) => setCourt(e.target.value)} placeholder="Ej: Complejo La 10" />
                <button
                  type="button"
                  onClick={() => setShowCourtPicker(true)}
                  className="press-fx flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-brand/40 bg-brand-pale/50 dark:bg-brand/10 dark:border-brand/30 py-3.5 text-[13px] font-bold text-brand-dark dark:text-brand hover:bg-brand-pale transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/20"><MapPin size={16} className="text-brand" /></span>
                  Buscar cancha en el mapa 🗺️
                </button>
              </Field>

              {showCourtPicker && (
                <CourtPickerModal
                  cityHint={city}
                  onClose={() => setShowCourtPicker(false)}
                  onSelect={(name, address, lat, lng) => {
                    setCourt(name);
                    if (address) setLocationAddress(address);
                    setLocationCoords({ lat, lng });
                    setShowCourtPicker(false);
                  }}
                />
              )}

              <Field label="Dirección exacta (Opcional)">
                <AddressAutocomplete
                  value={locationAddress}
                  onChange={setLocationAddress}
                  onLocationSelect={(lat, lng) => setLocationCoords({ lat, lng })}
                  placeholder="Ej: Av. Aconquija 1200"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha">
                  <input 
                    type="date" 
                    className={`${inputClass} font-bold`} 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    style={{ minHeight: '48px' }}
                  />
                </Field>
                <Field label="Hora">
                  <input 
                    type="time" 
                    className={`${inputClass} font-bold`} 
                    value={time} 
                    onChange={(e) => setTime(e.target.value)} 
                    style={{ minHeight: '48px' }}
                  />
                </Field>
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(1)} className="press-fx flex items-center justify-center rounded-2xl bg-line dark:bg-charcoal-line px-5 py-4 font-bold text-ink dark:text-white shadow-card">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={handleNext} className="press-fx flex-1 flex items-center justify-center gap-2 rounded-2xl bg-ink dark:bg-white text-white dark:text-ink py-4 font-display font-bold shadow-card">
                  Siguiente Paso <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Confirmación y Ajustes */}
          {step === 3 && (
            <div className="slide-up-sm space-y-5">
              {matchType === 'jugadores_sueltos' && (
                <Field label="Jugadores faltantes">
                  <div className="flex items-center gap-4 bg-white dark:bg-charcoal p-3 rounded-2xl border border-line dark:border-charcoal-line shadow-card">
                    <button type="button" onClick={() => setMissing((m: number) => Math.max(1, m - 1))} className="h-12 w-12 rounded-xl border border-line bg-white dark:bg-charcoal dark:border-charcoal-line flex items-center justify-center text-2xl font-bold text-brand press-fx shadow-sm">−</button>
                    <span className="font-display text-xl font-bold flex-1 text-center dark:text-white">{missing}</span>
                    <button type="button" onClick={() => setMissing((m: number) => Math.min(10, m + 1))} className="h-12 w-12 rounded-xl border border-line bg-white dark:bg-charcoal dark:border-charcoal-line flex items-center justify-center text-2xl font-bold text-brand press-fx shadow-sm">+</button>
                  </div>
                </Field>
              )}

              <div className="flex items-center justify-between rounded-2xl border border-line dark:border-charcoal-line bg-white dark:bg-charcoal p-4 shadow-card">
                <div>
                  <div className="font-bold text-ink dark:text-white text-sm">Solicitar Árbitro Oficial</div>
                  <div className="text-xs text-inksoft dark:text-neutral-400 mt-0.5">Se publicará en la bolsa de trabajo para árbitros.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setNeedsReferee(!needsReferee)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${needsReferee ? 'bg-brand' : 'bg-neutral-200 dark:bg-charcoal-light'}`}
                >
                  <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${needsReferee ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <Field label="Descripción adicional (opcional)">
                <textarea
                  className={`${inputClass} h-24 resize-none`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Cancha techada de sintético. Llevar pechera blanca y otra oscura."
                />
              </Field>

              {error && <p className="text-sm font-bold text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-xl">{error}</p>}

              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(2)} className="press-fx flex items-center justify-center rounded-2xl bg-line dark:bg-charcoal-line px-5 py-4 font-bold text-ink dark:text-white shadow-card">
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={publish}
                  disabled={submitting}
                  className="press-fx flex-1 flex items-center justify-center gap-2 rounded-2xl bg-brand py-4 font-display font-bold text-white shadow-glow-brand disabled:opacity-80"
                >
                  {submitting ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Publicando…
                    </>
                  ) : (
                    <>
                      Publicar partido <Check size={20} strokeWidth={3} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-ink dark:text-white">{label}</label>
      {children}
    </div>
  );
}
