'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Bell, User } from 'lucide-react';

const items = [
  { href: '/', label: 'Inicio', Icon: Home },
  { href: '/buscar', label: 'Buscar', Icon: Search },
  { href: '/publicar', label: 'Publicar', Icon: PlusCircle },
  { href: '/notificaciones', label: 'Notif.', Icon: Bell },
  { href: '/perfil', label: 'Perfil', Icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === '/auth') return null;

  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-[440px] -translate-x-1/2 border-t border-line dark:border-white/[0.06] bg-white dark:bg-charcoal px-1.5 pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
      <div className="flex">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`press-fx flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10.5px] font-semibold ${
                active ? 'text-brand' : 'text-inksoft dark:text-white/45'
              }`}
            >
              <item.Icon size={20} strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
