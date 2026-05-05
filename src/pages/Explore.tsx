import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/dbService';
import { Dinner } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Calendar, Users, Filter, ArrowLeft, RotateCcw, Navigation } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CUISINES } from '../constants';
import { Map, Marker, ZoomControl } from 'pigeon-maps';
import { LocationInput } from '../components/LocationInput';
import { DinnerCard, SkeletonCard } from '../components/DinnerCard';
import { calculateDistance } from '../lib/utils';

export const Explore: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [dinners, setDinners] = useState<Dinner[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search States initialized from URL params
  const [locationQuery, setLocationQuery] = useState(searchParams.get('location') || '');
  const [dateQuery, setDateQuery] = useState(searchParams.get('date') || '');
  const [guestCount, setGuestCount] = useState(parseInt(searchParams.get('guests') || '1'));
  const [activeCuisine, setActiveCuisine] = useState(searchParams.get('cuisine') || 'All');
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [soloFriendly, setSoloFriendly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [sortByDistance, setSortByDistance] = useState(false);

  // Get user location on mount or when requested
  const getMyLocation = (silent = false) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (!silent) setSortByDistance(true);
      },
      (err) => {
        if (!silent) console.error('Geolocation error:', err);
      },
      { enableHighAccuracy: true }
    );
  };

  // Pre-fetch location if already granted
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          getMyLocation(true);
        }
      });
    }
  }, []);

  // Sync state with URL params when they change (e.g. back button)
  useEffect(() => {
    setLocationQuery(searchParams.get('location') || '');
    setDateQuery(searchParams.get('date') || '');
    setGuestCount(parseInt(searchParams.get('guests') || '1'));
    setActiveCuisine(searchParams.get('cuisine') || 'All');
  }, [searchParams]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      // Construct filter for database service
      const filters = {
        cuisine: activeCuisine === 'All' ? undefined : activeCuisine,
        soloFriendly: soloFriendly || undefined
      };
      
      const data = await dbService.getDinners(filters);
      
      let filtered = data;

      // Location search
      const locParam = searchParams.get('location');
      if (locParam) {
        const loc = locParam.toLowerCase();
        filtered = filtered.filter(d => 
          d.host?.city?.toLowerCase().includes(loc) ||
          d.locationName?.toLowerCase().includes(loc) ||
          d.title.toLowerCase().includes(loc)
        );
      }

      // Date search
      const dateParam = searchParams.get('date');
      if (dateParam) {
        const dateVal = dateParam === 'today' ? new Date().toISOString().split('T')[0] : dateParam;
        filtered = filtered.filter(d => {
          const dinnerDate = new Date(d.date).toISOString().split('T')[0];
          return dinnerDate === dateVal;
        });
      }

      // Guest search
      const guestParam = parseInt(searchParams.get('guests') || '1');
      if (guestParam > 1) {
        filtered = filtered.filter(d => (d.guestsMax - d.guestsCount) >= guestParam);
      }

      // Keyword search (local state for immediate feedback)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(d => 
          d.title.toLowerCase().includes(query) || 
          d.description.toLowerCase().includes(query) ||
          d.tags.some(t => t.toLowerCase().includes(query))
        );
      }

      // Dietary filter
      if (selectedDiets.length > 0) {
        filtered = filtered.filter(d => 
          selectedDiets.every(diet => d.dietaryOptions?.includes(diet))
        );
      }
      
      // Sort by distance if enabled
      if (sortByDistance && userLocation) {
        filtered = [...filtered].sort((a, b) => {
          if (!a.lat || !a.lng) return 1;
          if (!b.lat || !b.lng) return -1;
          const distA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
          const distB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
          return distA - distB;
        });
      }
      
      setDinners(filtered);
      setLoading(false);
    };
    fetch();
  }, [searchParams, soloFriendly, searchQuery, sortByDistance, userLocation]);

  const handleSearch = () => {
    const params: any = {
      location: locationQuery,
      date: dateQuery,
      guests: guestCount.toString(),
      cuisine: activeCuisine
    };
    // Clean up empty params
    Object.keys(params).forEach(key => !params[key] && delete params[key]);
    setSearchParams(params);
  };

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Search Header */}
      <div className="mb-12">
        <Link to="/" className="inline-flex items-center text-stone-500 hover:text-brand transition-colors mb-8 group">
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Back to Home</span>
        </Link>
        
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-3xl md:rounded-full p-2 border border-brand-light card-shadow-lg flex flex-col md:flex-row items-stretch group transition-all hover:shadow-xl hover:border-brand/40">
            {/* Where */}
            <div className="flex-[1.5] flex items-center px-6 md:px-8 py-4 md:py-0 border-b md:border-b-0 md:border-r border-brand-light/50 group/item relative">
              <div className="flex-1 md:py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand mb-1">Where</p>
                <LocationInput 
                  value={locationQuery} 
                  onChange={setLocationQuery} 
                  className="w-full bg-transparent focus:outline-none text-sm font-semibold text-ink placeholder:text-stone-300 placeholder:font-normal py-1"
                />
              </div>
            </div>

            {/* When */}
            <div className="flex-1 flex items-center px-6 md:px-8 py-4 md:py-0 border-b md:border-b-0 md:border-r border-brand-light/50 group/item relative">
              <div className="flex-1 md:py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand mb-1">When</p>
                <input 
                  type="date" 
                  className="w-full bg-transparent focus:outline-none text-sm font-semibold text-ink appearance-none cursor-pointer py-1"
                  value={dateQuery}
                  onChange={e => setDateQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Who (Guests) */}
            <div className="flex-1 flex items-center px-6 md:px-8 py-4 md:py-0 border-b md:border-b-0 md:border-r border-brand-light/50 group/item relative">
              <div className="flex-1 md:py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand mb-1">Who</p>
                <div className="flex items-center">
                  <input 
                    type="number" 
                    min="1"
                    className="w-full bg-transparent focus:outline-none text-sm font-semibold text-ink py-1"
                    placeholder="Guests"
                    value={guestCount}
                    onChange={e => setGuestCount(parseInt(e.target.value) || 1)}
                  />
                  <Users size={14} className="text-stone-300 ml-2" />
                </div>
              </div>
            </div>

            {/* Search + Filters Button */}
            <div className="p-2 flex items-center gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-1 md:flex-none md:w-14 h-14 rounded-2xl md:rounded-full flex items-center justify-center transition-all border ${
                  showFilters 
                  ? 'bg-ink text-white border-ink' 
                  : 'bg-stone-50 text-stone-500 border-brand-light hover:border-brand/40'
                }`}
                title="Filters"
              >
                <Filter size={18} />
              </button>
              <button 
                onClick={handleSearch}
                className="bg-brand text-white flex-[3] md:flex-none md:px-10 h-14 rounded-2xl md:rounded-full flex items-center justify-center hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 active:scale-95 text-[11px] font-black uppercase tracking-widest gap-2"
              >
                <Search size={18} strokeWidth={3} />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </div>

          {/* Expandable Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-6 p-8 bg-white rounded-[32px] border border-brand-light shadow-xl space-y-8">
                  {/* Cuisine Selection */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4">Cuisine</h4>
                    <div className="flex flex-wrap gap-2">
                      {CUISINES.map(cuisine => (
                        <button
                          key={cuisine}
                          onClick={() => setActiveCuisine(cuisine)}
                          className={`px-5 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeCuisine === cuisine 
                            ? 'bg-brand text-bg-warm border-brand' 
                            : 'bg-stone-50 text-stone-500 border-transparent hover:border-brand/20'
                          }`}
                        >
                          {cuisine}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dietary & Preferences */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-brand-light/30">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4">Dietary Options</h4>
                      <div className="flex flex-wrap gap-2">
                        {['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Halal'].map(diet => (
                          <button
                            key={diet}
                            onClick={() => setSelectedDiets(prev => 
                              prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
                            )}
                            className={`px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${
                              selectedDiets.includes(diet) 
                              ? 'bg-emerald-600 text-white border-emerald-600' 
                              : 'bg-stone-50 text-stone-400 border-transparent hover:border-emerald-200'
                            }`}
                          >
                            {diet}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4">More Options</h4>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => setSoloFriendly(!soloFriendly)}
                          className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                            soloFriendly ? 'bg-stone-800 text-white border-stone-800' : 'bg-stone-50 text-stone-500 border-transparent hover:border-brand/40'
                          }`}
                        >
                          Solo Friendly
                        </button>
                        <button 
                          onClick={() => setDateQuery('today')}
                          className={`px-6 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${
                            dateQuery === 'today' 
                            ? 'bg-orange-600 text-white border-orange-600 shadow-sm' 
                            : 'bg-stone-50 text-stone-500 border-transparent hover:border-orange-200'
                          }`}
                        >
                          Happening Today
                        </button>
                        <button 
                          onClick={() => {
                            if (!userLocation) {
                              getMyLocation();
                            } else {
                              setSortByDistance(!sortByDistance);
                            }
                          }}
                          className={`px-6 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                            sortByDistance 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                            : 'bg-stone-50 text-stone-500 border-transparent hover:border-blue-200'
                          }`}
                        >
                          <Navigation size={14} />
                          Nearby Me
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Filter Footer */}
                  <div className="flex justify-between items-center pt-6 border-t border-brand-light/30">
                    <button 
                      onClick={() => {
                        setActiveCuisine('All');
                        setSelectedDiets([]);
                        setSoloFriendly(false);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-ink transition-colors"
                    >
                      Reset Filters
                    </button>
                    <button 
                      onClick={() => setShowFilters(false)}
                      className="bg-ink text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-stone-800 transition-all active:scale-95"
                    >
                      Show Results
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-12">
        {dinners.length > 0 && !loading && (
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2 text-stone-400">
              <Filter size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{dinners.length} Dinners found</span>
            </div>
            
            <div className="flex bg-stone-100 p-1 rounded-full">
              <button 
                onClick={() => setViewMode('grid')}
                className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white text-brand shadow-sm' : 'text-stone-400'}`}
              >
                Grid
              </button>
              <button 
                onClick={() => setViewMode('map')}
                className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-white text-brand shadow-sm' : 'text-stone-400'}`}
              >
                Map
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : dinners.length > 0 ? (
            viewMode === 'grid' ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10"
              >
                {dinners.map(dinner => (
                  <DinnerCard key={dinner.id} dinner={dinner} userLocation={userLocation} />
                ))}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-[600px] rounded-[48px] overflow-hidden border border-brand-light shadow-2xl relative"
              >
                <Map
                  defaultCenter={[dinners[0]?.lat || 51.5074, dinners[0]?.lng || -0.1278]}
                  defaultZoom={12}
                  height={600}
                >
                  <ZoomControl />
                  {dinners.map(dinner => (
                    <Marker
                      {...({ key: dinner.id } as any)}
                      anchor={[dinner.lat || 0, dinner.lng || 0]}
                      onClick={() => navigate(`/dinner/${dinner.id}`)}
                    >
                       <div className="bg-brand text-white px-3 py-1.5 rounded-full font-black text-[10px] shadow-lg border-2 border-white flex items-center gap-2 hover:scale-110 transition-transform cursor-pointer">
                          <span>${dinner.price}</span>
                       </div>
                    </Marker>
                  ))}
                </Map>
              </motion.div>
            )
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 bg-white rounded-[48px] border border-brand-light"
            >
              <RotateCcw className="mx-auto text-stone-200 mb-6" size={48} />
              <h3 className="serif text-3xl text-ink mb-2">No tables found</h3>
              <p className="text-stone-500 mb-8">Try adjusting your filters or search keywords.</p>
              <button 
                onClick={() => {
                  setActiveCuisine('All');
                  setSearchQuery('');
                  setLocationQuery('');
                  setDateQuery('');
                  setGuestCount(1);
                  setSoloFriendly(false);
                }}
                className="olive-btn"
              >
                Clear all filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
