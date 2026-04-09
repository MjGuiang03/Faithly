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

// 1. Robust CORS configuration
app.use(cors({
  origin: [
    'https://puacfaithly.com',
    'https://www.puacfaithly.com',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200 // Mandatory for some older browsers/proxies to not drop CORS headers
}));

/* ================== GLOBAL MIDDLEWARE ================== */
// app.use(globalLimiter); 
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  crossOriginEmbedderPolicy: false // Often causes issues with fonts/images and preflights
}));
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
app.use('/api',        announcementRoutes);
app.use('/api',        savingsRoutes);


export default app;