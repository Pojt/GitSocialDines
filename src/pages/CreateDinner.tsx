import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { dbService } from '../lib/dbService';
import { CUISINES } from '../constants';
import { motion } from 'motion/react';
import { Calendar, Users, DollarSign, Camera, ChefHat, Sparkles, AlertCircle, ArrowLeft, MapPin } from 'lucide-react';
import { LocationPicker } from '../components/LocationPicker';

export const CreateDinner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cuisine: 'Italian',
    price: 45,
    date: '',
    guestsMax: 6,
    vibe: 'Cozy',
    tags: '',
    dietaryOptions: [] as string[],
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80',
    locationName: '',
    lat: null as number | null,
    lng: null as number | null
  });

  useEffect(() => {
    if (isEditMode) {
      const fetchDinner = async () => {
        setFetching(true);
        const dinner = await dbService.getDinner(id);
        if (dinner) {
          if (user && dinner.hostId !== user.uid) {
            setError("You don't have permission to edit this dinner.");
            setFetching(false);
            return;
          }
          
          const date = new Date(dinner.date);
          // Format for datetime-local: YYYY-MM-DDThh:mm
          const formattedDate = date.toISOString().slice(0, 16);
          
          setFormData({
            title: dinner.title,
            description: dinner.description,
            cuisine: dinner.cuisine,
            price: dinner.price,
            date: formattedDate,
            guestsMax: dinner.guestsMax,
            vibe: dinner.vibe || 'Cozy',
            tags: (dinner.tags || []).join(', '),
            dietaryOptions: dinner.dietaryOptions || [],
            imageUrl: dinner.images[0] || '',
            locationName: dinner.locationName || '',
            lat: dinner.lat || null,
            lng: dinner.lng || null
          });
        }
        setFetching(false);
      };
      fetchDinner();
    }
  }, [id, isEditMode, user]);

  const DIETARY_TAGS = ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal', 'Kosher'];

  const toggleDietary = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryOptions: prev.dietaryOptions.includes(tag)
        ? prev.dietaryOptions.filter(t => t !== tag)
        : [...prev.dietaryOptions, tag]
    }));
  };

  if (!user) {
    return (
      <div className="pt-32 pb-20 max-w-2xl mx-auto px-4 text-center">
        <AlertCircle className="mx-auto text-brand mb-4" size={48} />
        <h1 className="serif text-3xl mb-4">Membership Required</h1>
        <p className="text-stone-500 mb-8">You need to join our community before you can host your own table.</p>
        <button onClick={() => navigate('/login')} className="olive-btn">Join Now</button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);

    const tagsArray = formData.tags.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(Boolean);
    
    const dinnerData = {
      title: formData.title,
      description: formData.description,
      cuisine: formData.cuisine,
      price: formData.price,
      currency: 'USD',
      date: new Date(formData.date).getTime(),
      guestsMax: formData.guestsMax,
      hostId: user.uid,
      images: [formData.imageUrl],
      vibe: formData.vibe,
      soloFriendly: true,
      tags: tagsArray,
      dietaryOptions: formData.dietaryOptions,
      locationName: formData.locationName,
      lat: formData.lat || 51.5074 + (Math.random() - 0.5) * 0.15,
      lng: formData.lng || -0.1278 + (Math.random() - 0.5) * 0.15
    };

    if (isEditMode) {
      const success = await dbService.updateDinner(id!, dinnerData);
      if (success) {
        navigate(`/dinner/${id}`);
      } else {
        setError('Could not update the dinner. Please check your connection.');
        setLoading(false);
      }
    } else {
      const dinnerId = await dbService.createDinner({
        ...dinnerData,
        guestsCount: 0
      });

      if (dinnerId) {
        navigate(`/dinner/${dinnerId}`);
      } else {
        setError('Could not create the dinner. Please check your connection.');
        setLoading(false);
      }
    }
  };

  if (fetching) {
    return <div className="pt-32 text-center font-serif text-2xl">Fetching dinner details...</div>;
  }

  return (
    <div className="pt-24 pb-32 max-w-4xl mx-auto px-4">
      <div className="mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-stone-400 hover:text-brand transition-colors text-xs font-black uppercase tracking-widest"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[40px] p-8 sm:p-16 card-shadow border border-brand-light"
      >
        <div className="mb-12">
          <div className="flex items-center space-x-3 text-brand mb-4">
             <ChefHat size={20} />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isEditMode ? 'Update your masterpiece' : 'Open your kitchen'}</span>
          </div>
          <h1 className="serif text-5xl sm:text-6xl text-ink">{isEditMode ? 'Edit Dinner' : 'Host a Dinner'}</h1>
          <p className="text-stone-500 font-medium italic font-serif mt-4 opacity-70">
            {isEditMode ? 'Refine the story of your table.' : 'Tell the story of your table. What makes this evening special?'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Left Col: Basics */}
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Dinner Title</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Handmade Pasta & Hidden Jazz Records"
                  className="w-full bg-[#F2F1EA]/50 border border-brand-light rounded-[2rem] px-6 py-4 focus:border-brand/40 focus:outline-none transition-all text-ink font-serif italic"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Location</label>
                <LocationPicker 
                  initialLat={formData.lat}
                  initialLng={formData.lng}
                  initialName={formData.locationName}
                  onLocationSelect={(lat, lng, name) => {
                    setFormData(prev => ({
                      ...prev,
                      locationName: name,
                      lat,
                      lng
                    }));
                  }}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Story & Menu</label>
                <textarea 
                  required
                  placeholder="Share a bit about the evening's menu and the vibe..."
                  className="w-full bg-[#F2F1EA]/50 border border-brand-light rounded-[2rem] p-6 h-40 focus:border-brand/40 focus:outline-none transition-all text-ink leading-relaxed font-serif italic"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Cuisine</label>
                  <select 
                    className="w-full bg-white border border-brand-light rounded-full px-6 py-3 text-xs font-bold text-stone-600 focus:outline-none appearance-none cursor-pointer"
                    value={formData.cuisine}
                    onChange={e => setFormData({ ...formData, cuisine: e.target.value })}
                  >
                    {CUISINES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Atmosphere</label>
                  <select 
                    className="w-full bg-white border border-brand-light rounded-full px-6 py-3 text-xs font-bold text-stone-600 focus:outline-none appearance-none cursor-pointer"
                    value={formData.vibe}
                    onChange={e => setFormData({ ...formData, vibe: e.target.value })}
                  >
                    {['Cozy', 'Lively', 'Technical', 'Artistic', 'Elegant', 'Minimal'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Accommodated Diets</label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleDietary(tag)}
                      className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        formData.dietaryOptions.includes(tag)
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-stone-50 text-stone-400 border-stone-100'
                      } border hover:border-brand/40`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Logistics */}
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Date & Time</label>
                <div className="relative">
                  <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-brand opacity-40" size={18} />
                  <input 
                    type="datetime-local"
                    required
                    className="w-full bg-[#F2F1EA]/50 border border-brand-light rounded-full pl-14 pr-6 py-4 focus:border-brand/40 focus:outline-none transition-all text-ink text-sm font-bold"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Price (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-brand opacity-40" size={16} />
                    <input 
                      type="number"
                      required
                      min="1"
                      className="w-full bg-[#F2F1EA]/50 border border-brand-light rounded-full pl-12 pr-6 py-4 focus:border-brand/40 focus:outline-none transition-all text-ink font-bold"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Max Guests</label>
                  <div className="relative">
                    <Users className="absolute left-6 top-1/2 -translate-y-1/2 text-brand opacity-40" size={16} />
                    <input 
                      type="number"
                      required
                      min="1"
                      max="20"
                      className="w-full bg-[#F2F1EA]/50 border border-brand-light rounded-full pl-12 pr-6 py-4 focus:border-brand/40 focus:outline-none transition-all text-ink font-bold"
                      value={formData.guestsMax}
                      onChange={e => setFormData({ ...formData, guestsMax: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Tags (comma separated)</label>
                <div className="relative">
                  <Sparkles className="absolute left-6 top-1/2 -translate-y-1/2 text-brand opacity-40" size={16} />
                  <input 
                    type="text"
                    placeholder="homemade, vinyl, garden, stories"
                    className="w-full bg-[#F2F1EA]/50 border border-brand-light rounded-full pl-12 pr-6 py-4 focus:border-brand/40 focus:outline-none transition-all text-ink text-sm font-bold"
                    value={formData.tags}
                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Cover Image URL</label>
                <div className="relative">
                  <Camera className="absolute left-6 top-1/2 -translate-y-1/2 text-brand opacity-40" size={18} />
                  <input 
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-[#F2F1EA]/50 border border-brand-light rounded-full pl-14 pr-6 py-4 focus:border-brand/40 focus:outline-none transition-all text-ink text-xs font-bold"
                    value={formData.imageUrl}
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-brand-light flex justify-between items-center">
            <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest max-w-[200px]">
              By posting, you agree to our host standards for safety and hospitality.
            </p>
            <button 
              type="submit"
              disabled={loading}
              className="olive-btn !py-5 !px-12 text-sm"
            >
              {loading ? (isEditMode ? 'Saving Changes...' : 'Publishing Table...') : (isEditMode ? 'Save Changes' : 'Publish Table')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
