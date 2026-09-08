import React from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../UserContext";
import AdminLayout from "./AdminLayout";
import DesktopOnly from "./DesktopOnly";
import { sh } from "../screens/dashboardShared";

export default function RoleBasedWrapper({ children, title, onBack }) {
  const { userProfile, loadingUser } = useUser();
  const navigate = useNavigate();

  if (loadingUser) return null;

  const role = (userProfile?.role || "").toLowerCase();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  // For Super Admins: Wrap in DesktopOnly + AdminLayout. Hide the mobile topbar.
  if (role === "admin") {
    return (
      <DesktopOnly>
        <AdminLayout>
          {children}
        </AdminLayout>
      </DesktopOnly>
    );
  }

  // For Owners: Keep the traditional mobile-style page with Topbar
  return (
    <div style={sh.page}>
      <div style={sh.topbar}>
        <button onClick={handleBack} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div style={sh.topbarLogo}>{title}</div>
        <div style={{ width: "24px" }} />
      </div>
      {children}
    </div>
  );
}
