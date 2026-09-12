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
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASSWORD,
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
      from: `"AutoBook" <${process.env.GMAIL_EMAIL}>`,
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

// Health check endpoint for Render
app.get('/', (req, res) => res.send('AutoBook Backend is running! 🚀'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
