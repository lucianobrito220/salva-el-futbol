'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Match } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Clock, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

const levelTheme: Record<string, { border: string; wash: string; text: string; chip: string }> = {
  Recreativo: { border: 'border-l-brand', wash: 'from-brand-pale/70', text: 'text-brand-dark', chip: 'chip-recreativo' },
  Intermedio: { border: 'border-l-amber-400', wash: 'from-amber-50', text: 'text-amber-700', chip: 'chip-intermedio' },
  Competitivo: { border: 'border-l-red-400', wash: 'from-red-50', text: 'text-red-700', chip: 'chip-competitivo' },
};

const genderDot: Record<string, string> = {
  Masculino: 'bg-blue-500',
  Femenino: 'bg-pink-500',
  Mixto: 'bg-purple-500',
};

const genderBorder: Record<string, string> = {
  Masculino: 'border-blue-400',
  Femenino: 'border-pink-400',
  Mixto: 'border-purple-400',
};

const genderText: Record<string, string> = {
  Masculino: 'text-blue-400',
  Femenino: 'text-pink-400',
  Mixto: 'text-purple-400',
};

const PITCH_IMAGES = [
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1518605368461-1e1e38ce8058?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1431324155629-1a6d0a6eb434?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1551280336-646f90bd6693?auto=format&fit=crop&q=80&w=800'
];

