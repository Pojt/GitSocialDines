import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  setDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Dinner, UserProfile, Booking, Review, AppNotification, WaitlistEntry, Conversation, HostAnalytics } from '../types';

export const dbService = {
  async getDinners(filters?: { cuisine?: string; soloFriendly?: boolean; limit?: number; startAfter?: any }) {
    const { startAfter: firestoreStartAfter } = await import('firebase/firestore');
    const dinnersRef = collection(db, 'dinners');
    let q = query(dinnersRef, orderBy('date', 'asc'));

    if (filters?.cuisine && filters.cuisine !== 'All') {
      q = query(q, where('cuisine', '==', filters.cuisine));
    }
    if (filters?.soloFriendly) {
      q = query(q, where('soloFriendly', '==', true));
    }
    if (filters?.startAfter) {
      q = query(q, firestoreStartAfter(filters.startAfter));
    }
    if (filters?.limit) {
      q = query(q, limit(filters.limit));
    }

    try {
      const querySnapshot = await getDocs(q);
      const dinnersData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Dinner));
      
      // Batch fetch hosts
      const hostIds = Array.from(new Set(dinnersData.map(d => d.hostId)));
      const hosts = await this.getBatchUsers(hostIds);
      
      return dinnersData.map(d => ({
        ...d,
        host: hosts[d.hostId]
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'dinners');
      return [];
    }
  },

  async getUpcomingDinners() {
    const dinnersRef = collection(db, 'dinners');
    const q = query(dinnersRef, where('date', '>', Date.now() - 3600000), orderBy('date', 'asc'), limit(6));

    try {
      const querySnapshot = await getDocs(q);
      const dinnersData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Dinner));
      
      // Batch fetch hosts
      const hostIds = Array.from(new Set(dinnersData.map(d => d.hostId)));
      const hosts = await this.getBatchUsers(hostIds);
      
      return dinnersData.map(d => ({
        ...d,
        host: hosts[d.hostId]
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'dinners');
      return [];
    }
  },

  async getBatchUsers(userIds: string[]): Promise<Record<string, UserProfile>> {
    if (!userIds || userIds.length === 0) return {};
    
    const validUserIds = userIds.filter(id => id && id.length > 0);
    if (validUserIds.length === 0) return {};

    const chunks: string[][] = [];
    for (let i = 0; i < validUserIds.length; i += 10) {
      chunks.push(validUserIds.slice(i, i + 10));
    }

    const results: Record<string, UserProfile> = {};
    try {
      await Promise.all(chunks.map(async chunk => {
        const q = query(collection(db, 'profiles'), where('__name__', 'in', chunk));
        const snap = await getDocs(q);
        snap.forEach(d => {
          results[d.id] = { id: d.id, ...d.data() } as UserProfile;
        });
      }));
      return results;
    } catch (error) {
      console.error('Batch user fetch failed:', error);
      return {};
    }
  },

  async getDinner(id: string): Promise<Dinner | null> {
    try {
      const dinnerDoc = await getDoc(doc(db, 'dinners', id));
      if (!dinnerDoc.exists()) return null;
      
      const dinnerData = dinnerDoc.data() as Omit<Dinner, 'id'>;
      const hostDoc = await getDoc(doc(db, 'profiles', dinnerData.hostId));
      
      return {
        id: dinnerDoc.id,
        ...dinnerData,
        host: hostDoc.exists() ? { id: hostDoc.id, ...hostDoc.data() } as UserProfile : undefined
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `dinners/${id}`);
      return null;
    }
  },

  async getHostDinners(hostId: string) {
    const q = query(collection(db, 'dinners'), where('hostId', '==', hostId));
    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Dinner));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'dinners');
      return [];
    }
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // First try users collection (private, only works if owner)
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as UserProfile;
      }

      // Fallback to public profile
      const profileDoc = await getDoc(doc(db, 'profiles', userId));
      if (!profileDoc.exists()) return null;
      return { id: profileDoc.id, ...profileDoc.data() } as UserProfile;
    } catch (error) {
      // If users/userId fails due to permissions, try profiles
      try {
        const profileDoc = await getDoc(doc(db, 'profiles', userId));
        if (!profileDoc.exists()) return null;
        return { id: profileDoc.id, ...profileDoc.data() } as UserProfile;
      } catch (innerError) {
        handleFirestoreError(innerError, OperationType.GET, `profiles/${userId}`);
        return null;
      }
    }
  },

  async getBookings(userId: string) {
    const q = query(collection(db, 'bookings'), where('guestId', '==', userId), orderBy('createdAt', 'desc'));
    try {
      const snapshot = await getDocs(q);
      const bookingDataList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
      
      const dinnerIds = Array.from(new Set(bookingDataList.map(b => b.dinnerId)));
      const dinnersMap: Record<string, Dinner> = {};
      
      if (dinnerIds.length > 0) {
        for (let i = 0; i < dinnerIds.length; i += 10) {
          const chunk = dinnerIds.slice(i, i + 10);
          const dq = query(collection(db, 'dinners'), where('__name__', 'in', chunk));
          const dSnap = await getDocs(dq);
          dSnap.forEach(doc => {
            dinnersMap[doc.id] = { id: doc.id, ...doc.data() } as Dinner;
          });
        }

        const hostIds = Array.from(new Set(Object.values(dinnersMap).map(d => d.hostId)));
        const hostsMap = await this.getBatchUsers(hostIds);
        
        Object.keys(dinnersMap).forEach(id => {
          dinnersMap[id].host = hostsMap[dinnersMap[id].hostId];
        });
      }

      return bookingDataList.map(b => ({
        ...b,
        dinner: dinnersMap[b.dinnerId]
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
      return [];
    }
  },

  async getHostBookings(userId: string) {
    const q = query(collection(db, 'bookings'), where('hostId', '==', userId), orderBy('createdAt', 'desc'));
    try {
      const snapshot = await getDocs(q);
      const bookingDataList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
      
      const dinnerIds = Array.from(new Set(bookingDataList.map(b => b.dinnerId)));
      const dinnersMap: Record<string, Dinner> = {};
      if (dinnerIds.length > 0) {
        for (let i = 0; i < dinnerIds.length; i += 10) {
          const chunk = dinnerIds.slice(i, i + 10);
          const dq = query(collection(db, 'dinners'), where('__name__', 'in', chunk));
          const dSnap = await getDocs(dq);
          dSnap.forEach(doc => {
            dinnersMap[doc.id] = { id: doc.id, ...doc.data() } as Dinner;
          });
        }
      }

      const guestIds = Array.from(new Set(bookingDataList.map(b => b.guestId)));
      const guestsMap = await this.getBatchUsers(guestIds);

      return bookingDataList.map(b => ({
        ...b,
        dinner: dinnersMap[b.dinnerId],
        guest: guestsMap[b.guestId]
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
      return [];
    }
  },

  async createDinner(dinner: Omit<Dinner, 'id' | 'host'>) {
    try {
      const docRef = await addDoc(collection(db, 'dinners'), {
        ...dinner,
        guestsCount: 0,
        createdAt: Date.now()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'dinners');
      return null;
    }
  },

  async updateDinner(id: string, dinner: Partial<Omit<Dinner, 'id' | 'host'>>) {
    try {
      await updateDoc(doc(db, 'dinners', id), {
        ...dinner,
        updatedAt: Date.now()
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `dinners/${id}`);
      return false;
    }
  },

  async createBooking(booking: Omit<Booking, 'id' | 'createdAt'>) {
    try {
      const docRef = await addDoc(collection(db, 'bookings'), {
        ...booking,
        paymentStatus: 'unpaid',
        createdAt: serverTimestamp()
      });

      // Get context for emails
      const [guest, host, dinner] = await Promise.all([
        this.getUserProfile(booking.guestId),
        this.getUserProfile(booking.hostId),
        this.getDinner(booking.dinnerId)
      ]);

      if (guest && host && dinner) {
        if (guest.email) {
          await this.queueEmail(
            [guest.email],
            `Booking Request Sent: ${dinner.title}`,
            `Hi ${guest.displayName}, your request to join ${dinner.title} for ${booking.guestCount} guests has been sent.`,
            `<div style="font-family: sans-serif; color: #1c1917;">
              <h2 style="color: #61694b;">Booking Request Sent!</h2>
              <p>Hi ${guest.displayName},</p>
              <p>Your request to join <strong>${dinner.title}</strong> has been sent to the host.</p>
              <div style="background: #fdfcf6; padding: 20px; border-radius: 12px; border: 1px solid #e7e5e4;">
                <p><strong>Table:</strong> ${dinner.title}</p>
                <p><strong>Guests:</strong> ${booking.guestCount}</p>
                <p><strong>Status:</strong> Pending Host Approval</p>
              </div>
            </div>`
          );
        }

        if (host.email) {
          await this.queueEmail(
            [host.email],
            `New Booking Request: ${dinner.title}`,
            `Hi ${host.displayName}, ${guest.displayName} wants to join your table ${dinner.title}.`,
            `<div style="font-family: sans-serif; color: #1c1917;">
              <h2 style="color: #61694b;">New Seat Request!</h2>
              <p>Hi ${host.displayName},</p>
              <p><strong>${guest.displayName}</strong> would like to join your table <strong>${dinner.title}</strong>.</p>
              <div style="background: #fdfcf6; padding: 20px; border-radius: 12px; border: 1px solid #e7e5e4;">
                <p><strong>Message:</strong> "${booking.message}"</p>
                <p><strong>Guests:</strong> ${booking.guestCount}</p>
              </div>
            </div>`
          );
        }

        await Promise.all([
          this.createNotification(booking.guestId, {
            type: 'booking_request',
            message: `Your request to join "${dinner.title}" is pending host approval.`,
            link: '/bookings'
          }),
          this.createNotification(booking.hostId, {
            type: 'booking_request',
            message: `${guest.displayName} wants to join your table "${dinner.title}".`,
            link: '/bookings'
          })
        ]);
      }

      return docRef;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
    }
  },

  async getReviews(targetId: string) {
    const q = query(collection(db, 'reviews'), where('targetId', '==', targetId), orderBy('createdAt', 'desc'));
    try {
      const snapshot = await getDocs(q);
      const reviewsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review));
      
      // Batch fetch authors
      const authorIds = Array.from(new Set(reviewsData.map(r => r.authorId)));
      const authors = await this.getBatchUsers(authorIds);
      
      return reviewsData.map(r => ({
        ...r,
        author: authors[r.authorId]
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
      return [];
    }
  },

  async createReview(review: Omit<Review, 'id' | 'createdAt'>) {
    try {
      return await addDoc(collection(db, 'reviews'), {
        ...review,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
    }
  },

  async updateUserProfile(userId: string, data: Partial<UserProfile>) {
    try {
      const { displayName, photoURL, bio, city, interests, isVerified, ...privateData } = data;
      
      const publicData = {
        ...(displayName !== undefined && { displayName }),
        ...(photoURL !== undefined && { photoURL }),
        ...(bio !== undefined && { bio }),
        ...(city !== undefined && { city }),
        ...(interests !== undefined && { interests }),
        ...(isVerified !== undefined && { isVerified }),
      };

      const batch = writeBatch(db);
      
      // Update private user record
      if (Object.keys(data).length > 0) {
        batch.set(doc(db, 'users', userId), data, { merge: true });
      }

      // Update public profile record
      if (Object.keys(publicData).length > 0) {
        batch.set(doc(db, 'profiles', userId), publicData, { merge: true });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  },

  async queueEmail(to: string[], subject: string, text: string, html: string) {
    try {
      await addDoc(collection(db, 'mail'), {
        to,
        message: {
          subject,
          text,
          html
        },
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to queue email:', error);
    }
  },

  async createNotification(userId: string, notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) {
    try {
      await addDoc(collection(db, 'notifications', userId, 'items'), {
        ...notif,
        isRead: false,
        createdAt: Date.now()
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  },

  async markNotificationRead(userId: string, notifId: string) {
    try {
      await updateDoc(doc(db, 'notifications', userId, 'items', notifId), { isRead: true });
    } catch (error) {
      console.error('Failed to mark notification read:', error);
    }
  },

  async markAllNotificationsRead(userId: string) {
    try {
      const q = query(
        collection(db, 'notifications', userId, 'items'),
        where('isRead', '==', false)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
      await batch.commit();
    } catch (error) {
      console.error('Failed to mark all notifications read:', error);
    }
  },

  async getOrCreateConversation(hostId: string, guestId: string, dinnerId: string, dinnerTitle: string): Promise<string> {
    const conversationId = `${hostId}_${guestId}_${dinnerId}`;
    const ref = doc(db, 'conversations', conversationId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        hostId, guestId, dinnerId, dinnerTitle,
        participants: [hostId, guestId],
        lastMessage: '',
        lastMessageAt: Date.now(),
        createdAt: Date.now()
      } as Omit<Conversation, 'id'>);
    }
    return conversationId;
  },

  async sendMessage(conversationId: string, senderId: string, text: string) {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await Promise.all([
        addDoc(collection(db, 'conversations', conversationId, 'messages'), {
          senderId,
          text,
          createdAt: Date.now()
        }),
        updateDoc(conversationRef, { lastMessage: text, lastMessageAt: Date.now() })
      ]);

      // Notify the other participant
      const convSnap = await getDoc(conversationRef);
      if (convSnap.exists()) {
        const conv = convSnap.data() as Conversation;
        const recipientId = senderId === conv.hostId ? conv.guestId : conv.hostId;
        await this.createNotification(recipientId, {
          type: 'new_message',
          message: `New message about "${conv.dinnerTitle}"`,
          link: `/messages/${conversationId}`
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `conversations/${conversationId}/messages`);
    }
  },

  async addToWaitlist(userId: string, dinnerId: string, hostId: string, guestCount: number) {
    try {
      await setDoc(doc(db, 'waitlist', `${userId}_${dinnerId}`), {
        userId, dinnerId, hostId, guestCount, joinedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'waitlist');
    }
  },

  async removeFromWaitlist(userId: string, dinnerId: string) {
    try {
      await deleteDoc(doc(db, 'waitlist', `${userId}_${dinnerId}`));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'waitlist');
    }
  },

  async getWaitlistEntry(userId: string, dinnerId: string): Promise<WaitlistEntry | null> {
    try {
      const snap = await getDoc(doc(db, 'waitlist', `${userId}_${dinnerId}`));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as WaitlistEntry;
    } catch (error) {
      return null;
    }
  },

  async checkAttendance(userId: string, dinnerId: string): Promise<boolean> {
    try {
      const snap = await getDoc(doc(db, 'confirmedAttendances', `${userId}_${dinnerId}`));
      return snap.exists();
    } catch (error) {
      return false;
    }
  },

  async getUserWaitlist(userId: string): Promise<WaitlistEntry[]> {
    try {
      const q = query(collection(db, 'waitlist'), where('userId', '==', userId), orderBy('joinedAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as WaitlistEntry);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'waitlist');
      return [];
    }
  },

  async getFavorites(dinnerIds: string[]) {
    try {
      if (!dinnerIds || dinnerIds.length === 0) return [];
      const dinnersRef = collection(db, 'dinners');
      
      const dinners: Dinner[] = [];
      for (let i = 0; i < dinnerIds.length; i += 10) {
        const chunk = dinnerIds.slice(i, i + 10);
        const q = query(dinnersRef, where('__name__', 'in', chunk));
        const snap = await getDocs(q);
        snap.forEach(doc => {
          dinners.push({ id: doc.id, ...doc.data() } as Dinner);
        });
      }
      
      const hostIds = Array.from(new Set(dinners.map(d => d.hostId)));
      const hosts = await this.getBatchUsers(hostIds);
      
      return dinners.map(d => ({
        ...d,
        host: hosts[d.hostId]
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'dinners');
      return [];
    }
  },

  async toggleFavorite(userId: string, dinnerId: string) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        const favorites = data.favorites || [];
        const index = favorites.indexOf(dinnerId);
        
        let newFavorites;
        if (index > -1) {
          newFavorites = favorites.filter(id => id !== dinnerId);
        } else {
          newFavorites = [...favorites, dinnerId];
        }
        
        await updateDoc(userRef, { favorites: newFavorites });
        return { isFavorite: index === -1 };
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  },

  async getHostAnalytics(hostId: string): Promise<HostAnalytics> {
    try {
      const dinnersSnap = await getDocs(
        query(collection(db, 'dinners'), where('hostId', '==', hostId))
      );
      const priceMap: Record<string, number> = {};
      let completedDinners = 0;
      const now = Date.now();
      dinnersSnap.docs.forEach(d => {
        const data = d.data();
        priceMap[d.id] = data.price as number;
        if ((data.date as number) < now) completedDinners++;
      });

      const bookingsSnap = await getDocs(
        query(collection(db, 'bookings'), where('hostId', '==', hostId), where('status', '==', 'confirmed'))
      );
      let totalGuests = 0;
      let totalEarnings = 0;
      bookingsSnap.docs.forEach(d => {
        const data = d.data();
        const count = (data.guestCount as number) || 1;
        totalGuests += count;
        totalEarnings += count * (priceMap[data.dinnerId] || 0);
      });

      const reviewsSnap = await getDocs(
        query(collection(db, 'reviews'), where('targetId', '==', hostId))
      );
      let averageRating = 0;
      if (reviewsSnap.size > 0) {
        const sum = reviewsSnap.docs.reduce((acc, d) => acc + ((d.data().rating as number) || 0), 0);
        averageRating = Math.round((sum / reviewsSnap.size) * 100) / 100;
      }

      return { totalEarnings, totalGuests, completedDinners, averageRating };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'analytics');
      return { totalEarnings: 0, totalGuests: 0, completedDinners: 0, averageRating: 0 };
    }
  },

  async updateBookingStatus(bookingId: string, status: Booking['status'], dinnerId: string) {
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const { app } = await import('./firebase');
      const fns = getFunctions(app);
      const callStatusUpdate = httpsCallable<{ bookingId: string, status: string, dinnerId: string }, { success: boolean }>(fns, 'updateBookingStatus');
      await callStatusUpdate({ bookingId, status, dinnerId });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
      return false;
    }
  }
};
