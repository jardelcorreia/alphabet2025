import * as React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Target, Check, X, Clock } from 'lucide-react';

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

interface Prediction {
  id: number;
  match_id: number;
  predicted_outcome: 'home_win' | 'away_win' | 'draw';
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  points_earned: number;
  is_evaluated: boolean;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  home_team_name: string;
  away_team_name: string;
}

interface Round {
  id: number;
  round_number: number;
  name: string;
}

export function Predictions() {
  const { user, token } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [savingPredictions, setSavingPredictions] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchRounds();
  }, []);

  useEffect(() => {
    if (selectedRound && user) {
      fetchMatches();
      fetchPredictions();
    }
  }, [selectedRound, user]);

  const fetchRounds = async () => {
    try {
      const response = await fetch('/api/rounds');
      if (response.ok) {
        const data = await response.json();
        setRounds(data);
        if (data.length > 0) {
          setSelectedRound(data[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching rounds:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await fetch(`/api/matches?roundId=${selectedRound}`);
      if (response.ok) {
        const data = await response.json();
        setMatches(data);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const fetchPredictions = async () => {
    try {
      const response = await fetch(`/api/predictions/user/${user?.id}?roundId=${selectedRound}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPredictions(data);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  const savePrediction = async (matchId: number, outcome: string, homeScore?: number, awayScore?: number) => {
    setSavingPredictions(prev => new Set(prev).add(matchId));
    
    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          matchId,
          predictedOutcome: outcome,
          predictedHomeScore: homeScore,
          predictedAwayScore: awayScore
        })
      });

      if (response.ok) {
        fetchPredictions(); // Refresh predictions
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save prediction');
      }
    } catch (error) {
      console.error('Error saving prediction:', error);
      alert('Failed to save prediction');
    } finally {
      setSavingPredictions(prev => {
        const newSet = new Set(prev);
        newSet.delete(matchId);
        return newSet;
      });
    }
  };

  const getPredictionForMatch = (matchId: number) => {
    return predictions.find(p => p.match_id === matchId);
  };

  const isPredictionOpen = (match: Match) => {
    return match.status === 'scheduled' && new Date() < new Date(match.prediction_deadline);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOutcomeText = (outcome: string) => {
    switch (outcome) {
      case 'home_win': return 'Home Win';
      case 'away_win': return 'Away Win';
      case 'draw': return 'Draw';
      default: return outcome;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-green-600">My Predictions</h1>
          <p className="text-gray-600 mt-1">Make your predictions and track your performance</p>
        </div>
        
        <div className="w-48">
          <Select value={selectedRound} onValueChange={setSelectedRound}>
            <SelectTrigger>
              <SelectValue placeholder="Select round" />
            </SelectTrigger>
            <SelectContent>
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
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No matches found for the selected round.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => {
            const prediction = getPredictionForMatch(match.id);
            const canPredict = isPredictionOpen(match);
            const isSaving = savingPredictions.has(match.id);

            return (
              <Card key={match.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-8 flex-1">
                      {/* Home Team */}
                      <div className="text-right flex-1">
                        <div className="font-semibold text-lg">{match.home_team_name}</div>
                        <div className="text-sm text-gray-500">{match.home_team_short}</div>
                      </div>

                      {/* VS */}
                      <div className="text-center min-w-[120px]">
                        <div className="text-xl font-semibold text-gray-400">vs</div>
                      </div>

                      {/* Away Team */}
                      <div className="text-left flex-1">
                        <div className="font-semibold text-lg">{match.away_team_name}</div>
                        <div className="text-sm text-gray-500">{match.away_team_short}</div>
                      </div>
                    </div>

                    {/* Match Info */}
                    <div className="text-right space-y-1">
                      <div className="text-sm text-gray-500">{formatDate(match.match_date)}</div>
                      {canPredict ? (
                        <div className="text-xs text-green-600 font-medium flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Open for predictions
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">
                          Predictions closed
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Prediction Section */}
                  <div className="border-t pt-4">
                    {prediction ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {prediction.is_evaluated ? (
                              prediction.points_earned > 0 ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <X className="h-4 w-4 text-red-600" />
                              )
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-600" />
                            )}
                            <span className="font-medium">
                              Predicted: {getOutcomeText(prediction.predicted_outcome)}
                            </span>
                            {prediction.predicted_home_score !== null && prediction.predicted_away_score !== null && (
                              <span className="text-gray-600">
                                ({prediction.predicted_home_score}-{prediction.predicted_away_score})
                              </span>
                            )}
                          </div>
                          {prediction.is_evaluated && (
                            <div className="text-right">
                              <span className="font-bold text-green-600">
                                +{prediction.points_earned} pts
                              </span>
                            </div>
                          )}
                        </div>
                        {canPredict && (
                          <div className="text-xs text-blue-600">
                            You can still update this prediction
                          </div>
                        )}
                      </div>
                    ) : canPredict ? (
                      <div className="text-sm text-gray-500">
                        No prediction made yet
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">
                        Prediction deadline passed
                      </div>
                    )}

                    {/* Prediction Form */}
                    {canPredict && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <PredictionForm
                          match={match}
                          prediction={prediction}
                          onSave={savePrediction}
                          isSaving={isSaving}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface PredictionFormProps {
  match: Match;
  prediction?: Prediction;
  onSave: (matchId: number, outcome: string, homeScore?: number, awayScore?: number) => void;
  isSaving: boolean;
}

function PredictionForm({ match, prediction, onSave, isSaving }: PredictionFormProps) {
  const [outcome, setOutcome] = useState(prediction?.predicted_outcome || '');
  const [homeScore, setHomeScore] = useState(prediction?.predicted_home_score?.toString() || '');
  const [awayScore, setAwayScore] = useState(prediction?.predicted_away_score?.toString() || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome) return;

    const homeScoreNum = homeScore ? parseInt(homeScore) : undefined;
    const awayScoreNum = awayScore ? parseInt(awayScore) : undefined;

    onSave(match.id, outcome, homeScoreNum, awayScoreNum);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Predict the outcome:</Label>
        <Select value={outcome} onValueChange={setOutcome}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem