'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, Gift } from 'lucide-react';

export default function SalvaPuntosPage() {
  const router = useRouter();

  return (
    <div className="pb-10">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 px-4 py-4 backdrop-blur-md shadow-sm">
        <button onClick={() => router.back()} className="press-fx text-ink dark:text-white">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-display text-lg font-black text-brand-dark dark:text-brand">SalvaPuntos</h1>
      </div>

      <div className="p-5 dark:bg-neutral-950 min-h-screen">
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-brand-dark via-brand to-brand-light dark:from-brand-dark dark:to-brand p-6 text-white shadow-glow-brand-lg relative overflow-hidden slide-up-sm stagger-1">
          <div className="relative z-10">
            <h2 className="mb-2 font-display text-xl font-black uppercase tracking-wide">¿Cómo funciona?</h2>
            <p className="text-sm text-white/95 leading-relaxed font-medium">
              Los SalvaPuntos son nuestra moneda virtual. Podés ganarlos organizando partidos, invitando amigos, 
              o simplemente jugando regularmente. ¡Mientras más juegues, más sumás!
            </p>
          </div>
          <Gift size={120} className="absolute -bottom-6 -right-6 text-white/10 rotate-12" strokeWidth={1.5} />
        </div>

        <div className="rounded-2xl border border-yellow-200 dark:border-yellow-900/50 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 p-6 shadow-card slide-up-sm stagger-2">
          <h3 className="mb-3 font-display text-lg font-black text-yellow-950 dark:text-yellow-500 uppercase tracking-wide">Tercer Tiempo 🍻</h3>
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-700/90 leading-relaxed">
            Próximamente estaremos integrando el Tercer Tiempo con descuentos exclusivos. 
            Vas a poder canjear tus SalvaPuntos por 2x1 en cervezas, comida y beneficios únicos 
            en bares asociados de tu ciudad para compartir con tu equipo después del partido.
          </p>
          <div className="mt-5 rounded-xl bg-yellow-400/20 dark:bg-yellow-500/10 px-4 py-3 text-center text-xs font-bold text-yellow-900 dark:text-yellow-600 border border-yellow-400/30 dark:border-yellow-500/20 shadow-sm">
            ¡Mantenete atento a las próximas actualizaciones!
          </div>
        </div>
      </div>
    </div>
  );
}
