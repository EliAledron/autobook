import React from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { sh, colors } from "./dashboardShared";

export default function Restricted() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={sh.page}>
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
        <button onClick={handleLogout} style={{ ...sh.outlineBtn, borderColor: colors.danger, color: colors.danger }}>Logout</button>
      </div>

      <div style={sh.hero}>
        <div style={{ ...sh.rolePill, background: "rgba(239, 68, 68, 0.15)" }}>
          <div style={{ ...sh.roleDot, background: colors.danger }} />
          <span style={{ ...sh.roleText, color: colors.danger }}>Account Restricted</span>
        </div>
        <div style={sh.heroGreeting}>Access Denied</div>
        <div style={sh.heroSub}>Your account has been restricted.</div>
      </div>

      <div style={sh.content}>
        <div style={{ background: colors.white, borderRadius: "20px", padding: "40px 20px", textAlign: "center", border: `1px solid ${colors.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "60px", marginBottom: "16px" }}>🚫</div>
          <h2 style={{ color: colors.textPrimary, margin: "0 0 16px 0", fontSize: "20px", fontWeight: "800" }}>Your account is restricted.</h2>
          <p style={{ color: colors.textSecondary, fontSize: "15px", lineHeight: "1.6", maxWidth: "400px", margin: "0 auto" }}>
            We've temporarily disabled your access due to a violation of our terms of service or multiple community reports. 
            <br/><br/>
            Please contact AutoBook Support to resolve this issue.
          </p>
        </div>
      </div>
    </div>
  );
}
