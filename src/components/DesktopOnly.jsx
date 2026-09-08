import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Monitor } from "lucide-react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { colors } from "../screens/dashboardShared";
import { useUser } from "../UserContext";

export default function DesktopOnly({ children }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();
  const { userProfile } = useUser();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const isAdmin = (userProfile?.role || "").toLowerCase() === "admin";

  if (isMobile && isAdmin) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        height: "100vh", backgroundColor: colors.bg, padding: "2rem", textAlign: "center", fontFamily: "Inter, sans-serif",
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999
      }}>
        <div style={{ background: colors.white, padding: "2rem", borderRadius: "24px", boxShadow: "0 8px 30px rgba(0,0,0,0.05)", maxWidth: "400px", width: "100%" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: colors.dangerBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
            <Monitor size={32} color={colors.danger} />
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: "800", color: colors.textPrimary, marginBottom: "0.5rem" }}>Desktop Required</h2>
          <p style={{ fontSize: "15px", color: colors.textSecondary, lineHeight: 1.5, marginBottom: "2rem" }}>
            The admin dashboard is only accessible on desktop devices. Please log in from a computer to continue, or switch to a customer account for mobile access.
          </p>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "16px", borderRadius: "16px", background: colors.navy, color: "#fff",
            fontSize: "16px", fontWeight: "700", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer"
          }}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
