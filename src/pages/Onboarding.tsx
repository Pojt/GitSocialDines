import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { dbService } from '../lib/dbService';
import { motion, AnimatePresence } from 'motion/react';
import { ImageUpload } from '../components/ImageUpload';
import { Sparkles, ArrowRight, Music, Utensils, Camera, Palmtree, Book, Coffee, Palette, Code, Heart, X, Check } from 'lucide-react';

const INTERESTS = [
  { id: 'cooking', label: 'Cooking', icon: Utensils },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'photography', label: 'Photography', icon: Camera },
  { id: 'travel', label: 'Travel', icon: Palmtree },
  { id: 'reading', label: 'Reading', icon: Book },
  { id: 'coffee', label: 'Coffee', icon: Coffee },
  { id: 'art', label: 'Art', icon: Palette },
  { id: 'tech', label: 'Tech', icon: Code },
  { id: 'sustainability', label: 'Sustainability', icon: Sparkles },
  { id: 'wine', label: 'Wine', icon: Heart },
  { id: 'adventure', label: 'Adventure', icon: Palmtree },
  { id: 'yoga', label: 'Yoga', icon: Sparkles }
];

export const Onboarding: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [photoURL, setPhotoURL] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');

  // Sync with profile once it loads
  React.useEffect(() => {
    if (profile) {
      if (!photoURL) setPhotoURL(profile.photoURL || '');
      if (selectedInterests.length === 0) setSelectedInterests(profile.interests || []);
      if (!bio) setBio(profile.bio || '');
      if (!city) setCity(profile.city || '');
    }
  }, [profile]);

  if (authLoading) return <div className="pt-40 text-center font-serif text-2xl animate-pulse text-stone-300">Setting the table...</div>;

  const toggleInterest = (label: string) => {
    setSelectedInterests(prev => 
      prev.includes(label) 
        ? prev.filter(i => i !== label) 
        : [...prev, label]
    );
  };

  const handleComplete = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await dbService.updateUserProfile(user.uid, {
        photoURL,
        interests: selectedInterests,
        bio,
        city,
        onboardingComplete: true
      });
      
      // Redirect to the original destination if available
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F9F8F3] pt-32 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-12 text-center">
           <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand/10 text-brand rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
              <Sparkles size={14} />
              Step {step} of 3
           </div>
           <h1 className="serif text-5xl font-black text-ink mb-4">
             {step === 1 && "Start with a smile."}
             {step === 2 && "The spirit of the table."}
             {step === 3 && "The final touches."}
           </h1>
           <p className="text-stone-500 font-serif italic text-lg opacity-70">
             {step === 1 && "A photo helps guests and hosts connect more personally."}
             {step === 2 && "Choose common grounds that describe your passions and table vibe."}
             {step === 3 && "Tell us where you're based and a little about yourself."}
           </p>
        </div>

        <motion.div 
          key={step}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[48px] p-10 border border-brand-light shadow-2xl shadow-brand/5"
        >
           <AnimatePresence mode="wait">
             {step === 1 && (
               <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 exit={{ opacity: 0 }}
                 className="flex flex-col items-center"
               >
                  <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-8">Profile Portrait</label>
                  <ImageUpload 
                    value={photoURL} 
                    onChange={setPhotoURL} 
                    storagePath={`users/${user.uid}/avatar`}
                    previewClassName="w-48 h-48 rounded-[48px]"
                  />
                  <div className="mt-12 w-full">
                    <button 
                      onClick={() => setStep(2)}
                      className="w-full olive-btn py-5 flex items-center justify-center gap-2"
                    >
                      Next Step <ArrowRight size={20} />
                    </button>
                  </div>
               </motion.div>
             )}

             {step === 2 && (
               <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 exit={{ opacity: 0 }}
               >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
                    {INTERESTS.map(item => {
                      const isSelected = selectedInterests.includes(item.label);
                       return (
                         <button 
                           key={item.id}
                           onClick={() => toggleInterest(item.label)}
                           className={`p-6 rounded-[32px] border flex flex-col items-center gap-3 transition-all ${
                             isSelected 
                             ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20 scale-105' 
                             : 'bg-white border-brand-light text-stone-400 hover:border-brand/40'
                           }`}
                         >
                            <item.icon size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                         </button>
                       )
                    })}
                  </div>
                  <div className="flex gap-4">
                     <button onClick={() => setStep(1)} className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-ink transition-colors">Go Back</button>
                     <button 
                       onClick={() => setStep(3)}
                       disabled={selectedInterests.length === 0}
                       className="flex-[2] olive-btn py-5 flex items-center justify-center gap-2 disabled:opacity-50"
                     >
                       Next Step <ArrowRight size={20} />
                     </button>
                  </div>
               </motion.div>
             )}

             {step === 3 && (
               <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 exit={{ opacity: 0 }}
                 className="space-y-8"
               >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-4">Current City</label>
                    <input 
                      type="text" 
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="e.g. Amsterdam, NL"
                      className="w-full bg-[#f2f1ea] border border-brand-light rounded-3xl px-8 py-5 focus:outline-none focus:border-brand/40 font-serif italic text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-4">Short Bio</label>
                    <textarea 
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Share a bit about yourself..."
                      className="w-full bg-[#f2f1ea] border border-brand-light rounded-3xl px-8 py-5 h-40 focus:outline-none focus:border-brand/40 font-serif italic text-lg resize-none"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                     <button onClick={() => setStep(2)} className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-ink transition-colors">Go Back</button>
                     <button 
                       onClick={handleComplete}
                       disabled={isSubmitting || !city || !bio}
                       className="flex-[2] olive-btn py-5 flex items-center justify-center gap-2"
                     >
                       {isSubmitting ? "Finalizing..." : "Complete Profile"}
                       <Check size={20} />
                     </button>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
