import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../lib/dbService';
import { Dinner } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, Clock, Sparkles, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DinnerCard, SkeletonCard } from '../components/DinnerCard';

export const Home: React.FC = () => {
  const [dinners, setDinners] = useState<Dinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'week'>('all');
  const [searchQuery, setSearchQuery] = useState({ where: '', when: '', guests: 1 });
  const navigate = useNavigate();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.where) params.append('location', searchQuery.where);
    if (searchQuery.when) params.append('date', searchQuery.when);
    if (searchQuery.guests > 1) params.append('guests', searchQuery.guests.toString());
    navigate(`/explore?${params.toString()}`);
  };

  const openDatePicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dateInputRef.current) {
      try {
        // Modern browsers support showPicker()
        if ('showPicker' in HTMLInputElement.prototype) {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
          dateInputRef.current.click();
        }
      } catch (err) {
        dateInputRef.current.focus();
        dateInputRef.current.click();
      }
    }
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const data = await dbService.getDinners({});
      setDinners(data);
      setLoading(false);
    };
    fetch();
  }, []);

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
    <div className="pb-20">
      {/* Hero Section - Covering 80% of the screen */}
      <section className="relative h-[80vh] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 bg-bg-warm overflow-hidden">
        {/* Subtle background abstract element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(115,103,72,0.03)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h2 className="serif text-4xl sm:text-6xl font-bold text-ink leading-tight mb-6">
              A seat for every story.
            </h2>
            <p className="text-stone-500 font-serif italic text-lg sm:text-xl opacity-70 leading-relaxed mb-12 max-w-2xl mx-auto">
              Intimate dinner parties where the menu and atmosphere are as curated as the guests.
            </p>
          </motion.div>

          {/* Search Experience - Centralized & Inline */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="max-w-3xl mx-auto"
          >
            <form 
              onSubmit={handleSearch}
              className="w-full bg-white rounded-[32px] p-2 border border-brand-light shadow-2xl hover:shadow-brand/5 transition-all flex flex-col md:flex-row items-center gap-1 group"
            >
              {/* Where */}
              <div className="flex-1 w-full px-6 py-3 text-left border-r border-stone-100 group-hover:border-stone-200 transition-colors">
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Where</label>
                <input 
                  type="text" 
                  placeholder="Any neighborhood"
                  value={searchQuery.where}
                  onChange={(e) => setSearchQuery(prev => ({ ...prev, where: e.target.value }))}
                  className="w-full bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-ink font-bold placeholder:text-stone-300 placeholder:font-medium"
                />
              </div>

              {/* When */}
              <div 
                onClick={openDatePicker}
                className="flex-1 w-full px-6 py-3 text-left border-r border-stone-100 group-hover:border-stone-200 transition-colors cursor-pointer relative"
              >
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1 pointer-events-none">When</label>
                <div className={`truncate pointer-events-none ${searchQuery.when ? 'text-ink font-bold' : 'text-stone-300 font-medium'}`}>
                  {searchQuery.when ? new Date(searchQuery.when).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "Add dates"}
                </div>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={searchQuery.when}
                  onChange={(e) => setSearchQuery(prev => ({ ...prev, when: e.target.value }))}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>

              {/* Who */}
              <div className="flex-1 w-full px-6 py-3 text-left">
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Who</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    min="1" 
                    max="20"
                    value={searchQuery.guests}
                    onChange={(e) => setSearchQuery(prev => ({ ...prev, guests: parseInt(e.target.value) || 1 }))}
                    className="w-12 bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-ink font-bold"
                  />
                  <span className="text-stone-300 font-medium">guests</span>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full md:w-14 h-14 bg-stone-900 text-white rounded-full flex items-center justify-center flex-shrink-0 hover:bg-brand transition-all group-hover:scale-105"
              >
                <Search size={22} strokeWidth={2.5} />
              </button>
            </form>
          </motion.div>
        </div>

        {/* Bottom indicator for remaining 20% content */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 animate-bounce">
           <span className="text-[8px] font-black uppercase tracking-[0.4em] text-ink">Discover</span>
           <div className="w-px h-8 bg-ink" />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        {/* Visible & Selectable Date Filters */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-16 border-b border-brand-light pb-8">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === 'all' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-white text-stone-500 hover:bg-stone-50 border border-brand-light'}`}
          >
            Discover All
          </button>
          <button 
            onClick={() => setActiveFilter('today')}
            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeFilter === 'today' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-white text-stone-500 hover:bg-stone-50 border border-brand-light'}`}
          >
            <Clock size={14} />
            Happening Today
          </button>
          <button 
            onClick={() => setActiveFilter('week')}
            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeFilter === 'week' ? 'bg-brand/20 text-brand border border-brand shadow-sm' : 'bg-white text-stone-500 hover:bg-stone-50 border border-brand-light'}`}
          >
            <Calendar size={14} />
            Happening This Week
          </button>
        </div>

        <div className="space-y-32">
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
                  className="mb-32"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
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
                className="bg-[#F2F1EA] -mx-4 sm:-mx-8 lg:-mx-20 px-4 sm:px-8 lg:px-20 py-32 rounded-[80px] mb-32 border-y border-brand-light"
              >
                <div className="max-w-7xl mx-auto">
                  <div className="flex flex-col sm:flex-row items-end justify-between mb-16 gap-6">
                    <div className="text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start space-x-2 text-brand mb-4">
                        <Star size={16} strokeWidth={2.5} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Tables of the month</span>
                      </div>
                      <h3 className="serif text-3xl sm:text-4xl text-ink leading-tight">Discover your next favorite local table</h3>
                    </div>
                    <button 
                      onClick={() => navigate('/explore')}
                      className="bg-brand text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand/20 hover:scale-105 transition-all text-center"
                    >
                      Find your table
                    </button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                    {loading ? [1,2].map(i => <div key={i} className="h-[500px] bg-stone-200 animate-pulse rounded-[40px]" />) : 
                      featuredDinners.slice(0, 2).map((dinner, idx) => (
                        <Link key={dinner.id} to={`/dinner/${dinner.id}`} className="group block relative h-[550px] rounded-[64px] overflow-hidden shadow-2xl transition-all hover:scale-[1.02]">
                          <img 
                            src={dinner.images[0] || dinner.host?.photoURL || 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80'} 
                            className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-110" 
                            alt="" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent opacity-80" />
                          <div className="absolute bottom-12 left-12 right-12">
                            <div className="flex gap-2 mb-6">
                              <span className="bg-brand text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{dinner.vibe} Vibe</span>
                              <span className="bg-white/20 backdrop-blur text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{dinner.cuisine}</span>
                            </div>
                            <h4 className="serif text-4xl text-white mb-4 leading-tight">"{dinner.title}"</h4>
                            <div className="flex items-center gap-4 pt-6 border-t border-white/20">
                               <div className="flex -space-x-2">
                                  {dinner.host?.interests?.slice(0, 3).map(interest => (
                                    <div key={interest} className="w-8 h-8 rounded-full bg-brand border-2 border-ink flex items-center justify-center text-[10px] font-bold text-white shadow-xl">
                                      {interest[0]}
                                    </div>
                                  ))}
                               </div>
                               <span className="text-white/60 text-xs font-medium uppercase tracking-[0.2em]">Hosted by {dinner.host?.displayName}</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
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
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10"
              >
                {filteredDinners.length > 0 ? (
                  filteredDinners.map(dinner => <DinnerCard key={dinner.id} dinner={dinner} />)
                ) : (
                  <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-stone-200">
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
    <div className="mt-40 text-center py-20 bg-stone-900 rounded-[64px] text-white px-6">
      <Sparkles size={40} className="mx-auto mb-6 text-brand" />
      <h3 className="serif text-3xl sm:text-4xl mb-6">Ready to find your seat?</h3>
      <p className="text-stone-400 mb-10 max-w-sm mx-auto">Discover the art of dining with strangers who feel like old friends.</p>
      <button 
        onClick={() => navigate('/explore')}
        className="bg-brand text-white px-10 py-5 rounded-full text-sm font-black uppercase tracking-widest hover:bg-brand/90 transition-all shadow-xl shadow-brand/20"
      >
        Explore All Dinners
      </button>
    </div>
  </div>
  );
};

