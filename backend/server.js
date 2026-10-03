const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');
require('dotenv').config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  initializeApp();
}

// Middleware to verify Firebase Auth token
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth Error:', error);
    return res.status(401).json({ error: 'Unauthorized: Token verification failed' });
  }
};

// ==========================================
// ENDPOINT: SEND EMAIL (VIA BREVO API)
// ==========================================
app.post('/api/send-email', authenticate, async (req, res) => {
  try {
    const { email, subject, html } = req.body;

    if (!email || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SMS_SENDER_NAME || 'AutoBook',
          email: process.env.GMAIL_EMAIL // Must be their actual verified email, not the SMTP login handle
        },
        to: [{ email: email }],
        subject: subject,
        htmlContent: html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email via Brevo API');
    }

    res.status(200).json({ success: true, messageId: data.messageId });
  } catch (error) {
    console.error('Email Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ENDPOINT: SEND VERIFICATION EMAIL (CUSTOM BREVO)
// ==========================================
app.post('/api/send-verification-email', authenticate, async (req, res) => {
  try {
    const email = req.user.email;
    if (!email) {
      return res.status(400).json({ error: 'No email associated with this user' });
    }

    // Generate Firebase Action Link
    const link = await getAuth().generateEmailVerificationLink(email);

    // Build Email HTML
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="padding: 40px 20px; text-align: center; background-color: #f3f4f6;">
          <div style="background-color: white; border-radius: 16px; padding: 40px 30px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); margin-bottom: 20px;">
            <img src="https://raw.githubusercontent.com/EliAledron/autobook/main/public/autobook-logo.png" alt="AutoBook Logo" style="max-width: 100px; height: auto; margin: 0 auto 24px; border-radius: 18px; display: block;" />
            
            <h1 style="color: #1e3a8a; font-size: 24px; font-weight: 700; margin: 0 0 16px; line-height: 1.3;">Welcome to AutoBook!</h1>
            <p style="color: #4b5563; font-size: 16px; margin: 0 0 32px; line-height: 1.5;">Please verify your email address to complete your registration and get started.</p>
            
            <a href="${link}" style="display: inline-block; background-color: #1e3a8a; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(30, 58, 138, 0.2);">Verify My Email</a>
            
            <p style="color: #9ca3af; font-size: 12px; margin-top: 32px; margin-bottom: 0;">If you did not request this, you can safely ignore this email.</p>
          </div>

          <div style="color: #6b7280; font-size: 12px; line-height: 1.5; text-align: center;">
            <p style="margin: 0 0 4px;">© 2026 AutoBook Inc. All rights reserved.</p>
            <p style="margin: 0 0 8px;">123 Mechanic Lane, Auto City, AC 12345</p>
            <div>
              <a href="#" style="color: #1e3a8a; text-decoration: underline;">Privacy Policy</a> &bull; 
              <a href="#" style="color: #1e3a8a; text-decoration: underline;">Terms of Service</a> &bull; 
              <a href="#" style="color: #1e3a8a; text-decoration: underline;">Contact Support</a>
            </div>
          </div>
        </div>
      </div>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SMS_SENDER_NAME || 'AutoBook',
          email: process.env.GMAIL_EMAIL
        },
        to: [{ email: email }],
        subject: "Verify your AutoBook account",
        htmlContent: htmlContent
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to send verification email');

    res.status(200).json({ success: true, messageId: data.messageId });
  } catch (error) {
    console.error('Verification Email Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ENDPOINT: SEND PUSH NOTIFICATION
// ==========================================
app.post('/api/send-push', authenticate, async (req, res) => {
  try {
    const { token, title, body, data } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const message = {
      notification: { title, body },
      token: token,
    };
    if (data) message.data = data;

    const response = await getMessaging().send(message);
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('Push Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ENDPOINT: SEND SMS (VIA BREVO)
// ==========================================
app.post('/api/send-sms', authenticate, async (req, res) => {
  try {
    const { toPhone, message } = req.body;

    if (!toPhone || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        type: 'transactional',
        sender: process.env.BREVO_SMS_SENDER_NAME || 'AutoBook',
        recipient: toPhone,
        content: message
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send SMS via Brevo');
    }

    res.status(200).json({ success: true, messageId: data.messageId });
  } catch (error) {
    console.error('SMS Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint for Render
app.get('/', (req, res) => res.send('AutoBook Backend is running! 🚀'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
