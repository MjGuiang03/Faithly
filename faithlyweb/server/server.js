const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection string
const MONGODB_URI = 'mongodb://localhost:27017/';
const DB_NAME = 'faithly';

let db;

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email (Development mode - just logs to console)
async function sendOTPEmail(email, otp, type = 'registration') {
  try {
    // For development, just log the OTP to console
    console.log('\n' + '='.repeat(60));
    console.log(`📧 OTP EMAIL (${type.toUpperCase()})`);
    console.log('='.repeat(60));
    console.log(`To: ${email}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Expires in: ${type === 'registration' ? '15' : '5'} minutes`);
    console.log('='.repeat(60) + '\n');

    // TODO: In production, integrate with a real email service like:
    // - SendGrid
    // - AWS SES
    // - Nodemailer with Gmail
    // - Mailgun
    // etc.
    
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

// Connect to MongoDB
MongoClient.connect(MONGODB_URI, { useUnifiedTopology: true })
  .then(client => {
    console.log('✅ Connected to MongoDB');
    db = client.db(DB_NAME);
  })
  .catch(error => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phoneNumber,
      email,
      password,
      gender,
      month,
      date,
      year,
      position,
      community
    } = req.body;

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    // Check if phone number already exists
    const existingPhone = await db.collection('users').findOne({ phoneNumber });
    if (existingPhone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP for email verification
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 900000); // 15 minutes from now

    // Create user object
    const newUser = {
      firstName,
      lastName,
      phoneNumber,
      email,
      password: hashedPassword,
      gender,
      birthdate: {
        month,
        date,
        year
      },
      position,
      community,
      isEmailVerified: false,
      otp: otp,
      otpExpiry: otpExpiry,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert user into database
    const result = await db.collection('users').insertOne(newUser);

    if (result.acknowledged) {
      // Send OTP email
      const otpSent = await sendOTPEmail(email, otp, 'registration');
      if (!otpSent) {
        return res.status(500).json({
          success: false,
          message: 'Registration successful but failed to send verification email'
        });
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email for verification code.',
        userId: result.insertedId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Check if email exists (for validation)
app.post('/api/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.collection('users').findOne({ email });
    res.json({ exists: !!user });
  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate OTP for login verification
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 300000); // 5 minutes from now

    // Store OTP in database
    await db.collection('users').updateOne(
      { email },
      {
        $set: {
          otp: otp,
          otpExpiry: otpExpiry,
          updatedAt: new Date()
        }
      }
    );

    // Send OTP email
    const otpSent = await sendOTPEmail(email, otp, 'login');
    if (!otpSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email'
      });
    }

    // Login successful - return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword,
      token: 'jwt-token-placeholder' // You can implement JWT later
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp, type = 'registration' } = req.body;

    // Validation
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find user with this OTP
    const user = await db.collection('users').findOne({
      email,
      otp,
      otpExpiry: { $gt: new Date() } // Check if OTP is not expired
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Update user - remove OTP and mark as verified if registration
    const updateData = {
      $unset: {
        otp: "",
        otpExpiry: ""
      }
    };

    if (type === 'registration') {
      updateData.$set = {
        isEmailVerified: true,
        updatedAt: new Date()
      };
    }

    await db.collection('users').updateOne(
      { email },
      updateData
    );

    res.status(200).json({
      success: true,
      message: type === 'registration' ? 'Email verified successfully' : 'OTP verified successfully'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification'
    });
  }
});

// Resend OTP
app.post('/api/resend-otp', async (req, res) => {
  try {
    const { email, type = 'registration' } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = type === 'registration' 
      ? new Date(Date.now() + 900000) // 15 minutes
      : new Date(Date.now() + 300000); // 5 minutes

    // Update OTP in database
    await db.collection('users').updateOne(
      { email },
      {
        $set: {
          otp: otp,
          otpExpiry: otpExpiry,
          updatedAt: new Date()
        }
      }
    );

    // Send OTP email
    const otpSent = await sendOTPEmail(email, otp, type);
    if (!otpSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email'
      });
    }

    res.status(200).json({
      success: true,
      message: 'New verification code has been sent to your email'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP resend'
    });
  }
});

// Forgot Password - Generate reset token
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in database
    await db.collection('users').updateOne(
      { email },
      {
        $set: {
          resetToken: resetToken,
          resetTokenExpiry: resetTokenExpiry,
          updatedAt: new Date()
        }
      }
    );

    // In a real application, you would send an email here
    // For now, we'll log the reset link to the console
    const resetLink = `http://localhost:3001/reset-password?token=${resetToken}`;
    console.log('\n📧 Password Reset Link:');
    console.log('Email:', email);
    console.log('Reset Link:', resetLink);
    console.log('Token expires in 1 hour\n');

    res.status(200).json({
      success: true,
      message: 'Password reset link has been sent to your email.',
      // Remove these in production:
      resetToken: resetToken,
      resetLink: resetLink
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset request'
    });
  }
});

// Verify Reset Token
app.get('/api/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        valid: false,
        message: 'Reset token is required'
      });
    }

    // Find user with this reset token
    const user = await db.collection('users').findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() } // Check if token is not expired
    });

    if (!user) {
      return res.status(400).json({
        valid: false,
        message: 'Invalid or expired reset token'
      });
    }

    res.status(200).json({
      valid: true,
      message: 'Reset token is valid'
    });

  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      valid: false,
      message: 'Server error during token verification'
    });
  }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validation
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Find user with valid reset token
    const user = await db.collection('users').findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and remove reset token
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date()
        },
        $unset: {
          resetToken: "",
          resetTokenExpiry: ""
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
});

// Get all users (for testing)
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.collection('users')
      .find({}, { projection: { password: 0 } })
      .toArray();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});