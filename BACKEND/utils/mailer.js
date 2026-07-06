import nodemailer from "nodemailer";

// Simple mailer configuration
// In development, if credentials are missing, we fallback to console log.
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export async function sendOTPEmail(email, otp) {
  const mailOptions = {
    from: `"Drivya Security" <${SMTP_USER || "no-reply@drivya.com"}>`,
    to: email,
    subject: "Your Drivya Verification Code",
    text: `Your verification code is: ${otp}. It is valid for 10 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
        <h2 style="color: #4f46e5; margin-top: 0;">Drivya Security</h2>
        <p>Verify your identity to reset your password. Use the following 6-digit verification code:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 12px 24px; background: #f3f4f6; border-radius: 8px; text-align: center; margin: 24px 0; color: #111827;">
          ${otp}
        </div>
        <p style="color: #4b5563; font-size: 14px;">This code is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
      </div>
    `,
  };

  if (transporter) {
    await transporter.sendMail(mailOptions);
  } else {
    console.log("==========================================");
    console.log(`[MAIL SIMULATION] OTP for ${email}: ${otp}`);
    console.log("==========================================");
  }
}
