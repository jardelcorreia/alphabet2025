export interface DatabaseSchema {
  users: {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    is_admin: boolean;
    total_points: number;
    created_at: string;
    updated_at: string;
  };
  teams: {
    id: number;
    name: string;
    short_name: string;
    logo_url: string | null;
    created_at: string;
  };
  rounds: {
    id: number;
    round_number: number;
    name: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    created_at: string;
  };
  matches: {
    id: number;
    round_id: number;
    home_team_id: number;
    away_team_id: number;
    match_date: string;
    home_score: number | null;
    away_score: number | null;
    status: 'scheduled' | 'live' | 'finished' | 'postponed';
    prediction_deadline: string;
    created_at: string;
    updated_at: string;
  };
  predictions: {
    id: number;
    user_id: number;
    match_id: number;
    predicted_outcome: 'home_win' | 'away_win' | 'draw';
    predicted_home_score: number | null;
    predicted_away_score: number | null;
    points_earned: number;
    is_evaluated: boolean;
    created_at: string;
    updated_at: string;
  };
  league_standings: {
    id: number;
    team_id: number;
    position: number;
    matches_played: number;
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
    points: number;
    updated_at: string;
  };
}
