import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const ThemeContext = createContext();

/**
 * Determine the localStorage key for the current role based on pathname.
 * Each role stores its theme preference independently.
 */
function getStorageKey(pathname) {
  if (pathname.startsWith('/admin')) return 'faithly-theme-admin';
  if (pathname.startsWith('/loan-admin')) return 'faithly-theme-loanAdmin';
  if (pathname.startsWith('/secretary-admin')) return 'faithly-theme-secretaryAdmin';
  // User pages (/home, /loans, /donation, etc.)
  if (['/home', '/loans', '/donation', '/attendance', '/branches',
       '/notifications', '/settings', '/savings', '/profile'].some(p => pathname.startsWith(p))) {
    return 'faithly-theme-user';
  }
  // Public pages (/, /reset-password, /verify-email, etc.) — always light, no storage key
  return null;
}

export function ThemeProvider({ children }) {
  const location = useLocation();

  const [theme, setTheme] = useState(() => {
    const key = getStorageKey(window.location.pathname);
    if (!key) return 'light'; // Public pages are always light
    return localStorage.getItem(key) || 'light';
  });

  /**
   * When the route changes (React Router navigation), load the saved
   * theme preference for that role. This ensures:
   * - Admin dark ≠ User dark ≠ Loan Admin dark ≠ Secretary dark
   * - Navigating between portals auto-switches to each role's saved pref
   */
  useEffect(() => {
    const key = getStorageKey(location.pathname);
    if (!key) {
      // Public page — force light
      setTheme('light');
      return;
    }
    const savedTheme = localStorage.getItem(key) || 'light';
    setTheme(savedTheme);
  }, [location.pathname]);

  /**
   * Apply/remove the .dark class on <html> and persist to localStorage
   */
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save to the current role's storage key
    const key = getStorageKey(location.pathname);
    if (key) {
      localStorage.setItem(key, theme);
    }
  }, [theme, location.pathname]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
