/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { Navigation } from './components/Navigation';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { DinnerDetail } from './pages/DinnerDetail';
import { Profile } from './pages/Profile';
import { HostProfile } from './pages/HostProfile';
import { Bookings } from './pages/Bookings';
import { ReviewPage } from './pages/ReviewPage';
import { Login } from './pages/Login';
import { CreateDinner } from './pages/CreateDinner';
import { Messages } from './pages/Messages';
import { seedDB } from './lib/seedData';

export default function App() {
  useEffect(() => {
    seedDB().catch(err => {
      console.warn('Seeding skipped or failed:', err);
    });
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-bg-warm">
          <Navigation />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dinner/:id" element={<DinnerDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/review/:dinnerId" element={<ReviewPage />} />
              <Route path="/host/:id" element={<HostProfile />} />
              <Route path="/host/create" element={<CreateDinner />} />
              <Route path="/host/edit/:id" element={<CreateDinner />} />
              <Route path="/messages/:conversationId" element={<Messages />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
