'use client';

import Link from 'next/link';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import SuccessCheck from '@/components/SuccessCheck';
import SplashLoading from '@/components/SplashLoading';
import { ArrowLeft, Shield, Camera } from 'lucide-react';

export default function CrearEquipoPage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Guest access allowed, handled in render
  }, [loading, session, router]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    if (!file.type.startsWith('image/')) return;

    setUploadingLogo(true);
    const path = `${session.user.id}/team_draft_${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setLogoUrl(data.publicUrl);
    } else {
      alert("Error al subir imagen");
    }
    setUploadingLogo(false);
  }

  async function handleCreate() {
    setError('');
    if (!name.trim()) {
      setError('El nombre del equipo es obligatorio.');
      return;
    }
    if (!session) return;

    setSubmitting(true);
    
    // 1. Create Team
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        logo_url: logoUrl.trim() || null,
        captain_id: session.user.id,
      })
      .select('id')
      .single();

    if (teamError || !teamData) {
      setSubmitting(false);
      console.error(teamError);
      setError(`Error: ${teamError?.message || 'No se pudo crear el equipo.'}`);
      return;
    }

    // 2. Add creator as team member
    await supabase
      .from('team_members')
      .insert({
        team_id: teamData.id,
        user_id: session.user.id,
      });

    setSubmitting(false);
    setShowSuccess(true);
    setTimeout(() => router.push(`/equipos/${teamData.id}`), 2200);
  }

  if (loading) return <SplashLoading />;

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-5 text-center bg-bg pb-24">
        <h2 className="mb-2 font-display text-xl font-bold">Iniciá sesión</h2>
        <p className="text-sm text-inksoft">Necesitás una cuenta para crear un equipo.</p>
        <Link href="/auth?next=/equipos/crear" className="mt-6 rounded-xl bg-brand px-6 py-3 font-bold text-white shadow-lg">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-10">
      {showSuccess && <SuccessCheck message="¡Equipo creado!" />}
      
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white px-5 py-4">
        <button onClick={() => router.back()} className="press-fx text-ink">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-lg font-extrabold flex items-center gap-2">
          Crear Equipo
        </h1>
      </header>

      <div className="px-5 pt-6">
        <div className="mb-8 flex flex-col items-center">
          <button 
            type="button"
            disabled={uploadingLogo}
            onClick={() => fileInputRef.current?.click()}
            className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-neutral-200 border-4 border-white shadow-md overflow-hidden press-fx disabled:opacity-50"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Shield size={40} className="text-neutral-400" />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 py-1 text-center">
              <Camera size={14} className="mx-auto text-white" />
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          {uploadingLogo && <p className="text-xs font-bold text-brand mt-1">Subiendo imagen...</p>}
          <p className="text-xs text-inksoft text-center px-4 mt-2">
            Tocá el escudo para subir una foto desde tu galería.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-ink">Nombre del Equipo *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Los Pumas FC"
              className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-sm outline-none focus:border-brand"
            />
          </div>

          {error && <p className="text-xs font-bold text-red-600">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={submitting}
            className="press-fx mt-4 w-full rounded-xl bg-brand py-4 font-display font-bold text-white shadow-lg disabled:opacity-50"
          >
            {submitting ? 'Creando...' : 'Fundar Equipo'}
          </button>
        </div>
      </div>
    </div>
  );
}
