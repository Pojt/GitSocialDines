/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import { Onboarding } from './pages/Onboarding';
import { CreateDinner } from './pages/CreateDinner';
import { Messages } from './pages/Messages';
import { seedDB } from './lib/seedData';
import { APIProvider } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(GOOGLE_MAPS_API_KEY) && GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY';

export default function App() {
  useEffect(() => {
    seedDB().catch(err => {
      console.warn('Seeding skipped or failed:', err);
    });
  }, []);

  if (!hasValidKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-warm p-6">
        <div className="max-w-md w-full bg-white rounded-[32px] p-10 shadow-2xl text-center border border-brand-light">
          <h2 className="serif text-3xl font-bold text-ink mb-6">Setup Required</h2>
          <div className="space-y-6 text-left text-stone-600">
            <p className="font-serif italic text-lg opacity-80 text-center">To enable location features like autocomplete, a Google Maps API Key is needed.</p>
            
            <div className="bg-stone-50 rounded-2xl p-6 space-y-4 border border-stone-100">
              <p className="text-sm font-bold text-ink flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-xs">1</span>
                Get an API Key
              </p>
              <a 
                href="https://console.cloud.google.com/google/maps-apis/start" 
                target="_blank" 
                rel="noopener"
                className="block w-full py-3 bg-brand text-white rounded-xl text-center text-xs font-black uppercase tracking-widest hover:bg-brand/90 transition-colors shadow-lg shadow-brand/20"
              >
                Go to Cloud Console
              </a>
            </div>

            <div className="bg-stone-50 rounded-2xl p-6 space-y-4 border border-stone-100">
              <p className="text-sm font-bold text-ink flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-xs">2</span>
                Add as Secret
              </p>
              <ul className="text-xs space-y-3 font-medium text-stone-500">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1 shrink-0" />
                  <span>Open <strong>Settings</strong> (⚙️ icon, top-right)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1 shrink-0" />
                  <span>Select <strong>Secrets</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1 shrink-0" />
                  <span>Add <code>GOOGLE_MAPS_PLATFORM_KEY</code></span>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-8 text-[10px] uppercase font-black tracking-widest text-stone-400">The app will rebuild automatically</p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-bg-warm">
            <Navigation />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/login" element={<Login />} />
                <Route path="/onboarding" element={<Onboarding />} />
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
    </APIProvider>
  );
}
