// utils/sanitize.js
export const sanitizeText = (value = '') =>
  value
    .replace(/[<>]/g, '')
    .replace(/["'`;]/g, '')
    .trim();

export const sanitizeEmail = (email = '') =>
  email.trim().toLowerCase();

export const sanitizePhone = (phone = '') =>
  phone.replace(/[^0-9+]/g, '');
