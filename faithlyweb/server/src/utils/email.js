import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const sendOTP = async (email, otp, subject = 'Your Email Verification Code', title = 'Your OTP Code') => {
  // EMERGENCY FALLBACK: Log the Email OTP to the console
  console.log(`\n\n📧 ================================== 📧`);
  console.log(`✉️ FALLBACK EMAIL OTP FOR ${email}: [ ${otp} ]`);
  console.log(`📧 ================================== 📧\n\n`);

  try {
    const info = await transporter.sendMail({
      from: `"FaithLy" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: `<h2>${title}</h2><h1>${otp}</h1><p>Expires in 15 minutes</p>`,
    });
    console.log(`✅ Email [${subject}] sent successfully: %s`, info.messageId);
  } catch (error) {
    console.error('❌ Email Error:', error);
  }
};
