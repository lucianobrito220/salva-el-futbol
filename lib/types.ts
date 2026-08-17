export type Level = 'Recreativo' | 'Intermedio' | 'Competitivo';
export type MatchStatus = 'open' | 'complete' | 'cancelled';
export type RequestStatus = 'pending' | 'accepted' | 'rejected';
export type MatchType = 'jugadores_sueltos' | 'equipo_rival';
export type TeamFormat = 'F5' | 'F7' | 'F11';
export type Gender = 'Masculino' | 'Femenino' | 'Mixto';

export interface Profile {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  city: string | null;
  position: string | null;
  avatar_url: string | null;
  played_count: number;
  rating: number;
  punctuality: number;
  attendance: number;
  respect: number;
  reports_count: number;
  member_since: string;
  salvapuntos?: number;
  yellow_cards?: number;
  red_cards?: number;
  suspended_until?: string | null;
  is_referee?: boolean;
  referee_updated_at?: string | null;
}

export interface Match {
  id: string;
  organizer_id: string;
  city: string;
  zone: string;
  court: string;
  match_date: string; // YYYY-MM-DD
  match_time: string; // HH:MM:SS
  missing_players: number;
  match_type: MatchType;
  team_format: TeamFormat | null;
  gender: Gender;
  description: string | null;
  location_address: string | null;
  level: Level;
  price: number;
  status: MatchStatus;
  needs_referee?: boolean;
  referee_id?: string | null;
  reminder_sent?: boolean;
  created_at: string;
  organizer?: { name: string; rating: number } | null;
}

export interface JoinRequest {
  id: string;
  match_id: string;
  player_id: string;
  status: RequestStatus;
  created_at: string;
  is_referee_request?: boolean;
  player?: { name: string; avatar_url: string | null; age: number | null } | null;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  match_id: string | null;
  read: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  captain_id: string;
  wins: number;
  losses: number;
  draws: number;
  created_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface Tournament {
  id: string;
  name: string;
  organizer_id: string;
  status: 'abierto' | 'en_curso' | 'finalizado';
  created_at: string;
}

export interface TournamentTeam {
  tournament_id: string;
  team_id: string;
  points: number;
  goals_for: number;
  goals_against: number;
  team?: Team;
}
