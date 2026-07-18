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

export async function sendRefundEmail(email, { userName, oldPlanName, newPlanName, refundAmount, grossAmount, refundType, gatewayCharges }) {
  const isFullRefund = refundType === "full";
  const refundLabel = isFullRefund ? "Full Refund" : "Prorated Refund";

  const mailOptions = {
    from: `"Drivya Billing" <${SMTP_USER || "billing@drivya.com"}>`,
    to: email,
    subject: `Refund of ₹${refundAmount.toFixed(2)} — Plan Upgrade`,
    text: `Hi ${userName},\n\nYour ${oldPlanName} plan has been upgraded to ${newPlanName}. A ${refundLabel.toLowerCase()} of ₹${refundAmount.toFixed(2)} has been initiated for the unused portion of your previous plan.\n\n${!isFullRefund ? `Prorated amount: ₹${grossAmount.toFixed(2)}\nGateway charges deducted: ₹${gatewayCharges.toFixed(2)}\nNet refund: ₹${refundAmount.toFixed(2)}` : `Refund amount: ₹${refundAmount.toFixed(2)}`}\n\nRefunds typically take 5–7 business days to reflect in your account.\n\nThank you for upgrading!\n— Team Drivya`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 28px 24px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Refund Initiated</h2>
          <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">Your upgrade refund is on its way</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="color: #374151; margin: 0 0 20px; font-size: 14px; line-height: 1.6;">
            Hi <strong>${userName}</strong>,<br/>
            Your plan has been upgraded from <strong>${oldPlanName}</strong> to <strong>${newPlanName}</strong>.
            A refund for the unused portion of your previous plan has been initiated.
          </p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${refundLabel}</span>
              <span style="background: ${isFullRefund ? '#dcfce7' : '#ede9fe'}; color: ${isFullRefund ? '#16a34a' : '#7c3aed'}; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px;">${isFullRefund ? 'Full' : 'Prorated'}</span>
            </div>
            ${!isFullRefund ? `
              <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #6b7280; font-size: 13px;">Prorated amount</span>
                  <span style="color: #374151; font-size: 13px; font-weight: 600;">₹${grossAmount.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #6b7280; font-size: 13px;">Gateway charges (2%)</span>
                  <span style="color: #ef4444; font-size: 13px; font-weight: 600;">−₹${gatewayCharges.toFixed(2)}</span>
                </div>
                <div style="border-top: 1px dashed #d1d5db; padding-top: 10px; margin-top: 4px; display: flex; justify-content: space-between;">
                  <span style="color: #111827; font-size: 14px; font-weight: 700;">Net Refund</span>
                  <span style="color: #16a34a; font-size: 18px; font-weight: 800;">₹${refundAmount.toFixed(2)}</span>
                </div>
              </div>
            ` : `
              <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 8px; display: flex; justify-content: space-between;">
                <span style="color: #111827; font-size: 14px; font-weight: 700;">Refund Amount</span>
                <span style="color: #16a34a; font-size: 18px; font-weight: 800;">₹${refundAmount.toFixed(2)}</span>
              </div>
            `}
          </div>
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
            Refunds typically take <strong>5–7 business days</strong> to reflect in your account depending on your bank or payment provider.
          </p>
        </div>
        <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 24px; text-align: center;">
          <span style="color: #9ca3af; font-size: 11px;">© Drivya · Secure Cloud Storage</span>
        </div>
      </div>
    `,
  };

  if (transporter) {
    await transporter.sendMail(mailOptions);
  } else {
    console.log("==========================================");
    console.log(`[MAIL SIMULATION] Refund email for ${email}:`);
    console.log(`  Type: ${refundLabel}`);
    console.log(`  Old Plan: ${oldPlanName} → New Plan: ${newPlanName}`);
    console.log(`  Gross: ₹${grossAmount.toFixed(2)}, Gateway: ₹${(gatewayCharges || 0).toFixed(2)}, Net: ₹${refundAmount.toFixed(2)}`);
    console.log("==========================================");
  }
}
