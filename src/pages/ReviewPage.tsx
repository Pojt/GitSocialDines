import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../lib/dbService';
import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';
import { Star, MessageSquare, ArrowLeft, Heart, Sparkles, Smile } from 'lucide-react';

const MOODS = [
  { label: 'Warm', icon: <Heart size={16} /> },
  { label: 'Lively', icon: <Sparkles size={16} /> },
  { label: 'Inspiring', icon: <Smile size={16} /> },
  { label: 'Profound', icon: <MessageSquare size={16} /> }
];

export const ReviewPage: React.FC = () => {
  const { dinnerId } = useParams<{ dinnerId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('Warm');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !dinnerId) return;
    setIsSubmitting(true);
    try {
      const dinner = await dbService.getDinner(dinnerId);
      if (dinner) {
        await dbService.createReview({
          rating,
          content,
          mood,
          authorId: user.uid,
          targetId: dinner.hostId,
          dinnerId
        });
      }
      navigate('/bookings');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-24 pb-20 max-w-2xl mx-auto px-4 sm:px-6">
      <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-stone-400 hover:text-brand transition-colors mb-8 text-xs font-bold uppercase tracking-widest">
         <ArrowLeft size={16} />
         <span>Go back</span>
      </button>

      <div className="bg-white rounded-[3rem] p-8 sm:p-12 border border-stone-100 shadow-2xl shadow-stone-200/50">
        <h1 className="text-4xl font-serif font-black text-stone-900 mb-2">How was the table?</h1>
        <p className="text-stone-500 font-medium mb-12">Reviews focus on the social experience and connection.</p>

        <div className="space-y-10">
          {/* Stars */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-6">Social Rating</label>
            <div className="flex space-x-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <button 
                  key={s} 
                  onClick={() => setRating(s)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    rating >= s ? 'bg-amber-100 text-amber-500 scale-110 shadow-lg shadow-amber-100' : 'bg-stone-50 text-stone-300'
                  }`}
                >
                  <Star size={24} fill={rating >= s ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          {/* Mood Labels */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-6">Describe the vibe</label>
            <div className="flex flex-wrap gap-3">
               {MOODS.map(m => (
                 <button
                   key={m.label}
                   onClick={() => setMood(m.label)}
                   className={`flex items-center space-x-2 px-6 py-3 rounded-full text-sm font-bold border transition-all ${
                     mood === m.label ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20' : 'bg-white border-stone-200 text-stone-500 hover:border-brand/30'
                   }`}
                 >
                   {m.icon}
                   <span>{m.label}</span>
                 </button>
               ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-6">Share your story</label>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What did you talk about? What was the host like?"
              className="w-full bg-stone-50 border-2 border-stone-100 rounded-3xl p-6 h-40 focus:border-brand/30 focus:outline-none transition-colors text-stone-700 leading-relaxed font-medium"
            />
          </div>

          <button 
            disabled={isSubmitting || !content.trim()}
            onClick={handleSubmit}
            className="w-full bg-brand text-white py-5 rounded-full font-serif font-black text-xl hover:bg-brand/90 transition-all active:scale-[0.98] shadow-xl shadow-brand/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Posting...' : 'Share Review'}
          </button>
        </div>
      </div>
    </div>
  );
};
