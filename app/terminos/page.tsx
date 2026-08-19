'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function TerminosPage() {
  const router = useRouter();
  return (
    <div className="pb-10">
      <div className="flex items-center gap-2 border-b border-line dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm px-5 py-4">
        <button onClick={() => router.back()} className="press-fx text-ink dark:text-white">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-display text-base font-bold dark:text-white">Términos y condiciones</h1>
      </div>

      <div className="space-y-6 px-5 py-6 text-sm text-inksoft dark:text-neutral-400 dark:bg-neutral-950 min-h-screen">
        <p className="rounded-2xl border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/10 p-4 text-xs font-medium leading-relaxed text-amber-800 dark:text-amber-500 shadow-card">
          Este texto es un punto de partida general y no reemplaza el asesoramiento de un abogado. Antes de
          publicar la app para el público en general, te recomendamos que lo revise un profesional.
        </p>

        <Section title="1. Aceptación">
          Al usar Salvá el Fútbol aceptás estos términos. Si no estás de acuerdo, no deberías usar la
          aplicación.
        </Section>
        <Section title="2. Qué es Salvá el Fútbol">
          Es una plataforma que conecta organizadores de partidos con jugadores disponibles. No somos
          organizadores, dueños de canchas ni responsables de lo que ocurra dentro de un partido: solo
          facilitamos el contacto entre usuarios.
        </Section>
        <Section title="3. Cuentas de usuario">
          Sos responsable de la información que cargás (nombre, email, foto, WhatsApp) y de mantener tu
          cuenta segura. La información de contacto que cargás es visible solo para otros usuarios con los
          que coordinás un partido.
        </Section>
        <Section title="4. Conducta esperada">
          Esperamos respeto entre usuarios: puntualidad, avisar si no podés asistir, y trato correcto dentro
          y fuera de la cancha. El sistema de reputación y denuncias existe para eso.
        </Section>
        <Section title="5. Pagos y donaciones">
          Los precios de cancha que se muestran son informados por cada organizador; la app no procesa ni
          garantiza esos cobros. Las donaciones ("Tirar un centro") son voluntarias y van a través de
          Mercado Pago, fuera de esta aplicación.
        </Section>
        <Section title="6. Responsabilidad">
          No nos hacemos responsables por lesiones, conflictos, cancelaciones, ausencias o cualquier
          inconveniente ocurrido durante un partido coordinado a través de la app. El uso de la plataforma
          es bajo tu propio criterio.
        </Section>
        <Section title="7. Cambios">
          Podemos actualizar estos términos en cualquier momento. El uso continuo de la app implica la
          aceptación de los cambios.
        </Section>
        <Section title="8. Contacto">
          Para consultas sobre estos términos, escribinos desde el Centro de ayuda.
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="slide-up-sm stagger-1">
      <h2 className="mb-2 font-display text-sm font-extrabold text-ink dark:text-white uppercase tracking-wide">{title}</h2>
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}
