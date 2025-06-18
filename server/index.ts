import express from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { setupStaticServing } from './static-serve.js';
import { db } from './database/connection.js';

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await db
      .selectFrom('users')
      .select(['id', 'username', 'email', 'is_admin', 'total_points'])
      .where('id', '=', decoded.userId)
      .executeTakeFirst();

    if (!user) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).json({ error: 'Invalid token' });
    return;
  }
};

// Admin middleware
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user?.is_admin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Check if user already exists
    const existingUser = await db
      .selectFrom('users')
      .select('id')
      .where('email', '=', email)
      .orWhere('username', '=', username)
      .executeTakeFirst();

    if (existingUser) {
      res.status(400).json({ error: 'Username or email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db
      .insertInto('users')
      .values({
        username,
        email,
        password_hash: hashedPassword,
        is_admin: false,
        total_points: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .returning(['id', 'username', 'email', 'is_admin', 'total_points'])
      .executeTakeFirst();

    const token = jwt.sign({ userId: user!.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user!.id,
        username: user!.username,
        email: user!.email,
        is_admin: user!.is_admin,
        total_points: user!.total_points
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst();

    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin,
        total_points: user.total_points
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info
app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  res.json({ user: req.user });
});

// Teams endpoints
app.get('/api/teams', async (req, res) => {
  try {
    const teams = await db
      .selectFrom('teams')
      .selectAll()
      .orderBy('name')
      .execute();

    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rounds endpoints
app.get('/api/rounds', async (req, res) => {
  try {
    const rounds = await db
      .selectFrom('rounds')
      .selectAll()
      .orderBy('round_number')
      .execute();

    res.json(rounds);
  } catch (error) {
    console.error('Error fetching rounds:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Matches endpoints
app.get('/api/matches', async (req, res) => {
  try {
    const { roundId } = req.query;
    
    let query = db
      .selectFrom('matches')
      .leftJoin('teams as home_team', 'matches.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'matches.away_team_id', 'away_team.id')
      .leftJoin('rounds', 'matches.round_id', 'rounds.id')
      .select([
        'matches.id',
        'matches.round_id',
        'matches.match_date',
        'matches.home_score',
        'matches.away_score',
        'matches.status',
        'matches.prediction_deadline',
        'home_team.name as home_team_name',
        'home_team.short_name as home_team_short',
        'away_team.name as away_team_name',
        'away_team.short_name as away_team_short',
        'rounds.name as round_name',
        'rounds.round_number'
      ]);

    if (roundId) {
      query = query.where('matches.round_id', '=', Number(roundId));
    }

    const matches = await query
      .orderBy('matches.match_date')
      .execute();

    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Predictions endpoints
app.post('/api/predictions', authenticateToken, async (req: any, res) => {
  try {
    const { matchId, predictedOutcome, predictedHomeScore, predictedAwayScore } = req.body;
    const userId = req.user.id;

    if (!matchId || !predictedOutcome) {
      res.status(400).json({ error: 'Match ID and predicted outcome are required' });
      return;
    }

    // Check if match exists and deadline hasn't passed
    const match = await db
      .selectFrom('matches')
      .select(['id', 'prediction_deadline', 'status'])
      .where('id', '=', matchId)
      .executeTakeFirst();

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    if (new Date() > new Date(match.prediction_deadline)) {
      res.status(400).json({ error: 'Prediction deadline has passed' });
      return;
    }

    if (match.status !== 'scheduled') {
      res.status(400).json({ error: 'Cannot predict on non-scheduled matches' });
      return;
    }

    // Insert or update prediction
    const prediction = await db
      .insertInto('predictions')
      .values({
        user_id: userId,
        match_id: matchId,
        predicted_outcome: predictedOutcome,
        predicted_home_score: predictedHomeScore || null,
        predicted_away_score: predictedAwayScore || null,
        points_earned: 0,
        is_evaluated: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .onConflict((oc) => oc
        .columns(['user_id', 'match_id'])
        .doUpdateSet({
          predicted_outcome: predictedOutcome,
          predicted_home_score: predictedHomeScore || null,
          predicted_away_score: predictedAwayScore || null,
          updated_at: new Date().toISOString()
        })
      )
      .returning(['id', 'predicted_outcome', 'predicted_home_score', 'predicted_away_score'])
      .executeTakeFirst();

    res.json(prediction);
  } catch (error) {
    console.error('Error creating prediction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/predictions/user/:userId', authenticateToken, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { roundId } = req.query;

    // Users can only view their own predictions unless they're admin
    if (userId !== req.user.id && !req.user.is_admin) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    let query = db
      .selectFrom('predictions')
      .leftJoin('matches', 'predictions.match_id', 'matches.id')
      .leftJoin('teams as home_team', 'matches.home_team_id', 'home_team.id')
      .leftJoin('teams as away_team', 'matches.away_team_id', 'away_team.id')
      .select([
        'predictions.id',
        'predictions.match_id',
        'predictions.predicted_outcome',
        'predictions.predicted_home_score',
        'predictions.predicted_away_score',
        'predictions.points_earned',
        'predictions.is_evaluated',
        'matches.match_date',
        'matches.home_score',
        'matches.away_score',
        'matches.status',
        'home_team.name as home_team_name',
        'home_team.short_name as home_team_short',
        'away_team.name as away_team_name',
        'away_team.short_name as away_team_short'
      ])
      .where('predictions.user_id', '=', userId);

    if (roundId) {
      query = query.where('matches.round_id', '=', Number(roundId));
    }

    const predictions = await query
      .orderBy('matches.match_date')
      .execute();

    res.json(predictions);
  } catch (error) {
    console.error('Error fetching user predictions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// League standings
app.get('/api/standings', async (req, res) => {
  try {
    const standings = await db
      .selectFrom('league_standings')
      .leftJoin('teams', 'league_standings.team_id', 'teams.id')
      .select([
        'league_standings.position',
        'teams.name as team_name',
        'teams.short_name',
        'league_standings.matches_played',
        'league_standings.wins',
        'league_standings.draws',
        'league_standings.losses',
        'league_standings.goals_for',
        'league_standings.goals_against',
        'league_standings.goal_difference',
        'league_standings.points'
      ])
      .orderBy('league_standings.position')
      .execute();

    res.json(standings);
  } catch (error) {
    console.error('Error fetching standings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await db
      .selectFrom('users')
      .select(['id', 'username', 'total_points'])
      .where('is_admin', '=', false)
      .orderBy('total_points', 'desc')
      .limit(50)
      .execute();

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoints
app.post('/api/admin/rounds', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { roundNumber, name, startDate, endDate } = req.body;

    const round = await db
      .insertInto('rounds')
      .values({
        round_number: roundNumber,
        name,
        start_date: startDate,
        end_date: endDate,
        is_active: false,
        created_at: new Date().toISOString()
      })
      .returning(['id', 'round_number', 'name', 'start_date', 'end_date'])
      .executeTakeFirst();

    res.json(round);
  } catch (error) {
    console.error('Error creating round:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/matches', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { roundId, homeTeamId, awayTeamId, matchDate, predictionDeadline } = req.body;

    const match = await db
      .insertInto('matches')
      .values({
        round_id: roundId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        match_date: matchDate,
        prediction_deadline: predictionDeadline,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .returning(['id'])
      .executeTakeFirst();

    res.json(match);
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/matches/:id/result', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const { homeScore, awayScore, status } = req.body;

    await db
      .updateTable('matches')
      .set({
        home_score: homeScore,
        away_score: awayScore,
        status: status || 'finished',
        updated_at: new Date().toISOString()
      })
      .where('id', '=', matchId)
      .execute();

    // Evaluate predictions for this match
    await evaluatePredictions(matchId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating match result:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to evaluate predictions
async function evaluatePredictions(matchId: number) {
  try {
    const match = await db
      .selectFrom('matches')
      .select(['home_score', 'away_score'])
      .where('id', '=', matchId)
      .executeTakeFirst();

    if (!match || match.home_score === null || match.away_score === null) {
      return;
    }

    const actualOutcome = match.home_score > match.away_score ? 'home_win' 
      : match.away_score > match.home_score ? 'away_win' : 'draw';

    const predictions = await db
      .selectFrom('predictions')
      .selectAll()
      .where('match_id', '=', matchId)
      .where('is_evaluated', '=', false)
      .execute();

    for (const prediction of predictions) {
      let points = 0;

      // Points for correct outcome
      if (prediction.predicted_outcome === actualOutcome) {
        points += 3;
      }

      // Additional points for exact score
      if (prediction.predicted_home_score === match.home_score && 
          prediction.predicted_away_score === match.away_score) {
        points += 2;
      }

      // Update prediction with points
      await db
        .updateTable('predictions')
        .set({
          points_earned: points,
          is_evaluated: true,
          updated_at: new Date().toISOString()
        })
        .where('id', '=', prediction.id)
        .execute();

      // Update user's total points
      await db
        .updateTable('users')
        .set({
          total_points: (eb) => eb('total_points', '+', points),
          updated_at: new Date().toISOString()
        })
        .where('id', '=', prediction.user_id)
        .execute();
    }

    console.log(`Evaluated ${predictions.length} predictions for match ${matchId}`);
  } catch (error) {
    console.error('Error evaluating predictions:', error);
  }
}

// Export a function to start the server
export async function startServer(port: number) {
  try {
    if (process.env.NODE_ENV === 'production') {
      setupStaticServing(app);
    }
    app.listen(port, () => {
      console.log(`AlphaBet API Server running on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting AlphaBet server...');
  startServer(Number(process.env.PORT) || 3001);
}
