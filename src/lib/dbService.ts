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
import { Dinner, UserProfile, Booking, Review, AppNotification, WaitlistEntry } from '../types';

export const dbService = {
  async getDinners(filters?: { cuisine?: string; soloFriendly?: boolean }) {
    const dinnersRef = collection(db, 'dinners');
    let q = query(dinnersRef, orderBy('date', 'asc'));

    if (filters?.cuisine) {
      q = query(q, where('cuisine', '==', filters.cuisine));
    }
    if (filters?.soloFriendly) {
      q = query(q, where('soloFriendly', '==', true));
    }

    try {
      const querySnapshot = await getDocs(q);
      const dinners: Dinner[] = [];
      
      for (const d of querySnapshot.docs) {
        const dinnerData = d.data() as Omit<Dinner, 'id'>;
        const hostDoc = await getDoc(doc(db, 'users', dinnerData.hostId));
        dinners.push({
          id: d.id,
          ...dinnerData,
          host: hostDoc.exists() ? { id: hostDoc.id, ...hostDoc.data() } as UserProfile : undefined
        });
      }
      return dinners;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'dinners');
      return [];
    }
  },

  async getDinner(id: string): Promise<Dinner | null> {
    try {
      const dinnerDoc = await getDoc(doc(db, 'dinners', id));
      if (!dinnerDoc.exists()) return null;
      
      const dinnerData = dinnerDoc.data() as Omit<Dinner, 'id'>;
      const hostDoc = await getDoc(doc(db, 'users', dinnerData.hostId));
      
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
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return null;
      return { id: userDoc.id, ...userDoc.data() } as UserProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      return null;
    }
  },

  async getBookings(userId: string) {
    const q = query(collection(db, 'bookings'), where('guestId', '==', userId), orderBy('createdAt', 'desc'));
    try {
      const snapshot = await getDocs(q);
      const bookings: Booking[] = [];
      for (const d of snapshot.docs) {
        const bookingData = d.data() as Omit<Booking, 'id'>;
        const dinner = await this.getDinner(bookingData.dinnerId);
        bookings.push({ id: d.id, ...bookingData, dinner: dinner || undefined });
      }
      return bookings;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
      return [];
    }
  },

  async getHostBookings(userId: string) {
    const q = query(collection(db, 'bookings'), where('hostId', '==', userId), orderBy('createdAt', 'desc'));
    try {
      const snapshot = await getDocs(q);
      const bookings: Booking[] = [];
      for (const d of snapshot.docs) {
        const bookingData = d.data() as Omit<Booking, 'id'>;
        const dinner = await this.getDinner(bookingData.dinnerId);
        // We'll also need the guest info
        const guestDoc = await getDoc(doc(db, 'users', bookingData.guestId));
        bookings.push({ 
          id: d.id, 
          ...bookingData, 
          dinner: dinner || undefined,
          guest: guestDoc.exists() ? { id: guestDoc.id, ...guestDoc.data() } as UserProfile : undefined
        });
      }
      return bookings;
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
      const reviews: Review[] = [];
      for (const d of snapshot.docs) {
        const reviewData = d.data() as Omit<Review, 'id'>;
        const authorDoc = await getDoc(doc(db, 'users', reviewData.authorId));
        reviews.push({ 
          id: d.id, 
          ...reviewData, 
          author: authorDoc.exists() ? { id: authorDoc.id, ...authorDoc.data() } as UserProfile : undefined 
        });
      }
      return reviews;
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
      await updateDoc(doc(db, 'users', userId), data);
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
      const q = query(dinnersRef, where('__name__', 'in', dinnerIds.slice(0, 10))); // Limitation of 10 for 'in'
      const snap = await getDocs(q);
      const dinners = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dinner));
      
      return await Promise.all(dinners.map(async d => ({
        ...d,
        host: await this.getUserProfile(d.hostId)
      })));
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

  async updateBookingStatus(bookingId: string, status: Booking['status'], dinnerId: string, newGuestCount?: number) {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const existingBookingSnap = await getDoc(bookingRef);
      if (!existingBookingSnap.exists()) return false;
      const existingBooking = existingBookingSnap.data() as Booking;

      const batch = writeBatch(db);
      batch.update(bookingRef, { status });

      if (status === 'confirmed' && newGuestCount !== undefined) {
        const dinnerRef = doc(db, 'dinners', dinnerId);
        batch.update(dinnerRef, { guestsCount: newGuestCount });
        // Write confirmedAttendance so the guest can leave a review
        const attendanceRef = doc(db, 'confirmedAttendances', `${existingBooking.guestId}_${dinnerId}`);
        batch.set(attendanceRef, { guestId: existingBooking.guestId, dinnerId, confirmedAt: Date.now() });
      }

      if (status === 'cancelled' && existingBooking.status === 'confirmed') {
        const dinnerSnap = await getDoc(doc(db, 'dinners', dinnerId));
        if (dinnerSnap.exists()) {
          const currentCount = (dinnerSnap.data().guestsCount as number) || 0;
          const decrement = existingBooking.guestCount || 1;
          batch.update(doc(db, 'dinners', dinnerId), {
            guestsCount: Math.max(0, currentCount - decrement)
          });
        }
      }

      await batch.commit();

      // After a confirmed booking is cancelled, notify the first person on the waitlist
      if (status === 'cancelled' && existingBooking.status === 'confirmed') {
        const waitlistQ = query(
          collection(db, 'waitlist'),
          where('dinnerId', '==', dinnerId),
          orderBy('joinedAt', 'asc'),
          limit(1)
        );
        const waitlistSnap = await getDocs(waitlistQ);
        if (!waitlistSnap.empty) {
          const first = waitlistSnap.docs[0];
          const entry = first.data() as WaitlistEntry;
          const dinner = await this.getDinner(dinnerId);
          if (dinner) {
            await Promise.all([
              this.createNotification(entry.userId, {
                type: 'booking_confirmed',
                message: `A seat just opened at "${dinner.title}" — you're first on the waitlist!`,
                link: `/dinner/${dinnerId}`
              }),
              deleteDoc(first.ref)
            ]);
          }
        }
      }

      if (status === 'confirmed' || status === 'rejected') {
        const [guest, dinner] = await Promise.all([
          this.getUserProfile(existingBooking.guestId),
          this.getDinner(dinnerId)
        ]);

        if (guest && dinner) {
          if (status === 'confirmed' && guest.email) {
            await this.queueEmail(
              [guest.email],
              `Booking Confirmed! ${dinner.title}`,
              `Great news! Your booking for ${dinner.title} has been confirmed.`,
              `<div style="font-family: sans-serif; color: #1c1917;">
                <h2 style="color: #61694b;">You're in!</h2>
                <p>Hi ${guest.displayName},</p>
                <p>Your booking for <strong>${dinner.title}</strong> has been <strong>Confirmed</strong>.</p>
                <div style="background: #61694b; color: white; padding: 30px; border-radius: 20px; text-align: center;">
                  <h3 style="margin: 0; font-size: 24px;">See you at the table!</h3>
                </div>
              </div>`
            );
          }

          await this.createNotification(existingBooking.guestId, {
            type: status === 'confirmed' ? 'booking_confirmed' : 'booking_rejected',
            message: status === 'confirmed'
              ? `Your booking for "${dinner.title}" has been confirmed!`
              : `Your booking request for "${dinner.title}" was not accepted.`,
            link: '/bookings'
          });
        }
      }

      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
      return false;
    }
  }
};
