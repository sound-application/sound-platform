/**
 * Sound Platform — App Root
 * ==========================
 * Phase: 5-A (Online App Shell)
 *
 * Wraps the full app with:
 *   1. BrowserRouter — client-side routing
 *   2. AuthProvider  — Firebase Auth state (loading/signed-out/signed-in)
 *   3. AppRouter     — protected and public routes
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppRouter }   from './router/AppRouter';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
