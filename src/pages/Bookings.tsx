import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { dbService } from '../lib/dbService';
import { app } from '../lib/firebase';
import { Booking } from '../types';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, CheckCircle2, ChevronRight, MessageSquare, Star, CreditCard, BadgeCheck, AlertCircle, MessageCircle, XCircle } from 'lucide-react';

const StatusBadge = ({ status }: { status: Booking['status'] }) => {
  const styles = {
    pending: 'bg-amber-50 text-amber-600 border-amber-100',
    confirmed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rejected: 'bg-rose-50 text-rose-600 border-rose-100',
    cancelled: 'bg-stone-50 text-stone-600 border-stone-100'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status]}`}>
      {status}
    </span>
  );
};

const PaymentBadge = ({ status }: { status: Booking['paymentStatus'] }) => {
  const config = {
    unpaid: { label: 'Payment needed', cls: 'bg-amber-50 text-amber-600 border-amber-100' },
    awaiting_payment: { label: 'Verifying...', cls: 'bg-stone-50 text-stone-500 border-stone-100' },
    paid: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    failed: { label: 'Payment failed', cls: 'bg-rose-50 text-rose-600 border-rose-100' }
  }[status || 'unpaid'];
  
  if (!config) return null;
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1 ${config.cls}`}>
      <CreditCard size={10} />
      {config.label}
    </span>
  );
};

