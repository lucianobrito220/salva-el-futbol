import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import { getPublicServerClient } from '@/lib/supabase/publicServer';
import PitchPattern from '@/components/PitchPattern';
import PlayerSilhouette from '@/components/PlayerSilhouette';
import LocationMapButton from '@/components/LocationMapButton';

export const dynamic = 'force-dynamic';

async function getMatchData(id: string) {
  const supabase = getPublicServerClient();
  const { data: match } = await supabase.from('matches').select('*').eq('id', id).single();
  if (!match) return null;
  const { data: organizerRows } = await supabase.rpc('get_public_match_organizer', { p_match_id: id });
  const organizer = (organizerRows && organizerRows[0]) || null;
  return { match, organizer };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const result = await getMatchData(params.id);
  if (!result) return { title: 'Partido no encontrado — Salvá el Fútbol' };
  const { match } = result;
  const title = `⚽ Partido en ${match.zone}, ${match.city} · ${match.match_time.slice(0, 5)}`;
  const description =
    match.status === 'open'
      ? `Faltan ${match.missing_players} jugadores. Nivel ${match.level}. $${match.price} por jugador. Sumate en Salvá el Fútbol.`
      : 'Este partido ya se completó, pero hay más esperándote en Salvá el Fútbol.';
  return { title, description, openGraph: { title, description } };
}

export default async function PublicMatchPage({ params }: { params: { id: string } }) {
  const result = await getMatchData(params.id);

  if (!result) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[440px] flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-inksoft">Este partido no existe o ya no está disponible.</p>
        <Link href="/" className="mt-4 text-sm font-bold text-brand-dark underline">
          Ir a Salvá el Fútbol
        </Link>
      </div>
    );
  }

  const { match, organizer } = result;
  const statusLabel =
    match.status === 'open'
      ? match.match_type === 'equipo_rival'
        ? 'Busca equipo rival'
        : `Faltan ${match.missing_players} jugadores`
      : match.status === 'complete'
      ? 'Partido completo'
      : 'Partido cancelado';

  return (
    <div className="mx-auto min-h-screen max-w-[440px] bg-bg pb-10 shadow-2xl">
      <div className="relative overflow-hidden px-6 pb-10 pt-10 text-white">
        <PitchPattern className="absolute inset-0 h-full w-full" />
        <PlayerSilhouette className="pointer-events-none absolute -right-4 bottom-0 h-40 w-40" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white"
            >
              <ChevronLeft size={20} />
            </Link>
            <div className="flex items-center gap-2">
              <img src="/brand/logo.png" alt="Salvá el Fútbol" className="h-8 w-8 rounded-full" />
              <span className="font-display text-sm font-extrabold">Salvá el Fútbol</span>
            </div>
          </div>
          <h1 className="mb-1 font-display text-2xl font-extrabold">
            {match.zone}, {match.city}
          </h1>
          <p className="text-white/80">
            {match.match_date} · {match.match_time.slice(0, 5)} hs
          </p>
        </div>
      </div>

      <div className="px-6 py-6">
        {organizer && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3">
            {organizer.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={organizer.avatar_url} alt={organizer.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-pale font-display font-bold text-brand-dark">
                {organizer.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-xs text-inksoft">Organiza</p>
              <p className="text-sm font-semibold">{organizer.name}</p>
            </div>
          </div>
        )}

        <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
          <InfoCard label="Cancha" value={match.court} />
          <InfoCard label="Formato" value={match.team_format || match.level} />
          <InfoCard label="Fútbol" value={match.gender} />
          <InfoCard label="Precio" value={`$${match.price} por jugador`} />
          <InfoCard label="Estado" value={statusLabel} />
        </div>

        {(match.location_address || match.court) && (
          <LocationMapButton
            query={match.location_address || `${match.court}, ${match.zone}, ${match.city}`}
            label={match.court}
            display={match.location_address || `${match.court}, ${match.zone}`}
          />
        )}
        {match.description && (
          <div className="mb-5 rounded-xl border border-line bg-white px-3.5 py-3 text-sm text-inksoft">
            {match.description}
          </div>
        )}

        <Link
          href={`/partido/${match.id}`}
          className="press-fx flex w-full items-center justify-center rounded-2xl bg-brand py-4 text-center font-display font-bold text-white shadow-lg shadow-brand/30"
        >
          {match.status === 'open' ? 'Quiero unirme' : 'Ver en la app'}
        </Link>
        <p className="mt-3 text-center text-[11px] text-inksoft">
          Te vamos a pedir que crees una cuenta gratis (con Google o email) para poder unirte.
        </p>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-inksoft">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
