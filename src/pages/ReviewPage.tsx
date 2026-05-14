import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../lib/dbService';
import { useAuth } from '../AuthContext';
import { Dinner } from '../types';
import { motion } from 'motion/react';
import { Star, MessageSquare, ShieldCheck, ArrowLeft } from 'lucide-react';

export const ReviewPage: React.FC = () => {
  const { dinnerId } = useParams<{ dinnerId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [dinner, setDinner] = useState<Dinner | null>(null);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAttendance = async () => {
      if (!user || !dinnerId) return;
      try {
        const canReview = await dbService.checkAttendance(user.uid, dinnerId);
        if (!canReview) {
          setError("You can only review dinners you have attended.");
          setLoading(false);
          return;
        }

        const din = await dbService.getDinner(dinnerId);
        setDinner(din);
      } catch (err) {
        console.error(err);
        setError("Something went wrong verifying your attendance.");
      } finally {
        setLoading(false);
      }
    };
    checkAttendance();
  }, [user, dinnerId]);

  const handleSubmit = async () => {
    if (!user || !dinnerId || rating === 0) return;
    setSubmitting(true);
    try {
      await dbService.createReview({
        dinnerId,
        authorId: user.uid,
        targetId: dinner?.hostId || '',
        rating,
        content,
        mood: 'Classic' // Default mood
      });
      navigate(`/dinner/${dinnerId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="pt-20 text-center text-2xl font-black text-brand animate-pulse">Verifying attendance...</div>;

  if (error) {
    return (
      <div className="pt-20 px-6 max-w-md mx-auto text-center">
        <div className="bg-rose-50 p-8 rounded-[32px] border border-rose-100 mb-8">
           <ShieldCheck className="mx-auto text-rose-500 mb-4" size={48} />
           <h2 className="text-2xl font-black text-rose-900 mb-2">Review Not Allowed</h2>
           <p className="text-rose-700/80 font-medium">{error}</p>
        </div>
        <button onClick={() => navigate(-1)} className="olive-btn flex items-center gap-2 mx-auto">
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pt-20 pb-40">
      <div className="max-w-2xl mx-auto px-6">
        <div className="mb-12 text-center">
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand mb-4">The Final Course</p>
           <h1 className="text-4xl sm:text-5xl font-black text-ink mb-6">How was your stay at {dinner?.title}?</h1>
           <div className="flex items-center justify-center gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-100 inline-flex">
              <img src={dinner?.host?.photoURL} className="w-8 h-8 rounded-full border border-white" />
              <span className="text-xs font-black uppercase tracking-wider text-stone-500">Host: {dinner?.host?.displayName}</span>
           </div>
        </div>

        <div className="space-y-12">
           <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-6">Rate your experience</p>
              <div className="flex justify-center gap-3">
                 {[1, 2, 3, 4, 5].map(star => (
                    <motion.button
                      key={star}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-1 transition-colors"
                    >
                      <Star 
                        size={40} 
                        className={`${(hoveredRating || rating) >= star ? 'text-brand fill-brand' : 'text-stone-200'} transition-colors`}
                      />
                    </motion.button>
                 ))}
              </div>
           </div>

           <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-6 flex items-center gap-2">
                <MessageSquare size={14} />
                Tell the host about your evening (Optional)
              </p>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="The food was divine, and the conversation even better..."
                className="w-full bg-[#F2F1EA] border border-brand-light rounded-[32px] p-8 h-48 focus:outline-none focus:border-brand/40 font-serif italic text-lg leading-relaxed resize-none"
              />
           </div>

           <button
             onClick={handleSubmit}
             disabled={rating === 0 || submitting}
             className={`w-full py-5 rounded-full text-sm font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
               rating > 0 && !submitting 
               ? 'bg-ink text-white shadow-xl hover:scale-[1.02] active:scale-95' 
               : 'bg-stone-100 text-stone-400 cursor-not-allowed'
             }`}
           >
             {submitting ? 'Sharing your story...' : 'Publish Review'}
           </button>
        </div>
      </div>
    </div>
  );
};
