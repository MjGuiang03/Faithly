import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const sendOTP = async (email, otp, subject = 'Your Email Verification Code', title = 'Your OTP Code') => {
  // EMERGENCY FALLBACK: Log the Email OTP to the console
  console.log(`\n\n📧 ================================== 📧`);
  console.log(`✉️ FALLBACK EMAIL OTP FOR ${email}: [ ${otp} ]`);
  console.log(`📧 ================================== 📧\n\n`);

  try {
    const data = await resend.emails.send({
      from: 'FaithLy <no-reply@puacfaithly.com>', // Official verified domain
      to: email,
      subject: subject,
      html: `<h2>${title}</h2><h1>${otp}</h1><p>Expires in 15 minutes</p>`
    });
    console.log(`✅ Resend Email [${subject}] sent successfully:`, data);
  } catch (error) {
    console.error('❌ Resend Error:', error);
  }
};

