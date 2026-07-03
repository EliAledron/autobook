import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getDocs, collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [userProfile, setUserProfile] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [assignedJobsCount, setAssignedJobsCount] = useState(0);

  useEffect(() => {
    let notifUnsub = null;
    let bookingsUnsub = null;

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUserProfile(null);
        setLoadingUser(false);
        setUnreadAlertsCount(0);
        setPendingBookingsCount(0);
        setAssignedJobsCount(0);
        if (notifUnsub) { notifUnsub(); notifUnsub = null; }
        if (bookingsUnsub) { bookingsUnsub(); bookingsUnsub = null; }
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          const d = snap.data();
          const role = (d.role || "Customer").toLowerCase();
          setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: d.displayName || firebaseUser.displayName || "User",
            photoURL: d.photoURL || firebaseUser.photoURL || "",
            role: d.role || "Customer",
            phone: d.phone || "",
            address: d.address || "",
            status: d.status || "pending",
            shopId: d.shopId || null,
          });

          if (notifUnsub) notifUnsub();
          if (bookingsUnsub) bookingsUnsub();

          if (role === "owner" || role === "admin") {
            let shopId = d.shopId;
            if (role === "owner" && d.shopName) {
              const sName = d.shopName.toUpperCase();
              if (sName.includes("JME")) shopId = "JME";
              else if (sName.includes("GRHE")) shopId = "GRHE";
            }

            const initOwnerListeners = (finalShopId) => {
              const bQuery = finalShopId 
                ? query(collection(db, "bookings"), where("shopId", "==", finalShopId), where("status", "==", "Pending"))
                : query(collection(db, "bookings"), where("status", "==", "Pending"));
              bookingsUnsub = onSnapshot(bQuery, (snap) => setPendingBookingsCount(snap.size));

              if (role === "admin") {
                const aQuery = query(collection(db, "adminAlerts"), where("type", "==", "new_user"), where("read", "==", false));
                notifUnsub = onSnapshot(aQuery, (snapshot) => setUnreadAlertsCount(snapshot.size));
              } else {
                const aQuery = query(collection(db, "adminAlerts"), where("shopId", "==", finalShopId || ""), where("read", "==", false));
                notifUnsub = onSnapshot(aQuery, (snapshot) => setUnreadAlertsCount(snapshot.size));
              }
            };

            if (role === "owner" && shopId !== "JME" && shopId !== "GRHE") {
               getDocs(query(collection(db, "shops"), where("ownerId", "==", firebaseUser.uid)))
                 .then(sSnap => {
                   if (!sSnap.empty) {
                     if (!shopId) shopId = sSnap.docs[0].id;
                     for (const docSnap of sSnap.docs) {
                       const fetchedName = (docSnap.data().name || "").toUpperCase();
                       if (fetchedName.includes("JME")) { shopId = "JME"; break; }
                       if (fetchedName.includes("GRHE")) { shopId = "GRHE"; break; }
                     }
                   }
                   initOwnerListeners(shopId);
                 })
                 .catch(() => initOwnerListeners(shopId));
            } else {
              initOwnerListeners(shopId);
            }
          } else if (role === "mechanic") {
            // Mechanic: listen to personal notifications + assigned bookings count
            const notifQuery = query(collection(db, "notifications"), where("userId", "==", firebaseUser.uid), where("read", "==", false));
            notifUnsub = onSnapshot(notifQuery, (snapshot) => setUnreadAlertsCount(snapshot.size));

            // Track pending/active assigned bookings
            const jobQuery1 = query(collection(db, "bookings"), where("mechanicId", "==", firebaseUser.uid), where("status", "==", "Pending"));
            const jobQuery2 = query(collection(db, "bookings"), where("assignedMechanicId", "==", firebaseUser.uid), where("status", "==", "Pending"));
            // Use first query for live count (both overlap is okay for badge)
            bookingsUnsub = onSnapshot(jobQuery1, (snap) => setAssignedJobsCount(snap.size));
          } else {
             const notifQuery = query(collection(db, "notifications"), where("userId", "==", firebaseUser.uid), where("read", "==", false));
             notifUnsub = onSnapshot(notifQuery, (snapshot) => setUnreadAlertsCount(snapshot.size));
          }
        }
      } catch (e) {
        console.error("UserContext fetch error:", e);
      }
      setLoadingUser(false);
    });
    return () => {
      unsub();
      if (notifUnsub) notifUnsub();
      if (bookingsUnsub) bookingsUnsub();
    };
  }, []);

  // Call this after saving profile to instantly update the avatar everywhere
  const refreshUserProfile = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    try {
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (snap.exists()) {
        const d = snap.data();
        setUserProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: d.displayName || firebaseUser.displayName || "User",
          photoURL: d.photoURL || firebaseUser.photoURL || "",
          role: d.role || "Customer",
          phone: d.phone || "",
          address: d.address || "",
          status: d.status || "pending",
        });
      }
    } catch (e) {
      console.error("refreshUserProfile error:", e);
    }
  };

  return (
    <UserContext.Provider value={{ userProfile, loadingUser, refreshUserProfile, setUserProfile, unreadAlertsCount, pendingBookingsCount, assignedJobsCount }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}