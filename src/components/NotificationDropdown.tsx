import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { AppNotification } from '../types';
import { dbService } from '../lib/dbService';

interface Props {
  userId: string;
  notifications: AppNotification[];
  onClose: () => void;
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export const NotificationDropdown: React.FC<Props> = ({ userId, notifications, onClose }) => {
  const hasUnread = notifications.some(n => !n.isRead);

  const handleMarkAllRead = () => {
    dbService.markAllNotificationsRead(userId);
  };

  const handleClick = (notif: AppNotification) => {
    if (!notif.isRead) dbService.markNotificationRead(userId, notif.id);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-10 w-80 bg-white rounded-[24px] border border-brand-light shadow-xl overflow-hidden z-50"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-brand-light">
        <p className="text-[10px] font-black uppercase tracking-widest text-brand">Notifications</p>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-[10px] font-bold text-stone-400 hover:text-brand transition-colors"
          >
            <Check size={11} />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <Bell size={22} className="mx-auto text-stone-200 mb-2" />
          <p className="text-xs text-stone-400 font-medium">Nothing new yet</p>
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto divide-y divide-brand-light">
          {notifications.map(notif => (
            <Link
              key={notif.id}
              to={notif.link}
              onClick={() => handleClick(notif)}
              className={`flex items-start gap-3 px-5 py-4 hover:bg-brand/5 transition-colors ${!notif.isRead ? 'bg-brand/[0.03]' : ''}`}
            >
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${!notif.isRead ? 'bg-brand' : 'bg-transparent'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs leading-snug ${notif.isRead ? 'text-stone-500' : 'text-ink font-medium'}`}>
                  {notif.message}
                </p>
                <p className="text-[10px] text-stone-400 mt-1">{formatTime(notif.createdAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
};
