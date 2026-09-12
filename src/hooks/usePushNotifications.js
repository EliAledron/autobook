import { useEffect } from "react";
import { getToken } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db, messaging } from "../firebase";

export function usePushNotifications() {
  useEffect(() => {
    const requestPermissionAndSaveToken = async () => {
      try {
        if (!auth.currentUser) return;

        console.log("Requesting notification permission...");
        const permission = await Notification.requestPermission();
        
        if (permission === "granted") {
          console.log("Notification permission granted.");
          const token = await getToken(messaging, { 
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
          });
          
          if (token) {
            console.log("FCM Token retrieved:", token);
            // Save the token to the user's Firestore document
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
              fcmToken: token
            });
          } else {
            console.log("No registration token available. Request permission to generate one.");
          }
        } else {
          console.log("Notification permission denied.");
        }
      } catch (error) {
        console.error("An error occurred while retrieving token:", error);
      }
    };

    // Only run if service workers and notifications are supported
    if ("Notification" in window && "serviceWorker" in navigator) {
      requestPermissionAndSaveToken();
    }
  }, []);
}
