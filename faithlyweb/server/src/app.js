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

const app = express();

// 1. Move CORS to the very top so even error/limited responses get headers
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    // allow all vercel domains
    if (origin.endsWith('.vercel.app')) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      console.warn(`CORS blocked request from origin: ${origin}`);
      return callback(new Error('CORS Policy: Access from this origin is not allowed'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

/* ================== GLOBAL MIDDLEWARE ================== */
app.use(globalLimiter);
app.use(helmet());
app.use(mongoSanitize());
app.use(express.json({ limit: '10mb' }));

/* ================== ROUTES ================== */
app.use('/api',        authRoutes);
app.use('/api',        passwordRoutes);
app.use('/api',        profileRoutes);
app.use('/api',        loanRoutes);
app.use('/api',        donationRoutes);
app.use('/api',        attendanceRoutes);
app.use('/api',        verificationRoutes);
app.use('/api/admin',  adminRoutes);
app.use('/api/admin',  notificationRoutes);

export default app;