import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../lib/dbService';
import { useAuth } from '../AuthContext';
import { Dinner } from '../types';
import { DinnerCard, SkeletonCard } from '../components/DinnerCard';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Map as MapIcon, 
  LayoutGrid, 
  Filter, 
  Calendar, 
  Users, 
  ChevronDown,
  Sparkles,
  MapPin,
  X
} from 'lucide-react';
import { Map, Marker, Overlay, ZoomControl } from 'pigeon-maps';
import { stamenToner } from 'pigeon-maps/providers';
import { calculateDistance, formatDistance } from '../lib/utils';

const CUISINES = ['All', 'Italian', 'French', 'Japanese', 'Mexican', 'Indian', 'Mediterranean', 'Nordic', 'Latin American'];
const DIETARY = ['Vegan', 'Vegetarian', 'Gluten-free', 'Dairy-free'];
const VIBES = ['Lively', 'Intimate', 'Deep Conversation', 'Artist Table', 'Festive'];

export const Explore: React.FC = () => {
  const [dinners, setDinners] = useState<Dinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const PAGE_SIZE = 9;

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const lastDinner = dinners[dinners.length - 1];
    const moreData = await dbService.getDinners({ 
      limit: PAGE_SIZE, 
      startAfter: lastDinner.date 
    });
    if (moreData.length < PAGE_SIZE) setHasMore(false);
    setDinners(prev => [...prev, ...moreData]);
    setLoadingMore(false);
  };
  
  // Filters
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [sharedInterestsOnly, setSharedInterestsOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  const [mapCenter, setMapCenter] = useState<[number, number]>([52.52, 13.405]); // Berlin default
  const [mapZoom, setMapZoom] = useState(11);

  const { profile } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const data = await dbService.getDinners({ limit: PAGE_SIZE });
      setDinners(data);
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    };
    fetch();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setMapCenter([loc.lat, loc.lng]);
      });
    }
  }, []);

  const filteredDinners = useMemo(() => {
    return dinners.filter(dinner => {
      const matchesSearch = dinner.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dinner.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dinner.host?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dinner.locationName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCuisine = selectedCuisine === 'All' || dinner.cuisine === selectedCuisine;
      const matchesDietary = selectedDietary.length === 0 || 
                            selectedDietary.every(opt => dinner.dietaryOptions?.includes(opt));
      const matchesVibes = selectedVibes.length === 0 || selectedVibes.includes(dinner.vibe);
      
      const minP = minPrice === '' ? 0 : parseFloat(minPrice);
      const maxP = maxPrice === '' ? Infinity : parseFloat(maxPrice);
      const matchesPrice = dinner.price >= minP && dinner.price <= maxP;

      const matchesInterests = !sharedInterestsOnly || (
        profile?.interests?.some(i => dinner.host?.interests?.includes(i))
      );

      return matchesSearch && matchesCuisine && matchesDietary && matchesVibes && matchesPrice && matchesInterests;
    });
  }, [dinners, searchQuery, selectedCuisine, selectedDietary, selectedVibes, minPrice, maxPrice, sharedInterestsOnly, profile]);

  const sortedDinners = useMemo(() => {
    if (!userLocation) return filteredDinners;
    return [...filteredDinners].sort((a, b) => {
      if (!a.lat || !a.lng) return 1;
      if (!b.lat || !b.lng) return -1;
      const distA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
      const distB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
      return distA - distB;
    });
  }, [filteredDinners, userLocation]);

  return (
    <div className="bg-white min-h-screen">
      {/* Search & Meta Header */}
      <div className="pt-24 sm:pt-28 pb-8 px-4 sm:px-6 lg:px-8 border-b border-brand-light sticky top-0 bg-white/95 backdrop-blur-xl z-30">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-brand transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Find interesting hosts or cuisines..." 
                className="w-full bg-[#F2F1EA] border border-brand-light rounded-full py-4 pl-14 pr-6 focus:outline-none focus:border-brand/40 font-serif italic text-lg transition-all card-shadow-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
               <button 
                 onClick={() => setSharedInterestsOnly(!sharedInterestsOnly)}
                 className={`px-6 rounded-full border flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${sharedInterestsOnly ? 'bg-brand text-white border-brand' : 'bg-white border-brand-light text-stone-500 hover:border-brand/40'}`}
               >
                 <Sparkles size={14} />
                 Aligned Passions
               </button>
               <button 
                 onClick={() => setShowFilters(!showFilters)}
                 className={`px-6 rounded-full border flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${showFilters ? 'bg-ink text-white border-ink' : 'bg-white border-brand-light text-stone-500 hover:border-brand/40'}`}
               >
                 <Filter size={16} />
                 Filters {(selectedDietary.length + selectedVibes.length) > 0 && <span className="bg-brand text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] ml-1">{selectedDietary.length + selectedVibes.length}</span>}
               </button>

               <div className="bg-[#F2F1EA] p-1.5 rounded-full flex gap-1 border border-brand-light">
                 <button 
                   onClick={() => setViewMode('grid')}
                   className={`p-2.5 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white text-brand shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                 >
                   <LayoutGrid size={18} />
                 </button>
                 <button 
                   onClick={() => setViewMode('map')}
                   className={`p-2.5 rounded-full transition-all ${viewMode === 'map' ? 'bg-white text-brand shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                 >
                   <MapIcon size={18} />
                 </button>
               </div>
            </div>
          </div>

          {/* Quick Cuisine Filter */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {CUISINES.map(cuisine => (
               <button
                 key={cuisine}
                 onClick={() => setSelectedCuisine(cuisine)}
                 className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                   selectedCuisine === cuisine 
                   ? 'bg-brand text-white border-brand shadow-md scale-105' 
                   : 'bg-white border-brand-light text-stone-500 hover:bg-brand/5'
                 }`}
               >
                 {cuisine}
               </button>
            ))}
          </div>
        </div>
      </div>

      {/* Extended Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#F2F1EA] border-b border-brand-light"
          >
            <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-12">
               <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-6 flex items-center gap-2">
                    <Calendar size={14} />
                    Dietary Requirements
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY.map(opt => (
                       <button
                         key={opt}
                         onClick={() => setSelectedDietary(prev => prev.includes(opt) ? prev.filter(i => i !== opt) : [...prev, opt])}
                         className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all border ${selectedDietary.includes(opt) ? 'bg-brand/10 border-brand text-brand' : 'bg-white border-stone-200 text-stone-500'}`}
                       >
                         {opt}
                       </button>
                    ))}
                  </div>
               </div>

               <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-6 flex items-center gap-2">
                    <Sparkles size={14} />
                    Table Vibes
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {VIBES.map(vibe => (
                       <button
                         key={vibe}
                         onClick={() => setSelectedVibes(prev => prev.includes(vibe) ? prev.filter(i => i !== vibe) : [...prev, vibe])}
                         className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all border ${selectedVibes.includes(vibe) ? 'bg-brand/10 border-brand text-brand' : 'bg-white border-stone-200 text-stone-500'}`}
                       >
                         {vibe}
                       </button>
                    ))}
                  </div>
               </div>

               <div className="flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-6">Price Preference</h4>
                    <div className="flex items-center gap-2 bg-white p-4 rounded-2xl border border-stone-200">
                       <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">$</span>
                          <input 
                            type="number" 
                            placeholder="Min"
                            value={minPrice}
                            onChange={e => setMinPrice(e.target.value)}
                            className="w-full bg-stone-50 border-none rounded-xl pl-6 pr-2 py-2 text-xs focus:ring-1 focus:ring-brand"
                          />
                       </div>
                       <span className="text-stone-400 font-bold">—</span>
                       <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">$</span>
                          <input 
                            type="number" 
                            placeholder="Max"
                            value={maxPrice}
                            onChange={e => setMaxPrice(e.target.value)}
                            className="w-full bg-stone-50 border-none rounded-xl pl-6 pr-2 py-2 text-xs focus:ring-1 focus:ring-brand"
                          />
                       </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                        setSelectedDietary([]);
                        setSelectedVibes([]);
                        setMinPrice('');
                        setMaxPrice('');
                    }}
                    className="mt-6 text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-rose-500 transition-colors flex items-center gap-2"
                  >
                    <X size={14} /> Clear all filters
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              ) : sortedDinners.length > 0 ? (
                sortedDinners.map(dinner => (
                  <DinnerCard
                    key={dinner.id}
                    dinner={dinner}
                    userLocation={userLocation}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-24">
                  <div className="serif text-3xl font-black text-stone-300 mb-4">No tables found nearby</div>
                  <p className="text-stone-400 font-medium">Try broadening your search or adjust your filters.</p>
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCuisine('All');
                      setSelectedDietary([]);
                      setSelectedVibes([]);
                    }}
                    className="mt-8 olive-btn"
                  >
                    Reset all filters
                  </button>
                </div>
              )}
            </AnimatePresence>
            {hasMore && !loading && (
              <div className="col-span-full flex justify-center mt-12">
                <button 
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-10 py-4 bg-brand text-white rounded-full font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-xl shadow-brand/20"
                >
                  {loadingMore ? 'Preparing more tables...' : 'Load more experiences'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-[60vh] sm:h-[70vh] rounded-[40px] overflow-hidden border border-brand-light card-shadow relative">
             <Map 
               center={mapCenter} 
               zoom={mapZoom} 
               onBoundsChanged={({ center, zoom }) => {
                 setMapCenter(center);
                 setMapZoom(zoom);
               }}
               provider={stamenToner}
             >
               <ZoomControl />
               {sortedDinners.map(dinner => dinner.lat && dinner.lng && (
                 <React.Fragment key={dinner.id}>
                   <Overlay anchor={[dinner.lat, dinner.lng]} offset={[0, 0]}>
                      <motion.div 
                        whileHover={{ scale: 1.1 }}
                        onClick={() => (window.location.href = `/dinner/${dinner.id}`)}
                        className="cursor-pointer"
                      >
                         <div className="bg-ink text-white px-3 py-1.5 rounded-full font-serif font-black flex items-center gap-2 border-2 border-white shadow-xl">
                            <span className="text-xs">${dinner.price}</span>
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20">
                               <img src={dinner.host?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dinner.hostId}`} className="w-full h-full object-cover" alt="" />
                            </div>
                         </div>
                      </motion.div>
                   </Overlay>
                 </React.Fragment>
               ))}
               {userLocation && (
                 <Marker anchor={[userLocation.lat, userLocation.lng]} color="#C26D46" />
               )}
             </Map>
             <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
                <button 
                  onClick={() => userLocation && setMapCenter([userLocation.lat, userLocation.lng])}
                  className="p-3 bg-white rounded-2xl shadow-xl border border-brand-light text-brand hover:scale-105 transition-transform"
                >
                   <MapPin size={20} />
                </button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};
