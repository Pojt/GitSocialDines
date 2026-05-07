import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, LogOut, Calendar, Home, User as UserIcon } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import { db } from '../lib/firebase';
import { AppNotification } from '../types';
import { NotificationDropdown } from './NotificationDropdown';

export const Navigation: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const q = query(
      collection(db, 'notifications', user.uid, 'items'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    return onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() }) as AppNotification));
    }, () => {});
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-warm/90 backdrop-blur-md border-b border-brand-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-12">
            <Link to="/" className="flex items-center space-x-2 group">
              <h1 className="font-serif text-3xl font-bold tracking-tight text-brand transition-colors group-hover:opacity-80">Social Dine</h1>
            </Link>

            {user && (
              <div className="hidden sm:flex items-center space-x-8">
                <Link
                  to="/bookings"
                  className={`text-sm font-medium transition-all ${isActive('/bookings') ? 'text-ink border-b-2 border-brand pb-1' : 'text-stone-500 hover:text-ink'}`}
                >
                  My Bookings
                </Link>
                <Link
                  to="/host/create"
                  className={`text-sm font-semibold transition-all ${isActive('/host/create') ? 'text-brand' : 'text-stone-500 hover:text-brand'}`}
                >
                  Set a Table
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-brand-light text-[10px] font-black uppercase tracking-wider text-brand">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Solo-Friendly Mode
            </div>

            {user ? (
              <div className="flex items-center space-x-4">
                <div ref={notifRef} className="relative">
                  <button
                    onClick={() => setShowNotifications(v => !v)}
                    className="relative text-stone-400 hover:text-brand transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-brand text-white rounded-full text-[8px] font-black flex items-center justify-center px-0.5">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {showNotifications && (
                      <NotificationDropdown
                        userId={user.uid}
                        notifications={notifications}
                        onClose={() => setShowNotifications(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => signOut()}
                  className="text-stone-400 hover:text-brand transition-colors"
                >
                  <LogOut size={18} />
                </button>
                <Link to="/profile" className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden flex items-center justify-center font-bold text-brand bg-brand-light text-sm">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    profile?.displayName?.charAt(0) || 'U'
                  )}
                </Link>
              </div>
            ) : (
              <Link
                to="/login"
                className="olive-btn text-xs"
              >
                Join the table
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-1 left-4 right-4 bg-white/90 backdrop-blur-xl border border-stone-200 px-6 py-4 flex justify-between items-center z-50 rounded-[32px] shadow-2xl">
        <Link to="/" className={`flex flex-col items-center ${isActive('/') ? 'text-brand' : 'text-stone-400'}`}>
          <Home size={18} />
          <span className="text-[10px] mt-1 font-bold uppercase tracking-wider">Home</span>
        </Link>
        <Link to="/bookings" className={`flex flex-col items-center resident relative ${isActive('/bookings') ? 'text-brand' : 'text-stone-400'}`}>
          <Calendar size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 bg-brand text-white rounded-full text-[7px] font-black flex items-center justify-center px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="text-[10px] mt-1 font-bold uppercase tracking-wider">Tables</span>
        </Link>
        <Link to="/profile" className={`flex flex-col items-center ${isActive('/profile') ? 'text-brand' : 'text-stone-400'}`}>
          <UserIcon size={18} />
          <span className="text-[10px] mt-1 font-bold uppercase tracking-wider">Me</span>
        </Link>
      </div>
    </nav>
  );
};
