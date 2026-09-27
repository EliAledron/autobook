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
  console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT env var is missing! FCM and Auth will fail.');
  initializeApp();
}

// Nodemailer setup
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.BREVO_SMTP_LOGIN || process.env.GMAIL_EMAIL,
    pass: process.env.BREVO_SMTP_PASSWORD || process.env.GMAIL_PASSWORD,
  },
});

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
// ENDPOINT: SEND EMAIL
// ==========================================
app.post('/api/send-email', authenticate, async (req, res) => {
  try {
    const { email, subject, html } = req.body;

    if (!email || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const mailOptions = {
      from: `"AutoBook" <${process.env.BREVO_SMTP_LOGIN || process.env.GMAIL_EMAIL}>`,
      to: email,
      subject: subject,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Email Error:', error);
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
