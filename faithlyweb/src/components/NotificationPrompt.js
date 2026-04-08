import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import {
  shouldShowPromptBanner,
  requestNotificationPermission,
  dismissPromptForever,
} from '../utils/desktopNotify';
import './NotificationPrompt.css';

/**
 * In-app banner that asks the user to enable desktop notifications.
 * Shows only if browser permission is 'default' and user hasn't clicked "Don't show again".
 */
export default function NotificationPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay so it appears after the page loads, not instantly
    const timer = setTimeout(() => {
      if (shouldShowPromptBanner()) {
        setVisible(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const handleAllow = async () => {
    await requestNotificationPermission();
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  const handleDontShowAgain = () => {
    dismissPromptForever();
    setVisible(false);
  };

  return (
    <div className="notif-prompt-banner">
      <div className="notif-prompt-top">
        <div className="notif-prompt-icon-wrap">
          <Bell size={18} color="#155DFC" />
        </div>
        <div className="notif-prompt-text">
          <p className="notif-prompt-title">Enable Desktop Notifications</p>
          <p className="notif-prompt-desc">
            Get real-time alerts for new activities, even when this tab is in the background.
          </p>
        </div>
      </div>
      <div className="notif-prompt-actions">
        <button className="notif-prompt-btn notif-prompt-btn-allow" onClick={handleAllow}>
          Allow Notifications
        </button>
        <button className="notif-prompt-btn notif-prompt-btn-later" onClick={handleDismiss}>
          Later
        </button>
        <button className="notif-prompt-btn notif-prompt-btn-never" onClick={handleDontShowAgain}>
          Don't show again
        </button>
      </div>
      <button className="notif-prompt-close" onClick={handleDismiss} aria-label="Close">
        <X size={16} />
      </button>
    </div>
  );
}
