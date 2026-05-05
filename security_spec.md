# Security Specification - Social Dine

## Data Invariants
1. A booking cannot exist without a valid `dinnerId`, `guestId`, and `hostId`.
2. A user can only create a dinner if they are verified (`isVerified == true`).
3. A user can only modify their own profile.
4. A user can only modify a booking if they are the host (to confirm/reject) or the guest (to cancel).
5. A user cannot book their own dinner.
6. A review can only be created by a guest who had a 'confirmed' booking for that dinner.
7. Ratings must be between 1 and 5.
8. Prices and guest limits must be positive numbers.

## The "Dirty Dozen" Payloads (Deny Cases)
1. **Identity Spoofing**: Attempt to create a dinner with `hostId` set to another user's UID.
2. **Unverified Host**: Attempt to create a dinner when the user's profile `isVerified` is false.
3. **Ghost Update**: Attempt to update a dinner's `guestsCount` manually as a guest.
4. **Illegal Accept**: Attempt to confirm a booking as the guest (only host should confirm).
5. **Shadow Profile**: Attempt to update another user's display name or photo.
6. **Price Poisoning**: Attempt to create a dinner with a price of -100 or a 1MB string as a tag.
7. **Self-Booking**: Attempt to create a booking where `guestId == hostId`.
8. **Rating Inflation**: Attempt to create a review with rating 10.
9. **Relational Orphan**: Create a booking for a `dinnerId` that does not exist.
10. **State Shortcut**: Update a booking status directly from 'pending' to 'confirmed' without being the host.
11. **Negative Seats**: Set `guestsMax` to 0 or -5.
12. **PII Leak**: Attempt to read the entire `users` collection without a specific filter for own identity.
