import React, { useState, useEffect } from 'react';
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
  const navigate = useNavigate();

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
    <div className="pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Search Bar Trigger (Airbnb style) */}
      <div className="max-w-xl mx-auto mb-16">
        <button 
          onClick={() => navigate('/explore')}
          className="w-full bg-white rounded-full py-3 px-6 border border-brand-light shadow-lg hover:shadow-xl transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand text-white rounded-full flex items-center justify-center">
              <Search size={18} strokeWidth={3} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-ink">Where to? Any table</p>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Any Week • Add Guests</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-stone-300 group-hover:text-brand transition-colors">
            <span className="text-[10px] font-black uppercase tracking-widest">Explore</span>
          </div>
        </button>
      </div>

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
        <div className="max-w-2xl">
          <h2 className="serif text-5xl sm:text-7xl font-medium text-ink leading-tight">
            Find your seat.
          </h2>
          <p className="text-stone-500 font-serif italic text-lg mt-4 opacity-70">
            Discover intimate dinner parties hosted by locals.
          </p>
        </div>
      </div>

      {/* Visible & Selectable Date Filters */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-20 border-b border-brand-light pb-8">
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
                className="bg-brand/5 -mx-4 sm:-mx-8 lg:-mx-20 px-4 sm:px-8 lg:px-20 py-24 rounded-[64px] mb-32"
              >
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center justify-between mb-12">
                    <div>
                      <div className="flex items-center space-x-2 text-brand mb-2">
                        <Star size={16} strokeWidth={2.5} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Curated Tables</span>
                      </div>
                      <h3 className="serif text-4xl text-ink">Most Loved This Week</h3>
                    </div>
                    <button 
                      onClick={() => navigate('/explore')}
                      className="hidden sm:flex items-center gap-2 bg-white text-brand px-6 py-3 rounded-full border border-brand-light font-bold text-xs shadow-sm hover:shadow-md transition-all"
                    >
                      Explore all table vibes
                    </button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {loading ? [1,2].map(i => <div key={i} className="h-64 bg-stone-200 animate-pulse rounded-[40px]" />) : 
                      featuredDinners.slice(0, 2).map((dinner, idx) => (
                        <Link key={dinner.id} to={`/dinner/${dinner.id}`} className="group relative h-[400px] rounded-[48px] overflow-hidden shadow-2xl shadow-brand/20">
                          <img 
                            src={dinner.images[0]} 
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                            alt="" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute bottom-10 left-10 right-10">
                            <div className="flex gap-2 mb-4">
                              <span className="bg-white/20 backdrop-blur text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{dinner.cuisine}</span>
                              <span className="bg-brand text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">${dinner.price}</span>
                            </div>
                            <h4 className="serif text-4xl text-white mb-2 leading-tight">{dinner.title}</h4>
                            <p className="text-white/70 text-sm font-medium">Hosted by {dinner.host?.displayName}</p>
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

      
      {/* Final Call to Action */}
      <div className="mt-40 text-center py-20 bg-stone-900 rounded-[64px] text-white">
        <Sparkles size={40} className="mx-auto mb-6 text-brand" />
        <h3 className="serif text-5xl mb-6">Ready to find your seat?</h3>
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

