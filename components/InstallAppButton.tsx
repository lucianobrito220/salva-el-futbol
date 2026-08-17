'use client';

import { useEffect, useState } from 'react';
import { Download, Share, PlusSquare } from 'lucide-react';

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSSheet, setShowIOSSheet] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isStandalone) return null; // ya está instalada

  async function handleClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSSheet(true);
    } else {
      setShowIOSSheet(true); // fallback genérico con instrucciones del navegador
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="press-fx flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white py-3.5 text-sm font-bold text-brand-dark"
      >
        <Download size={18} /> Instalar la app en tu celular
      </button>

      {showIOSSheet && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 backdrop-blur-sm" onClick={() => setShowIOSSheet(false)}>
          <div
            className="w-full max-w-[440px] rounded-t-2xl bg-white p-6 pb-[max(24px,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <h3 className="mb-3 font-display text-base font-bold">Instalar Salvá el Fútbol</h3>
            {isIOS ? (
              <ol className="space-y-3 text-sm text-inksoft">
                <li className="flex items-center gap-2">
                  <Share size={18} className="flex-shrink-0 text-brand-dark" />
                  Tocá el botón <b className="text-ink">Compartir</b> abajo de Safari.
                </li>
                <li className="flex items-center gap-2">
                  <PlusSquare size={18} className="flex-shrink-0 text-brand-dark" />
                  Elegí <b className="text-ink">"Agregar a pantalla de inicio"</b>.
                </li>
              </ol>
            ) : (
              <ol className="space-y-3 text-sm text-inksoft">
                <li>Abrí el menú de tu navegador (los tres puntitos, arriba a la derecha).</li>
                <li>
                  Elegí <b className="text-ink">"Instalar app"</b> o <b className="text-ink">"Agregar a pantalla de inicio"</b>.
                </li>
              </ol>
            )}
            <button
              onClick={() => setShowIOSSheet(false)}
              className="press-fx mt-5 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
