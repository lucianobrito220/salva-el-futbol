'use client';

import { useState } from 'react';
import { Megaphone, Search, Bell } from 'lucide-react';

const slides = [
  {
    Icon: Megaphone,
    title: '¿Te falta un jugador?',
    body: 'Publicá tu partido en 30 segundos y avisamos a jugadores disponibles en tu ciudad.',
  },
  {
    Icon: Search,
    title: '¿Querés jugar hoy?',
    body: 'Encontrá partidos con lugar cerca tuyo y sumate con un toque.',
  },
  {
    Icon: Bell,
    title: 'Nunca más un partido suspendido',
    body: 'Chat, WhatsApp y notificaciones en tiempo real para coordinar todo, sin vueltas.',
  },
];

export default function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const slide = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-between bg-white px-6 py-10">
      <button onClick={onFinish} className="press-fx self-end text-xs font-semibold text-inksoft">
        Saltar
      </button>

      <div className="fade-slide-up flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-pale text-brand-dark">
          <slide.Icon size={34} strokeWidth={2} />
        </div>
        <h1 className="mb-2 font-display text-xl font-extrabold">{slide.title}</h1>
        <p className="max-w-[280px] text-sm text-inksoft">{slide.body}</p>
      </div>

      <div>
        <div className="mb-5 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-brand' : 'w-1.5 bg-line'}`} />
          ))}
        </div>
        <button
          onClick={() => (isLast ? onFinish() : setStep((s) => s + 1))}
          className="press-fx w-full rounded-2xl bg-brand py-4 font-display font-bold text-white"
        >
          {isLast ? 'Empezar' : 'Siguiente'}
        </button>
      </div>
    </div>
  );
}
