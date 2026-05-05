import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { dbService } from '../lib/dbService';
import { UserProfile, Dinner, Review } from '../types';
import { motion } from 'motion/react';
import { MapPin, Quote, Sparkles, ChefHat, ArrowLeft, Star, Heart, Smile, MessageSquare } from 'lucide-react';
import { DinnerCard, SkeletonCard } from '../components/DinnerCard';

const MOOD_ICONS: Record<string, React.ReactNode> = {
  'Warm': <Heart size={14} className="text-pink-500" />,
  'Lively': <Sparkles size={14} className="text-amber-500" />,
  'Inspiring': <Smile size={14} className="text-emerald-500" />,
  'Profound': <MessageSquare size={14} className="text-indigo-500" />
};

export const HostProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dinners, setDinners] = useState<Dinner[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHostData = async () => {
      if (!id) return;
      setLoading(true);
      const [hostProfile, hostDinners, hostReviews] = await Promise.all([
        dbService.getUserProfile(id),
        dbService.getHostDinners(id),
        dbService.getReviews(id)
      ]);
      setProfile(hostProfile);
      setDinners(hostDinners);
      setReviews(hostReviews || []);
      setLoading(false);
    };
    fetchHostData();
  }, [id]);

  if (loading) {
    return (
      <div className="pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-32 h-32 rounded-full bg-stone-200 mb-8" />
          <div className="h-10 bg-stone-200 rounded w-48 mb-4" />
          <div className="h-6 bg-stone-200 rounded w-32 mb-12" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 w-full">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pt-32 text-center h-[60vh] flex flex-col items-center justify-center">
        <h2 className="serif text-3xl mb-4">Host not found</h2>
        <Link to="/" className="text-brand font-bold underline">Go back home</Link>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-32 min-h-screen bg-bg-warm">
      {/* Background/Header Effect */}
      <div className="h-64 bg-brand/5 absolute top-0 left-0 right-0 -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button 
          onClick={() => navigate(-1)} 
          className="inline-flex items-center text-stone-500 hover:text-brand transition-colors mb-12 group"
        >
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Back</span>
        </button>

        <div className="flex flex-col lg:flex-row gap-16">
          {/* Sidebar / Info */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-1/3"
          >
            <div className="bg-white rounded-[40px] p-8 card-shadow-lg border border-brand-light sticky top-28">
              <div className="relative mb-8 flex justify-center">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-brand-light">
                  <img 
                    src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.displayName}`} 
                    className="w-full h-full object-cover" 
                    alt={profile.displayName} 
                  />
                </div>
                {profile.isVerified && (
                  <div className="absolute bottom-2 right-[36%] bg-brand text-bg-warm w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                    <span className="text-[10px] font-black uppercase">✓</span>
                  </div>
                )}
              </div>

              <div className="text-center mb-8">
                <h1 className="serif text-4xl font-bold text-ink mb-2">{profile.displayName}</h1>
                <div className="flex items-center justify-center space-x-2 text-stone-400">
                  <MapPin size={14} />
                  <span className="text-xs font-black uppercase tracking-widest">{profile.city || 'Culinary Nomad'}</span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-3">Host Bio</h3>
                  <div className="relative">
                    <Quote className="absolute -top-2 -left-2 text-brand/10" size={32} />
                    <p className="text-sm text-stone-600 leading-relaxed italic z-10 relative pl-4">
                      {profile.about || "This host hasn't shared their story yet, but their table is ready for you."}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-3">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests?.length ? profile.interests.map(interest => (
                      <span key={interest} className="vibe-tag">#{interest}</span>
                    )) : (
                      <span className="text-xs text-stone-400 italic">No interests listed yet</span>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-brand-light">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500">Joined Social Dine</span>
                    <span className="font-bold text-ink">May 2024</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content / Dinners */}
          <div className="lg:w-2/3">
            <div className="mb-12">
              <div className="flex items-center space-x-2 text-brand mb-4">
                <ChefHat size={18} strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">The Host's Table</span>
              </div>
              <h2 className="serif text-5xl text-ink leading-tight">Tables Hosted by {profile.displayName.split(' ')[0]}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {dinners.length > 0 ? (
                dinners.map(dinner => (
                  <DinnerCard key={dinner.id} dinner={{ ...dinner, host: profile }} />
                ))
              ) : (
                <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-stone-200">
                  <Sparkles size={32} className="mx-auto text-stone-200 mb-4" />
                  <p className="text-stone-400 font-medium">No active dinner listings at the moment.</p>
                </div>
              )}
            </div>

            {/* Reviews Section */}
            <div className="mt-24 pt-24 border-t border-brand-light">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <div className="flex items-center space-x-2 text-brand mb-4">
                    <Star size={18} fill="currentColor" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Guest Voices</span>
                  </div>
                  <h3 className="serif text-4xl text-ink">Table Stories & Reviews</h3>
                </div>
                {reviews.length > 0 && (
                  <div className="text-right">
                    <div className="text-3xl font-serif font-bold text-brand">{ (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) }</div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-stone-400">Average Vibe</div>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                {reviews.length > 0 ? (
                  reviews.map(review => (
                    <motion.div 
                      key={review.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-white rounded-[32px] p-8 border border-brand-light"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-light">
                             <img 
                               src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${review.authorId}`} 
                               alt="Guest" 
                               className="w-full h-full object-cover"
                             />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                               <div className="flex">
                                 {Array.from({ length: 5 }).map((_, i) => (
                                   <Star key={i} size={12} fill={i < review.rating ? "#D4C79F" : "none"} stroke={i < review.rating ? "#D4C79F" : "#E5E7EB"} />
                                 ))}
                               </div>
                               <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Guest</span>
                            </div>
                            <p className="text-xs text-stone-300 mt-1">{new Date(review.createdAt || Date.now()).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {review.mood && (
                          <div className="flex items-center space-x-2 bg-stone-50 px-3 py-1.5 rounded-full border border-stone-100">
                             {MOOD_ICONS[review.mood]}
                             <span className="text-[9px] font-black uppercase tracking-widest text-stone-500">{review.mood}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-stone-600 font-medium italic leading-relaxed">"{review.content}"</p>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-20 text-center bg-[#F2F1EA]/30 rounded-[40px] border border-dashed border-brand-light/50">
                    <p className="text-stone-400 font-medium italic font-serif">Be the first to share a story from {profile.displayName.split(' ')[0]}'s table.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
