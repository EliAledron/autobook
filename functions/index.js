const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Load environment variables for Gmail
const gmailEmail = process.env.GMAIL_EMAIL;
const gmailPassword = process.env.GMAIL_PASSWORD;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

exports.onUserStatusUpdate = onDocumentUpdated("users/{userId}", async (event) => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();

  // If status didn't change, do nothing
  if (beforeData.status === afterData.status) {
    return null;
  }

  const email = afterData.email;
  const name = afterData.displayName?.split(" ")[0] || "there";
  const status = afterData.status;

  if (!email) {
    console.log("No email found for user:", event.params.userId);
    return null;
  }

  let subject = "";
  let html = "";

  if (status === "approved") {
    subject = "Welcome to AutoBook! Your account is approved";
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2a5298;">Welcome to AutoBook! 🎉</h2>
        <p>Hi ${name},</p>
        <p>Great news! Your account has been fully <strong>approved</strong> by our team.</p>
        <p>You can now log in and access all the features of the platform.</p>
        <br>
        <a href="https://autobook.web.app" style="background-color: #2a5298; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Log in to your account</a>
        <br><br>
        <p>See you inside!</p>
        <p><strong>- The AutoBook Team</strong></p>
      </div>
    `;
  } else if (status === "rejected") {
    const reason = afterData.rejectionReason || "Please review your submitted details and try again.";
    subject = "Update regarding your AutoBook application";
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #e53e3e;">Update on your application</h2>
        <p>Hi ${name},</p>
        <p>Thank you for applying to join AutoBook. Unfortunately, your application was not approved at this time.</p>
        <div style="background-color: #fff5f5; padding: 16px; border-left: 4px solid #e53e3e; margin: 20px 0; border-radius: 4px;">
          <strong style="color: #e53e3e; font-size: 12px; text-transform: uppercase;">Admin Note:</strong><br>
          <div style="margin-top: 8px;">${reason}</div>
        </div>
        <p>You can log back into your account to fix these issues and submit a new application.</p>
        <br>
        <p><strong>- The AutoBook Team</strong></p>
      </div>
    `;
  } else {
    return null;
  }

  // Prevent sending email if we don't have credentials configured yet
  if (!gmailEmail || !gmailPassword) {
    console.warn("Missing GMAIL_EMAIL or GMAIL_PASSWORD. Email not sent.");
    return null;
  }

  const mailOptions = {
    from: `"AutoBook" <${gmailEmail}>`,
    to: email,
    subject: subject,
    html: html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(\`Email successfully sent to \${email} for status: \${status}\`);
  } catch (error) {
    console.error("Error sending email:", error);
  }

  return null;
});
