import React from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../UserContext";
import AdminLayout from "./AdminLayout";
import DesktopOnly from "./DesktopOnly";
import BackButton from "./BackButton";
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BackButton onClick={handleBack} />
        </div>
      </div>
      {children}
    </div>
  );
}
