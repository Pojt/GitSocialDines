import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../lib/dbService';
import { useAuth } from '../AuthContext';
import { Dinner } from '../types';
import { DinnerCard, SkeletonCard } from '../components/DinnerCard';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  LayoutGrid, 
  Filter, 
  Calendar, 
  Users, 
  ChevronDown,
  MapPin,
  X,
  Map as MapIcon
} from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
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
  const [selectedGuests, setSelectedGuests] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [userLocationName, setUserLocationName] = useState('Detecting...');
  
  const places = useMapsLibrary('places');
  const geocoding = useMapsLibrary('geocoding');
  const locationInputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const geocodeLocation = async (lat: number, lng: number) => {
    if (!geocoding) return null;
    const geocoder = new google.maps.Geocoder();
    try {
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response.results[0]) {
        const result = response.results[0];
        let cityName = '';
        if (result.address_components) {
          const cityComp = result.address_components.find(c => 
            c.types.includes('locality') || 
            c.types.includes('postal_town')
          );
          if (cityComp) cityName = cityComp.long_name;
        }
        return cityName || result.formatted_address;
      }
    } catch (e) {
      console.error('Geocoding failed', e);
    }
    return null;
  };

  useEffect(() => {
    if (!places || !locationInputRef.current || !isEditingLocation) return;

    const options = {
      fields: ['formatted_address', 'geometry', 'name', 'address_components'],
      componentRestrictions: { country: ['NL', 'BE'] }
    };

    const ac = new places.Autocomplete(locationInputRef.current, options);
    setAutocomplete(ac);

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        // Extract city from address components
        let cityName = '';
        if (place.address_components) {
          const cityComp = place.address_components.find(c => 
            c.types.includes('locality') || 
            c.types.includes('postal_town')
          );
          if (cityComp) cityName = cityComp.long_name;
        }

        const locName = cityName || place.name || place.formatted_address || '';
        setUserLocationName(locName);
        setUserLocation({ lat, lng });
        setIsEditingLocation(false);
      }
    });

    return () => {
      if (window.google && google.maps && google.maps.event && ac) {
        google.maps.event.clearInstanceListeners(ac);
      }
    };
  }, [places, isEditingLocation]);

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
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        if (geocoding) {
          const name = await geocodeLocation(pos.coords.latitude, pos.coords.longitude);
          if (name) setUserLocationName(name);
        } else {
          setUserLocationName('Near You');
        }
      }, (err) => {
        console.warn('Geolocation denied or failed:', err);
        setUserLocationName('Select Location');
      });
    } else {
      setUserLocationName('Select Location');
    }
  }, [geocoding]);

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

      const matchesGuests = dinner.guestsMax >= selectedGuests;

      const matchesInterests = !sharedInterestsOnly || (
        profile?.interests?.some(i => dinner.host?.interests?.includes(i))
      );

      return matchesSearch && matchesCuisine && matchesDietary && matchesVibes && matchesPrice && matchesInterests && matchesGuests;
    });
  }, [dinners, searchQuery, selectedCuisine, selectedDietary, selectedVibes, minPrice, maxPrice, sharedInterestsOnly, profile, selectedGuests]);

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
    <div className="bg-white min-h-screen pt-14 sm:pt-18 pb-32 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 1. Location Selection - ABOVE sticky part */}
        <div className="relative mb-2">
          <div 
            onClick={() => setIsEditingLocation(!isEditingLocation)}
            className="cursor-pointer group inline-block px-0.5"
          >
            <div className="text-[7px] font-black uppercase tracking-[0.15em] text-stone-400 group-hover:text-brand transition-colors">Dinner near</div>
            <div className="flex items-center gap-1.5 font-bold text-base sm:text-lg text-ink">
              <span className="border-b-2 border-brand/10 group-hover:border-brand/40 transition-all">{userLocationName}</span>
              <ChevronDown size={14} className={`text-stone-300 transition-transform ${isEditingLocation ? 'rotate-180' : ''} group-hover:text-brand`} />
            </div>
          </div>

          {/* Location Selection Dropdown */}
          <AnimatePresence>
            {isEditingLocation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 sm:left-0 sm:w-80 w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-brand-light z-50 p-4 mt-2 origin-top-left"
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
                        navigator.geolocation.getCurrentPosition(async (pos) => {
                          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                          setUserLocation(loc);
                          setIsEditingLocation(false);
                          
                          const name = await geocodeLocation(pos.coords.latitude, pos.coords.longitude);
                          if (name) setUserLocationName(name);
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

        {/* 2. Sticky Bar - Search & Filter */}
        <div className={`sticky top-12 sm:top-14 bg-white/95 backdrop-blur-xl z-30 -mx-4 px-4 sm:mx-0 sm:px-0 py-2 transition-all duration-300 ${isScrolled ? 'border-b border-brand-light shadow-md shadow-brand/5' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-brand transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Dishes, hosts, or cuisines..." 
                className="w-full h-11 bg-[#F2F1EA] border border-brand-light rounded-xl pl-10 pr-6 focus:outline-none focus:border-brand/40 font-medium text-sm shadow-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`h-11 px-4 rounded-xl border transition-all flex items-center justify-center gap-2.5 shadow-sm ${
                showFilters 
                ? 'bg-brand/10 border-brand text-brand' 
                : 'bg-white border-brand-light text-stone-500 hover:border-brand/40'
              }`}
            >
              <Filter size={16} />
              <span className="text-[10px] font-black uppercase tracking-wider hidden md:inline">Filters</span>
              {(selectedDietary.length + selectedVibes.length) > 0 && (
                <span className="bg-brand text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px]">
                  {selectedDietary.length + selectedVibes.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 3. Cuisine Filter list */}
        <div className="mt-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-2 pb-3">
            {CUISINES.map(cuisine => (
              <button
                key={cuisine}
                onClick={() => setSelectedCuisine(cuisine)}
                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0 ${
                  selectedCuisine === cuisine 
                  ? 'bg-ink text-white border-ink shadow-lg shadow-ink/20' 
                  : 'bg-white border-brand-light text-stone-400 hover:bg-stone-50'
                }`}
              >
                {cuisine}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Results Header */}
        {!loading && (
          <div className="mt-2 mb-4">
            <h2 className="text-2xl sm:text-3xl font-black text-ink leading-tight">
              Dineer bij {sortedDinners.length} thuischefs
            </h2>
            <p className="text-stone-400 font-medium text-sm mt-0.5 uppercase tracking-widest text-[10px]">
              {selectedCuisine !== 'All' ? `${selectedCuisine} experiences` : 'Recent gatherings'} in your area
            </p>
          </div>
        )}
      </div>

      {/* Extended Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#F2F1EA] border-y border-brand-light sticky top-[104px] sm:top-[120px] z-20"
          >
            <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
               <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-4 flex items-center gap-2">
                    <Calendar size={13} />
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
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-4 flex items-center gap-2">
                    <Users size={13} />
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

               <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-4 flex items-center gap-2">
                    <Users size={13} />
                    Guests
                  </h4>
                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-stone-200">
                    <button 
                      onClick={() => setSelectedGuests(prev => Math.max(1, prev - 1))}
                      className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center hover:bg-stone-100 transition-colors text-stone-400"
                    >
                      -
                    </button>
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-black text-ink">{selectedGuests}</span>
                      <span className="text-[8px] font-bold text-stone-400 uppercase tracking-tighter">People</span>
                    </div>
                    <button 
                      onClick={() => setSelectedGuests(prev => Math.min(20, prev + 1))}
                      className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center hover:bg-stone-100 transition-colors text-stone-400"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-2 font-medium">Filter by table size</p>
               </div>

               <div className="flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-4">Price Range</h4>
                    <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-stone-200">
                       <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[10px] font-bold">$</span>
                          <input 
                            type="number" 
                            placeholder="Min"
                            value={minPrice}
                            onChange={e => setMinPrice(e.target.value)}
                            className="w-full bg-stone-50 border-none rounded-xl pl-6 pr-2 py-2 text-[10px] focus:ring-1 focus:ring-brand"
                          />
                       </div>
                       <span className="text-stone-400 font-bold text-xs">—</span>
                       <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[10px] font-bold">$</span>
                          <input 
                            type="number" 
                            placeholder="Max"
                            value={maxPrice}
                            onChange={e => setMaxPrice(e.target.value)}
                            className="w-full bg-stone-50 border-none rounded-xl pl-6 pr-2 py-2 text-[10px] focus:ring-1 focus:ring-brand"
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
                        setSelectedGuests(1);
                    }}
                    className="mt-4 text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-rose-500 transition-colors flex items-center gap-2"
                  >
                    <X size={14} /> Clear all
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
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
                <div className="text-3xl font-black text-stone-300 mb-4">No tables found nearby</div>
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
      </main>
    </div>
  );
};
