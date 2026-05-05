import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dbService } from '../lib/dbService';
import { UserProfile, Dinner, WaitlistEntry } from '../types';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Calendar, Heart, ShieldCheck, Quote, Edit3, Save, X, Camera, History, Bookmark, BarChart3, TrendingUp, Users as UsersIcon, Star, ChefHat, Clock } from 'lucide-react';
import { LocationInput } from '../components/LocationInput';
import { DinnerCard } from '../components/DinnerCard';

export const Profile: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [attendedDinners, setAttendedDinners] = useState<Dinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'favorites' | 'waitlist' | 'hosting' | 'analytics'>('history');
  const [favoriteDinners, setFavoriteDinners] = useState<Dinner[]>([]);
  const [hostedDinners, setHostedDinners] = useState<Dinner[]>([]);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [waitlistDinners, setWaitlistDinners] = useState<Dinner[]>([]);
  const [editData, setEditData] = useState({
    displayName: '',
    bio: '',
    city: '',
    interests: '',
    photoURL: '',
    dietaryPreferences: [] as string[]
  });

  const DIETARY_TAGS = ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal', 'Kosher'];

  const toggleDietary = (tag: string) => {
    setEditData(prev => ({
      ...prev,
      dietaryPreferences: prev.dietaryPreferences.includes(tag)
        ? prev.dietaryPreferences.filter(t => t !== tag)
        : [...prev.dietaryPreferences, tag]
    }));
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const bookings = await dbService.getBookings(user.uid);
      const past = bookings
        .filter(b => b.status === 'confirmed' && b.dinner && b.dinner.date < Date.now())
        .map(b => b.dinner!);
      setAttendedDinners(past);

      // Fetch favorites
      if (profile?.favorites && profile.favorites.length > 0) {
        const favs = await dbService.getFavorites(profile.favorites);
        setFavoriteDinners(favs);
      }

      // Fetch hosted dinners
      const hostDinners = await dbService.getHostDinners(user.uid);
      setHostedDinners(hostDinners);

      // Fetch pending bookings for host
      const allHostBookings = await dbService.getHostBookings(user.uid);
      setPendingBookings(allHostBookings.filter(b => b.status === 'pending'));

      // Fetch waitlist entries
      const entries = await dbService.getUserWaitlist(user.uid);
      setWaitlistEntries(entries);
      const dinners = await Promise.all(entries.map(e => dbService.getDinner(e.dinnerId)));
      setWaitlistDinners(dinners.filter(Boolean) as Dinner[]);

      setLoading(false);
    };
    fetch();
  }, [user, profile?.favorites]);

  useEffect(() => {
    if (profile) {
      setEditData({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        city: profile.city || '',
        interests: profile.interests?.join(', ') || '',
        photoURL: profile.photoURL || '',
        dietaryPreferences: profile.dietaryPreferences || []
      });
    }
  }, [profile, isEditing]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const interestsArray = editData.interests.split(',').map(i => i.trim()).filter(Boolean);
    
    await dbService.updateUserProfile(user.uid, {
      displayName: editData.displayName,
      bio: editData.bio,
      city: editData.city,
      interests: interestsArray,
      dietaryPreferences: editData.dietaryPreferences,
      photoURL: editData.photoURL
    });
    
    setIsEditing(false);
    setLoading(false);
    // Note: The AuthContext should ideally listen to profile changes or we could force a refresh.
    // Assuming AuthContext handles the subscription to user profile.
    window.location.reload(); // Quickest way to ensure everything syncs for this prototype
  };

  if (authLoading) return (
    <div className="pt-32 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
      <p className="font-serif italic text-stone-400">Setting the table...</p>
    </div>
  );

  if (!profile) return (
    <div className="pt-32 text-center p-8">
      <h2 className="serif text-2xl text-ink mb-4">Profile not found.</h2>
      <p className="text-stone-500 mb-8 max-w-md mx-auto">We couldn't retrieve your guest profile. Try refreshing the page or logging in again.</p>
      <button onClick={() => window.location.reload()} className="olive-btn">Refresh Page</button>
    </div>
  );

  return (
    <div className="pt-28 pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-[40px] p-8 sm:p-16 border border-brand-light card-shadow relative overflow-hidden">
        
        {/* Edit Toggle */}
        <button 
          onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
          className="absolute top-8 right-8 p-4 bg-brand/5 text-brand rounded-full hover:bg-brand/10 transition-colors z-10"
        >
          {isEditing ? <X size={20} /> : <Edit3 size={20} />}
        </button>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-12">
          {/* Avatar side */}
          <div className="flex-shrink-0 text-center">
            <div className="relative inline-block group">
               <img 
                 src={isEditing ? editData.photoURL : profile.photoURL} 
                 className="w-40 h-40 rounded-[32px] object-cover shadow-2xl transition-all group-hover:opacity-80"
                 alt={profile.displayName}
               />
               {isEditing && (
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <Camera className="text-white" size={32} />
                 </div>
               )}
               {profile.isVerified && !isEditing && (
                 <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-lg border border-brand-light">
                    <ShieldCheck className="text-brand" size={24} />
                 </div>
               )}
            </div>
            
            {isEditing && (
              <div className="mt-4">
                <input 
                  type="text"
                  placeholder="Photo URL"
                  className="text-[10px] w-40 bg-stone-50 border border-brand-light rounded-full px-3 py-1.5 focus:outline-none focus:border-brand/40"
                  value={editData.photoURL}
                  onChange={e => setEditData({ ...editData, photoURL: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Info side */}
          <div className="flex-1 space-y-10">
             <div>
                {isEditing ? (
                  <input 
                    type="text"
                    className="text-4xl sm:text-5xl font-serif font-medium text-ink mb-4 w-full bg-[#F2F1EA]/50 border border-brand-light rounded-2xl px-4 py-2 focus:outline-none"
                    value={editData.displayName}
                    onChange={e => setEditData({ ...editData, displayName: e.target.value })}
                  />
                ) : (
                  <h1 className="text-4xl sm:text-6xl font-serif font-medium text-ink mb-4">{profile.displayName}</h1>
                )}

                <div className="flex items-center flex-wrap gap-6 text-stone-500 font-medium text-sm">
                   <div className="flex items-center space-x-2 px-4 py-2 bg-[#F2F1EA] rounded-full text-brand">
                      <MapPin size={16} />
                      {isEditing ? (
                        <div className="w-32">
                            <LocationInput 
                              value={editData.city} 
                              onChange={val => setEditData({ ...editData, city: val })}
                              className="bg-transparent text-[10px] uppercase font-black tracking-widest focus:outline-none"
                            />
                        </div>
                      ) : (
                        <span className="text-[10px] uppercase font-black tracking-widest">{profile.city || 'Sojourner'}</span>
                      )}
                   </div>
                   <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest opacity-60">
                      <Calendar size={16} />
                      <span>Member since {profile.createdAt ? new Date(profile.createdAt).getFullYear() : new Date().getFullYear()}</span>
                   </div>
                </div>
                
                {profile.isVerified && !isEditing && (
                  <div className="mt-6 flex flex-wrap gap-4">
                    <button 
                      onClick={() => navigate('/host/create')}
                      className="olive-btn flex items-center space-x-2 text-[10px] py-2.5"
                    >
                      <ChefHat size={16} />
                      <span>Host a Table</span>
                    </button>
                  </div>
                )}
                
                {!profile.isVerified && !isEditing && (
                  <button 
                    onClick={async () => {
                      if (!user) return;
                      await dbService.updateUserProfile(user.uid, { isVerified: true });
                      window.location.reload();
                    }}
                    className="mt-6 flex items-center space-x-2 text-emerald-600 bg-emerald-50 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm w-fit"
                  >
                    <ShieldCheck size={14} />
                    <span>Verify Identity to Host</span>
                  </button>
                )}
             </div>

             <div className="relative pl-10 border-l-2 border-brand/10">
                <Quote className="absolute top-0 left-[-12px] p-2 bg-bg-warm text-brand" size={40} />
                {isEditing ? (
                  <textarea 
                    className="w-full bg-[#F2F1EA]/50 border border-brand-light rounded-2xl p-4 text-lg font-serif italic focus:outline-none h-32"
                    placeholder="Your story..."
                    value={editData.bio}
                    onChange={e => setEditData({ ...editData, bio: e.target.value })}
                  />
                ) : (
                  <p className="text-stone-600 text-xl font-serif italic leading-relaxed opacity-80">
                    "{profile.bio || 'I believe that to really know a city, you must sit at its kitchen tables.'}"
                  </p>
                )}
             </div>

             <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-400 mb-5">Current Interests</h3>
                {isEditing ? (
                  <input 
                    type="text"
                    placeholder="Cooking, Travel, Jazz (comma separated)"
                    className="w-full bg-[#F2F1EA]/50 border border-brand-light rounded-full px-6 py-3 text-xs font-bold focus:outline-none"
                    value={editData.interests}
                    onChange={e => setEditData({ ...editData, interests: e.target.value })}
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(profile.interests && profile.interests.length > 0 ? profile.interests : ['Culinary Arts', 'Existentialism', 'Boutique Wines', 'Modern Architecture']).map(interest => (
                      <span key={interest} className="px-5 py-2.5 bg-white text-stone-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-light flex items-center space-x-2 hover:border-brand/30 transition-colors">
                         <Heart size={10} className="text-brand/50" />
                         <span>{interest}</span>
                      </span>
                    ))}
                  </div>
                )}
             </div>

             <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-400 mb-5">Dietary Regimes</h3>
                {isEditing ? (
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleDietary(tag)}
                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                          editData.dietaryPreferences.includes(tag)
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-stone-50 text-stone-400 border-stone-100'
                        } border hover:border-brand/40`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(profile.dietaryPreferences && profile.dietaryPreferences.length > 0) ? (
                      profile.dietaryPreferences.map(diet => (
                        <span key={diet} className="px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                          {diet}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-300 italic">No restrictions set</span>
                    )}
                  </div>
                )}
             </div>

             {isEditing && (
               <div className="pt-4">
                 <button 
                   onClick={handleSave}
                   disabled={loading}
                   className="olive-btn flex items-center space-x-2"
                 >
                   <Save size={18} />
                   <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                 </button>
               </div>
             )}
          </div>
        </div>

        {/* Tabbed Content */}
        {!isEditing && (
          <div className="mt-20">
             <div className="flex border-b border-brand-light mb-12">
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'history' ? 'text-brand' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  <History size={16} />
                  My Table History
                  {activeTab === 'history' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand rounded-t-full" />}
                </button>
                <button 
                  onClick={() => setActiveTab('favorites')}
                  className={`flex items-center gap-2 px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'favorites' ? 'text-brand' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  <Bookmark size={16} />
                  Saved for Later
                  {activeTab === 'favorites' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand rounded-t-full" />}
                </button>
                <button
                  onClick={() => setActiveTab('waitlist')}
                  className={`flex items-center gap-2 px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'waitlist' ? 'text-brand' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  <Clock size={16} />
                  Waitlist
                  {waitlistEntries.length > 0 && (
                    <span className="ml-1 w-4 h-4 bg-brand text-white rounded-full text-[8px] font-black flex items-center justify-center">
                      {waitlistEntries.length}
                    </span>
                  )}
                  {activeTab === 'waitlist' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand rounded-t-full" />}
                </button>
                <button
                  onClick={() => setActiveTab('hosting')}
                  className={`flex items-center gap-2 px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'hosting' ? 'text-brand' : 'text-stone-400 hover:text-stone-600'}`}
                >
                  <ChefHat size={16} />
                  My Table Management
                  {activeTab === 'hosting' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand rounded-t-full" />}
                </button>
                {profile.isVerified && (
                  <button 
                    onClick={() => setActiveTab('analytics')}
                    className={`flex items-center gap-2 px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'analytics' ? 'text-brand' : 'text-stone-400 hover:text-stone-600'}`}
                  >
                    <BarChart3 size={16} />
                    Host Insights
                    {activeTab === 'analytics' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand rounded-t-full" />}
                  </button>
                )}
             </div>

             <AnimatePresence mode="wait">
               {activeTab === 'history' && (
                 <motion.div 
                   key="history"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="space-y-8"
                 >
                   {attendedDinners.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                       {attendedDinners.map(dinner => <DinnerCard key={dinner.id} dinner={dinner} />)}
                     </div>
                   ) : (
                     <div className="py-20 text-center bg-stone-50 rounded-[40px] border border-dashed border-stone-200">
                        <p className="text-stone-400 font-medium italic font-serif">Your seat at the table is waiting. Join your first dinner to build your history.</p>
                        <button onClick={() => navigate('/explore')} className="mt-6 text-[10px] font-black uppercase tracking-widest text-brand">Browse upcoming tables</button>
                     </div>
                   )}
                 </motion.div>
               )}

               {activeTab === 'favorites' && (
                 <motion.div 
                   key="favorites"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                 >
                   {favoriteDinners.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                       {favoriteDinners.map(dinner => <DinnerCard key={dinner.id} dinner={dinner} />)}
                     </div>
                   ) : (
                     <div className="py-20 text-center bg-stone-50 rounded-[40px] border border-dashed border-stone-200">
                        <p className="text-stone-400 font-medium italic font-serif">A wishlist for hungry souls. Save tables you'd love to join.</p>
                        <button onClick={() => navigate('/explore')} className="mt-6 text-[10px] font-black uppercase tracking-widest text-brand">Explore tables</button>
                     </div>
                   )}
                 </motion.div>
               )}

               {activeTab === 'waitlist' && (
                 <motion.div
                   key="waitlist"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="space-y-6"
                 >
                   {waitlistDinners.length > 0 ? (
                     <>
                       <p className="text-xs text-stone-400 font-medium italic">You'll be notified when a seat opens at these tables.</p>
                       <div className="space-y-4">
                         {waitlistDinners.map((dinner, i) => (
                           <div key={dinner.id} className="bg-white border border-brand-light rounded-[28px] p-5 flex items-center gap-5">
                             <img src={dinner.images[0]} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" alt={dinner.title} />
                             <div className="flex-1 min-w-0">
                               <p className="font-bold text-ink truncate">{dinner.title}</p>
                               <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest mt-1">
                                 {new Date(dinner.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                               </p>
                             </div>
                             <button
                               onClick={async () => {
                                 if (!user) return;
                                 await dbService.removeFromWaitlist(user.uid, dinner.id);
                                 setWaitlistEntries(prev => prev.filter(e => e.dinnerId !== dinner.id));
                                 setWaitlistDinners(prev => prev.filter(d => d.id !== dinner.id));
                               }}
                               className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-rose-500 transition-colors flex-shrink-0"
                             >
                               Leave
                             </button>
                           </div>
                         ))}
                       </div>
                     </>
                   ) : (
                     <div className="py-20 text-center bg-stone-50 rounded-[40px] border border-dashed border-stone-200">
                       <Clock className="mx-auto text-stone-200 mb-3" size={32} />
                       <p className="text-stone-400 font-medium italic font-serif">No waitlists yet. Join a sold-out dinner to get notified when a seat opens.</p>
                       <button onClick={() => navigate('/explore')} className="mt-6 text-[10px] font-black uppercase tracking-widest text-brand">Explore tables</button>
                     </div>
                   )}
                 </motion.div>
               )}

                {activeTab === 'hosting' && (
                  <motion.div 
                    key="hosting"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-12"
                  >
                    {pendingBookings.length > 0 && (
                      <div className="bg-amber-50 rounded-[40px] p-8 border border-amber-100">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-6 flex items-center gap-2">
                          <UsersIcon size={14} />
                          Guest Requests ({pendingBookings.length})
                        </h4>
                        <div className="space-y-4">
                          {pendingBookings.map(booking => (
                            <div key={booking.id} className="bg-white p-6 rounded-3xl border border-amber-200 flex items-center justify-between">
                               <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-100">
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.guestId}`} alt="Guest" />
                                 </div>
                                 <div className="min-w-0 flex-1">
                                    <p className="font-bold text-ink truncate">{booking.guest?.displayName || 'Guest'}</p>
                                    <p className="text-[10px] text-stone-400 truncate tracking-tight">{booking.dinner?.title}</p>
                                 </div>
                               </div>
                               <div className="flex gap-2">
                                  <button 
                                    onClick={async () => {
                                      await dbService.updateBookingStatus(booking.id, 'confirmed', booking.dinnerId);
                                      window.location.reload();
                                    }}
                                    className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest"
                                  >
                                    Confirm
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      await dbService.updateBookingStatus(booking.id, 'cancelled', booking.dinnerId);
                                      window.location.reload();
                                    }}
                                    className="bg-stone-50 text-stone-400 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest"
                                  >
                                    Decline
                                  </button>
                               </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400">Hosting Schedule</h4>
                        <button onClick={() => navigate('/host/create')} className="text-brand text-[10px] font-black uppercase tracking-widest">+ Host New</button>
                      </div>
                      {hostedDinners.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          {hostedDinners.map(dinner => <DinnerCard key={dinner.id} dinner={dinner} />)}
                        </div>
                      ) : (
                        <div className="py-16 text-center bg-stone-50 rounded-[40px] border border-dashed border-stone-200">
                          <p className="text-stone-400 font-medium italic font-serif">Your table is empty. Start hosting!</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

               {activeTab === 'analytics' && (
                 <motion.div 
                   key="analytics"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                 >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
                      <div className="bg-brand/5 p-8 rounded-[32px] border border-brand-light flex flex-col items-center">
                        <TrendingUp className="text-brand mb-4" size={32} />
                        <span className="text-4xl font-serif font-bold text-ink">$2,450</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">Total Earnings</span>
                      </div>
                      <div className="bg-brand/5 p-8 rounded-[32px] border border-brand-light flex flex-col items-center">
                        <UsersIcon className="text-brand mb-4" size={32} />
                        <span className="text-4xl font-serif font-bold text-ink">124</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">Guests Hosted</span>
                      </div>
                      <div className="bg-brand/5 p-8 rounded-[32px] border border-brand-light flex flex-col items-center">
                        <Star className="text-brand mb-4" size={32} />
                        <span className="text-4xl font-serif font-bold text-ink">4.92</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-2">Avg Rating</span>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-brand-light rounded-[40px] p-10">
                      <h4 className="serif text-2xl text-ink mb-8">Performance Overview</h4>
                      <p className="text-stone-500 italic font-serif leading-relaxed h-32 flex items-center justify-center border border-dashed border-stone-200 rounded-3xl">
                        Chart showing growth over time will appear here as you host more tables.
                      </p>
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
