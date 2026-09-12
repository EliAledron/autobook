import { auth } from "../firebase";

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
    return data.success;
  } catch (error) {
    console.error("Failed to send email notification:", error);
    return false;
  }
};
