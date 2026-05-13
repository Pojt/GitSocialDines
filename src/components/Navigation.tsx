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
  const isChatPage = location.pathname.startsWith('/messages/');

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
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-warm/95 backdrop-blur-md border-b border-brand-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 sm:h-20 items-center">
            <div className="flex items-center gap-12">
              <Link to="/" className="flex items-center space-x-2 group">
                <h1 className="font-serif text-xl sm:text-3xl font-bold tracking-tight text-brand transition-colors group-hover:opacity-80">Social Dine</h1>
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

            <div className="flex items-center space-x-4 sm:space-x-6">
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
                    className="text-stone-400 hover:text-brand transition-colors hidden sm:block"
                  >
                    <LogOut size={18} />
                  </button>
                  <Link to="/profile" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white shadow-sm overflow-hidden flex items-center justify-center font-bold text-brand bg-brand-light text-xs sm:text-sm">
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
                  className="olive-btn text-[10px] sm:text-xs py-2 px-4"
                >
                  Join
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav - Moved outside the top nav to avoid stacking context issues */}
      {!isChatPage && (
        <div className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-white/95 backdrop-blur-xl border border-brand-light px-10 py-4 flex justify-between items-center z-[100] rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
          <Link to="/" className={`flex flex-col items-center gap-1.5 transition-all ${isActive('/') ? 'text-brand scale-110' : 'text-stone-300'}`}>
            <Home size={22} strokeWidth={isActive('/') ? 2.5 : 1.5} />
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Explore</span>
          </Link>
          <Link to="/bookings" className={`flex flex-col items-center gap-1.5 resident relative transition-all ${isActive('/bookings') ? 'text-brand scale-110' : 'text-stone-300'}`}>
            <div className="relative">
              <Calendar size={22} strokeWidth={isActive('/bookings') ? 2.5 : 1.5} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-brand text-white rounded-full text-[8px] font-black flex items-center justify-center px-1 shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Bookings</span>
          </Link>
          <Link to="/profile" className={`flex flex-col items-center gap-1.5 transition-all ${isActive('/profile') ? 'text-brand scale-110' : 'text-stone-300'}`}>
            <UserIcon size={22} strokeWidth={isActive('/profile') ? 2.5 : 1.5} />
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Profile</span>
          </Link>
        </div>
      )}
    </>
  );
};
