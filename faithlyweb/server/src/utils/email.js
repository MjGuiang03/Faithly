import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const sendOTP = async (email, otp, subject = 'Your Email Verification Code', title = 'Your OTP Code') => {
  try {
    const data = await resend.emails.send({
      from: 'Faithly <onboarding@resend.dev>', // Use this test email until you buy a custom domain
      to: email,
      subject: subject,
      html: `<h2>${title}</h2><h1>${otp}</h1><p>Expires in 15 minutes</p>`
    });
    console.log(`✅ Resend Email [${subject}] sent successfully:`, data);
  } catch (error) {
    console.error('❌ Resend Error:', error);
  }
};

export const sendSmsOTP = async (phoneNumber, otp) => {
  // EMERGENCY FALLBACK: Log the SMS OTP to the console
  // So the admin can share it if the SMS API fails or runs out of credits.
  console.log(`\n\n📱 ================================== 📱`);
  console.log(`💬 FALLBACK SMS OTP FOR ${phoneNumber}: [ ${otp} ]`);
  console.log(`📱 ================================== 📱\n\n`);

  try {
    // If there is no API key, we skip the fetch and rely strictly on the console log above.
    if (!process.env.SEMAPHORE_API_KEY) {
      console.warn('⚠️ No SEMAPHORE_API_KEY found. SMS OTP was only logged to the console.');
      return;
    }

    const response = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: process.env.SEMAPHORE_API_KEY,
        number: phoneNumber,
        message: `Your Faithly verification code is: ${otp}. Do not share this with anyone.`
      })
    });

    const data = await response.json();
    console.log('✅ SMS Sent request finished. Semaphore response:', data);
  } catch (error) {
    console.error('❌ Semaphore SMS Error:', error.message);
  }
};
