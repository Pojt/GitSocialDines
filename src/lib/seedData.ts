import { collection, getDocs, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

const SAMPLE_USERS = [
  {
    uid: 'host1',
    displayName: 'Marco Rossi',
    photoURL: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&q=80',
    bio: 'Pasta is my love language. I grew up in Tuscany and want to share my grandmothers secrets.',
    city: 'Florence (Guest in London)',
    isVerified: true,
    interests: ['Cooking', 'Art', 'Opera']
  },
  {
    uid: 'host2',
    displayName: 'Yumi Tanaka',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80',
    bio: 'Exploring Zen through Washoku. Join me for an evening of mindful eating and conversation.',
    city: 'Tokyo (Guest in NYC)',
    isVerified: true,
    interests: ['Zen', 'Tea Ceremony', 'Jazz']
  },
  {
    uid: 'host3',
    displayName: 'Elena Duarte',
    photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80',
    bio: 'Bringing the vibrant flavors of Mexico City to your plate. Its more than tacos—its heritage.',
    city: 'Mexico City',
    isVerified: true,
    interests: ['Mezcal', 'History', 'Street Photography']
  }
];

const SAMPLE_DINNERS = [
  {
    title: 'Handmade Tagliatelle & Truffles',
    description: 'We will spend the evening making pasta from scratch. We will then enjoy it with fresh black truffles and a selection of Italian wines. The goal is to feel like you are in a rustic kitchen in the heart of Italy.',
    cuisine: 'Italian',
    price: 85,
    currency: 'USD',
    date: Date.now() + 86400000 * 3, // 3 days from now
    guestsMax: 6,
    guestsCount: 0,
    hostId: 'host1',
    vibe: 'Lively',
    soloFriendly: true,
    tags: ['Pasta', 'Wine', 'Cozy'],
    images: [
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546548970-7178404675e2?auto=format&fit=crop&q=80'
    ]
  },
  {
    title: 'Secret Ramen Night',
    description: 'A deep dive into the bowl. I spend 72 hours preparing my tonkotsu broth. We will discuss the history of ramen while enjoying different types of sake.',
    cuisine: 'Japanese',
    price: 120,
    currency: 'USD',
    date: Date.now() + 86400000 * 5,
    guestsMax: 4,
    guestsCount: 0,
    hostId: 'host2',
    vibe: 'Deep Conversation',
    soloFriendly: true,
    tags: ['Ramen', 'Sake', 'History'],
    images: [
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1591814447470-71d34c118671?auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&q=80'
    ]
  },
  {
    title: 'Oaxacan Mole & Mezcal',
    description: 'Experience the complexity of authentic Mole. My family has been passing down this recipe for generations. We will sample 3 different Mezcals and enjoy a 5-course dinner.',
    cuisine: 'Mexican',
    price: 95,
    currency: 'USD',
    date: Date.now() + 86400000 * 2,
    guestsMax: 8,
    guestsCount: 8, // Sold out
    hostId: 'host3',
    vibe: 'Festive',
    soloFriendly: false,
    tags: ['Mole', 'Mezcal', 'Traditional'],
    images: [
      'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1582234372722-50d7ccc30ebd?auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&q=80'
    ]
  }
];

export async function seedDB() {
  const dinnersRef = collection(db, 'dinners');
  const snapshot = await getDocs(dinnersRef);
  if (snapshot.size > 0) return;

  console.log('Seeding database...');
  
  for (const user of SAMPLE_USERS) {
    const { uid, ...data } = user;
    try {
      await setDoc(doc(db, 'users', uid), data);
    } catch (e) {
      console.warn(`Could not seed user ${uid}:`, e);
    }
  }

  for (const dinner of SAMPLE_DINNERS) {
    try {
      await addDoc(dinnersRef, dinner);
    } catch (e) {
      console.warn(`Could not seed dinner:`, e);
    }
  }

  // Add a sample review
  try {
    await addDoc(collection(db, 'reviews'), {
      rating: 5,
      content: 'Marco is the host you always dream of. The pasta was incredible but the conversation was even better. We ended up singing Italian songs together until midnight!',
      mood: 'Lively',
      authorId: 'guest-sample',
      targetId: 'host1',
      dinnerId: 'dinner-sample',
      createdAt: Date.now()
    });
  } catch (e) {
    console.warn(`Could not seed review:`, e);
  }

  console.log('Seeding complete.');
}