export default function MatchCard({ match, isMine, asRefereeMode }: { match: Match; isMine?: boolean; asRefereeMode?: boolean }) {
  const { session } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isLastMinute, setIsLastMinute] = useState(false);

  useEffect(() => {
    if (match.status !== 'open') return;
    
    const calculateTime = () => {
      const now = new Date();
      const matchDate = new Date(`${match.match_date}T${match.match_time}`);
      const diffMs = matchDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 0 && diffHours <= 2) {
        setIsLastMinute(true);
        const h = Math.floor(diffHours);
        const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${h}h ${m}m`);
      } else {
        setIsLastMinute(false);
        setTimeLeft(null);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [match.match_date, match.match_time, match.status]);

  const href = session ? `/partido/${match.id}` : `/p/${match.id}`;
  const urgent = match.missing_players <= 1 && match.status === 'open' && match.match_type === 'jugadores_sueltos';
  
  // Si es último minuto, sobrescribimos el tema para que sea rojo llamativo
  const theme = isLastMinute 
    ? { border: 'border-l-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]', wash: 'from-red-50', text: 'text-red-700', chip: levelTheme[match.level]?.chip || 'chip-recreativo' }
    : levelTheme[match.level] || levelTheme.Recreativo;

  const statusLabel =
    match.status === 'complete'
      ? 'Completo'
      : match.status === 'cancelled'
      ? 'Cancelado'
      : match.match_type === 'equipo_rival'
      ? 'Busca equipo rival'
      : `Faltan ${match.missing_players}`;

  // Tarjeta específica para torneos
  if (match.zone === 'Torneo') {
    const today = new Date();
    const matchDate = new Date(`${match.match_date}T00:00:00`);
    const diffTime = matchDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const startsText = diffDays > 0 ? `Inicio en ${diffDays} días` : diffDays === 0 ? 'Inicia hoy' : 'En curso';

    return (
      <Link
        href={href}
        className="press-fx lift-fx mb-4 block overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm"
      >
        <div 
          className="h-28 w-full relative bg-cover bg-center" 
          style={{ backgroundImage: `url("${match.description?.split('\n').find((l: string) => l.startsWith('IMAGEN:'))?.replace('IMAGEN: ', '') || 'https://images.unsplash.com/photo-1518605368461-1e1e38ce8058?auto=format&fit=crop&q=80&w=800'}")` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/90 via-purple-900/40 to-transparent"></div>
          <div className="absolute bottom-3 left-4 flex items-center gap-2 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-md">
              <span className="text-lg">🏆</span>
            </span>
            <div>
              <div className="font-display text-sm font-bold leading-tight shadow-black drop-shadow-md">TORNEO LOCAL</div>
              <div className="text-[11px] font-medium opacity-90 drop-shadow-md">{startsText}</div>
            </div>
          </div>
        </div>
        
        <div className="flex">
          <div className="flex-1 py-3 pl-4 pr-3">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="chip border-purple-100 bg-purple-50 text-purple-700">{match.level || 'Competitivo'}</span>
              <span className="chip border-neutral-100 bg-neutral-50 text-neutral-600">{match.gender}</span>
            </div>
            <p className="mb-0.5 text-[14px] font-bold text-ink">{match.description?.split('\n').find((l: string) => l.startsWith('TORNEO:'))?.replace('TORNEO: ', '') || 'Torneo Relámpago'}</p>
            <p className="mb-1 text-[12px] text-inksoft">{match.description?.split('\n').find((l: string) => l.startsWith('CATEGORÍA:'))?.replace('CATEGORÍA: ', '') || 'Todas las categorías'}</p>
            <p className="text-[12px] text-inksoft font-medium flex items-center gap-1">📍 {match.court}</p>
          </div>
          
          <div className="flex w-[100px] flex-shrink-0 flex-col items-center justify-center gap-1.5 border-l-2 border-dashed border-neutral-100 bg-neutral-50 px-2 py-3 text-center">
            <div className="font-display text-[15px] font-extrabold text-purple-700">
              ${match.price}
              <small className="block text-[9px] font-medium text-inksoft uppercase tracking-wide mt-0.5">inscripción</small>
            </div>
            <span className={`w-full rounded-lg py-1.5 text-[11px] font-bold mt-1 ${isMine ? 'bg-white text-purple-700 border border-purple-600' : 'bg-purple-600 text-white leading-tight'}`}>
              {isMine ? 'Gestionar' : 'Contactar'}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  const PITCH_IMAGES = [
    '/backgrounds/pitch-1.jpg',
    '/backgrounds/pitch-2.jpg',
    '/backgrounds/pitch-3.jpg',
    '/backgrounds/pitch-4.jpg',
    '/backgrounds/pitch-5.jpg',
  ];

  const hash = Math.imul(31, match.id.charCodeAt(0)) + match.id.charCodeAt(match.id.length - 1) | 0;
  const imgIndex = Math.abs(hash) % PITCH_IMAGES.length;
  
  const bgImage = PITCH_IMAGES[imgIndex];
  const borderCol = genderBorder[match.gender] || 'border-line';
  const textCol = genderText[match.gender] || 'text-white/80';

  const formattedDate = new Date(match.match_date + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).replace(/ de /g, ' ');

  const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <Link
      href={href}
      className={`press-fx lift-fx mb-4 block overflow-hidden rounded-[24px] border border-white/10 shadow-lg relative bg-black`}
    >
      <div className="absolute inset-0 z-0">
        <Image 
          src={bgImage} 
          alt="Cancha" 
          fill 
          className="object-cover opacity-80" 
          sizes="(max-width: 768px) 100vw, 400px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30"></div>
      </div>
      
      <div className="relative z-10 flex h-full flex-col p-4">
        {/* Top Badges */}
        <div className="flex justify-between items-start mb-auto pb-8">
          <div className="flex flex-col gap-2">
            {asRefereeMode && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider bg-yellow-400 text-yellow-950 shadow-lg border border-yellow-300">
                <span className="text-[13px]">🏁 🧑‍⚖️</span> SE BUSCA ÁRBITRO
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-md border border-white/20 w-fit ${
              match.status !== 'open'
                ? 'bg-white/10 text-white/90'
                : (urgent || isLastMinute)
                ? 'bg-red-500/80 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                : 'bg-brand/80 text-white'
            }`}>
              {statusLabel}
            </span>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="bg-black/40 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md border border-white/10 uppercase tracking-wide">
              {displayDate}
            </div>
            {isLastMinute && timeLeft && (
              <div className="bg-red-500/90 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md border border-red-400/50">
                <Clock size={14} /> En {timeLeft}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Content - Glassmorphism Card */}
        <div className="mt-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="flex items-end justify-between mb-3 border-b border-white/10 pb-3">
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-display text-4xl font-black leading-none text-white drop-shadow-md">{match.match_time.slice(0, 5)}</span>
                <span className={`text-[12px] font-extrabold uppercase tracking-widest ${textCol} drop-shadow-sm`}>{match.gender}</span>
              </div>
              <p className="text-[13px] font-medium text-white/80 flex items-center gap-1.5">
                <MapPin size={14} className="text-white/60" /> {match.zone} · {match.city}
              </p>
            </div>
            
            <div className="text-right">
              <div className="font-display text-3xl font-black text-white drop-shadow-md leading-none">
                <span className="text-xl text-white/70 mr-0.5">$</span>{match.price}
              </div>
              <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider mt-1">/ jugador</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-bold text-white truncate max-w-[180px] drop-shadow-sm">{match.court}</p>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-black uppercase tracking-wider ${textCol} drop-shadow-sm`}>{match.level}</span>
                <span className="text-white/40 text-[10px]">•</span>
                <span className="text-[11px] font-medium text-white/70">{match.team_format || 'F5'}</span>
              </div>
            </div>
            <span className={`rounded-xl px-5 py-2.5 text-[13px] font-bold shadow-lg transition-transform active:scale-95 ${
              asRefereeMode 
                ? 'bg-yellow-400 text-yellow-950 border border-yellow-300' 
                : isMine 
                ? 'bg-white/20 text-white border border-white/30 backdrop-blur-sm hover:bg-white/30' 
                : 'bg-brand text-white border border-brand/50 hover:bg-brand-dark'
            }`}>
              {asRefereeMode ? 'Postularme' : isMine ? 'Gestionar' : 'Unirme'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
