import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Home } from './pages/Home';
import { Matches } from './pages/Matches';
import { Predictions } from './pages/Predictions';
import { Standings } from './pages/Standings';
import { Leaderboard } from './pages/Leaderboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 dark:from-green-950 dark:to-yellow-950">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="matches" element={<Matches />} />
              <Route path="predictions" element={
                <ProtectedRoute>
                  <Predictions />
                </ProtectedRoute>
              } />
              <Route path="standings" element={<Standings />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="admin" element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
