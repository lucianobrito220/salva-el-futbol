'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Users, Trophy, Flag, Swords, ShieldPlus, Shield, PlusCircle, Settings, Megaphone, Search, Activity, HelpCircle } from 'lucide-react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === '/auth') return null;

  const closeSidebar = () => setIsOpen(false);

  const isTopLevel = ['/', '/buscar', '/mis-partidos', '/perfil', '/notificaciones'].includes(pathname);

  return (
    <>
      {/* Botón Hamburguesa Flotante (Esquina superior izquierda) */}
      {isTopLevel && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Abrir menú"
          className="fixed left-4 top-[10px] z-40 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-card backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Overlay oscuro */}
      {isOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity modal-backdrop-in"
        />
      )}

      {/* Panel del Menú Lateral */}
      <div
        className={`fixed bottom-0 left-0 top-0 z-50 w-72 max-w-[80vw] transform bg-white/90 dark:bg-neutral-900/95 backdrop-blur-2xl shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line/50 dark:border-neutral-800/50 px-5 py-4 shadow-card">
          <h2 className="font-display text-lg font-black text-brand-dark dark:text-brand">Menú</h2>
          <button onClick={closeSidebar} aria-label="Cerrar menú" className="text-inksoft hover:text-ink dark:text-neutral-400 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto p-4 pb-24 h-full">
          <MenuLink href="/buscar" icon={Search} label="Quiero jugar" onClick={closeSidebar} />
          <MenuLink href="/publicar?tipo=jugadores_sueltos" icon={Users} label="Me faltan jugadores" onClick={closeSidebar} />
          <MenuLink href="/buscar/arbitros" icon={Flag} label="Buscar árbitro" onClick={closeSidebar} highlight />
          <MenuLink href="/publicar?tipo=equipo_rival" icon={Swords} label="Buscar rival" onClick={closeSidebar} />
          <MenuLink href="/equipos/crear" icon={ShieldPlus} label="Armar equipo" onClick={closeSidebar} />
          <MenuLink href="/torneos" icon={Trophy} label="Buscar torneo" onClick={closeSidebar} />
          <MenuLink href="/torneos/crear" icon={PlusCircle} label="Armar torneo" onClick={closeSidebar} />
          
          <div className="my-3 h-px w-full bg-line/50 dark:bg-neutral-800/50" />
          
          <MenuLink href="/mis-partidos" icon={Activity} label="Mis Partidos" onClick={closeSidebar} />
          
          <div className="my-3 h-px w-full bg-line/50 dark:bg-neutral-800/50" />
          
          <MenuLink href="/ayuda" icon={HelpCircle} label="Quiénes somos" onClick={closeSidebar} />
          <MenuLink href="/perfil" icon={Settings} label="Configuración" onClick={closeSidebar} />
        </nav>
      </div>
    </>
  );
}

function MenuLink({ href, icon: Icon, label, onClick, highlight }: { href: string; icon: any; label: string; onClick: () => void; highlight?: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all duration-200 active:scale-[0.98] hover:bg-brand/5 ${
        highlight
          ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-400 font-bold border border-yellow-200 dark:border-yellow-900/50'
          : isActive
          ? 'bg-brand/10 dark:bg-brand/20 font-bold text-brand-dark dark:text-brand'
          : 'font-medium text-ink dark:text-neutral-200 dark:hover:bg-neutral-800'
      }`}
    >
      <Icon size={20} className={highlight ? 'text-yellow-600 dark:text-yellow-500' : isActive ? 'text-brand' : 'text-inksoft dark:text-neutral-400'} />
      {label}
    </Link>
  );
}
