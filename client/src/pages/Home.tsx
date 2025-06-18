import * as React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Trophy, Target, Calendar, Award } from 'lucide-react';

interface Match {
  id: number;
  home_team_name: string;
  away_team_name: string;
  match_date: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

interface LeaderboardEntry {
  id: number;
  username: string;
  total_points: number;
}

export function Home() {
  const { user } = useAuth();
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [topUsers, setTopUsers] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [matchesRes, leaderboardRes] = await Promise.all([
        fetch('/api/matches'),
        fetch('/api/leaderboard')
      ]);

      if (matchesRes.ok) {
        const matches = await matchesRes.json();
        const upcoming = matches
          .filter((match: Match) => match.status === 'scheduled')
          .slice(0, 5);
        setUpcomingMatches(upcoming);
      }

      if (leaderboardRes.ok) {
        const leaderboard = await leaderboardRes.json();
        setTopUsers(leaderboard.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <div className="flex justify-center mb-6">
          <Trophy className="h-20 w-20 text-green-600" />
        </div>
        <h1 className="text-4xl font-bold text-green-600 mb-4">
          Welcome to AlphaBet
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          The ultimate Brazilian Série A prediction platform. Make predictions, compete with friends, and climb the leaderboard!
        </p>
        {!user && (
          <div className="flex justify-center space-x-4">
            <Link to="/register">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                Get Started
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* User Welcome */}
      {user && (
        <Card className="bg-gradient-to-r from-green-500 to-yellow-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Welcome back, {user.username}!</h2>
                <p className="text-green-100">Ready to make some predictions?</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{user.total_points}</div>
                <div className="text-green-100">Total Points</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upcoming Matches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Upcoming Matches</span>
            </CardTitle>
            <CardDescription>Next matches you can predict</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingMatches.length > 0 ? (
              <div className="space-y-3">
                {upcomingMatches.map((match) => (
                  <div key={match.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {match.home_team_name} vs {match.away_team_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(match.match_date)}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-3">
                  <Link to="/matches">
                    <Button variant="outline" className="w-full">
                      View All Matches
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No upcoming matches</p>
            )}
          </CardContent>
        </Card>

        {/* Top Predictors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Top Predictors</span>
            </CardTitle>
            <CardDescription>Current leaderboard leaders</CardDescription>
          </CardHeader>
          <CardContent>
            {topUsers.length > 0 ? (
              <div className="space-y-3">
                {topUsers.map((user, index) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="font-medium">{user.username}</span>
                    </div>
                    <span className="font-bold text-green-600">{user.total_points} pts</span>
                  </div>
                ))}
                <div className="pt-3">
                  <Link to="/leaderboard">
                    <Button variant="outline" className="w-full">
                      View Full Leaderboard
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No rankings yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-6 mt-12">
        <Card className="text-center">
          <CardContent className="p-6">
            <Target className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Make Predictions</h3>
            <p className="text-sm text-gray-600">
              Predict match outcomes and exact scores for all Série A games
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <Trophy className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Earn Points</h3>
            <p className="text-sm text-gray-600">
              Get points for correct predictions and climb the leaderboard
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <Award className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Compete</h3>
            <p className="text-sm text-gray-600">
              Challenge friends and see who's the best predictor
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
