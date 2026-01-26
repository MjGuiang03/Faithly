# FaithLy - Church Loan Management Platform

A comprehensive church management platform built with React and Supabase, featuring loan management, donations, attendance tracking, and member management with bank-level security.

## 🚀 Features

### Authentication & Security
- ✅ **Email/Password Authentication** with email verification
- ✅ **OTP Login** via email (one-time password)
- ✅ **Password Reset** functionality
- ✅ **Secure Sessions** with auto-refreshing JWT tokens
- ✅ **Row Level Security (RLS)** at database level
- ✅ **Input Sanitization** (XSS protection)
- ✅ **CSRF Protection** via PKCE flow
- ✅ **Rate Limiting** against brute force attacks

### Core Features
- 📊 **Dashboard** with user stats and quick actions
- 💰 **Loan Management** (Coming soon)
- ❤️ **Donations** (Coming soon)
- 📅 **Attendance Tracking** with QR/RFID (Coming soon)
- 🏢 **Branch Management** with multiple locations
- 👥 **Member Profiles** with comprehensive information
- 🤖 **AI Chatbot** (Coming soon)

### User Experience
- 🎨 **Modern Dark Blue Gradient Theme**
- 📱 **Fully Responsive** across all devices
- ✨ **Smooth Animations** and transitions
- 🔔 **Toast Notifications** for user feedback
- 📝 **Form Validation** with error handling
- 🔒 **Terms & Privacy Modals** before registration

## 🛠️ Tech Stack

- **Frontend**: React 18 + React Router v6
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS v4 + Custom CSS
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Security**: Built-in XSS, CSRF, SQL Injection protection

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd faithly
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a Supabase project at https://supabase.com
   - Copy your project URL and anon key
   - Follow instructions in `SUPABASE_SETUP.md` to create tables

4. **Configure environment variables**
   Create a `.env` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
faithly/
├── components/
│   ├── Dashboard.jsx          # Main dashboard
│   ├── Login.tsx              # Login page
│   ├── Signup.tsx             # Registration page
│   ├── OTPLogin.jsx           # OTP authentication
│   ├── ResetPassword.jsx      # Password reset
│   ├── UpdatePassword.jsx     # New password form
│   ├── VerifyEmail.jsx        # Email verification
│   ├── ProtectedRoute.jsx     # Route guard
│   └── Welcome.tsx            # Landing page
├── context/
│   └── AuthContext.jsx        # Authentication state
├── lib/
│   └── supabase.js            # Supabase client
├── styles/
│   ├── Dashboard.css
│   ├── Login.css
│   ├── Signup.css
│   ├── Verify.css
│   └── Welcome.css
├── App.tsx                    # Main app with routing
├── SUPABASE_SETUP.md         # Database setup guide
└── README.md                 # This file
```

## 🔐 Security Features

### Client-Side Protection
- Input sanitization against XSS attacks
- Form validation with comprehensive checks
- Password strength requirements:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character

### Server-Side Protection
- **Supabase Auth**: Industry-standard authentication
- **Row Level Security**: Users can only access their own data
- **Parameterized Queries**: Protection against SQL injection
- **JWT Tokens**: Secure, auto-refreshing sessions
- **PKCE Flow**: Enhanced OAuth security
- **Rate Limiting**: Automatic protection against brute force

### Email Security
- Email verification required before login
- Time-sensitive OTP codes (1-hour expiration)
- Secure password reset flow
- Custom email templates (configurable)

## 📚 Usage Guide

### For Users

1. **Creating an Account**
   - Click "Get Started Free" or "Sign Up"
   - Fill in all required information
   - Read and agree to Terms & Privacy Policy
   - Check your email for verification link
   - Click link to verify your account

2. **Logging In**
   - Option 1: Email + Password
   - Option 2: OTP via email
   - After successful login, access your dashboard

3. **Resetting Password**
   - Click "Forgot password?" on login page
   - Enter your email address
   - Check email for reset link
   - Create a new password

### For Developers

1. **Adding New Features**
   - Create component in `/components`
   - Add route in `App.tsx`
   - Use `useAuth()` hook for user data
   - Follow existing styling patterns

2. **Database Queries**
   ```javascript
   import { supabase } from '../lib/supabase';
   
   // Query example
   const { data, error } = await supabase
     .from('your_table')
     .select('*')
     .eq('user_id', user.id);
   ```

3. **Protected Routes**
   ```javascript
   <Route 
     path="/protected" 
     element={
       <ProtectedRoute>
         <YourComponent />
       </ProtectedRoute>
     } 
   />
   ```

## 🎨 Customization

### Changing Colors
Edit the CSS files in `/styles`:
- Primary: `#3b82f6` (Blue)
- Secondary: `#1e3a8a` (Dark Blue)
- Success: `#10b981` (Green)
- Error: `#ef4444` (Red)

### Adding Branches
Update the branch options in `Signup.tsx`:
```javascript
<option value="Your Branch">Your Branch</option>
```

### Customizing Email Templates
Go to Supabase Dashboard → Authentication → Email Templates

## 🚀 Deployment

### Production Checklist
- [ ] Set up custom SMTP for emails
- [ ] Configure production URL in Supabase
- [ ] Enable SSL certificates
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy
- [ ] Enable DDoS protection
- [ ] Review security settings
- [ ] Test all authentication flows

### Recommended Hosting
- **Frontend**: Vercel, Netlify, or Cloudflare Pages
- **Backend**: Supabase (already configured)
- **CDN**: Cloudflare or AWS CloudFront

## 📈 Scaling for Nationwide Use

Supabase is designed to scale:
- ✅ Handles **billions of rows** efficiently
- ✅ Built on **PostgreSQL** (battle-tested)
- ✅ **Auto-scaling** infrastructure
- ✅ **99.9% uptime** SLA (paid tiers)
- ✅ **Connection pooling** for high traffic
- ✅ **Real-time subscriptions** support
- ✅ **CDN** for global performance

### Scaling Tips
1. **Database Indexing**: Already configured in setup
2. **Caching**: Use React Query or SWR
3. **Image Optimization**: Use Supabase Storage
4. **Load Balancing**: Automatic with Supabase
5. **Monitoring**: Set up Sentry or LogRocket

## 🔧 Troubleshooting

### Common Issues

**Email not received?**
- Check spam folder
- Verify email in Supabase dashboard
- Check SMTP configuration

**Can't connect to Supabase?**
- Verify environment variables
- Check API keys in dashboard
- Ensure correct project URL

**Login fails?**
- Verify email address
- Check if email is verified
- Reset password if needed

**Database errors?**
- Run SQL setup script
- Check RLS policies
- Verify table permissions

## 📄 License

This project is built for church management purposes. Please ensure compliance with data protection regulations (GDPR, CCPA, etc.) when handling member data.

## 🤝 Contributing

This is a custom church management system. For questions or support:
- Review the documentation
- Check Supabase docs: https://supabase.com/docs
- Join Supabase Discord: https://discord.supabase.com

## 📞 Support

For technical support or questions about implementation:
1. Check this README and SUPABASE_SETUP.md
2. Review Supabase documentation
3. Test in development before production deployment

---

**Built with ❤️ for church communities nationwide**
