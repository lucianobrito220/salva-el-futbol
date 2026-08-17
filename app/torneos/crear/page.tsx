'use client';

import Link from 'next/link';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import SuccessCheck from '@/components/SuccessCheck';
import SplashLoading from '@/components/SplashLoading';
import { ArrowLeft, Trophy } from 'lucide-react';

export default function CrearTorneoPage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Guest access allowed, handled in render
  }, [loading, session, router]);

  async function handleCreate() {
    setError('');
    if (!name.trim()) {
      setError('El nombre del torneo es obligatorio.');
      return;
    }
    if (!session) return;

    setSubmitting(true);
    
    const { data, error: tError } = await supabase
      .from('tournaments')
      .insert({
        name: name.trim(),
        organizer_id: session.user.id,
        status: 'abierto',
      })
      .select('id')
      .single();

    if (tError || !data) {
      setSubmitting(false);
      console.error(tError);
      setError(`Error: ${tError?.message || 'No se pudo crear el torneo.'}`);
      return;
    }

    setSubmitting(false);
    setShowSuccess(true);
    setTimeout(() => router.push(`/torneos/${data.id}`), 2000);
  }

  if (loading) return <SplashLoading />;

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-5 text-center bg-bg pb-24">
        <h2 className="mb-2 font-display text-xl font-bold">Iniciá sesión</h2>
        <p className="text-sm text-inksoft">Necesitás una cuenta para crear un torneo.</p>
        <Link href="/auth?next=/torneos/crear" className="mt-6 rounded-xl bg-brand px-6 py-3 font-bold text-white shadow-lg">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-10">
      {showSuccess && <SuccessCheck message="¡Torneo creado!" />}
      
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white px-5 py-4">
        <button onClick={() => router.back()} className="press-fx text-ink">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-lg font-extrabold flex items-center gap-2">
          Crear Torneo
        </h1>
      </header>

      <div className="px-5 pt-6">
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 p-5 text-white shadow-lg text-center">
          <Trophy size={48} className="mx-auto mb-3 text-yellow-300" />
          <h2 className="font-display text-lg font-bold">Iniciá tu propia Liga</h2>
          <p className="text-sm text-white/80 mt-1">
            Administrá equipos, generá fixtures y llevá la tabla de posiciones automáticamente.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink">Nombre del Torneo *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Copa Tucumán F5"
              className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-sm outline-none focus:border-brand"
            />
          </div>

          {error && <p className="text-xs font-bold text-red-600">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={submitting}
            className="press-fx mt-4 w-full rounded-xl bg-brand py-4 font-display font-bold text-white shadow-lg disabled:opacity-50"
          >
            {submitting ? 'Creando...' : 'Comenzar a organizar'}
          </button>
        </div>
      </div>
    </div>
  );
}
