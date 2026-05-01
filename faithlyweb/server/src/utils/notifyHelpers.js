import { users } from '../config/db.js';
import { sendEmailNotification } from './email.js';
import { sendPushNotification } from './webpush.js';
import { sendExpoPushNotification } from './expoPush.js';

/**
 * Sends notifications based on user preferences.
 * Supports both Web Push (browser) and Expo Push (React Native mobile).
 * @param {string} email - The user's email address
 * @param {string} category - The notification category (loan, savings, donation, payment_pending)
 * @param {string} title - The title of the notification (for Push & Email Subject)
 * @param {string} htmlMessage - The HTML body for the email
 * @param {string} plainMessage - The plain text body for the push notification
 * @param {string} url - Optional URL to open when push is clicked
 */
export const notifyUser = async (email, category, title, htmlMessage, plainMessage, url = '/') => {
  try {
    const user = await users.findOne({ email });
    if (!user) return;

    // Check category preferences
    if (user.notifPrefs && user.notifPrefs[category] === false) {
      return; // User disabled this specific category
    }

    // Email Notification
    if (user.emailNotifications !== false) {
      await sendEmailNotification(email, title, htmlMessage);
    }

    // Web Push Notification (Browser / PWA)
    if (user.pushNotifications === true && user.pushSubscription) {
      const payload = {
        title,
        message: plainMessage,
        url
      };
      const result = await sendPushNotification(user.pushSubscription, payload);
      
      // Clean up expired subscriptions
      if (result && result.expired) {
        await users.updateOne({ email }, { $unset: { pushSubscription: "" }, $set: { pushNotifications: false } });
      }
    }

    // Expo Push Notification (React Native Mobile App)
    if (user.expoPushToken) {
      const payload = {
        title,
        message: plainMessage,
        data: { url, category }
      };
      const result = await sendExpoPushNotification(user.expoPushToken, payload);

      // Clean up expired / invalid tokens
      if (result && result.expired) {
        await users.updateOne({ email }, { $unset: { expoPushToken: "" } });
      }
    }
  } catch (error) {
    console.error('Error in notifyUser helper:', error);
  }
};
