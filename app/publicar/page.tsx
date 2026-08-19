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

  return (
    <div className="pb-10 bg-bg min-h-screen">
      {showSuccess && <SuccessCheck message="¡Partido publicado!" donate />}
      
      {/* Header Visual */}
      <div 
        className="relative overflow-hidden px-5 pb-6 pt-7 text-white bg-cover bg-center"
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
        <div className="flex items-center gap-2 mb-8">
          <div className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${step >= 1 ? 'bg-brand' : 'bg-line dark:bg-charcoal-line'}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${step >= 2 ? 'bg-brand' : 'bg-line dark:bg-charcoal-line'}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${step >= 3 ? 'bg-brand' : 'bg-line dark:bg-charcoal-line'}`} />
        </div>

        <div className="space-y-5">
          {/* STEP 1: Detalles Básicos */}
          {step === 1 && (
            <div className="fade-slide-up space-y-5">
              <Field label="¿Qué necesitás?">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMatchType('jugadores_sueltos')}
                    className={`rounded-xl border px-2 py-3 text-[13px] font-bold transition-all ${
                      matchType === 'jugadores_sueltos' ? 'border-brand bg-brand-pale text-brand-dark ring-2 ring-brand/20' : 'border-line bg-white text-inksoft dark:bg-charcoal dark:border-charcoal-line'
                    }`}
                  >
                    Jugadores sueltos
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchType('equipo_rival')}
                    className={`rounded-xl border px-2 py-3 text-[13px] font-bold transition-all ${
                      matchType === 'equipo_rival' ? 'border-brand bg-brand-pale text-brand-dark ring-2 ring-brand/20' : 'border-line bg-white text-inksoft dark:bg-charcoal dark:border-charcoal-line'
                    }`}
                  >
                    Equipo rival
                  </button>
                </div>
                {matchType === 'equipo_rival' && (
                  <p className="mt-2 text-[11px] text-inksoft">Ya tenés tu equipo armado y buscás otro equipo completo para jugar.</p>
                )}
                
                <button
                  type="button"
                  onClick={() => router.push('/publicar-torneo')}
                  className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 py-3 text-[13px] font-bold text-purple-700 hover:bg-purple-100 press-fx dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300"
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
                      className={`rounded-xl border px-1 py-3 text-[13px] font-bold transition-all ${
                        teamFormat === f ? 'border-brand bg-brand-pale text-brand-dark ring-2 ring-brand/20' : 'border-line bg-white text-inksoft dark:bg-charcoal dark:border-charcoal-line'
                      }`}
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
                      className={`rounded-xl border px-1 py-3 text-[13px] font-bold transition-all ${
                        gender === g ? genderStyles[g] : 'border-line bg-white text-inksoft dark:bg-charcoal dark:border-charcoal-line'
                      }`}
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
                      className={`rounded-xl border px-1 py-3 text-[12px] font-bold transition-all ${
                        level === l ? 'border-brand bg-brand-pale text-brand-dark ring-2 ring-brand/20' : 'border-line bg-white text-inksoft dark:bg-charcoal dark:border-charcoal-line'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Precio por jugador ($)">
                <input type="number" min={0} className="input text-lg font-bold" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ej: 3500" />
              </Field>

              <button onClick={handleNext} className="press-fx mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink dark:bg-white text-white dark:text-ink py-4 font-display font-bold shadow-lg">
                Siguiente Paso <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* STEP 2: Ubicación y Fecha */}
          {step === 2 && (
            <div className="fade-slide-up space-y-5">
              <Field label="Ciudad">
                <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej: Yerba Buena" />
              </Field>
              
              <Field label="Nombre del Complejo o Cancha">
                <input className="input mb-3" value={court} onChange={(e) => setCourt(e.target.value)} placeholder="Ej: Complejo La 10" />
                <button
                  type="button"
                  onClick={() => setShowCourtPicker(true)}
                  className="press-fx flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-brand/40 bg-brand-pale/50 py-3.5 text-[13px] font-bold text-brand-dark hover:bg-brand-pale transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10"><MapPin size={16} className="text-brand" /></span>
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
                    className="input font-bold" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    style={{ colorScheme: 'light', minHeight: '48px', appearance: 'none', WebkitAppearance: 'none' }}
                  />
                </Field>
                <Field label="Hora">
                  <input 
                    type="time" 
                    className="input font-bold" 
                    value={time} 
                    onChange={(e) => setTime(e.target.value)} 
                    style={{ colorScheme: 'light', minHeight: '48px', appearance: 'none', WebkitAppearance: 'none' }}
                  />
                </Field>
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(1)} className="press-fx flex items-center justify-center rounded-2xl bg-line dark:bg-charcoal-line px-5 py-4 font-bold text-ink dark:text-white">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={handleNext} className="press-fx flex-1 flex items-center justify-center gap-2 rounded-2xl bg-ink dark:bg-white text-white dark:text-ink py-4 font-display font-bold shadow-lg">
                  Siguiente Paso <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Confirmación y Ajustes */}
          {step === 3 && (
            <div className="fade-slide-up space-y-5">
              {matchType === 'jugadores_sueltos' && (
                <Field label="Jugadores faltantes">
                  <div className="flex items-center gap-4 bg-white dark:bg-charcoal p-3 rounded-2xl border border-line dark:border-charcoal-line">
                    <button type="button" onClick={() => setMissing((m: number) => Math.max(1, m - 1))} className="stepper-btn press-fx">−</button>
                    <span className="font-display text-2xl font-extrabold flex-1 text-center dark:text-white">{missing}</span>
                    <button type="button" onClick={() => setMissing((m: number) => Math.min(10, m + 1))} className="stepper-btn press-fx">+</button>
                  </div>
                </Field>
              )}

              <div className="flex items-center justify-between rounded-2xl border border-line dark:border-charcoal-line bg-white dark:bg-charcoal p-4">
                <div>
                  <div className="font-bold text-ink dark:text-white">Solicitar Árbitro Oficial</div>
                  <div className="text-xs text-inksoft mt-0.5">Se publicará en la bolsa de trabajo para árbitros.</div>
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
                  className="input h-24 resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Cancha techada de sintético. Llevar pechera blanca y otra oscura."
                />
              </Field>

              {error && <p className="text-sm font-bold text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(2)} className="press-fx flex items-center justify-center rounded-2xl bg-line dark:bg-charcoal-line px-5 py-4 font-bold text-ink dark:text-white">
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={publish}
                  disabled={submitting}
                  className="press-fx flex-1 flex items-center justify-center gap-2 rounded-2xl bg-brand py-4 font-display font-bold text-white shadow-lg shadow-brand/30 disabled:opacity-60"
                >
                  {submitting ? 'Publicando…' : 'Publicar partido'} <Check size={20} strokeWidth={3} />
                </button>
              </div>
            </div>
          )}

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 16px;
          border: 1.5px solid #e7e9ec;
          padding: 14px 16px;
          font-size: 15px;
          background-color: #ffffff;
          color: #1a1a2e;
          -webkit-appearance: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .input:focus {
          border-color: #00d65f;
          outline: none;
          box-shadow: 0 0 0 4px rgba(0, 214, 95, 0.1);
        }
        :global(.dark) .input {
          background-color: #1a1a1a;
          border-color: #2a2a2a;
          color: #ffffff;
        }
        .stepper-btn {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          border: 1.5px solid #e7e9ec;
          background: #f8fafc;
          font-size: 24px;
          font-weight: 700;
          color: #157135;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        :global(.dark) .stepper-btn {
          background: #2a2a2a;
          border-color: #333;
          color: #00d65f;
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
      <label className="mb-2 block text-[13px] font-bold text-ink dark:text-white/90">{label}</label>
      {children}
    </div>
  );
}
