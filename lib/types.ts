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
