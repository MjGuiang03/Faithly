import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  // Advanced settings to combat cloud firewalls & IPv6 issues
  logger: true,
  debug: true,
  connectionTimeout: 15000, // 15 seconds
  socketTimeout: 15000
});

export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const sendOTP = async (email, otp) => {
  // EMERGENCY FALLBACK: Since Render's free tier frequently blocks SMTP,
  // we log the OTP directly to the console so the admin can read it
  // and share it with the user if the email fails to send.
  console.log(`\n\n🚨 ================================== 🚨`);
  console.log(`📩 FALLBACK OTP FOR ${email}: [ ${otp} ]`);
  console.log(`🚨 ================================== 🚨\n\n`);

  await transporter.sendMail({
    from: `"Faithly" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Email Verification Code',
    html: `<h2>Your OTP Code</h2><h1>${otp}</h1><p>Expires in 15 minutes</p>`
  });
};