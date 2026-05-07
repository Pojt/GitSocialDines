import * as fftest from 'firebase-functions-test';
import * as admin from 'firebase-admin';

// Initialize the test SDK
const test = fftest({
  projectId: 'test-project',
}, '/path/to/key.json'); // In real setup, you'd pass a service account key or use emulators

describe('Booking Functions', () => {
  let myFunctions: any;

  beforeAll(() => {
    myFunctions = require('../index');
  });

  afterAll(() => {
    test.cleanup();
  });

  describe('createCheckoutSession validation', () => {
    it('should throw unauthenticated if user is not signed in', async () => {
      const wrapped = test.wrap(myFunctions.createCheckoutSession);
      const data = { bookingId: 'test-id' };
      
      await expect(wrapped({ data })).rejects.toThrow('The function must be called while authenticated.');
    });

    it('should throw invalid-argument if bookingId is missing', async () => {
      const wrapped = test.wrap(myFunctions.createCheckoutSession);
      const auth = { uid: 'user1' };
      const data = {};
      
      await expect(wrapped({ data, auth })).rejects.toThrow('Valid Booking ID is required.');
    });
  });

  describe('cancelBooking validation', () => {
    it('should throw if bookingId is invalid', async () => {
      const wrapped = test.wrap(myFunctions.cancelBooking);
      const auth = { uid: 'user1' };
      const data = { bookingId: 123 }; // Invalid type
      
      await expect(wrapped({ data, auth })).rejects.toThrow('Valid Booking ID is required.');
    });
  });
});
