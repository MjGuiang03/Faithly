import { users } from '../config/db.js';
import { sendEmailNotification } from './email.js';
import { sendPushNotification } from './webpush.js';

/**
 * Sends notifications based on user preferences.
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

    // Push Notification
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
  } catch (error) {
    console.error('Error in notifyUser helper:', error);
  }
};
