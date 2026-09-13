import React from "react";
import DesktopAdminShops from "./desktop/DesktopAdminShops";
import { useUser } from "../UserContext";
import { Navigate } from "react-router-dom";

export default function AdminShops() {
  const { userProfile, loadingUser } = useUser();

  if (loadingUser) return null;

  if (userProfile?.role?.toLowerCase() === "admin") {
    return <DesktopAdminShops />;
  }

  // Non-admins shouldn't access this screen
  return <Navigate to="/dashboard" replace />;
}
