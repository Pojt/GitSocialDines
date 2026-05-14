import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../lib/dbService';
import { Dinner } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, Clock, Sparkles, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DinnerCard, SkeletonCard } from '../components/DinnerCard';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export const Home: React.FC = () => {
  const [dinners, setDinners] = useState<Dinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'week'>('all');
  const [searchQuery, setSearchQuery] = useState({ where: '', when: '', guests: 1 });
  const navigate = useNavigate();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const whereInputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary('places');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.where) params.append('location', searchQuery.where);
    if (searchQuery.when) params.append('date', searchQuery.when);
    if (searchQuery.guests > 1) params.append('guests', searchQuery.guests.toString());
    navigate(`/explore?${params.toString()}`);
  };

  useEffect(() => {
    if (!places || !whereInputRef.current) return;

    // Use the modern PlaceAutocompleteElement (Beta/Weekly)
    // We initialize it imperatively to set options and listeners correctly in React
    const autocomplete = new places.Autocomplete(whereInputRef.current, {
      fields: ['formatted_address', 'geometry', 'name'],
      types: ['(cities)'],
      componentRestrictions: { country: ['NL', 'BE'] }
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        setSearchQuery(prev => ({ ...prev, where: place.formatted_address || '' }));
      } else if (place.name) {
        setSearchQuery(prev => ({ ...prev, where: place.name }));
      }
    });

    // Clean up
    return () => {
      if (window.google && google.maps && google.maps.event) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [places]);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await dbService.getDinners({});
        if (data) {
          setDinners(data);
        }
      } catch (err) {
        console.error("Failed to fetch dinners:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "Add dates";
    try {
      // Adding time part ensures we get the date in local time consistently
      const d = new Date(dateStr + 'T12:00:00');
      if (isNaN(d.getTime())) return "Add dates";
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return "Add dates";
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Get start and end of current week
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
  
  const todayDinners = dinners.filter(d => new Date(d.date).toISOString().split('T')[0] === todayStr);
  const thisWeekDinners = dinners.filter(d => {
    const dinnerDate = new Date(d.date);
    return dinnerDate >= startOfWeek && dinnerDate <= endOfWeek;
  });
  const upcomingDinners = dinners.filter(d => new Date(d.date).toISOString().split('T')[0] !== todayStr);
  const featuredDinners = dinners.slice(0, 3); // Mock featured

  const filteredDinners = activeFilter === 'today' ? todayDinners : 
                          activeFilter === 'week' ? thisWeekDinners : 
                          dinners;

  return (
    <div className="pb-32 bg-white">
      {/* Hero Section - Airy and Impactful */}
      <section className="relative min-h-[85vh] sm:min-h-[80vh] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 bg-bg-warm overflow-hidden pt-18 pb-16 sm:pt-32 sm:pb-32 lg:pt-0 lg:h-[80vh]">
        {/* Subtle background abstract element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,rgba(90,90,64,0.05)_0%,transparent_60%)] pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-4xl sm:text-6xl lg:text-8xl font-black text-ink leading-[1.1] mb-6 sm:mb-8 tracking-[-0.02em]">
              The best stories start at <span className="text-brand">dinner.</span>
            </h2>
            <p className="hidden sm:block text-stone-500 font-sans text-base sm:text-xl lg:text-2xl opacity-60 leading-relaxed mb-10 sm:mb-16 max-w-2xl mx-auto px-4 font-normal">
              Join intimate gatherings hosted by local culinary enthusiasts. Shared tables, genuine conversations.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-5xl mx-auto w-full mt-2 sm:mt-0"
          >
            <form 
              onSubmit={handleSearch}
              className="w-full bg-white rounded-[28px] sm:rounded-[50px] p-2 sm:p-3 border border-brand-light shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all flex flex-col lg:flex-row items-center gap-1 group hover:shadow-[0_25px_60px_rgba(0,0,0,0.12)]"
            >
              {/* Where */}
              <div 
                onClick={() => whereInputRef.current?.focus()}
                className="flex-[1.2] w-full px-6 sm:px-10 py-3.5 sm:py-6 text-left border-b lg:border-b-0 lg:border-r border-stone-100 group-focus-within:border-brand/20 transition-colors cursor-pointer"
              >
                <label className="block text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1 pointer-events-none">Where</label>
                <input 
                  ref={whereInputRef}
                  type="text" 
                  placeholder="Which city?"
                  value={searchQuery.where}
                  onChange={(e) => setSearchQuery(prev => ({ ...prev, where: e.target.value }))}
                  className="w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-ink font-bold placeholder:text-stone-200 placeholder:font-medium text-base sm:text-xl"
                />
              </div>

              {/* When */}
              <div 
                onClick={() => {
                  try {
                    // @ts-ignore
                    dateInputRef.current?.showPicker();
                  } catch (e) {
                    dateInputRef.current?.focus();
                  }
                }}
                className="flex-1 w-full px-6 sm:px-10 py-3.5 sm:py-6 text-left border-b lg:border-b-0 lg:border-r border-stone-100 group-focus-within:border-brand/20 transition-colors cursor-pointer relative"
              >
                <label className="block text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1 pointer-events-none">When</label>
                <div className={`truncate pointer-events-none text-base sm:text-xl ${searchQuery.when ? 'text-ink font-bold' : 'text-stone-200 font-medium'}`}>
                  {formatDisplayDate(searchQuery.when)}
                </div>
                <input 
                  ref={dateInputRef}
                  type="date" 
                  value={searchQuery.when}
                  onChange={(e) => setSearchQuery(prev => ({ ...prev, when: e.target.value }))}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-none"
                />
              </div>

              {/* Who */}
              <div className="flex-1 w-full px-6 sm:px-10 py-3.5 sm:py-6 text-left lg:border-r border-stone-100 group-focus-within:border-brand/20 transition-colors relative">
                <label className="block text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1 pointer-events-none">People</label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-stone-300 font-medium text-base sm:text-xl">{searchQuery.guests}</span>
                    <span className="text-stone-300 font-medium text-xs sm:text-base">guests</span>
                  </div>
                  <div className="flex items-center gap-1 bg-stone-50 rounded-full p-1 border border-stone-100">
                    <button 
                      type="button"
                      onClick={() => setSearchQuery(prev => ({ ...prev, guests: Math.max(1, prev.guests - 1) }))}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white hover:shadow-sm transition-all text-stone-400 hover:text-brand"
                    >
                      -
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSearchQuery(prev => ({ ...prev, guests: Math.min(20, prev.guests + 1) }))}
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white hover:shadow-sm transition-all text-stone-400 hover:text-brand"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full lg:w-20 lg:h-20 py-4 lg:py-0 bg-stone-900 text-white rounded-[20px] lg:rounded-full flex items-center justify-center flex-shrink-0 hover:bg-brand transition-all lg:mt-0 active:scale-95 shadow-xl sm:shadow-none"
              >
                <Search size={20} strokeWidth={3} className="mr-3 lg:mr-0" />
                <span className="lg:hidden font-black text-[10px] uppercase tracking-[0.4em]">Search Tables</span>
                <Search size={24} strokeWidth={3} className="hidden lg:block transition-transform duration-500 group-hover:scale-110" />
              </button>
            </form>
          </motion.div>
        </div>

        {/* Bottom indicator */}
        <div className="hidden sm:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 opacity-30 animate-bounce">
           <span className="text-[8px] font-black uppercase tracking-[0.4em] text-ink">Discover</span>
           <div className="w-px h-8 bg-ink" />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-24">
        {/* Visible & Selectable Date Filters */}
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center sm:justify-center gap-2 sm:gap-3 mb-10 sm:mb-20 border-b border-brand-light pb-6 sm:pb-8">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`px-2 py-3 sm:px-8 sm:py-3.5 rounded-[1.25rem] sm:rounded-full text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all ${activeFilter === 'all' ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'bg-white text-stone-500 hover:bg-stone-50 border border-brand-light'}`}
          >
            All
          </button>
          <button 
            onClick={() => setActiveFilter('today')}
            className={`px-2 py-3 sm:px-8 sm:py-3.5 rounded-[1.25rem] sm:rounded-full text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${activeFilter === 'today' ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/20' : 'bg-white text-stone-500 hover:bg-stone-50 border border-brand-light'}`}
          >
            <Clock size={14} className="sm:w-4 sm:h-4" />
            <span>Today</span>
          </button>
          <button 
            onClick={() => setActiveFilter('week')}
            className={`px-2 py-3 sm:px-8 sm:py-3.5 rounded-[1.25rem] sm:rounded-full text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${activeFilter === 'week' ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'bg-white text-stone-500 hover:bg-stone-50 border border-brand-light'}`}
          >
            <Calendar size={14} className="sm:w-4 sm:h-4" />
            <span>Week</span>
          </button>
        </div>

        <div className="space-y-20 sm:space-y-32">
          {/* Dynamic Filter Section / All Dinners */}
          <section>
          {activeFilter !== 'all' && (
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center space-x-2 text-brand">
                 {activeFilter === 'today' ? <Clock size={16} /> : <Calendar size={16} />}
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                   {activeFilter === 'today' ? "Today's Table Talk" : "This Week's Gatherings"}
                 </span>
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                 {filteredDinners.length} dinners found
               </span>
            </div>
          )}

          {activeFilter === 'all' ? (
            <>
              {/* Today's Selection */}
              {todayDinners.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-20 sm:mb-32"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-2 text-orange-600">
                      <Clock size={16} strokeWidth={2.5} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Happening Today</span>
                    </div>
                    <Link to="/explore?date=today" className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-brand transition-colors border-b border-stone-200 pb-1">
                      View all today
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
                    {loading ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />) : 
                      todayDinners.slice(0, 3).map(dinner => <DinnerCard key={dinner.id} dinner={dinner} />)
                    }
                  </div>
                </motion.section>
              )}

              {/* Featured / Trending */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-[#F2F1EA] -mx-4 sm:-mx-8 lg:-mx-20 px-4 sm:px-8 lg:px-20 py-16 sm:py-32 rounded-[40px] sm:rounded-[80px] mb-20 sm:mb-32 border-y border-brand-light"
              >
                <div className="max-w-7xl mx-auto">
                  <div className="flex flex-col md:flex-row items-center md:items-end justify-between mb-12 sm:mb-16 gap-6">
                    <div className="text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start space-x-2 text-brand mb-4">
                        <Star size={16} strokeWidth={2.5} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Tables of the month</span>
                      </div>
                      <h3 className="text-2xl sm:text-4xl font-black text-ink leading-tight">Discover your next favorite local table</h3>
                    </div>
                    <button 
                      onClick={() => navigate('/explore')}
                      className="w-full sm:w-auto bg-brand text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand/20 hover:scale-105 transition-all text-center"
                    >
                      Find your table
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-20">
                    {loading ? [1,2].map(i => <div key={i} className="h-[400px] sm:h-[500px] bg-stone-200 animate-pulse rounded-[32px] sm:rounded-[40px]" />) : 
                      featuredDinners.slice(0, 2).map((dinner, idx) => (
                        <Link key={dinner.id} to={`/dinner/${dinner.id}`} className="group block relative h-[400px] sm:h-[550px] rounded-[32px] sm:rounded-[64px] overflow-hidden shadow-2xl transition-all hover:scale-[1.02]">
                          <img 
                            src={dinner.images[0] || dinner.host?.photoURL || 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80'} 
                            className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-110" 
                            alt="" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent opacity-80" />
                          <div className="absolute bottom-6 left-6 right-6 sm:bottom-12 sm:left-12 sm:right-12">
                            <div className="flex gap-2 mb-4 sm:mb-6">
                              <span className="bg-brand text-white px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{dinner.vibe}</span>
                              <span className="bg-white/20 backdrop-blur text-white px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{dinner.cuisine}</span>
                            </div>
                            <h4 className="text-2xl sm:text-4xl font-black text-white mb-4 leading-tight">"{dinner.title}"</h4>
                            <div className="flex items-center gap-4 pt-4 sm:pt-6 border-t border-white/20">
                               <div className="flex -space-x-2">
                                  {(dinner.host?.interests || []).slice(0, 3).map(interest => (
                                    <div key={interest} className="w-8 h-8 rounded-full bg-brand border-2 border-ink flex items-center justify-center text-[10px] font-bold text-white shadow-xl">
                                      {interest[0]}
                                    </div>
                                  ))}
                               </div>
                               <span className="text-white/60 text-[10px] font-medium uppercase tracking-[0.2em]">Hosted by {dinner.host?.displayName}</span>
                            </div>
                          </div>
                        </Link>
                      ))
                    }
                  </div>
                </div>
              </motion.section>

              {/* Upcoming Dinners */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-2 text-brand">
                    <Calendar size={16} strokeWidth={2.5} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Upcoming Dinners</span>
                  </div>
                  <Link to="/explore" className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-brand transition-colors border-b border-stone-200 pb-1">
                    View full collection
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
                  {loading ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />) : 
                    upcomingDinners.slice(0, 6).map(dinner => <DinnerCard key={dinner.id} dinner={dinner} />)
                  }
                </div>
              </motion.section>
            </>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilter}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10"
              >
                {filteredDinners.length > 0 ? (
                  filteredDinners.map(dinner => <DinnerCard key={dinner.id} dinner={dinner} />)
                ) : (
                  <div className="col-span-full py-20 text-center bg-white rounded-[32px] sm:rounded-[40px] border border-dashed border-stone-200">
                    <p className="text-stone-400 font-medium">No dinners found for this selection.</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </section>
      </div>
    </div>

      {/* Final Call to Action */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mt-20 sm:mt-40 text-center py-12 sm:py-20 bg-stone-900 rounded-[32px] sm:rounded-[64px] text-white px-6">
          <Sparkles size={40} className="mx-auto mb-6 text-brand" />
          <h3 className="text-2xl sm:text-4xl font-black mb-6">Ready to find your seat?</h3>
          <p className="text-stone-400 mb-8 sm:mb-10 max-w-sm mx-auto text-sm sm:text-base">Discover the art of dining with strangers who feel like old friends.</p>
          <button 
            onClick={() => navigate('/explore')}
            className="w-full sm:w-auto bg-brand text-white px-10 py-5 rounded-full text-[10px] sm:text-sm font-black uppercase tracking-widest hover:bg-brand/90 transition-all shadow-xl shadow-brand/20"
          >
            Explore All Dinners
          </button>
        </div>
      </div>
    </div>
  );
};

