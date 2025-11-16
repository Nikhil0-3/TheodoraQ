import nodemailer from 'nodemailer';

/**
 * Create email transporter
 */
export const createEmailTransporter = () => {
  // Check if email credentials are configured
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured in .env file');
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (userEmail, userName, resetToken) => {
  try {
    const transporter = createEmailTransporter();
    
    if (!transporter) {
      throw new Error('Email transporter not configured');
    }

    // Create the reset link - use frontend URL from env or default
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendURL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: '"TheodoraQ Support" <noreply@theodoraq.com>',
      to: userEmail,
      subject: 'Password Reset Request - TheodoraQ',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Password Reset Request</h2>
          <p>Hi ${userName},</p>
          <p>You are receiving this email because you (or someone else) have requested a password reset for your TheodoraQ account.</p>
          <p>Please click on the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #1976d2; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetLink}</p>
          <p style="color: #d32f2f; margin-top: 20px;">
            <strong>This link will expire in 1 hour.</strong>
          </p>
          <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated email from TheodoraQ. Please do not reply to this message.
          </p>
        </div>
      `,
      text: `
        Hi ${userName},

        You are receiving this email because you (or someone else) have requested a password reset for your TheodoraQ account.

        Please click on the following link, or paste it into your browser to complete the process:
        
        ${resetLink}

        This link will expire in 1 hour.

        If you did not request this password reset, please ignore this email and your password will remain unchanged.

        ---
        TheodoraQ Support Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('✉️  Password reset email sent: %s', info.messageId);
    
    // If using Ethereal (test email), log the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('📧 Preview URL: %s', previewUrl);
    }

    return info;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw error;
  }
};
