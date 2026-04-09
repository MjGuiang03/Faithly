import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';

import { globalLimiter } from './middleware/rateLimiter.js';

import authRoutes         from './routes/auth.js';
import passwordRoutes     from './routes/passwordReset.js';
import profileRoutes      from './routes/profile.js';
import loanRoutes         from './routes/loans.js';
import donationRoutes     from './routes/donations.js';
import attendanceRoutes   from './routes/attendance.js';
import verificationRoutes from './routes/verification.js';
import adminRoutes        from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import announcementRoutes from './routes/announcements.js';
import savingsRoutes      from './routes/savings.js';


const app = express();

// 0. Trust proxy (Required for express-rate-limit on Render)
app.set('trust proxy', 1);

// 1. ABSOLUTE TOP MANIFOLD: Guarantees CORS headers before anything else
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://puacfaithly.com',
    'https://www.puacfaithly.com',
    'http://localhost:3000'
  ];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

  // Handle preflight immediately and stop chain
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

/* ================== GLOBAL MIDDLEWARE ================== */
// app.use(globalLimiter); 
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  crossOriginEmbedderPolicy: false
}));
app.use(mongoSanitize());
app.use(express.json({ limit: '10mb' }));

/* ================== ROUTES ================== */
app.use('/api', authRoutes);
app.use('/api', passwordRoutes);
app.use('/api', profileRoutes);
app.use('/api', loanRoutes);
app.use('/api', donationRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', verificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', notificationRoutes);
app.use('/api', announcementRoutes);
app.use('/api', savingsRoutes);

/* ================== GLOBAL ERROR HANDLER ================== */
// This ensures even 500 errors carry CORS headers so the browser doesn't hide the real error
app.use((err, req, res, next) => {
  console.error('[Global Error]:', err.stack);
  
  // Re-apply CORS headers to the error response
  const origin = req.headers.origin;
  const allowed = ['https://puacfaithly.com', 'https://www.puacfaithly.com', 'http://localhost:3000'];
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});


export default app;