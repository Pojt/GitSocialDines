import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { ArrowLeft, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { dbService } from '../lib/dbService';
import { useAuth } from '../AuthContext';
import { Message, Conversation, UserProfile } from '../types';

export const Messages: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherParty, setOtherParty] = useState<UserProfile | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // Load conversation metadata and other party's profile
  useEffect(() => {
    if (!conversationId || !user) return;
    getDoc(doc(db, 'conversations', conversationId)).then(async snap => {
      if (!snap.exists()) { navigate('/bookings'); return; }
      const conv = { id: snap.id, ...snap.data() } as Conversation;
      if (!conv.participants.includes(user.uid)) { navigate('/bookings'); return; }
      setConversation(conv);
      const otherId = user.uid === conv.hostId ? conv.guestId : conv.hostId;
      const profile = await dbService.getUserProfile(otherId);
      setOtherParty(profile);
      setLoading(false);
    });
  }, [conversationId, user, navigate]);

  // Real-time message listener
  useEffect(() => {
    if (!conversationId) return;
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Message));
    }, () => {});
  }, [conversationId]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId || !user || sending) return;
    setSending(true);
    setText('');
    await dbService.sendMessage(conversationId, user.uid, trimmed);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  function formatTime(ts: number) {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg-warm">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-brand-light px-4 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-brand/5 flex items-center justify-center text-brand hover:bg-brand/10 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={18} />
        </button>

        {otherParty && (
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={otherParty.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParty.id}`}
              className="w-10 h-10 rounded-full object-cover border-2 border-brand-light flex-shrink-0"
              alt={otherParty.displayName}
            />
            <div className="min-w-0">
              <p className="font-bold text-ink text-sm truncate">{otherParty.displayName}</p>
              {conversation && (
                <Link
                  to={`/dinner/${conversation.dinnerId}`}
                  className="text-[10px] font-black uppercase tracking-widest text-brand/60 hover:text-brand transition-colors truncate block"
                >
                  {conversation.dinnerTitle}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-24 pb-28 px-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-stone-400 font-medium italic font-serif text-center">
              No messages yet. Say hello!
            </p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.senderId === user?.uid;
          const showTime = i === 0 || msg.createdAt - messages[i - 1].createdAt > 300_000;
          return (
            <div key={msg.id}>
              {showTime && (
                <p className="text-center text-[10px] text-stone-400 font-medium my-3">
                  {formatTime(msg.createdAt)}
                </p>
              )}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-5 py-3 rounded-[20px] text-sm leading-relaxed ${
                    isMine
                      ? 'bg-brand text-white rounded-br-md'
                      : 'bg-white border border-brand-light text-ink rounded-bl-md'
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-light px-4 py-4 flex items-end gap-3">
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message…"
          rows={1}
          className="flex-1 bg-[#F2F1EA] border border-brand-light rounded-[20px] px-5 py-3 text-sm text-ink resize-none focus:outline-none focus:border-brand/40 max-h-32 overflow-y-auto leading-relaxed"
          style={{ minHeight: '48px' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
