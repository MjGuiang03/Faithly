import webpush from 'web-push';
import dotenv from 'dotenv';
dotenv.config();

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

// Ensure we have a valid contact email for VAPID setup
const emailContact = process.env.EMAIL_USER ? `mailto:${process.env.EMAIL_USER}` : 'mailto:test@example.com';

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(emailContact, publicVapidKey, privateVapidKey);
} else {
  console.warn('⚠️ VAPID keys are not set. Web Push notifications will not work.');
}

/**
 * Send a web push notification
 * @param {Object} subscription - The user's push subscription object
 * @param {Object} payload - Data to send to the Service Worker
 */
export const sendPushNotification = async (subscription, payload) => {
  if (!publicVapidKey || !privateVapidKey) {
    console.warn('⚠️ Skipping push notification because VAPID keys are missing.');
    return { success: false, error: 'VAPID keys not configured' };
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending web push notification:', error);
    // If status is 410 (Gone), the subscription is no longer valid
    if (error.statusCode === 410) {
      return { success: false, expired: true };
    }
    return { success: false, error };
  }
};
