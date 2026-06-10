import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LiveStateProvider } from './context/LiveStateContext';

// Pages
import LoginPage from './pages/LoginPage';
import Signup from './pages/Signup';
import DashboardPage from './pages/DashboardPage';
import FleetPage from './pages/FleetPage';
import HazardsPage from './pages/HazardsPage';
import MissionLogPage from './pages/MissionLogPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import WeatherPage from './pages/WeatherPage';

// Layout
import AppShell from './components/layout/AppShell';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          border: '2px solid var(--accent-blue)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
        }} className="animate-spin" />
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--accent-blue)',
          letterSpacing: 'var(--tracking-widest)'
        }}>
          SECURE OPERATIONS CHANNEL INITIALIZING...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <LiveStateProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Core Console Routes inside AppShell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="fleet" element={<FleetPage />} />
              <Route path="hazards" element={<HazardsPage />} />
              <Route path="mission-log" element={<MissionLogPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="weather" element={<WeatherPage />} />
              <Route path="about" element={<AboutPage />} />
            </Route>

            {/* Fallback Catch-All */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </LiveStateProvider>
      </AuthProvider>
    </Router>
  );
}
