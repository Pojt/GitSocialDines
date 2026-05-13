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
  MapPin,
  X,
  ChevronRight
} from 'lucide-react';
import { Map, Marker, APIProvider, MapControl, ControlPosition, useMapsLibrary } from '@vis.gl/react-google-maps';
import { calculateDistance, formatDistance } from '../lib/utils';
import { useRef } from 'react';

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
    try {
      setLoadingMore(true);
      const lastDinner = dinners[dinners.length - 1];
      const moreData = await dbService.getDinners({ 
        limit: PAGE_SIZE, 
        startAfter: lastDinner.date,
        cuisine: selectedCuisine !== 'All' ? selectedCuisine : undefined
      });
      setHasMore(moreData.length === PAGE_SIZE);
      setDinners(prev => [...prev, ...moreData]);
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setLoadingMore(false);
    }
  };
  
  // Filters
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [sharedInterestsOnly, setSharedInterestsOnly] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [userLocationName, setUserLocationName] = useState('Your Current Location');
  
  const places = useMapsLibrary('places');
  const locationInputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!places || !locationInputRef.current || !isEditingLocation) return;

    const options = {
      fields: ['formatted_address', 'geometry', 'name'],
      componentRestrictions: { country: ['NL', 'BE'] }
    };

    const ac = new places.Autocomplete(locationInputRef.current, options);
    setAutocomplete(ac);

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const locName = place.formatted_address || place.name || '';
        setUserLocationName(locName);
        setUserLocation({ lat, lng });
        setMapCenter({ lat, lng });
        setIsEditingLocation(false);
      }
    });

    return () => {
      if (window.google && google.maps && google.maps.event && ac) {
        google.maps.event.clearInstanceListeners(ac);
      }
    };
  }, [places, isEditingLocation]);

  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({ lat: 52.52, lng: 13.405 }); // Berlin default
  const [mapZoom, setMapZoom] = useState(11);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { profile } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await dbService.getDinners({ limit: PAGE_SIZE });
        setDinners(data);
        setHasMore(data.length === PAGE_SIZE);
      } catch (error) {
        console.error('Failed to fetch dinners:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setMapCenter(loc);
      }, (err) => {
        console.warn('Geolocation denied or failed:', err);
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
    <div className="bg-white min-h-screen pb-32 font-sans">
      {/* Search & Meta Header */}
      <motion.div 
        layout
        className={`sticky top-16 sm:top-20 bg-white/95 backdrop-blur-xl z-30 border-b border-brand-light transition-shadow duration-300 ${isScrolled ? 'shadow-md shadow-brand/5' : ''}`}
        transition={{ type: 'spring', stiffness: 90, damping: 25, mass: 1.2 }}
      >
        <motion.div 
          layout
          initial={false}
          animate={{ 
            paddingTop: isScrolled ? 14 : 32,
            paddingBottom: isScrolled ? 14 : 20
          }}
          transition={{ type: 'spring', stiffness: 90, damping: 25, mass: 1.2 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          {/* Location Header - Uber Eats Style */}
          <AnimatePresence mode="popLayout" initial={false}>
            {!isScrolled && (
              <div className="relative">
                <motion.div 
                  layout
                  initial={{ height: 0, opacity: 0, y: -10 }}
                  animate={{ height: 'auto', opacity: 1, y: 0, marginBottom: 16 }}
                  exit={{ height: 0, opacity: 0, y: -10, marginBottom: 0 }}
                  transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity overflow-hidden"
                  onClick={() => setIsEditingLocation(!isEditingLocation)}
                >
                  <div className="w-8 h-8 bg-[#F2F1EA] rounded-full flex items-center justify-center text-brand shrink-0">
                    <MapPin size={16} fill="currentColor" fillOpacity={0.2} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-wider text-stone-400 whitespace-nowrap">Dinner near</div>
                    <div className="flex items-center gap-1 font-serif italic text-base sm:text-lg text-ink truncate">
                      {userLocationName}
                      <ChevronDown size={14} className={`text-stone-400 shrink-0 transition-transform ${isEditingLocation ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </motion.div>

                {/* Location Selection Dropdown */}
                <AnimatePresence>
                  {isEditingLocation && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute top-12 left-0 w-full sm:w-80 bg-white rounded-2xl shadow-2xl border border-brand-light z-50 p-4"
                    >
                      <div className="flex items-center gap-2 bg-[#F2F1EA] p-3 rounded-xl border border-brand-light mb-4">
                        <Search size={16} className="text-stone-400" />
                        <input 
                          ref={locationInputRef}
                          type="text" 
                          placeholder="Search city or address..." 
                          className="bg-transparent border-none focus:outline-none w-full text-base font-medium"
                          value={locationSearch}
                          onChange={(e) => setLocationSearch(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setUserLocationName(locationSearch);
                              setIsEditingLocation(false);
                            }
                          }}
                        />
                        {locationSearch && (
                          <button onClick={() => setLocationSearch('')}>
                            <X size={14} className="text-stone-400" />
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <button 
                          onClick={() => {
                            if ("geolocation" in navigator) {
                              navigator.geolocation.getCurrentPosition(pos => {
                                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                                setUserLocation(loc);
                                setMapCenter(loc);
                                setUserLocationName('Your Current Location');
                                setIsEditingLocation(false);
                              });
                            }
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-stone-50 rounded-xl transition-colors text-left"
                        >
                          <div className="w-8 h-8 bg-brand/10 text-brand rounded-full flex items-center justify-center shrink-0">
                            <MapPin size={14} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-ink">Use current location</div>
                            <div className="text-[10px] text-stone-400">Recommended for accuracy</div>
                          </div>
                        </button>

                        <div className="h-px bg-stone-100 my-2" />
                        
                        <div className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-stone-400">Popular Cities</div>
                        {['Amsterdam', 'Rotterdam', 'Brussels', 'Antwerp', 'Ghent'].map((city) => (
                          <button 
                            key={city}
                            onClick={() => {
                              setUserLocationName(city);
                              setIsEditingLocation(false);
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-stone-50 rounded-xl transition-colors text-left"
                          >
                            <div className="w-8 h-8 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center shrink-0">
                              <MapIcon size={14} />
                            </div>
                            <div className="text-xs font-medium text-ink">{city}</div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>

          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-brand transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Dishes, hosts, or cuisines..." 
                className="w-full h-12 bg-[#F2F1EA] border border-brand-light rounded-2xl pl-12 pr-6 focus:outline-none focus:border-brand/40 font-medium text-base shadow-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 shrink-0">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex-1 md:flex-none px-5 py-3 rounded-2xl border bg-white border-brand-light text-stone-500 hover:border-brand/40 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shadow-sm"
              >
                <Filter size={14} />
                <span>Filters</span>
                {(selectedDietary.length + selectedVibes.length) > 0 && (
                  <span className="bg-brand text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px]">
                    {selectedDietary.length + selectedVibes.length}
                  </span>
                )}
              </button>

              <div className="bg-[#F2F1EA] p-1 rounded-2xl flex gap-1 border border-brand-light shrink-0 shadow-sm">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-wider ${viewMode === 'grid' ? 'bg-white text-brand shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-wider ${viewMode === 'map' ? 'bg-white text-brand shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  <MapIcon size={14} />
                  <span className="hidden sm:inline">Map</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Cuisine Filter - Scrolls naturally */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {CUISINES.map(cuisine => (
            <button
              key={cuisine}
              onClick={() => setSelectedCuisine(cuisine)}
              className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 ${
                selectedCuisine === cuisine 
                ? 'bg-ink text-white border-ink shadow-lg shadow-ink/20' 
                : 'bg-white border-brand-light text-stone-500 hover:bg-stone-50'
              }`}
            >
              {cuisine}
            </button>
          ))}
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
                    Dietary
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
                    <Users size={14} />
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
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
          <div className="h-[60vh] sm:h-[70vh] rounded-[40px] overflow-hidden border border-brand-light card-shadow relative bg-stone-50">
             <Map 
               defaultCenter={mapCenter} 
               center={mapCenter}
               defaultZoom={mapZoom} 
               onCameraChanged={(ev) => {
                 setMapCenter(ev.detail.center);
                 setMapZoom(ev.detail.zoom);
               }}
               mapId="bf50a41d06e23652"
               disableDefaultUI={true}
             >
               {sortedDinners.map(dinner => dinner.lat && dinner.lng && (
                 <Marker 
                   key={dinner.id}
                   position={{ lat: dinner.lat, lng: dinner.lng }}
                   onClick={() => (window.location.href = `/dinner/${dinner.id}`)}
                 />
               ))}
               
               {userLocation && window.google && (
                 <Marker 
                   position={userLocation}
                   icon={{
                     path: google.maps.SymbolPath.CIRCLE,
                     fillColor: '#736748',
                     fillOpacity: 1,
                     scale: 8,
                     strokeColor: 'white',
                     strokeWeight: 2,
                   }}
                 />
               )}

               <MapControl position={ControlPosition.RIGHT_BOTTOM}>
                 <div className="m-6 flex flex-col gap-2">
                    <button 
                      onClick={() => userLocation && setMapCenter(userLocation)}
                      className="p-3 bg-white rounded-2xl shadow-xl border border-brand-light text-brand hover:scale-105 transition-transform"
                    >
                       <MapPin size={20} />
                    </button>
                 </div>
               </MapControl>
             </Map>
          </div>
        )}
      </main>
    </div>
  );
};
