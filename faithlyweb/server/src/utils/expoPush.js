import { Expo } from 'expo-server-sdk';

const expo = new Expo();

/**
 * Send an Expo Push Notification to a single token.
 * @param {string} expoPushToken - The Expo push token (e.g. "ExponentPushToken[...]")
 * @param {Object} payload - { title, message, data, url }
 * @returns {Object} { success: boolean, expired?: boolean, error?: any }
 */
export const sendExpoPushNotification = async (expoPushToken, payload) => {
  if (!expoPushToken || !Expo.isExpoPushToken(expoPushToken)) {
    console.warn(`⚠️ Invalid Expo push token: ${expoPushToken}`);
    return { success: false, error: 'Invalid Expo push token' };
  }

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: payload.title || 'FaithLy',
    body: payload.message || '',
    data: payload.data || { url: payload.url || '/' },
    priority: 'high',
    channelId: 'default',
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of ticketChunk) {
        if (ticket.status === 'error') {
          console.error('❌ Expo Push Error:', ticket.message);
          if (ticket.details?.error === 'DeviceNotRegistered') {
            return { success: false, expired: true };
          }
          return { success: false, error: ticket.message };
        }
      }
    }
    return { success: true };
  } catch (error) {
    console.error('❌ Expo Push Send Error:', error);
    return { success: false, error };
  }
};

/**
 * Send Expo Push Notifications to multiple tokens.
 * @param {string[]} tokens - Array of Expo push tokens
 * @param {Object} payload - { title, message, data }
 */
export const sendExpoPushNotifications = async (tokens, payload) => {
  const validTokens = tokens.filter(t => Expo.isExpoPushToken(t));
  if (validTokens.length === 0) return;

  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title: payload.title || 'FaithLy',
    body: payload.message || '',
    data: payload.data || {},
    priority: 'high',
    channelId: 'default',
  }));

  try {
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (error) {
    console.error('❌ Expo Bulk Push Error:', error);
  }
};
