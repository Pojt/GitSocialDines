import React from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Dinner } from '../types';
import { Heart, MapPin } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { dbService } from '../lib/dbService';

import { calculateDistance, formatDistance } from '../lib/utils';

export const SkeletonCard = () => (
  <div className="bg-white rounded-3xl overflow-hidden animate-pulse border border-stone-100">
    <div className="aspect-[4/3] bg-stone-200" />
    <div className="p-6 space-y-4">
      <div className="h-6 bg-stone-200 rounded w-3/4" />
      <div className="h-4 bg-stone-200 rounded w-1/2" />
      <div className="flex space-x-2">
        <div className="h-4 bg-stone-200 rounded w-16" />
        <div className="h-4 bg-stone-200 rounded w-16" />
      </div>
    </div>
  </div>
);

export const DinnerCard: React.FC<{ dinner: Dinner, userLocation?: {lat: number, lng: number} | null }> = ({ dinner, userLocation }) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isFavorite, setIsFavorite] = React.useState(profile?.favorites?.includes(dinner.id) || false);
  const isHost = user && user.uid === dinner.hostId;

  const distanceText = React.useMemo(() => {
    if (!userLocation || !dinner.lat || !dinner.lng) return null;
    const dist = calculateDistance(userLocation.lat, userLocation.lng, dinner.lat, dinner.lng);
    return formatDistance(dist);
  }, [userLocation, dinner.lat, dinner.lng]);

  React.useEffect(() => {
    setIsFavorite(profile?.favorites?.includes(dinner.id) || false);
  }, [profile?.favorites, dinner.id]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    const oldFav = isFavorite;
    setIsFavorite(!oldFav); // Optimistic update
    try {
      await dbService.toggleFavorite(user.uid, dinner.id);
    } catch (err) {
      setIsFavorite(oldFav); // Rollback
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={() => navigate(`/dinner/${dinner.id}`)}
      className="group bg-white rounded-[32px] sm:rounded-[40px] p-3 sm:p-4 card-shadow border border-brand-light flex flex-col h-full hover:translate-y-[-8px] transition-all duration-500 cursor-pointer overflow-hidden"
    >
      <div className="relative h-48 sm:h-64 w-full rounded-[24px] sm:rounded-[32px] bg-stone-200 mb-4 sm:mb-5 overflow-hidden">
        {/* The Menu takes center stage */}
        <img 
          src={dinner.images[0] || 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80'} 
          alt={dinner.title}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
        />
        
        {/* Host Avatar on image */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[18px] border-2 border-white shadow-xl overflow-hidden bg-stone-100">
           <img 
             src={dinner.host?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dinner.hostId}`} 
             className="w-full h-full object-cover" 
             alt={dinner.host?.displayName} 
           />
        </div>
        
        {/* Overlay for food/dinner title */}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
           <div className="flex justify-between items-end">
              <div className="max-w-[85%] sm:max-w-[80%]">
                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-0.5 sm:mb-1">In {dinner.locationName || dinner.host?.city?.split(' ')[0]}</p>
                <h3 className="serif text-lg sm:text-xl font-bold text-white leading-tight truncate">
                  {dinner.title}
                </h3>
              </div>
           </div>
        </div>
        
        {/* Heart icon button */}
        <button 
          onClick={handleFavoriteClick}
          className={`absolute top-3 left-3 sm:top-4 sm:left-4 p-2 sm:p-2.5 rounded-full backdrop-blur-md transition-all ${isFavorite ? 'bg-brand text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}
        >
          <Heart size={16} fill={isFavorite ? "currentColor" : "none"} strokeWidth={2.5} className="sm:hidden" />
          <Heart size={18} fill={isFavorite ? "currentColor" : "none"} strokeWidth={2.5} className="hidden sm:block" />
        </button>

        {/* Personality Badge (Vibe) */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
           <span className="bg-brand text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg">
             {dinner.vibe}
           </span>
        </div>
      </div>
      
      <div className="px-1 sm:px-2 flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
             <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                <span className="text-base sm:text-lg font-serif font-black text-ink truncate">
                  {dinner.cuisine} with {dinner.host?.displayName}
                </span>
                <span className="text-brand font-black text-sm">${dinner.price}</span>
             </div>
             <p className="text-[8px] sm:text-[10px] text-stone-400 uppercase tracking-widest font-black">
                {distanceText ? `${distanceText} away` : 'Nearby'} • {dinner.vibe}
             </p>
          </div>
        </div>

        {/* Shared Interests */}
        {profile?.interests && dinner.host?.interests && (
          <div className="mb-3 sm:mb-4">
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {dinner.host.interests.slice(0, 2).map(interest => {
                const isMatch = profile.interests?.includes(interest);
                return (
                  <span 
                    key={interest} 
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest border transition-colors ${
                      isMatch 
                      ? 'bg-brand/10 border-brand text-brand' 
                      : 'bg-stone-50 border-stone-100 text-stone-400'
                    }`}
                  >
                    {isMatch && '✨ '}{interest}
                  </span>
                );
              })}
              {dinner.host.interests.length > 2 && (
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-stone-50 border border-stone-100 text-stone-400">
                  +{dinner.host.interests.length - 2}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-auto pt-3 sm:pt-4 border-t border-brand-light flex items-center justify-between">
           <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-stone-500">
                 {dinner.guestsMax - dinner.guestsCount} Seats Left
              </span>
           </div>
           <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-brand group-hover:translate-x-1 transition-transform">
              Join Table →
           </span>
        </div>
      </div>
    </motion.div>
  );
};
