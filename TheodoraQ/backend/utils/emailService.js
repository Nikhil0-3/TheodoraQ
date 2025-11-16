import nodemailer from 'nodemailer';

/**
 * Create email transporter
 * Configure with your email service (Gmail, SendGrid, etc.)
 */
const createTransporter = () => {
  // For development: Use ethereal.email (fake SMTP)
  // For production: Use real SMTP credentials from environment variables
  
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  
  // Default: Use SMTP settings from env
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

/**
 * Send class invitation email to a candidate
 * @param {string} recipientEmail - Email address of the candidate
 * @param {string} recipientName - Name of the candidate
 * @param {Object} classInfo - Class details
 * @param {string} inviteCode - Class invite code
 * @param {string} adminName - Name of the admin/instructor
 */
export const sendClassInvitation = async (recipientEmail, recipientName, classInfo, inviteCode, adminName) => {
  try {
    const transporter = createTransporter();
    
    // Frontend URL (adjust based on your deployment)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const joinUrl = `${frontendUrl}/candidate/join-class?code=${inviteCode}`;
    
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'TheodoraQ'}" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: `You're invited to join ${classInfo.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1976d2; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .invite-code { background-color: #fff; border: 2px dashed #1976d2; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1976d2; font-family: monospace; }
            .button { display: inline-block; background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .info-box { background-color: #e3f2fd; padding: 15px; border-left: 4px solid #1976d2; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Class Invitation</h1>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              
              <p><strong>${adminName}</strong> has invited you to join their class on TheodoraQ!</p>
              
              <div class="info-box">
                <strong>📚 Class:</strong> ${classInfo.title}<br>
                <strong>📝 Course Code:</strong> ${classInfo.courseCode || 'N/A'}<br>
                ${classInfo.description ? `<strong>📖 Description:</strong> ${classInfo.description}<br>` : ''}
                <strong>👨‍🏫 Instructor:</strong> ${adminName}
              </div>
              
              <h3>How to Join:</h3>
              <p>You have two options to join this class:</p>
              
              <p><strong>Option 1: Use the direct link</strong></p>
              <p style="text-align: center;">
                <a href="${joinUrl}" class="button">Join Class Now</a>
              </p>
              
              <p><strong>Option 2: Use the invite code</strong></p>
              <div class="invite-code">
                <p style="margin: 0; font-size: 14px; color: #666;">Your Invite Code:</p>
                <p class="code">${inviteCode}</p>
              </div>
              
              <ol>
                <li>Visit <a href="${frontendUrl}">${frontendUrl}</a></li>
                <li>Sign up or log in (you can use Google OAuth)</li>
                <li>Go to "Join a Class"</li>
                <li>Enter the invite code: <strong>${inviteCode}</strong></li>
              </ol>
              
              <div class="info-box">
                <strong>⚠️ Note:</strong> You'll need to create an account or sign in before you can join the class. 
                You can sign up using your email or Google account.
              </div>
              
              <p>We look forward to seeing you in class!</p>
              
              <p>Best regards,<br>
              The TheodoraQ Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>If you did not expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${recipientName},

${adminName} has invited you to join their class on TheodoraQ!

Class: ${classInfo.title}
Course Code: ${classInfo.courseCode || 'N/A'}
Instructor: ${adminName}

How to Join:

Option 1: Click this link to join directly:
${joinUrl}

Option 2: Use the invite code:
${inviteCode}

Steps:
1. Visit ${frontendUrl}
2. Sign up or log in (you can use Google OAuth)
3. Go to "Join a Class"
4. Enter the invite code: ${inviteCode}

We look forward to seeing you in class!

Best regards,
The TheodoraQ Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send test email to verify configuration
 */
export const sendTestEmail = async (recipientEmail) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: 'Test Email from TheodoraQ',
      text: 'This is a test email to verify your email configuration is working correctly.',
      html: '<p>This is a test email to verify your email configuration is working correctly.</p>'
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Test email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Test email error:', error);
    throw error;
  }
};
