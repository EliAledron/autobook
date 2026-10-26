import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { getToken } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db, messaging } from "../firebase";

export function usePushNotifications() {
  useEffect(() => {
    const setupNativePush = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === "prompt") {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== "granted") {
          console.log("Native push notification permission denied.");
          return;
        }

        // Register device with FCM / APNS
        await PushNotifications.register();

        // Listen for FCM registration token
        await PushNotifications.addListener("registration", async (token) => {
          console.log("Native FCM Token retrieved:", token.value);
          if (auth.currentUser && token?.value) {
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
              fcmToken: token.value,
            });
          }
        });

        // Listen for registration errors
        await PushNotifications.addListener("registrationError", (err) => {
          console.error("Native push registration error:", err);
        });

        // Listen for foreground notifications
        await PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("Push notification received in foreground:", notification);
        });

        // Listen for user tapping on notification
        await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          console.log("Push notification tapped:", action);
        });
      } catch (error) {
        console.error("Error setting up native push notifications:", error);
      }
    };

    const setupWebPush = async () => {
      try {
        if (!auth.currentUser || !messaging) return;

        console.log("Requesting web notification permission...");
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
          console.log("Web notification permission granted.");
          const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          });

          if (token) {
            console.log("Web FCM Token retrieved:", token);
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
              fcmToken: token,
            });
          }
        } else {
          console.log("Web notification permission denied.");
        }
      } catch (error) {
        console.error("Error retrieving web push token:", error);
      }
    };

    if (Capacitor.isNativePlatform()) {
      setupNativePush();
    } else if ("Notification" in window && "serviceWorker" in navigator) {
      setupWebPush();
    }
  }, []);
}
