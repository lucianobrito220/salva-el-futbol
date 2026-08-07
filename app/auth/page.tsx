'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Onboarding from '@/components/Onboarding';

export const dynamic = 'force-dynamic';

// Next.js exige que cualquier componente que use useSearchParams()
// esté envuelto en <Suspense>, incluso en páginas dinámicas — si no,
// el build de producción falla al intentar generar la página.
export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkEmailMsg, setCheckEmailMsg] = useState('');

  useEffect(() => {
    const seen = typeof window !== 'undefined' && window.localStorage.getItem('sef_onboarded');
    setShowOnboarding(!seen);
    setCheckedOnboarding(true);
  }, []);

  function finishOnboarding() {
    window.localStorage.setItem('sef_onboarded', '1');
    setShowOnboarding(false);
  }

  async function handleGoogle() {
    setError('');
    setGoogleLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${next}` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
    // Si no hay error, el navegador redirige a Google y después vuelve solo — no hace falta hacer nada más acá.
  }

  async function handleRegister() {
    setError('');
    if (!name.trim() || !email.trim() || !password) {
      setError('Completá nombre, email y contraseña.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña tiene que tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim(), city: city.trim() } },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      // La confirmación por email está desactivada en el proyecto: ya queda logueado.
      router.push(next);
    } else {
      // La confirmación por email está activada: hay que confirmar antes de poder entrar.
      setCheckEmailMsg('Te mandamos un email para confirmar tu cuenta. Abrilo, confirmá, y después volvé acá para iniciar sesión.');
      setMode('login');
    }
  }

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password) {
      setError('Completá tu email y contraseña.');
      return;
    }
    setLoading(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (loginError) {
      setError(loginError.message);
      return;
    }
    router.push(next);
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-10">
      {checkedOnboarding && showOnboarding && <Onboarding onFinish={finishOnboarding} />}
      <div className="mb-8 text-center">
        <img src="/brand/logo.png" alt="Salvá el Fútbol" className="mx-auto mb-3 h-16 w-16 rounded-full" />
        <h1 className="font-display text-xl font-extrabold">Salvá el Fútbol</h1>
        <p className="mt-1 text-sm text-inksoft">
          {mode === 'register' ? 'Creá tu cuenta gratis.' : 'Iniciá sesión.'}
        </p>
      </div>

      {checkEmailMsg && (
        <div className="mb-4 rounded-xl bg-brand-pale p-3 text-xs font-medium text-brand-dark">{checkEmailMsg}</div>
      )}

      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="press-fx mb-4 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-line bg-white py-3.5 text-sm font-bold text-ink disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.6 3 24 3c-7.5 0-14 4.2-17.7 10.4z"/>
          <path fill="#4CAF50" d="M24 45c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 36 26.9 37 24 37c-5.2 0-9.7-3.3-11.3-8l-6.6 5.1C9.9 40.7 16.4 45 24 45z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.5 36.2 45 30.6 45 24c0-1.4-.1-2.4-.4-3.5z"/>
        </svg>
        {googleLoading ? 'Conectando…' : 'Continuar con Google'}
      </button>

      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="text-[11px] font-medium text-inksoft">o con tu email</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <div className="space-y-4">
        {mode === 'register' && (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-bold">Nombre</label>
              <input
                className="w-full rounded-xl border border-line px-3.5 py-3 text-sm"
                placeholder="Tu nombre y apellido"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold">Ciudad</label>
              <input
                className="w-full rounded-xl border border-line px-3.5 py-3 text-sm"
                placeholder="Ej: Yerba Buena"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </>
        )}
        <div>
          <label className="mb-1.5 block text-xs font-bold">Email</label>
          <input
            type="email"
            className="w-full rounded-xl border border-line px-3.5 py-3 text-sm"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold">Contraseña</label>
          <input
            type="password"
            className="w-full rounded-xl border border-line px-3.5 py-3 text-sm"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <button
          onClick={mode === 'register' ? handleRegister : handleLogin}
          disabled={loading}
          className="press-fx w-full rounded-2xl bg-brand py-4 font-display font-bold text-white disabled:opacity-60"
        >
          {loading ? 'Un momento…' : mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}
        </button>

        <button
          onClick={() => {
            setError('');
            setCheckEmailMsg('');
            setMode(mode === 'register' ? 'login' : 'register');
          }}
          className="w-full text-center text-xs text-inksoft underline"
        >
          {mode === 'register' ? '¿Ya tenés cuenta? Iniciá sesión' : '¿No tenés cuenta? Registrate'}
        </button>

        <p className="pt-2 text-center text-[11px] text-inksoft">
          Podés cargar tu número de WhatsApp más adelante, desde tu perfil — no es obligatorio para registrarte.
        </p>
      </div>
    </div>
  );
}
