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
      className="group bg-white rounded-[32px] p-5 card-shadow border border-brand-light flex flex-col h-full hover:translate-y-[-4px] transition-all duration-300 cursor-pointer"
    >
      <div className="relative h-48 w-full rounded-[24px] bg-stone-200 mb-4 overflow-hidden">
        <img 
          src={dinner.images[0] || 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80'} 
          alt={dinner.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        
        {/* Heart icon button */}
        <button 
          onClick={handleFavoriteClick}
          className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md transition-all ${isFavorite ? 'bg-brand text-white' : 'bg-white/40 text-white hover:bg-white/60'}`}
        >
          <Heart size={18} fill={isFavorite ? "currentColor" : "none"} strokeWidth={2.5} />
        </button>

        <div className="absolute bottom-3 left-4 flex gap-2">
          <span className="bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-brand">
            {dinner.vibe}
          </span>
          {distanceText && (
            <span className="bg-ink text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
              {distanceText} away
            </span>
          )}
          {dinner.guestsMax - dinner.guestsCount <= 2 && (
            <span className="bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-orange-600">
              {dinner.guestsMax - dinner.guestsCount} Seats Left
            </span>
          )}
          {isHost && (
            <Link 
              to={`/host/edit/${dinner.id}`}
              onClick={(e) => e.stopPropagation()}
              className="bg-stone-800 text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-brand transition-colors"
            >
              Edit
            </Link>
          )}
        </div>
      </div>
      
      <div className="flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="serif text-2xl font-semibold text-ink leading-tight">
            {dinner.title}
          </h3>
          <span className="text-lg font-medium text-brand">${dinner.price}</span>
        </div>
        
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (dinner.hostId) navigate(`/host/${dinner.hostId}`);
          }}
          className="flex items-center gap-2 mb-4 hover:opacity-70 transition-opacity"
        >
          <img 
            src={dinner.host?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Host'} 
            className="w-6 h-6 rounded-full bg-stone-200 object-cover"
            alt={dinner.host?.displayName}
          />
          <div className="flex-1 min-w-0">
             <p className="text-sm font-semibold text-stone-800 truncate">
               {dinner.host?.displayName} {dinner.host?.isVerified && <span className="text-brand">✓</span>}
             </p>
             <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold flex items-center gap-1">
               <MapPin size={10} className="text-stone-300" />
               {dinner.locationName || dinner.host?.city?.split(' ')[0]} 
               {distanceText && <span className="text-brand ml-1">• {distanceText} away</span>}
             </p>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          {dinner.dietaryOptions?.slice(0, 2).map(opt => (
            <span key={opt} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-100 flex items-center gap-1">
              <span className="w-1 h-1 bg-emerald-400 rounded-full"></span>
              {opt}
            </span>
          ))}
          {dinner.tags?.slice(0, 1).map(tag => (
            <span key={tag} className="vibe-tag">#{tag}</span>
          ))}
          {dinner.cuisine !== 'All' && <span className="vibe-tag">{dinner.cuisine}</span>}
        </div>
      </div>
    </motion.div>
  );
};
