import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: `"Faithly" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Email Verification Code',
    html: `<h2>Your OTP Code</h2><h1>${otp}</h1><p>Expires in 15 minutes</p>`
  });
};