export const Bookings: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  const paymentResult = new URLSearchParams(location.search).get('payment');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const [mainTab, setMainTab] = useState<'Guest' | 'Host'>('Guest');
  const [subTab, setSubTab] = useState<'Upcoming' | 'Pending' | 'Past'>('Upcoming');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [guestData, hostData] = await Promise.all([
        dbService.getBookings(user.uid),
        dbService.getHostBookings(user.uid)
      ]);
      setBookings(guestData);
      setHostBookings(hostData);
    } catch (err) {
      console.error("fetchData error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleUpdateStatus = async (booking: Booking, status: 'confirmed' | 'rejected') => {
    if (status === 'confirmed') {
      const currentCount = booking.dinner?.guestsCount || 0;
      const requestedGuests = booking.guestCount || 1;
      await dbService.updateBookingStatus(booking.id, 'confirmed', booking.dinnerId, currentCount + requestedGuests);
    } else {
      await dbService.updateBookingStatus(booking.id, 'rejected', booking.dinnerId);
    }
    fetchData();
  };

  const handlePay = async (bookingId: string) => {
    setPayingBookingId(bookingId);
    try {
      const fns = getFunctions(app);
      const createSession = httpsCallable<{ bookingId: string }, { url: string }>(fns, 'createCheckoutSession');
      const result = await createSession({ bookingId });
      window.location.href = result.data.url;
    } catch (err) {
      console.error('Payment error:', err);
      setPayingBookingId(null);
    }
  };

  const handleCancel = async (booking: Booking) => {
    if (!window.confirm('Are you sure you want to cancel this booking?' + (booking.paymentStatus === 'paid' ? ' A refund will be initiated.' : ''))) return;
    setCancellingBookingId(booking.id);
    try {
      const fns = getFunctions(app);
      const cancel = httpsCallable<{ bookingId: string }, { success: boolean; refunded: boolean }>(fns, 'cancelBooking');
      await cancel({ bookingId: booking.id });
      await fetchData();
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setCancellingBookingId(null);
    }
  };

  const handleOpenMessage = async (booking: Booking) => {
    if (!user || !booking.dinner) return;
    const conversationId = await dbService.getOrCreateConversation(
      booking.hostId, booking.guestId, booking.dinnerId, booking.dinner.title
    );
    navigate(`/messages/${conversationId}`);
  };

  const filteredBookings = (mainTab === 'Host' ? hostBookings : bookings).filter(b => {
    const isPast = b.dinner ? b.dinner.date < Date.now() : false;
    if (subTab === 'Upcoming') return b.status === 'confirmed' && !isPast;
    if (subTab === 'Pending') return b.status === 'pending';
    if (subTab === 'Past') return isPast || b.status === 'rejected' || b.status === 'cancelled';
    return true;
  });

  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const hostRequestCount = hostBookings.filter(b => b.status === 'pending').length;

  return (
    <div className="pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif font-medium text-ink mb-4">Your dining timeline</h1>
          <p className="text-stone-500 font-medium opacity-70 italic font-serif">Keep track of your seats and shared moments.</p>
        </div>
        
        {/* Main Attending vs Hosting Switcher */}
        <div className="flex bg-stone-100 p-1 rounded-2xl self-start md:self-end">
           <button 
             onClick={() => { setMainTab('Guest'); setSubTab('Upcoming'); }}
             className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mainTab === 'Guest' ? 'bg-white text-brand shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
           >
             Attending
             {pendingCount > 0 && <span className="w-2 h-2 bg-brand rounded-full" />}
           </button>
           <button 
             onClick={() => { setMainTab('Host'); setSubTab('Pending'); }}
             className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mainTab === 'Host' ? 'bg-white text-brand shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
           >
             Hosting
             {hostRequestCount > 0 && <span className="w-2 h-2 bg-brand rounded-full" />}
           </button>
        </div>
      </div>

      {/* Payment result banner */}
      <AnimatePresence>
        {paymentResult && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`mb-8 flex items-center gap-3 px-6 py-4 rounded-2xl border text-sm font-medium ${
              paymentResult === 'success'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-amber-50 border-amber-100 text-amber-700'
            }`}
          >
            {paymentResult === 'success' ? <BadgeCheck size={18} /> : <AlertCircle size={18} />}
            {paymentResult === 'success'
              ? 'Payment successful — see you at the table!'
              : 'Payment was cancelled. You can try again from your upcoming bookings.'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub Tabs */}
      <div className="flex border-b border-brand-light mb-10 overflow-x-auto no-scrollbar">
        {[
          { id: 'Pending', label: mainTab === 'Host' ? 'New Requests' : 'Pending Approval', count: mainTab === 'Host' ? hostRequestCount : pendingCount },
          { id: 'Upcoming', label: 'Confirmed Tables' },
          { id: 'Past', label: 'Past Moments' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id as any)}
            className={`relative px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-colors flex items-center space-x-2 ${
              subTab === tab.id ? 'text-brand' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="bg-brand text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{tab.count}</span>
            )}
            {subTab === tab.id && (
              <motion.div 
                layoutId="activeSubTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
             Array.from({ length: 3 }).map((_, i) => (
               <div key={i} className="h-32 bg-white card-shadow rounded-[32px] animate-pulse border border-brand-light" />
             ))
          ) : filteredBookings.length > 0 ? (
            filteredBookings.map(booking => (
              <motion.div
                key={booking.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white border border-brand-light rounded-[32px] p-6 sm:p-8 card-shadow group"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-start sm:items-center space-x-6">
                    <img 
                      src={booking.dinner?.images[0] || 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80'} 
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-[24px] object-cover" 
                      alt={booking.dinner?.title} 
                    />
                    <div>
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <StatusBadge status={booking.status} />
                        <PaymentBadge status={booking.paymentStatus} />
                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                          {new Date(booking.dinner?.date || 0).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="serif text-xl font-bold text-ink group-hover:text-brand transition-colors">
                        {booking.dinner?.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 font-semibold text-stone-400 uppercase tracking-wider text-xs">
                        {mainTab === 'Host' && booking.guest && (
                          <img 
                            src={booking.guest.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.guestId}`} 
                            className="w-5 h-5 rounded-full object-cover border border-brand-light" 
                            alt={booking.guest.displayName || 'Guest'} 
                          />
                        )}
                        <span>
                          {mainTab === 'Host' ? `Requested by ${booking.guest?.displayName || 'Guest'}` : `with ${booking.dinner?.host?.displayName}`}
                        </span>
                      </div>
                    </div>
                    </div>

                  <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                    {mainTab === 'Host' && (
                      <div className="flex flex-col gap-2 items-end">
                        <div className="flex gap-2">
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              const conversationId = await dbService.getOrCreateConversation(
                                user!.uid, booking.guestId, booking.dinnerId, booking.dinner?.title || 'Dinner'
                              );
                              navigate(`/messages/${conversationId}`);
                            }}
                            className="bg-stone-100 text-stone-600 hover:text-brand px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors"
                          >
                            <MessageSquare size={12} />
                            Chat
                          </button>
                          {booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(booking, 'confirmed')}
                                className="bg-brand text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md"
                              >Accept</button>
                              <button
                                onClick={() => handleUpdateStatus(booking, 'rejected')}
                                className="bg-stone-100 text-stone-500 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-stone-200"
                              >Decline</button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {mainTab === 'Guest' && (subTab === 'Pending' || subTab === 'Past') && (
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          const conversationId = await dbService.getOrCreateConversation(
                            booking.hostId, user!.uid, booking.dinnerId, booking.dinner?.title || 'Dinner'
                          );
                          navigate(`/messages/${conversationId}`);
                        }}
                        className="bg-stone-50 text-stone-500 hover:text-brand px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare size={12} />
                        Message Host
                      </button>
                    )}

                    {mainTab === 'Guest' && subTab === 'Upcoming' && (
                      <div className="flex flex-col gap-2 items-end">
                        {(!booking.paymentStatus || booking.paymentStatus === 'unpaid' || booking.paymentStatus === 'failed') && (
                          <button
                            onClick={() => handlePay(booking.id)}
                            disabled={payingBookingId === booking.id}
                            className="flex items-center gap-2 olive-btn !py-2 !px-5 !text-[10px] w-full"
                          >
                            <CreditCard size={12} />
                            {payingBookingId === booking.id ? 'Redirecting...' : 'Complete Payment'}
                          </button>
                        )}
                        {booking.paymentStatus === 'paid' && (
                          <button
                            onClick={() => setSelectedBooking(booking)}
                            className="olive-btn !py-2 !px-5 !text-[10px] w-full"
                          >
                            Next Steps
                          </button>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenMessage(booking)}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-brand transition-colors"
                          >
                            <MessageCircle size={13} />
                            Chat
                          </button>
                          <button
                            onClick={() => handleCancel(booking)}
                            disabled={cancellingBookingId === booking.id}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600 transition-colors disabled:opacity-50"
                          >
                            <XCircle size={13} />
                            {cancellingBookingId === booking.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    )}

                    {subTab === 'Past' && booking.status === 'confirmed' && (
                      <Link 
                        to={`/review/${booking.dinnerId}`}
                        className="flex items-center space-x-2 bg-brand/5 text-brand px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-brand/10 transition-colors"
                      >
                        <Star size={12} />
                        <span>Leave a review</span>
                      </Link>
                    )}
                    
                    <Link 
                      to={`/dinner/${booking.dinnerId}`}
                      className="flex items-center space-x-2 text-stone-400 hover:text-brand transition-colors text-[10px] font-black uppercase tracking-widest"
                    >
                      <span>Details</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>

                {(mainTab === 'Host' || subTab === 'Pending') && (
                  <div className="mt-6 pt-6 border-t border-brand-light flex items-start space-x-3">
                    <MessageSquare size={16} className="text-brand opacity-40 mt-1" />
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand mb-1">Message</p>
                      <p className="text-sm text-stone-600 italic">"{booking.message}"</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="text-center py-24">
               <p className="serif text-2xl font-bold text-stone-300">No {subTab.toLowerCase()} moments found</p>
               <Link to="/" className="mt-4 inline-block olive-btn text-[10px]">
                 Explore dinners
               </Link>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Detail Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-[40px] p-10 card-shadow overflow-hidden"
            >
                <div className="absolute top-0 right-0 h-24 w-24 bg-brand/5 rounded-bl-full -z-10 -translate-x-8 -translate-y-8" />
                <div className="flex items-center space-x-4 mb-8">
                   <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={24} />
                   </div>
                   <h2 className="text-3xl font-serif font-black text-ink">You're going!</h2>
                </div>

                <div className="space-y-6">
                   <p className="text-stone-600 font-medium leading-relaxed">
                      Your seat for <span className="font-bold text-brand">{selectedBooking.dinner?.title}</span> is officially confirmed. 
                      {selectedBooking.dinner?.host?.displayName} is looking forward to seeing you at the table.
                   </p>

                   <div className="bg-[#F2F1EA] rounded-3xl p-6 border border-brand-light">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-brand mb-4">Next Steps & Payment</h4>
                      <ul className="space-y-3">
                           <li className="flex items-start space-x-3 text-xs text-stone-600 font-medium">
                              <span className="w-4 h-4 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[8px] mt-0.5">1</span>
                              <span>The exact address and host contact details will be revealed once payment is complete.</span>
                           </li>
                           <li className="flex items-start space-x-3 text-xs text-stone-600 font-medium">
                              <span className="w-4 h-4 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[8px] mt-0.5">2</span>
                              <span>Review the host's narrative and get ready for the spirit of the table!</span>
                           </li>
                      </ul>
                   </div>

                   <button 
                     onClick={() => setSelectedBooking(null)}
                     className="w-full olive-btn !py-4"
                   >
                     Got it
                   </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
