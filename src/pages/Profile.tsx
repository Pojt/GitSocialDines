import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { dbService } from '../lib/dbService';
import { UserProfile, Dinner, WaitlistEntry, HostAnalytics } from '../types';
import { useAuth } from '../AuthContext';
import { DinnerCard } from '../components/DinnerCard';
import { ImageUpload } from '../components/ImageUpload';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  MapPin, 
  CheckCircle2, 
  ChefHat, 
  Heart,
  Edit2,
  X,
  LogOut,
  Sparkles,
  Link as LinkIcon,
  LayoutDashboard,
  Clock,
  Star,
  TrendingUp,
  Users
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile: currentUserProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dinners, setDinners] = useState<Dinner[]>([]);
  const [favorites, setFavorites] = useState<Dinner[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [waitlistDinners, setWaitlistDinners] = useState<Dinner[]>([]);
  const [analytics, setAnalytics] = useState<HostAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [activeTab, setActiveTab] = useState<'hosted' | 'favorites' | 'waitlist' | 'analytics'>('hosted');

  const profileId = id || user?.uid;
  const isOwnProfile = !id || (user && id === user.uid);

  useEffect(() => {
    const fetch = async () => {
      if (!profileId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [profData, dinnerData] = await Promise.all([
          dbService.getUserProfile(profileId),
          dbService.getHostDinners(profileId)
        ]);
        setProfile(profData);
        setEditForm(profData || {});
        setDinners(dinnerData);
        
        if (profData?.favorites?.length) {
          const favData = await Promise.all(
            profData.favorites.slice(0, 50).map(fid => dbService.getDinner(fid))
          );
          setFavorites(favData.filter((d): d is Dinner => d !== null));
        }

        if (isOwnProfile) {
          const waitlist = await dbService.getUserWaitlist(profileId);
          setWaitlistEntries(waitlist);
          const wDinners = await Promise.all(waitlist.map(w => dbService.getDinner(w.dinnerId)));
          setWaitlistDinners(wDinners.filter((d): d is Dinner => d !== null));
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, user?.uid]);

  useEffect(() => {
    if (activeTab === 'analytics' && !analytics && profileId) {
      setAnalyticsLoading(true);
      dbService.getHostAnalytics(profileId).then(data => {
        setAnalytics(data);
        setAnalyticsLoading(false);
      });
    }
  }, [activeTab, profileId, analytics]);

  const handleUpdate = async () => {
    if (!user || !profile) return;
    await dbService.updateUserProfile(user.uid, editForm);
    setProfile({ ...profile, ...editForm });
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleLeaveWaitlist = async (dinnerId: string) => {
    if (!user) return;
    await dbService.removeFromWaitlist(user.uid, dinnerId);
    setWaitlistEntries(prev => prev.filter(w => w.dinnerId !== dinnerId));
    setWaitlistDinners(prev => prev.filter(d => d.id !== dinnerId));
  };

  if (loading) return (
    <div className="pt-32 text-center">
      <div className="inline-block w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin mb-4" />
      <div className="font-serif text-2xl text-stone-400">Preparing the table...</div>
    </div>
  );

  if (!profile) {
    if (!profileId && !user) {
      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
          <div className="w-20 h-20 bg-brand/5 rounded-full flex items-center justify-center text-brand mb-6">
            <ChefHat size={40} />
          </div>
          <h2 className="serif text-4xl font-black text-ink mb-2">Your Story Awaits</h2>
          <p className="text-stone-500 font-serif italic text-lg mb-8 opacity-70 text-center max-w-sm">
            Sign in to manage your tables, track your bookings, and connect with other locals.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="olive-btn px-12 py-4 shadow-xl shadow-brand/20"
          >
            Sign in to Social Dine
          </button>
        </div>
      );
    }
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="font-serif text-2xl text-stone-300">Host not found at our table.</div>
        <button onClick={() => navigate('/explore')} className="mt-4 text-brand text-xs font-black uppercase tracking-widest hover:underline">
          Explore tables
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-32">
      {/* Profile Header */}
      <div className="relative h-64 bg-brand/5 border-b border-brand-light">
         {isOwnProfile && (
           <button 
             onClick={handleLogout}
             className="absolute top-24 right-4 sm:right-8 p-3 bg-white rounded-full card-shadow text-stone-400 hover:text-rose-500 transition-all active:scale-95"
           >
             <LogOut size={20} />
           </button>
         )}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="relative -mt-24 mb-12">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8">
                <div className="relative group">
                   <div className="w-40 h-40 rounded-[48px] border-[6px] border-white card-shadow overflow-hidden bg-stone-100">
                     <img 
                       src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.displayName || 'Felix'}`} 
                       className="w-full h-full object-cover"
                       alt={profile.displayName}
                     />
                   </div>
                </div>

               <div className="flex-1 text-center sm:text-left pb-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3 mb-3">
                    <h1 className="text-4xl font-serif font-black text-ink">{profile.displayName}</h1>
                    {profile.isVerified && (
                      <div className="flex items-center gap-1.5 bg-brand/10 text-brand px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle2 size={12} />
                        Verified Host
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 text-stone-400 font-bold text-xs uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-brand/40" />
                      {profile.city || 'Secret Location'}
                    </div>
                    <div className="w-1 h-1 bg-stone-200 rounded-full" />
                    <div className="flex items-center gap-1.5">
                      <ChefHat size={14} className="text-brand/40" />
                      {dinners.length} Hosted
                    </div>
                  </div>
               </div>

               {isOwnProfile && (
                 <button 
                   onClick={() => setIsEditing(true)}
                   className="sm:mb-4 px-6 py-3 bg-white border border-brand-light rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand hover:bg-brand hover:text-white transition-all card-shadow flex items-center gap-2"
                 >
                   <Edit2 size={14} />
                   Edit Profile
                 </button>
               )}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
           {/* Sidebar Info */}
           <div className="lg:col-span-4 space-y-8">
              <div className="bg-[#F2F1EA] rounded-[32px] p-8 border border-brand-light">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-4">The Story</h3>
                 <p className="text-stone-600 font-serif italic text-lg leading-relaxed">
                   "{profile.bio || "This host is still writing their culinary manifesto..."}"
                 </p>
              </div>

              {profile.interests && profile.interests.length > 0 && (
                <div>
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4">Aligned Passions</h3>
                   <div className="flex flex-wrap gap-2">
                      {profile.interests.map(interest => (
                        <span key={interest} className="px-4 py-2 bg-white border border-brand-light rounded-full text-[10px] font-black text-ink uppercase tracking-wider">
                           {interest}
                        </span>
                      ))}
                   </div>
                </div>
              )}
           </div>

           {/* Main Content Area */}
           <div className="lg:col-span-8">
              <div className="flex border-b border-brand-light mb-10 overflow-x-auto no-scrollbar">
                {[
                  { id: 'hosted', icon: Sparkles, label: 'Hosted' },
                  { id: 'favorites', icon: Heart, label: 'Saved' },
                  ...(isOwnProfile ? [{ id: 'waitlist', icon: Clock, label: 'Waitlist', badge: waitlistEntries.length }] : []),
                  { id: 'analytics', icon: LayoutDashboard, label: 'Analytics' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`relative px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-colors flex items-center gap-2 whitespace-nowrap ${
                      activeTab === t.id ? 'text-brand' : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    <t.icon size={14} />
                    {t.label}
                    {t.badge !== undefined && t.badge > 0 && (
                      <span className="bg-brand text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{t.badge}</span>
                    )}
                    {activeTab === t.id && <motion.div layoutId="profileTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {activeTab === 'hosted' && (
                    dinners.length > 0 ? (
                      dinners.map(dinner => <DinnerCard key={dinner.id} dinner={dinner} />)
                    ) : (
                      <div className="col-span-full py-20 text-center bg-stone-50 rounded-[32px] border border-dashed border-stone-200 font-serif italic text-stone-400">No hosted moments yet.</div>
                    )
                  )}

                  {activeTab === 'favorites' && (
                    favorites.length > 0 ? (
                      favorites.map(dinner => <DinnerCard key={dinner.id} dinner={dinner} />)
                    ) : (
                      <div className="col-span-full py-20 text-center bg-stone-50 rounded-[32px] border border-dashed border-stone-200 font-serif italic text-stone-400">No saved tables yet.</div>
                    )
                  )}

                  {activeTab === 'waitlist' && (
                    waitlistDinners.length > 0 ? (
                      waitlistDinners.map(dinner => (
                        <div key={dinner.id} className="relative group">
                          <DinnerCard dinner={dinner} />
                          <button 
                            onClick={(e) => { e.preventDefault(); handleLeaveWaitlist(dinner.id); }}
                            className="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-stone-400 hover:text-rose-500 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all font-bold text-[10px] uppercase tracking-widest flex items-center gap-1"
                          >
                            <X size={12} /> Leave
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-20 text-center bg-stone-50 rounded-[32px] border border-dashed border-stone-200 font-serif italic text-stone-400">Your waitlist is empty.</div>
                    )
                  )}

                  {activeTab === 'analytics' && (
                    <div className="col-span-full">
                       {analyticsLoading ? (
                         <div className="text-center py-20 font-serif text-stone-400 animate-pulse italic">Brewing the numbers...</div>
                       ) : analytics ? (
                         <div className="grid grid-cols-2 gap-4">
                            {[
                              { label: 'Total Earnings', value: `$${analytics.totalEarnings.toLocaleString()}`, icon: TrendingUp },
                              { label: 'Guests Hosted', value: analytics.totalGuests, icon: Users },
                              { label: 'Tables Hosted', value: analytics.completedDinners, icon: ChefHat },
                              { label: 'Avg Rating', value: analytics.averageRating || '—', icon: Star }
                            ].map(s => (
                              <div key={s.label} className="bg-[#F2F1EA] p-6 rounded-[32px] border border-brand-light flex flex-col items-center text-center">
                                 <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-brand mb-4 shadow-sm">
                                    <s.icon size={20} />
                                 </div>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">{s.label}</p>
                                 <p className="text-2xl font-serif font-black text-ink">{s.value}</p>
                              </div>
                            ))}
                            {analytics.totalGuests === 0 && (
                              <div className="col-span-full py-10 text-center text-xs text-stone-400 font-medium italic">Host your first dinner to see real-time analytics.</div>
                            )}
                         </div>
                       ) : null}
                    </div>
                  )}
                </AnimatePresence>
              </div>
           </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[40px] p-8 sm:p-10 card-shadow overflow-hidden"
            >
               <button 
                 onClick={() => setIsEditing(false)}
                 className="absolute top-6 right-6 p-2 text-stone-400 hover:text-ink transition-colors"
               >
                 <X size={20} />
               </button>

               <div className="mb-10">
                  <h2 className="text-3xl font-serif font-black text-ink mb-2">Update Narrative</h2>
                  <p className="text-stone-400 font-medium opacity-70 italic font-serif">Tell us about your culinary journey and table vision.</p>
               </div>

               <div className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Photo URL</label>
                    <ImageUpload 
                      value={editForm.photoURL || ''} 
                      onChange={url => setEditForm(prev => ({ ...prev, photoURL: url }))} 
                      storagePath={`users/${user?.uid}/avatar`}
                      previewClassName="w-32 h-32 rounded-[32px]"
                    />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Display Name</label>
                   <input 
                     type="text"
                     value={editForm.displayName || ''}
                     onChange={e => setEditForm({ ...editForm, displayName: e.target.value })}
                     className="w-full bg-[#F2F1EA] border border-brand-light rounded-2xl px-6 py-4 focus:outline-none focus:border-brand/40 font-serif italic"
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">City</label>
                   <input 
                     type="text"
                     value={editForm.city || ''}
                     onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                     className="w-full bg-[#F2F1EA] border border-brand-light rounded-2xl px-6 py-4 focus:outline-none focus:border-brand/40 font-serif italic"
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">The Narrative (Bio)</label>
                   <textarea 
                     value={editForm.bio || ''}
                     onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                     className="w-full bg-[#F2F1EA] border border-brand-light rounded-2xl px-6 py-4 h-32 focus:outline-none focus:border-brand/40 font-serif italic resize-none"
                   />
                 </div>
                 <button 
                   onClick={handleUpdate}
                   className="w-full olive-btn py-4"
                 >
                   Save Changes
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

