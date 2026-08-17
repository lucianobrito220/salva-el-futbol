'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import SuccessCheck from '@/components/SuccessCheck';
import SplashLoading from '@/components/SplashLoading';
import { ArrowLeft, Phone, Trophy, CheckSquare, AlertCircle } from 'lucide-react';

export default function PublicarTorneoPage() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();

  const [nombre, setNombre] = useState('');
  const [tipoPublicacion, setTipoPublicacion] = useState('busco_equipos');
  const [categoria, setCategoria] = useState('');
  const [genero, setGenero] = useState('Mixto');
  const [nivel, setNivel] = useState('Competitivo');
  const [fechas, setFechas] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [aforo, setAforo] = useState('');
  const [coste, setCoste] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [contacto, setContacto] = useState('');
  const [imagenBase64, setImagenBase64] = useState<string | null>(null);
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Guest access allowed, handled in render
  }, [loading, session, router]);

  useEffect(() => {
    if (profile?.phone && !contacto) setContacto(profile.phone);
    if (profile?.city && !ubicacion) setUbicacion(profile.city);
  }, [profile, contacto, ubicacion]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.7 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setImagenBase64(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  async function publish() {
    setError('');
    
    if (!nombre.trim() || !categoria.trim() || !fechas.trim() || !ubicacion.trim() || !aforo.trim() || !coste.trim() || !contacto.trim()) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }
    
    if (!termsAccepted) {
      setError('Debes aceptar la exención de responsabilidad para publicar el torneo.');
      return;
    }

    if (!session) return;

    setSubmitting(true);
    
    // Como la base de datos no tiene columnas específicas para Torneos, 
    // agruparemos toda la info en la descripción para este modo clasificado.
    const torneoDetails = `
${imagenBase64 ? `IMAGEN: ${imagenBase64}\n` : ''}TIPO: ${tipoPublicacion === 'busco_equipos' ? 'Inscripción de equipos' : 'Busco jugadores para mi equipo de torneo'}
TORNEO: ${nombre.trim()}
GÉNERO: ${genero}
NIVEL: ${nivel}
CATEGORÍA: ${categoria.trim()}
FECHAS: ${fechas.trim()}
AFORO: ${aforo.trim()} equipos
COSTO INSCRIPCIÓN: $${coste.trim()}
CONTACTO (WhatsApp): ${contacto.trim()}
---
${descripcion.trim()}
    `.trim();

    const { data, error: insertError } = await supabase
      .from('matches')
      .insert({
        organizer_id: session.user.id,
        city: ubicacion.trim(),
        zone: 'Torneo',
        court: ubicacion.trim(),
        match_date: new Date().toISOString().slice(0, 10), // Guardamos hoy por defecto
        match_time: '00:00', 
        match_type: 'equipo_rival', // Guardamos como equipo rival temporalmente hasta que haya match_type='torneo'
        missing_players: 0,
        level: nivel as any,
        gender: genero as any,
        description: torneoDetails,
        price: Number(coste) || 0,
      })
      .select('id')
      .single();

    if (insertError || !data) {
      setSubmitting(false);
      setError('No se pudo publicar el torneo. Intentá de nuevo.');
      return;
    }

    setSubmitting(false);
    setShowSuccess(true);
    // Redirigimos al inicio luego del éxito
    setTimeout(() => router.push('/'), 2200);
  }

  if (loading) return <SplashLoading />;

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-5 text-center bg-bg pb-24">
        <h2 className="mb-2 font-display text-xl font-bold">Iniciá sesión</h2>
        <p className="text-sm text-inksoft">Necesitás una cuenta para armar un torneo.</p>
        <Link href="/auth?next=/publicar-torneo" className="mt-6 rounded-xl bg-brand px-6 py-3 font-bold text-white shadow-lg">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-10">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="press-fx text-ink">
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-display text-lg font-extrabold flex items-center gap-2">
            <Trophy size={20} className="text-purple-600" /> Publicar Torneo
          </h1>
        </div>
      </header>

      <div className="px-5 pt-6">
        <p className="mb-6 text-sm text-inksoft">
          Completa este formulario para publicar tu torneo como clasificado. Los interesados te contactarán directamente por WhatsApp.
        </p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} className="flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-5">
          <div className="mb-2">
            <label className="mb-2 block text-[13px] font-bold text-ink">¿Qué estás buscando? *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoPublicacion('busco_equipos')}
                className={`rounded-xl border px-2 py-3 text-xs font-bold transition-all ${
                  tipoPublicacion === 'busco_equipos' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-line bg-white text-inksoft'
                }`}
              >
                Inscribir equipos
              </button>
              <button
                type="button"
                onClick={() => setTipoPublicacion('busco_jugadores')}
                className={`rounded-xl border px-2 py-3 text-xs font-bold transition-all ${
                  tipoPublicacion === 'busco_jugadores' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-line bg-white text-inksoft'
                }`}
              >
                Jugadores p/ mi equipo
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Imagen del Torneo (Opcional)</label>
            <div className="flex items-center gap-4">
              {imagenBase64 && (
                <img src={imagenBase64} alt="Preview" className="h-16 w-16 rounded-xl object-cover border border-line" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-xs text-inksoft file:mr-4 file:rounded-full file:border-0 file:bg-purple-50 file:px-4 file:py-2 file:text-xs file:font-bold file:text-purple-700 hover:file:bg-purple-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Nombre del Torneo *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Copa de Verano 2026"
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm border border-line focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Categoría *</label>
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ej: Libre, +30"
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm border border-line focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Género *</label>
              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value)}
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm border border-line focus:border-purple-500 focus:outline-none appearance-none"
              >
                <option value="Mixto">Mixto</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Nivel *</label>
              <select
                value={nivel}
                onChange={(e) => setNivel(e.target.value)}
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm border border-line focus:border-purple-500 focus:outline-none appearance-none"
              >
                <option value="Recreativo">Recreativo</option>
                <option value="Intermedio">Intermedio</option>
                <option value="Competitivo">Competitivo</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Aforo (Equipos) *</label>
              <input
                type="number"
                value={aforo}
                onChange={(e) => setAforo(e.target.value)}
                placeholder="Ej: 16"
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm border border-line focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Fechas (Inicio y fin) *</label>
            <input
              type="text"
              value={fechas}
              onChange={(e) => setFechas(e.target.value)}
              placeholder="Ej: 10 de Agosto al 25 de Agosto"
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm border border-line focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Ubicación (Sede) *</label>
            <input
              type="text"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Complejo, Dirección, Ciudad"
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm border border-line focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Costo de Inscripción *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-inksoft">$</span>
                <input
                  type="number"
                  value={coste}
                  onChange={(e) => setCoste(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-2xl bg-white py-3 pl-8 pr-4 text-sm border border-line focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Teléfono / WhatsApp *</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-inksoft" />
                <input
                  type="tel"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  placeholder="3815..."
                  className="w-full rounded-2xl bg-white py-3 pl-9 pr-4 text-sm border border-line focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Descripción (Opcional)</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Premios, formato de juego, reglamento breve..."
              rows={3}
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm border border-line focus:border-purple-500 focus:outline-none"
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-neutral-50 p-4 border border-line cursor-pointer">
            <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${termsAccepted ? 'bg-purple-600 border-purple-600' : 'border-neutral-300 bg-white'}`}>
              {termsAccepted && <CheckSquare size={14} className="text-white" />}
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={termsAccepted} 
              onChange={() => setTermsAccepted(!termsAccepted)} 
            />
            <span className="text-xs text-inksoft leading-tight">
              <strong>Exención de Responsabilidad:</strong> Entiendo que la plataforma solo funciona como tablón de anuncios clasificados y no se responsabiliza por la organización, pagos internos, fixture, ni gestión del torneo. *
            </span>
          </label>

          <button
            onClick={publish}
            disabled={submitting}
            className="press-fx w-full rounded-2xl bg-purple-600 py-4 font-display font-bold text-white shadow-lg disabled:opacity-50 mt-2"
          >
            {submitting ? 'Publicando...' : 'Publicar Torneo'}
          </button>
        </div>
      </div>

      {showSuccess && <SuccessCheck message="¡Torneo publicado con éxito!" />}
    </div>
  );
}
