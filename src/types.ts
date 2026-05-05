export interface WaitlistEntry {
  id: string; // userId_dinnerId
  userId: string;
  dinnerId: string;
  hostId: string;
  guestCount: number;
  joinedAt: number;
}

export interface AppNotification {
  id: string;
  type: 'booking_request' | 'booking_confirmed' | 'booking_rejected' | 'booking_cancelled';
  message: string;
  link: string;
  isRead: boolean;
  createdAt: number;
}


  id: string;
  displayName: string;
  photoURL: string;
  email?: string;
  bio?: string;
  city?: string;
  interests?: string[];
  isVerified?: boolean;
  dietaryPreferences?: string[];
  favorites?: string[]; // IDs of favorite dinners
}

export interface Dinner {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  price: number;
  currency: string;
  date: number; // timestamp
  guestsMax: number;
  guestsCount: number;
  hostId: string;
  vibe: string;
  soloFriendly: boolean;
  tags: string[];
  dietaryOptions: string[]; // ['Vegan', 'Gluten-Free', etc]
  images: string[];
  host?: UserProfile;
  lat?: number;
  lng?: number;
  locationName?: string;
}

export interface Booking {
  id: string;
  dinnerId: string;
  guestId: string;
  hostId: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  message: string;
  guestCount: number;
  createdAt: number;
  dinner?: Dinner;
  guest?: UserProfile;
}

export interface HostAnalytics {
  totalEarnings: number;
  totalGuests: number;
  completedDinners: number;
  averageRating: number;
}

export interface Review {
  id: string;
  rating: number;
  content: string;
  mood: string;
  authorId: string;
  targetId: string;
  dinnerId: string;
  createdAt: number;
  author?: UserProfile;
}
