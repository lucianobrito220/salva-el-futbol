'use client';

import Link from 'next/link';
import { Match } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

const levelClass: Record<string, string> = {
  Recreativo: 'chip-recreativo',
  Intermedio: 'chip-intermedio',
  Competitivo: 'chip-competitivo',
};

const genderDot: Record<string, string> = {
  Masculino: 'bg-blue-500',
  Femenino: 'bg-pink-500',
  Mixto: 'bg-purple-500',
};

export default function MatchCard({ match, isMine }: { match: Match; isMine?: boolean }) {
  const { session } = useAuth();
  const href = session ? `/partido/${match.id}` : `/p/${match.id}`;
  const urgent = match.missing_players <= 1 && match.status === 'open' && match.match_type === 'jugadores_sueltos';
  const statusLabel =
    match.status === 'complete'
      ? 'Completo'
      : match.status === 'cancelled'
      ? 'Cancelado'
      : match.match_type === 'equipo_rival'
      ? 'Busca equipo rival'
      : `Faltan ${match.missing_players}`;
  return (
    <Link
      href={href}
      className="press-fx lift-fx mb-3 flex overflow-hidden rounded-2xl border border-line bg-white"
    >
      <div className="flex-1 py-3.5 pl-4 pr-3">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="font-display text-[17px] font-extrabold">{match.match_time.slice(0, 5)}</span>
          <span className={`chip ${levelClass[match.level]}`}>{match.level}</span>
          {match.team_format && <span className="chip bg-neutral-100 text-neutral-600">{match.team_format}</span>}
          <span className={`h-2 w-2 rounded-full ${genderDot[match.gender] || 'bg-neutral-400'}`} title={match.gender} />
        </div>
        <p className="mb-0.5 text-[13.5px] font-semibold">{match.zone} · {match.city}</p>
        <p className="mb-2 text-xs text-inksoft">{match.court}</p>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${
            match.status !== 'open'
              ? 'bg-neutral-100 text-neutral-500'
              : urgent
              ? 'bg-red-50 text-red-700'
              : 'bg-brand-pale text-brand-dark'
          }`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="flex w-[92px] flex-shrink-0 flex-col items-center justify-center gap-1.5 border-l-2 border-dashed border-neutral-200 bg-neutral-50 px-2 py-2.5 text-center">
        <div className="font-display text-[14.5px] font-extrabold">
          ${match.price}
          <small className="block text-[9.5px] font-medium text-inksoft">por jugador</small>
        </div>
        <span className={`w-full rounded-lg py-1.5 text-[11px] font-bold ${isMine ? 'bg-white text-brand-dark border border-brand' : 'bg-brand text-white'}`}>
          {isMine ? 'Gestionar' : 'Ver más'}
        </span>
      </div>
    </Link>
  );
}
