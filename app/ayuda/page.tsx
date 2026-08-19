'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, MessageCircle } from 'lucide-react';

const FAQS = [
  {
    q: '¿Cómo publico un partido?',
    a: 'Andá a "Publicar" en la barra inferior, completá cancha, fecha, hora y precio, y tocá "Publicar partido". Tarda menos de 30 segundos.',
  },
  {
    q: '¿Cómo me uno a un partido?',
    a: 'Buscalo en "Buscar" o en Inicio, entrá al partido y tocá "Quiero unirme". El organizador va a ver tu solicitud y podrá aceptarte.',
  },
  {
    q: '¿Por qué no me aceptan al toque?',
    a: 'La aceptación la hace el organizador manualmente, para que pueda elegir quién completa su equipo. Te vamos a avisar apenas responda.',
  },
  {
    q: '¿Cómo cargo mi WhatsApp?',
    a: 'Desde tu Perfil, en la tarjeta "Tu WhatsApp". Nunca se muestra públicamente: solo se comparte con quien ya confirmaste jugar.',
  },
  {
    q: '¿Cómo activo las notificaciones?',
    a: 'Desde tu Perfil, tocá "Activar notificaciones push" y aceptá el permiso que te pida el navegador.',
  },
  {
    q: '¿Puedo cancelar mi solicitud o mi lugar?',
    a: 'Sí. Si tu solicitud está pendiente, podés cancelarla desde el partido. Si el partido no te sirve más, contactá al organizador por el chat o WhatsApp.',
  },
  {
    q: '¿Cómo denuncio a alguien?',
    a: 'Dentro del partido, junto al nombre del jugador o del organizador, hay un ícono de bandera para denunciar. Lo revisamos nosotros.',
  },
];

export default function AyudaPage() {
  const router = useRouter();
  return (
    <div className="pb-10">
      <div className="flex items-center gap-2 border-b border-line dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm px-5 py-4">
        <button onClick={() => router.back()} className="press-fx text-ink dark:text-white">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-display text-base font-bold dark:text-white">Centro de ayuda</h1>
      </div>

      <div className="px-5 py-5 dark:bg-neutral-950 min-h-screen">
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <details key={i} className="group rounded-xl border border-line dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-card transition-all duration-300 overflow-hidden slide-up-sm stagger-1">
              <summary className="cursor-pointer list-none font-display text-sm font-bold dark:text-white marker:content-[''] flex justify-between items-center">
                {f.q}
                <span className="transition group-open:rotate-180 text-inksoft dark:text-neutral-500">
                  <ChevronLeft size={16} className="-rotate-90" />
                </span>
              </summary>
              <p className="mt-3 text-sm text-inksoft dark:text-neutral-400 animate-in fade-in slide-in-from-top-2 duration-300 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-line dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 text-center shadow-card">
          <p className="mb-4 text-sm font-medium text-inksoft dark:text-neutral-400">¿No encontraste lo que buscabas?</p>
          <a
            href="https://wa.me/?text=Hola%2C%20tengo%20una%20consulta%20sobre%20Salv%C3%A1%20el%20F%C3%BAtbol"
            target="_blank"
            rel="noreferrer"
            className="press-fx inline-flex items-center gap-2 rounded-full bg-brand shadow-glow-brand px-6 py-3 text-sm font-bold text-white transition-transform hover:scale-105"
          >
            <MessageCircle size={18} /> Escribinos por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
