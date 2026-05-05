import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { dbService } from '../lib/dbService';
import { Dinner, Booking, WaitlistEntry } from '../types';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  MessageSquare, 
  ArrowLeft,
  ChevronRight,
  Info,
  Check,
  Star,
  Clock,
  ChefHat,
  Sparkles,
  Ticket
} from 'lucide-react';

export const DinnerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dinner, setDinner] = useState<Dinner | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<'verify' | 'intro' | 'confirm' | 'success'>('intro');
  const [message, setMessage] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitlistEntry, setWaitlistEntry] = useState<WaitlistEntry | null>(null);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      setLoading(true);
      const data = await dbService.getDinner(id);
      setDinner(data);
      setLoading(false);
    };
    fetch();
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    dbService.getWaitlistEntry(user.uid, id).then(setWaitlistEntry);
  }, [user, id]);

  useEffect(() => {
    if (isModalOpen && user) {
      if (!user.emailVerified && user.providerData[0]?.providerId === 'password') {
        setBookingStep('verify');
      } else {
        setBookingStep('intro');
      }
    }
  }, [isModalOpen, user]);

  const isHost = user && dinner && user.uid === dinner.hostId;

  const handleSendVerification = async () => {
    const { sendEmailVerification } = await import('firebase/auth');
    if (user) {
      try {
        await sendEmailVerification(user);
        alert('Verification email sent! Please check your inbox and refresh the page once verified.');
      } catch (err) {
        console.error(err);
        alert('Could not send verification email.');
      }
    }
  };

  const handleRequest = async () => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!dinner || isHost) return;

    setIsSubmitting(true);
    try {
      await dbService.createBooking({
        dinnerId: dinner.id,
        guestId: user.uid,
        hostId: dinner.hostId,
        status: 'pending',
        message,
        guestCount
      });
      setBookingStep('success');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWaitlist = async () => {
    if (!user) { navigate('/login', { state: { from: location } }); return; }
    if (!dinner || isHost) return;
    setWaitlistLoading(true);
    if (waitlistEntry) {
      await dbService.removeFromWaitlist(user.uid, dinner.id);
      setWaitlistEntry(null);
    } else {
      await dbService.addToWaitlist(user.uid, dinner.id, dinner.hostId, 1);
      setWaitlistEntry({ id: `${user.uid}_${dinner.id}`, userId: user.uid, dinnerId: dinner.id, hostId: dinner.hostId, guestCount: 1, joinedAt: Date.now() });
      setWaitlistJoined(true);
    }
    setWaitlistLoading(false);
  };

  if (loading) return <div className="pt-32 text-center font-serif text-2xl">Preparing the table...</div>;
  if (!dinner) return <div className="pt-32 text-center font-serif text-2xl">Dinner not found.</div>;

  const dateStr = new Date(dinner.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="bg-white min-h-screen">
      {/* Mobile Header / Back Button */}
      <div className="fixed top-20 left-4 z-40 sm:top-24 sm:left-8">
        <Link to="/" className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-stone-900 border border-stone-100 hover:text-brand transition-colors">
          <ArrowLeft size={20} />
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-12">
            {/* Gallery Grid */}
            <div className="grid grid-cols-12 gap-4 h-[400px] sm:h-[500px]">
              <div className="col-span-8 h-full rounded-[2rem] overflow-hidden">
                <img src={dinner.images[0]} className="w-full h-full object-cover" alt="Main" />
              </div>
              <div className="col-span-4 grid grid-rows-2 gap-4 h-full">
                <div className="rounded-[2rem] overflow-hidden">
                  <img src={dinner.images[1] || dinner.images[0]} className="w-full h-full object-cover" alt="Detail 1" />
                </div>
                <div className="rounded-[2rem] overflow-hidden relative">
                  <img src={dinner.images[2] || dinner.images[0]} className="w-full h-full object-cover" alt="Detail 2" />
                  {dinner.images.length > 3 && (
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-lg font-serif">
                       +{dinner.images.length - 3} more
                     </div>
                  )}
                </div>
              </div>
            </div>

            {/* Title & Info */}
            <div>
              <div className="flex items-center space-x-2 text-brand mb-4">
                <div className="bg-brand/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{dinner.cuisine}</div>
                {dinner.locationName && (
                  <>
                    <span className="text-stone-300">•</span>
                    <div className="flex items-center text-stone-500 text-[10px] font-black uppercase tracking-widest">
                      <MapPin size={12} className="mr-1 text-brand/40" />
                      {dinner.locationName}
                    </div>
                  </>
                )}
              </div>
              <h1 className="text-4xl sm:text-5xl font-serif font-bold text-stone-900 mb-8">{dinner.title}</h1>

              {/* Dedicated Vibe & Seats Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                <div className="bg-orange-50/50 border border-orange-100 p-6 rounded-[2rem] flex items-center space-x-5 transition-transform hover:scale-[1.02]">
                  <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600/60 mb-1">Atmosphere</p>
                    <p className="text-xl font-serif font-bold text-ink leading-none">{dinner.vibe} <span className="text-xs font-sans font-medium text-orange-600/40">Vibe</span></p>
                  </div>
                </div>

                <div className="bg-brand/5 border border-brand-light p-6 rounded-[2rem] flex items-center space-x-5 transition-transform hover:scale-[1.02]">
                  <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center text-brand shadow-sm">
                    <Ticket size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand/60 mb-1">Availability</p>
                    <p className="text-xl font-serif font-bold text-ink leading-none">
                      {dinner.guestsMax - dinner.guestsCount} 
                      <span className="text-xs font-sans font-medium text-brand/40 ml-2 uppercase">Seats Left</span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-8 py-6 border-y border-stone-100">
                <div className="flex items-center space-x-3">
                   <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-brand">
                     <Calendar size={20} />
                   </div>
                   <div>
                     <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Date & Time</p>
                     <p className="text-sm font-semibold text-stone-800">{dateStr}</p>
                   </div>
                </div>
                <div className="flex items-center space-x-3">
                   <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-brand">
                     <Users size={20} />
                   </div>
                   <div>
                     <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Table Size</p>
                     <p className="text-sm font-semibold text-stone-800">{dinner.guestsMax} seats total</p>
                   </div>
                </div>
                {dinner.soloFriendly && (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-brand">
                      <Check size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Booking Type</p>
                      <p className="text-sm font-semibold text-stone-800">Solo-friendly</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-stone max-w-none">
              <h2 className="text-2xl font-serif font-black mb-4">About the evening</h2>
              <p className="text-stone-600 text-lg leading-relaxed whitespace-pre-wrap">
                {dinner.description}
              </p>
            </div>

            {/* Host Section */}
            <div className="bg-[#F2F1EA] rounded-[32px] p-8 sm:p-10 border border-brand-light">
               <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-8">
                  <Link to={`/host/${dinner.hostId}`} className="relative group cursor-pointer block">
                    <img 
                      src={dinner.host?.photoURL} 
                      className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-xl object-cover group-hover:scale-105 transition-transform" 
                      alt={dinner.host?.displayName} 
                    />
                    {dinner.host?.isVerified && (
                      <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md">
                        <ShieldCheck className="text-brand" size={24} />
                      </div>
                    )}
                  </Link>
                  <div className="flex-1">
                    <h3 className="text-2xl font-serif font-medium text-ink mb-2">Hosted by {dinner.host?.displayName}</h3>
                    <p className="text-stone-500 mb-6 font-medium italic opacity-80 leading-relaxed">"{dinner.host?.bio}"</p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                       <Link to={`/host/${dinner.hostId}`} className="text-xs font-black text-brand uppercase tracking-[0.2em] flex items-center hover:opacity-70 transition-opacity">
                         View Host Story <ChevronRight size={14} className="ml-1" />
                       </Link>
                    </div>
                  </div>
               </div>
            </div>

            {/* Request Flow Notice */}
            <div className="flex items-start space-x-4 p-6 rounded-[2rem] border border-brand-light bg-white">
               <div className="w-10 h-10 rounded-full bg-brand/5 flex items-center justify-center text-brand flex-shrink-0">
                 <Info size={20} />
               </div>
               <div>
                  <h4 className="font-bold text-ink mb-1 text-sm uppercase tracking-wider">Request-and-confirm table</h4>
                  <p className="text-xs text-stone-500 leading-relaxed font-medium">
                    Social Dine is about connection. When you request a seat, your host will read your intro before confirming. You only pay once they accept your request.
                  </p>
               </div>
            </div>
          </div>

          {/* Checkout / Booking Sidebar (Desktop) */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-28 bg-white border border-brand-light card-shadow rounded-[32px] p-8">
               <div className="flex items-center justify-between mb-8">
                  <div className="text-3xl font-serif font-bold text-ink">
                    ${dinner.price}
                    <span className="text-xs font-sans font-medium text-stone-400 ml-2 italic">per guest</span>
                  </div>
               </div>

               {isHost ? (
                 <div className="bg-brand/5 rounded-3xl p-6 border border-brand-light text-center">
                    <ChefHat className="mx-auto text-brand mb-2" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-ink">Your Table</p>
                    <div className="mt-4 flex flex-col gap-2">
                      <Link to={`/host/edit/${dinner.id}`} className="olive-btn !py-2.5 text-[10px]">Edit Table Details</Link>
                      <Link to="/bookings" className="text-[10px] font-bold text-stone-500 hover:text-brand transition-colors">Manage Requests</Link>
                    </div>
                 </div>
               ) : dinner.guestsCount >= dinner.guestsMax ? (
                 <div className="space-y-3">
                   {waitlistJoined ? (
                     <div className="w-full py-4 text-sm rounded-full font-bold uppercase tracking-widest text-center bg-emerald-50 text-emerald-600 border border-emerald-100">
                       You're on the waitlist!
                     </div>
                   ) : (
                     <button
                       onClick={handleWaitlist}
                       disabled={waitlistLoading}
                       className={`w-full py-4 text-sm rounded-full font-bold uppercase tracking-widest transition-all ${
                         waitlistEntry ? 'bg-stone-100 text-stone-500 hover:bg-rose-50 hover:text-rose-500' : 'olive-btn'
                       }`}
                     >
                       {waitlistLoading ? '...' : waitlistEntry ? 'Leave Waitlist' : 'Join Waitlist'}
                     </button>
                   )}
                   <p className="text-center text-[10px] text-stone-400 font-black uppercase tracking-[0.2em]">
                     Fully booked · We'll notify you if a seat opens
                   </p>
                 </div>
               ) : (
                 <button
                   onClick={() => setIsModalOpen(true)}
                   className="w-full py-4 text-sm rounded-full font-bold uppercase tracking-widest olive-btn"
                 >
                   Request to join
                 </button>
               )}

               {dinner.guestsCount < dinner.guestsMax && (
                 <p className="text-center text-[10px] text-stone-400 mt-6 font-black uppercase tracking-[0.2em]">
                   Seats remaining: {dinner.guestsMax - dinner.guestsCount}
                 </p>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-brand-light p-4 pb-8 flex items-center justify-between">
         <div>
            <div className="text-xl font-serif font-bold text-ink">${dinner.price} <span className="text-xs font-sans text-stone-400 italic">pp</span></div>
            <div className="text-[10px] font-black text-brand uppercase tracking-widest">{dateStr.split(',')[1]}</div>
         </div>
         {isHost ? (
            <div className="flex gap-2">
              <Link to={`/host/edit/${dinner.id}`} className="olive-btn px-6 py-3 text-[10px]">
                Edit
              </Link>
              <Link to="/bookings" className="olive-btn !bg-stone-100 !text-stone-500 border-stone-200 px-6 py-3 text-[10px]">
                Requests
              </Link>
            </div>
          ) : dinner.guestsCount >= dinner.guestsMax ? (
            <button
              onClick={handleWaitlist}
              disabled={waitlistLoading}
              className={`px-8 py-3 text-xs rounded-full font-bold uppercase tracking-widest transition-all ${
                waitlistJoined ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                waitlistEntry ? 'bg-stone-100 text-stone-500' : 'olive-btn'
              }`}
            >
              {waitlistJoined ? 'On Waitlist!' : waitlistLoading ? '...' : waitlistEntry ? 'Leave Waitlist' : 'Join Waitlist'}
            </button>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="olive-btn px-8 py-3 text-xs"
            >
              Request a seat
            </button>
          )}
      </div>

      {/* Request Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsModalOpen(false)}
               className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="relative bg-white w-full max-w-lg rounded-[40px] p-10 card-shadow border border-brand-light"
             >
                {bookingStep === 'verify' && (
                  <div className="text-center">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-600">
                      <ShieldCheck size={40} />
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-ink mb-4">Verify your email</h2>
                    <p className="text-stone-500 mb-8 font-medium leading-relaxed">
                      To ensure a safe community, we require all guests to verify their email address before requesting a seat.
                    </p>
                    <button 
                      onClick={handleSendVerification}
                      className="w-full olive-btn mb-4"
                    >
                      Send Verification Email
                    </button>
                    <button 
                      onClick={() => window.location.reload()}
                      className="text-xs font-black uppercase tracking-widest text-brand"
                    >
                      I've verified my email
                    </button>
                  </div>
                )}

                {bookingStep === 'intro' && (
                  <div className="space-y-8">
                    <div className="mb-10">
                       <h2 className="text-4xl font-serif font-bold text-ink mb-2">Request your seat</h2>
                       <p className="text-stone-500 font-medium opacity-70 italic font-serif">A shared table awaits. Introduce yourself to {dinner.host?.displayName}.</p>
                    </div>

                    <div>
                       <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-3">Your Introduction</label>
                       <textarea 
                         value={message}
                         onChange={(e) => setMessage(e.target.value)}
                         placeholder="Hi! I'm a traveler visiting from..."
                         className="w-full bg-[#F2F1EA]/50 border border-brand-light rounded-[2rem] p-6 h-40 focus:border-brand/40 focus:outline-none transition-all text-ink leading-relaxed font-serif italic"
                       />
                    </div>

                    <div className="flex items-center justify-between bg-white p-2 rounded-full border border-brand-light">
                       <span className="pl-6 text-[10px] font-black text-brand uppercase tracking-widest">Party Size</span>
                       <div className="flex items-center space-x-6 bg-[#F2F1EA] rounded-full px-6 py-2 border border-brand-light">
                         <button 
                           onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                           className="text-stone-400 hover:text-brand font-bold text-lg"
                         >—</button>
                         <span className="font-bold text-ink min-w-[1rem] text-center">{guestCount}</span>
                         <button 
                           onClick={() => setGuestCount(Math.min(dinner.guestsMax - dinner.guestsCount, guestCount + 1))}
                           className="text-stone-400 hover:text-brand font-bold text-lg"
                         >+</button>
                       </div>
                    </div>

                    <button 
                      disabled={!message.trim()}
                      onClick={() => setBookingStep('confirm')}
                      className="w-full olive-btn !py-5"
                    >
                      Review Booking
                    </button>
                  </div>
                )}

                {bookingStep === 'confirm' && (
                  <div className="space-y-8">
                    <div className="mb-10 text-center">
                       <h2 className="text-4xl font-serif font-bold text-ink mb-2">One final look</h2>
                       <p className="text-stone-500 font-medium opacity-70">Review your request before we send it to {dinner.host?.displayName}.</p>
                    </div>

                    <div className="bg-brand/5 rounded-3xl p-6 border border-brand-light space-y-4">
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-stone-500">Party Size</span>
                          <span className="font-bold text-ink">{guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-stone-500">Price per guest</span>
                          <span className="font-bold text-ink">${dinner.price}</span>
                       </div>
                       <div className="pt-4 border-t border-brand-light flex justify-between items-center">
                          <span className="text-stone-500 font-bold">Total to hold</span>
                          <span className="text-xl font-bold text-brand">${dinner.price * guestCount}</span>
                       </div>
                    </div>

                    <div className="flex items-start space-x-3 opacity-60">
                       <Info size={14} className="text-brand shrink-0 mt-0.5" />
                       <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider leading-relaxed">
                         Funds are held but not captured until the host accepts. You can cancel anytime before confirmation.
                       </p>
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={() => setBookingStep('intro')}
                        className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-brand transition-colors"
                      >
                        Go Back
                      </button>
                      <button 
                        disabled={isSubmitting}
                        onClick={handleRequest}
                        className="flex-[2] olive-btn !py-5"
                      >
                        {isSubmitting ? 'Sending...' : 'Confirm & Send'}
                      </button>
                    </div>
                  </div>
                )}

                {bookingStep === 'success' && (
                  <div className="text-center py-10">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-600"
                    >
                      <Check size={48} strokeWidth={3} />
                    </motion.div>
                    <h2 className="text-4xl font-serif font-bold text-ink mb-4">Request Sent!</h2>
                    <p className="text-stone-500 mb-10 font-medium leading-relaxed">
                      We've sent your introduction to {dinner.host?.displayName}. We'll notify you once they've confirmed your seat at the table.
                    </p>
                    <button 
                      onClick={() => navigate('/bookings')}
                      className="w-full olive-btn"
                    >
                      View My Bookings
                    </button>
                  </div>
                )}
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
