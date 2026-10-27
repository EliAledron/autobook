import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import CarLoader from "./CarLoader";
import CustomerDashboard from "./CustomerDashboard";
import OwnerDashboard from "./OwnerDashboard";
import MechanicDashboard from "./MechanicDashboard";
import AdminDashboard from "./AdminDashboard";
import DesktopOnly from "../components/DesktopOnly";

function isEmail(str) {
  return typeof str === "string" && str.includes("@");
}

function resolveName(a, b) {
  if (a && !isEmail(a)) return a;
  if (b && !isEmail(b)) return b;
  return "User";
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // In dev mode allow bypassing auth to view admin dashboard
        if (import.meta.env.DEV) {
          setUser({ name: "Dev Admin", email: "dev@admin.local", role: "admin", uid: "dev", shopId: null });
          setLoading(false);
        } else {
          navigate("/");
        }
        return;
      }

      const snap = await getDoc(doc(db, "users", firebaseUser.uid));

      if (snap.exists()) {
        const data = snap.data();

        if (data.status === "restricted") {
          navigate("/restricted");
          return;
        }

        // Must be email verified first (except admin, or if already approved by admin)
        const isVerified = firebaseUser.emailVerified || data.emailVerified === true || data.status === "approved";
        if (!isVerified && (data.role || "").toLowerCase() !== "admin") {
          navigate("/pending");
          return;
        }

        if (data.status !== "approved" && (data.role || "").toLowerCase() !== "admin") {
          navigate("/pending");
          return;
        }

        let shopId = data.shopId;
        if (data.role && data.role.toLowerCase() === "owner" && data.shopName) {
          const sName = data.shopName.toUpperCase();
          if (sName.includes("JME")) shopId = "JME";
          else if (sName.includes("GRHE")) shopId = "GRHE";
          else if (!shopId) shopId = data.shopName;
        }

        // Auto-bring owner to shop setup screen if their profile has not been initialized
        if ((data.role || "").toLowerCase() === "owner") {
          let targetShop = null;
          let targetShopId = shopId || data.shopId;
          if (targetShopId) {
            try {
              const sSnap = await getDoc(doc(db, "shops", targetShopId));
              if (sSnap.exists()) targetShop = { id: sSnap.id, ...sSnap.data() };
            } catch (e) {}
          }
          if (!targetShop) {
            try {
              const sQuery = query(collection(db, "shops"), where("ownerId", "==", firebaseUser.uid));
              const sSnap = await getDocs(sQuery);
              if (!sSnap.empty) {
                targetShop = { id: sSnap.docs[0].id, ...sSnap.docs[0].data() };
                targetShopId = sSnap.docs[0].id;
              }
            } catch (e) {}
          }

          if (targetShop && !targetShop.isSetupCompleted && (!targetShop.services || targetShop.services.length === 0)) {
            navigate("/customer/shop-profile", {
              replace: true,
              state: {
                shop: targetShop,
                shopId: targetShopId,
                isOwner: true,
                openEdit: true,
                isFirstSetup: true
              }
            });
            return;
          }
        }

        setUser({
          name: resolveName(data.displayName, firebaseUser.displayName),
          email: firebaseUser.email,
          role: data.role || "Customer",
          uid: firebaseUser.uid,
          shopId: shopId || null,
          shopName: data.shopName || shopId || null,
        });
      } else {
        // Document does not exist yet (signup in progress or uninitialized profile)
        navigate("/pending");
        return;
      }

      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (loading) return <CarLoader text="Loading your dashboard" />;

  const props = { user, onLogout: handleLogout };
  const role = user?.role?.toLowerCase();

  if (role === "admin") {
    return (
      <DesktopOnly>
        <AdminDashboard {...props} />
      </DesktopOnly>
    );
  }
  
  if (role === "owner") return <OwnerDashboard {...props} />;
  
  if (role === "mechanic") return <MechanicDashboard {...props} />;
  
  return <CustomerDashboard {...props} />;
}
