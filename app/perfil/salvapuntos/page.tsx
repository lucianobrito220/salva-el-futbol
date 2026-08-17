'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, Gift } from 'lucide-react';

export default function SalvaPuntosPage() {
  const router = useRouter();

  return (
    <div className="pb-10">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-4 backdrop-blur-md">
        <button onClick={() => router.back()} className="press-fx text-ink">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-display text-lg font-black text-brand-dark">SalvaPuntos</h1>
      </div>

      <div className="p-5">
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-brand-dark to-brand p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="mb-2 font-display text-xl font-black uppercase tracking-wide">¿Cómo funciona?</h2>
            <p className="text-sm text-white/90 leading-relaxed">
              Los SalvaPuntos son nuestra moneda virtual. Podés ganarlos organizando partidos, invitando amigos, 
              o simplemente jugando regularmente. ¡Mientras más juegues, más sumás!
            </p>
          </div>
          <Gift size={120} className="absolute -bottom-6 -right-6 text-white/10" strokeWidth={1.5} />
        </div>

        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 shadow-sm">
          <h3 className="mb-3 font-display text-lg font-black text-yellow-950 uppercase">Tercer Tiempo 🍻</h3>
          <p className="text-sm font-semibold text-yellow-800 leading-relaxed">
            Próximamente estaremos integrando el Tercer Tiempo con descuentos exclusivos. 
            Vas a poder canjear tus SalvaPuntos por 2x1 en cervezas, comida y beneficios únicos 
            en bares asociados de tu ciudad para compartir con tu equipo después del partido.
          </p>
          <div className="mt-4 rounded-xl bg-yellow-400/20 px-4 py-2 text-center text-xs font-bold text-yellow-900 border border-yellow-400/30">
            ¡Mantenete atento a las próximas actualizaciones!
          </div>
        </div>
      </div>
    </div>
  );
}
