import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { getToken } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db, messaging } from "../firebase";

export function usePushNotifications(userId) {
  useEffect(() => {
    const currentUid = userId || auth.currentUser?.uid;
    if (!currentUid) return;

    let isMounted = true;

    const setupNativePush = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive !== "granted") {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== "granted") {
          console.log("Native push notification permission denied or dismissed.");
          return;
        }

        // Register device with FCM / APNS
        await PushNotifications.register();

        // Listen for FCM registration token
        await PushNotifications.addListener("registration", async (token) => {
          if (!isMounted) return;
          console.log("Native FCM Token retrieved:", token.value);
          const uidToUpdate = userId || auth.currentUser?.uid;
          if (uidToUpdate && token?.value) {
            try {
              await updateDoc(doc(db, "users", uidToUpdate), {
                fcmToken: token.value,
              });
            } catch (err) {
              console.error("Error saving native FCM token:", err);
            }
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
        if (!messaging) return;

        let permission = Notification.permission;
        if (permission !== "granted" && permission !== "denied") {
          permission = await Notification.requestPermission();
        }

        if (permission === "granted") {
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
          if (!vapidKey) return;

          const token = await getToken(messaging, { vapidKey });
          const uidToUpdate = userId || auth.currentUser?.uid;
          if (token && uidToUpdate && isMounted) {
            console.log("Web FCM Token retrieved:", token);
            await updateDoc(doc(db, "users", uidToUpdate), {
              fcmToken: token,
            });
          }
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

    return () => {
      isMounted = false;
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners().catch(() => {});
      }
    };
  }, [userId]);
}
