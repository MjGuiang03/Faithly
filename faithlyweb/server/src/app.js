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

/* ================== GLOBAL MIDDLEWARE ================== */
app.use(globalLimiter);
app.use(helmet());
app.use(mongoSanitize());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

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