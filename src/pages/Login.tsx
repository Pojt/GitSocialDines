import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, LogIn, UtensilsCrossed, Globe, Sparkles, Loader2, Mail, Lock, User, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { signInWithGoogle, signInWithMicrosoft, signUpWithEmail, signInWithEmail, user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMethod, setAuthMethod] = useState<'social' | 'email'>('social');
  const [emailMode, setEmailMode] = useState<'login' | 'signup'>('login');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  // Redirect if already logged in
  React.useEffect(() => {
    if (user && !loading) {
      // If we have a user but no profile yet, we just wait
      if (!profile) return;

      console.log("Login: checking profile completion", profile);

      // Check if profile is incomplete (no interests)
      const isIncomplete = !profile.interests || profile.interests.length === 0;
      
      // If incomplete, go to onboarding (preserving the 'from' location)
      if (isIncomplete) {
        navigate('/onboarding', { 
          replace: true, 
          state: { from: location.state?.from } 
        });
        return;
      }

      // If complete, go to the intended destination or home
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [user, profile, loading, navigate, location]);

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setAuthError("Failed to connect with Google.");
      setIsSubmitting(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setIsSubmitting(true);
    setAuthError(null);
    try {
      await signInWithMicrosoft();
    } catch (error: any) {
      setAuthError("Failed to connect with Microsoft.");
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError(null);
    try {
      if (emailMode === 'signup') {
        if (!name.trim()) throw new Error("Please enter your name.");
        if (password.length < 8) throw new Error("Password must be at least 8 characters long.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error: any) {
      console.error("Email auth failed:", error);
      let msg = "An error occurred. Please try again.";
      if (error.code === 'auth/email-already-in-use') msg = "This email is already registered.";
      if (error.code === 'auth/wrong-password') msg = "Incorrect password.";
      if (error.code === 'auth/user-not-found') msg = "No account found with this email.";
      if (error.message) msg = error.message;
      setAuthError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F8F3] px-4 py-12">
      <div className="max-w-md w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] p-8 sm:p-10 border border-brand-light card-shadow text-center relative overflow-hidden"
        >
          {/* Decorative backgrounds */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-bl-full -z-0" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand/5 rounded-tr-full -z-0" />

          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-brand/10 rounded-2xl text-brand mb-6">
              <UtensilsCrossed size={28} />
            </div>

            <h1 className="serif text-3xl font-bold text-ink mb-2">Join the Table</h1>
            <p className="text-stone-500 font-medium italic font-serif mb-8 opacity-70 text-sm">
              Sharing authentic culinary experiences worldwide.
            </p>

            {/* Auth Method Selector */}
            <div className="flex bg-stone-100 p-1 rounded-2xl mb-8">
              <button 
                onClick={() => setAuthMethod('social')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMethod === 'social' ? 'bg-white text-brand shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
              >
                Social
              </button>
              <button 
                onClick={() => setAuthMethod('email')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMethod === 'email' ? 'bg-white text-brand shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
              >
                Email
              </button>
            </div>

            <AnimatePresence mode="wait">
              {authError && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold mb-6 flex items-start gap-2 text-left"
                >
                  <span className="shrink-0 bg-red-100 rounded-full p-1 leading-none w-4 h-4 flex items-center justify-center">!</span>
                  <span>{authError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {authMethod === 'social' ? (
              <div className="space-y-4 mb-8">
                <button 
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full bg-white border border-stone-200 hover:border-brand/40 px-6 py-4 rounded-2xl flex items-center justify-center space-x-3 transition-all group scale-active"
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-ink">Continue with Google</span>
                </button>

                <button 
                  onClick={handleMicrosoftSignIn}
                  disabled={isSubmitting}
                  className="w-full bg-stone-900 border border-stone-800 hover:bg-black px-6 py-4 rounded-2xl flex items-center justify-center space-x-3 transition-all group scale-active"
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg viewBox="0 0 23 23" width="20" height="20">
                      <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
                      <rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
                      <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/>
                      <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-white">Continue with Microsoft</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="text-left space-y-4 mb-8">
                {emailMode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-4">Full Name</label>
                    <div className="relative">
                      <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300" />
                      <input 
                        required
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-stone-50 border border-stone-100 focus:border-brand/40 focus:ring-0 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none transition-all"
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-4">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300" />
                    <input 
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-stone-50 border border-stone-100 focus:border-brand/40 focus:ring-0 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pb-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-4">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300" />
                    <input 
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-stone-50 border border-stone-100 focus:border-brand/40 focus:ring-0 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                {emailMode === 'signup' && (
                  <div className="space-y-1.5 pb-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-4">Confirm Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300" />
                      <input 
                        required
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-stone-50 border border-stone-100 focus:border-brand/40 focus:ring-0 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                <button 
                  disabled={isSubmitting}
                  className="w-full olive-btn !py-5 flex items-center justify-center space-x-3 shadow-lg shadow-brand/20"
                >
                  {isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <span className="font-bold">{emailMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button 
                    type="button"
                    onClick={() => setEmailMode(emailMode === 'login' ? 'signup' : 'login')}
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-brand hover:underline"
                  >
                    {emailMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-stone-50 border border-brand-light flex items-center justify-center text-brand opacity-60">
                   <ShieldCheck size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Verified Hosts</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-stone-50 border border-brand-light flex items-center justify-center text-brand opacity-60">
                   <Globe size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Global Tables</span>
              </div>
            </div>
          </div>
        </motion.div>

        <p className="text-center mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
          Curated by Social Dine &copy; 2024
        </p>
      </div>
    </div>
  );
};
