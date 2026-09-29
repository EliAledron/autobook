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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h1 style="color: #1e3a8a;">Welcome to AutoBook!</h1>
        <p style="font-size: 16px; color: #475569;">Please verify your email address to complete your registration and get started.</p>
        <a href="${link}" style="display: inline-block; background-color: #1e3a8a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; margin-bottom: 20px;">Verify My Email</a>
        <p style="font-size: 12px; color: #94a3b8;">If you did not request this, you can safely ignore this email.</p>
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
