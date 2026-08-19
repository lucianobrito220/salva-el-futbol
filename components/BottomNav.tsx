'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Activity, User, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const items = [
  { href: '/', label: 'Inicio', Icon: Home },
  { href: '/buscar', label: 'Explorar', Icon: Search },
  { href: '/mis-partidos', label: 'Mis Partidos', Icon: Activity },
  { href: '/perfil', label: 'Perfil', Icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { unreadNotifications } = useAuth();
  if (pathname === '/auth') return null;

  // Encontrar el índice activo para la barra superior deslizante
  // Como agregamos un FAB en el medio, ajustamos los índices visualmente
  let activeIndex = items.findIndex((item) => item.href === pathname);
  if (activeIndex >= 2) activeIndex += 1; // Saltear el espacio del FAB para el indicador

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-line dark:border-white/[0.06] bg-white/95 dark:bg-charcoal/95 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-[max(8px,env(safe-area-inset-bottom))]">
      <nav className="mx-auto relative w-full max-w-[440px] pt-2">
        {/* Indicador deslizante (dividimos el ancho en 5 partes, 4 botones + 1 espacio) */}
        {activeIndex >= 0 && pathname !== '/publicar' && (
          <div
            className="tab-indicator absolute top-0 h-[2px] rounded-full bg-brand transition-all duration-300 ease-out"
            style={{
              width: '20%',
              left: `${activeIndex * 20}%`,
            }}
          />
        )}

        <div className="flex px-1.5 relative h-[50px] items-center">
          {items.map((item, i) => {
            const active = pathname === item.href;
            
            // Si estamos en la segunda mitad (índice 2 o 3), agregamos margin para dejar el hueco del FAB
            const isRightSide = i >= 2;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`press-fx relative flex flex-col items-center gap-0.5 py-1 text-[10px] tracking-wide font-semibold transition-colors duration-200 w-[20%] ${
                  isRightSide && i === 2 ? 'ml-[20%]' : '' // Hueco para el FAB
                } ${active ? 'text-brand' : 'text-inksoft dark:text-white/40'}`}
              >
                <span
                  className={`relative flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-200 ${
                    active ? 'bg-brand/15 glow-brand-static icon-bounce' : ''
                  }`}
                >
                  <item.Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Floating Action Button (FAB) en el centro absoluto */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[4px]">
            <Link
              href="/publicar"
              aria-label="Crear o armar partido"
              className="press-fx flex h-[54px] w-[54px] items-center justify-center rounded-full bg-brand text-white shadow-glow-brand-lg count-pulse transition-all hover:bg-brand-dark hover:scale-105 active:scale-95"
            >
              <Plus size={28} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
