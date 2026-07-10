import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import CarLoader from "./CarLoader";
import CustomerDashboard from "./CustomerDashboard";
import OwnerDashboard from "./OwnerDashboard";
import MechanicDashboard from "./MechanicDashboard";

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
      if (!firebaseUser) { navigate("/"); return; }

      const snap = await getDoc(doc(db, "users", firebaseUser.uid));

      if (snap.exists()) {
        const data = snap.data();

        if (data.status !== "approved") {
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

        setUser({
          name: resolveName(data.displayName, firebaseUser.displayName),
          email: firebaseUser.email,
          role: data.role || "Customer",
          uid: firebaseUser.uid,
          shopId: shopId || null,
          shopName: data.shopName || shopId || null,
        });
      } else {
        setUser({
          name: resolveName(null, firebaseUser.displayName),
          email: firebaseUser.email,
          role: "Customer",
          uid: firebaseUser.uid,
        });
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

  // Owner covers both "owner" and legacy "admin" roles
  if (role === "owner" || role === "admin") return <OwnerDashboard {...props} />;
  if (role === "mechanic") return <MechanicDashboard {...props} />;
  return <CustomerDashboard {...props} />;
}
