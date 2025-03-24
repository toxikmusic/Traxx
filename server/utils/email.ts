
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
  
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@example.com',
    to: email,
    subject: 'Password Reset Request',
    text: `Click the following link to reset your password: ${resetUrl}`,
    html: `
      <p>You requested a password reset.</p>
      <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  });
}
