import * as React from 'react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar, Clock } from 'lucide-react';

interface Match {
  id: number;
  round_id: number;
  home_team_name: string;
  away_team_name: string;
  home_team_short: string;
  away_team_short: string;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  prediction_deadline: string;
  round_name: string;
  round_number: number;
}

interface Round {
  id: number;
  round_number: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRounds();
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [selectedRound]);

  const fetchRounds = async () => {
    try {
      const response = await fetch('/api/rounds');
      if (response.ok) {
        const data = await response.json();
        setRounds(data);
      }
    } catch (error) {
      console.error('Error fetching rounds:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const url = selectedRound === 'all' 
        ? '/api/matches' 
        : `/api/matches?roundId=${selectedRound}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMatches(data);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600';
      case 'live': return 'text-red-600';
      case 'finished': return 'text-green-600';
      case 'postponed': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'live': return 'Live';
      case 'finished': return 'Finished';
      case 'postponed': return 'Postponed';
      default: return status;
    }
  };

  const isPredictionOpen = (match: Match) => {
    return match.status === 'scheduled' && new Date() < new Date(match.prediction_deadline);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">Loading matches...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-green-600">Matches</h1>
          <p className="text-gray-600 mt-1">Brazilian Série A fixtures and results</p>
        </div>
        
        <div className="w-48">
          <Select value={selectedRound} onValueChange={setSelectedRound}>
            <SelectTrigger>
              <SelectValue placeholder="Select round" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rounds</SelectItem>
              {rounds.map((round) => (
                <SelectItem key={round.id} value={round.id.toString()}>
                  {round.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No matches found for the selected round.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => (
            <Card key={match.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-8 flex-1">
                    {/* Home Team */}
                    <div className="text-right flex-1">
                      <div className="font-semibold text-lg">{match.home_team_name}</div>
                      <div className="text-sm text-gray-500">{match.home_team_short}</div>
                    </div>

                    {/* Score/VS */}
                    <div className="text-center min-w-[120px]">
                      {match.status === 'finished' && match.home_score !== null && match.away_score !== null ? (
                        <div className="text-2xl font-bold text-green-600">
                          {match.home_score} - {match.away_score}
                        </div>
                      ) : match.status === 'live' && match.home_score !== null && match.away_score !== null ? (
                        <div className="text-2xl font-bold text-red-600">
                          {match.home_score} - {match.away_score}
                        </div>
                      ) : (
                        <div className="text-xl font-semibold text-gray-400">vs</div>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="text-left flex-1">
                      <div className="font-semibold text-lg">{match.away_team_name}</div>
                      <div className="text-sm text-gray-500">{match.away_team_short}</div>
                    </div>
                  </div>

                  {/* Match Info */}
                  <div className="text-right space-y-1">
                    <div className={`font-semibold ${getStatusColor(match.status)}`}>
                      {getStatusText(match.status)}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center justify-end space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(match.match_date)}</span>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center justify-end space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(match.match_date)}</span>
                    </div>
                    {match.round_name && (
                      <div className="text-xs text-gray-400">{match.round_name}</div>
                    )}
                    {isPredictionOpen(match) && (
                      <div className="text-xs text-green-600 font-medium">
                        Predictions open
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
