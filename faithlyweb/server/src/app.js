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

// 0. Trust proxy (Required for express-rate-limit on Render)
app.set('trust proxy', 1);

// 1. Move CORS to the very top so even error/limited responses get headers
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: true, // Allow all origins during high-priority debugging
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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