import { auth, messaging, db } from "../firebase";
import { getToken } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

const BACKEND_URL = "https://autobook-backend-k543.onrender.com";

/**
 * Sends a push notification to a specific FCM token via our Render backend.
 */
export const sendPushNotification = async (token, title, body) => {
  if (!auth.currentUser || !token) return false;
  
  try {
    const idToken = await auth.currentUser.getIdToken();
    
    const response = await fetch(`${BACKEND_URL}/api/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({ token, title, body })
    });
    
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Failed to send push notification:", error);
    return false;
  }
};

/**
 * Sends a beautifully formatted email via our Render backend.
 */
export const sendEmailNotification = async (email, subject, html) => {
  if (!auth.currentUser || !email) return false;
  
  try {
    const idToken = await auth.currentUser.getIdToken();
    
    const response = await fetch(`${BACKEND_URL}/api/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({ email, subject, html })
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to send Email");
    }
    return { success: data.success, error: null };
  } catch (error) {
    console.error("Failed to send email notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Sends an email notification to a user when their account is approved.
 */
export const sendApprovalEmailNotification = async (email, recipientName, role = "") => {
  if (!email) return false;

  const name = recipientName || "there";
  const roleDisplay = role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : "";
  const roleText = roleDisplay ? `${roleDisplay} ` : "";
  const loginUrl = (typeof window !== "undefined" && window?.location?.origin)
    ? window.location.origin
    : "https://autobook-livid.vercel.app";

  const subject = "🎉 Your AutoBook Account Has Been Approved!";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="padding: 40px 20px; text-align: center; background-color: #f3f4f6;">
        <div style="background-color: white; border-radius: 16px; padding: 40px 30px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); margin-bottom: 20px; text-align: center;">
          <img src="https://raw.githubusercontent.com/EliAledron/autobook/main/public/autobook-logo.png" alt="AutoBook Logo" style="max-width: 100px; height: auto; margin: 0 auto 24px; border-radius: 18px; display: block;" />
          
          <div style="display: inline-block; background-color: #dcfce7; color: #16a34a; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 20px; margin-bottom: 16px;">
            ✓ Account Approved
          </div>

          <h1 style="color: #1e3a8a; font-size: 24px; font-weight: 800; margin: 0 0 16px; line-height: 1.3;">Welcome aboard, ${name}!</h1>
          <p style="color: #4b5563; font-size: 16px; margin: 0 0 28px; line-height: 1.6;">
            Great news! Your AutoBook ${roleText}account has been reviewed and officially approved by platform administrators. You now have full access to your account and platform features.
          </p>

          <a href="${loginUrl}" style="display: inline-block; background-color: #1e3a8a; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(30, 58, 138, 0.25);">
            Open AutoBook
          </a>

          <p style="color: #9ca3af; font-size: 13px; margin-top: 32px; margin-bottom: 0;">
            If you did not create an AutoBook account or have questions, please contact our support team.
          </p>
        </div>

        <div style="color: #6b7280; font-size: 12px; line-height: 1.5; text-align: center;">
          <p style="margin: 0 0 8px;">© 2026 AutoBook Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  return await sendEmailNotification(email, subject, html);
};

/**
 * Sends an email notification to a user when their application is rejected.
 */
export const sendRejectionEmailNotification = async (email, recipientName, reason = "") => {
  if (!email) return false;

  const name = recipientName || "there";
  const subject = "AutoBook Application Update";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="padding: 40px 20px; text-align: center; background-color: #f3f4f6;">
        <div style="background-color: white; border-radius: 16px; padding: 40px 30px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); margin-bottom: 20px; text-align: center;">
          <img src="https://raw.githubusercontent.com/EliAledron/autobook/main/public/autobook-logo.png" alt="AutoBook Logo" style="max-width: 100px; height: auto; margin: 0 auto 24px; border-radius: 18px; display: block;" />
          
          <div style="display: inline-block; background-color: #fee2e2; color: #dc2626; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 20px; margin-bottom: 16px;">
            Application Update
          </div>

          <h1 style="color: #1e3a8a; font-size: 24px; font-weight: 800; margin: 0 0 16px; line-height: 1.3;">Hello ${name},</h1>
          <p style="color: #4b5563; font-size: 16px; margin: 0 0 20px; line-height: 1.6;">
            Thank you for applying to AutoBook. We regret to inform you that your application could not be approved at this time.
          </p>

          ${reason ? `
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; border-radius: 8px; text-align: left; margin: 0 0 24px 0;">
            <div style="font-size: 12px; font-weight: 700; color: #dc2626; text-transform: uppercase; margin-bottom: 4px;">Admin Note:</div>
            <div style="font-size: 14px; color: #7f1d1d;">${reason}</div>
          </div>
          ` : ""}

          <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">
            If you believe this was an error or would like to submit updated information, please feel free to contact our support team.
          </p>
        </div>

        <div style="color: #6b7280; font-size: 12px; line-height: 1.5; text-align: center;">
          <p style="margin: 0 0 8px;">© 2026 AutoBook Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  return await sendEmailNotification(email, subject, html);
};

/**
 * Sends an SMS message via our Render backend using Brevo.
 */
export const sendSmsNotification = async (toPhone, message) => {
  if (!auth.currentUser || !toPhone) return false;
  
  try {
    const idToken = await auth.currentUser.getIdToken();
    
    const response = await fetch(`${BACKEND_URL}/api/send-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({ toPhone, message })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to send SMS");
    }
    
    const data = await response.json();
    return { success: data.success, error: null };
  } catch (error) {
    console.error("Failed to send SMS notification:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Requests the backend to generate and send a custom Brevo verification email
 */
export const sendCustomVerificationEmail = async () => {
  if (!auth.currentUser) return { success: false, error: "No user logged in" };
  
  try {
    const idToken = await auth.currentUser.getIdToken();
    
    const response = await fetch(`${BACKEND_URL}/api/send-verification-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${idToken}`
      }
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to send verification email");
    }
    
    return { success: data.success, error: null };
  } catch (error) {
    console.error("Failed to send custom verification email:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Requests browser push notification permission and saves the FCM token to Firestore.
 */
export const requestPushPermission = async (userUid) => {
  try {
    if (Capacitor.isNativePlatform()) {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive !== "granted") {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive === "granted") {
        await PushNotifications.register();
        return { success: true };
      } else {
        return { success: false, error: "Notification permission denied." };
      }
    }

    if (!messaging) {
      return { success: false, error: "Messaging not supported in this environment" };
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const currentToken = await getToken(messaging, { 
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
      });
      if (currentToken) {
        // Save the token to the user's Firestore document
        await updateDoc(doc(db, "users", userUid), {
          fcmToken: currentToken
        });
        return { success: true, token: currentToken };
      } else {
        return { success: false, error: "No registration token available." };
      }
    } else {
      return { success: false, error: "Notification permission denied." };
    }
  } catch (error) {
    console.error("Error retrieving FCM token:", error);
    return { success: false, error: error.message };
  }
};
