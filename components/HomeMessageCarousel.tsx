'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Search, Bell, Coffee } from 'lucide-react';

const DONATE_URL = 'https://link.mercadopago.com.ar/salvaelfutbol';

const messages = [
  { Icon: Megaphone, text: '¿Te falta un jugador? Publicá tu partido en 30 segundos.' },
  { Icon: Search, text: '¿Querés jugar hoy? Encontrá partidos con lugar cerca tuyo.' },
  { Icon: Bell, text: 'Nunca más un partido suspendido: todo se coordina en tiempo real.' },
  {
    Icon: Coffee,
    text: '¿Te salvamos el partido? Tiranos un centro 😄',
    href: DONATE_URL,
  },
];

export default function HomeMessageCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % messages.length), 4500);
    return () => clearInterval(timer);
  }, []);

  const current = messages[index];
  const Wrapper = current.href ? 'a' : 'div';
  const wrapperProps = current.href ? { href: current.href, target: '_blank', rel: 'noreferrer' } : {};

  return (
    <div className="fixed bottom-[64px] left-1/2 z-20 w-full max-w-[440px] -translate-x-1/2 px-3 pb-2">
      <Wrapper
        {...(wrapperProps as any)}
        key={index}
        className="fade-slide-up press-fx flex items-center gap-2.5 rounded-full border border-line bg-white/95 px-4 py-2.5 shadow-[0_6px_18px_-6px_rgba(15,23,42,0.15)] backdrop-blur-sm"
      >
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-pale text-brand-dark">
          <current.Icon size={13} strokeWidth={2.4} />
        </span>
        <span className="flex-1 truncate text-[11.5px] font-medium text-ink">{current.text}</span>
        <div className="flex flex-shrink-0 gap-1">
          {messages.map((_, i) => (
            <span key={i} className={`h-1 rounded-full transition-all ${i === index ? 'w-3 bg-brand' : 'w-1 bg-line'}`} />
          ))}
        </div>
      </Wrapper>
    </div>
  );
}
