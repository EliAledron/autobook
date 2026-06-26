import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sh, colors } from "./dashboardShared";
import { useUser } from "../UserContext";

export default function GlobalBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, loadingUser, unreadAlertsCount, pendingBookingsCount } = useUser();

  // Hide bottom nav entirely on auth and onboarding screens
  const hiddenPaths = ["/", "/login", "/signup", "/pending", "/profile"];
  if (hiddenPaths.includes(location.pathname)) return null;

  // Don't render until profile is loaded
  if (loadingUser || !userProfile) return null;

  const role = (userProfile.role || "customer").toLowerCase();
  const path = location.pathname;

  const getStyle = (isActive) => (isActive ? sh.navLabelActive : sh.navLabel);

  const renderBadge = (count) => {
    if (!count || count <= 0) return null;
    return (
      <span style={{
        position: "absolute", top: "-4px", right: "-6px",
        background: colors.danger, color: "#fff",
        fontSize: "9px", fontWeight: "700",
        borderRadius: "10px", padding: "1px 4px",
        minWidth: "14px", textAlign: "center"
      }}>
        {count}
      </span>
    );
  };

  // ─── OWNER / ADMIN NAV ───
  if (role === "owner" || role === "admin") {
    return (
      <div style={{ ...sh.bottomNav, display: "flex" }}>
        <button style={sh.navItem} onClick={() => navigate("/dashboard")}>
          <span style={sh.navIcon}>🏠</span>
          <span style={getStyle(path === "/dashboard")}>Home</span>
        </button>
        {role === "admin" && (
          <>
            <button style={sh.navItem} onClick={() => navigate("/admin/users")}>
              <span style={sh.navIcon}>👥</span>
              <span style={getStyle(path === "/admin/users")}>Users</span>
            </button>
            <button style={sh.navItem} onClick={() => navigate("/customer/feed")}>
              <span style={sh.navIcon}>📰</span>
              <span style={getStyle(path === "/customer/feed")}>Feed</span>
            </button>
            <button style={sh.navItem} onClick={() => navigate("/admin/alerts")}>
              <span style={{ position: "relative", display: "inline-block" }}>
                <span style={sh.navIcon}>🔔</span>
                {renderBadge(unreadAlertsCount)}
              </span>
              <span style={getStyle(path === "/admin/alerts")}>Alerts</span>
            </button>
          </>
        )}
        {role === "owner" && (
          <>
            <button style={sh.navItem} onClick={() => navigate("/admin/mechanics")}>
              <span style={sh.navIcon}>👷</span>
              <span style={getStyle(path === "/admin/mechanics")}>Mechanic</span>
            </button>
            <button style={sh.navItem} onClick={() => navigate("/admin/bookings")}>
              <span style={{ position: "relative", display: "inline-block" }}>
                <span style={sh.navIcon}>📋</span>
                {renderBadge(pendingBookingsCount)}
              </span>
              <span style={getStyle(path === "/admin/bookings")}>Bookings</span>
            </button>
            <button style={sh.navItem} onClick={() => navigate("/admin/alerts")}>
              <span style={{ position: "relative", display: "inline-block" }}>
                <span style={sh.navIcon}>🔔</span>
                {renderBadge(unreadAlertsCount)}
              </span>
              <span style={getStyle(path === "/admin/alerts")}>Alerts</span>
            </button>
          </>
        )}
      </div>
    );
  }

  // ─── CUSTOMER NAV ───
  return (
    <div style={{ ...sh.bottomNav, display: "flex" }}>
      <button style={sh.navItem} onClick={() => navigate("/customer/dashboard")}>
        <span style={sh.navIcon}>🏠</span>
        <span style={getStyle(path === "/customer/dashboard")}>Home</span>
      </button>
      <button style={sh.navItem} onClick={() => navigate("/customer/feed")}>
        <span style={sh.navIcon}>📰</span>
        <span style={getStyle(path === "/customer/feed")}>Feed</span>
      </button>
      <button style={sh.navItem} onClick={() => navigate("/customer/alerts")}>
        <span style={{ position: "relative", display: "inline-block" }}>
          <span style={sh.navIcon}>🔔</span>
          {renderBadge(unreadAlertsCount)}
        </span>
        <span style={getStyle(path === "/customer/alerts")}>Alerts</span>
      </button>
      <button style={sh.navItem} onClick={() => navigate("/profile")}>
        <span style={sh.navIcon}>👤</span>
        <span style={getStyle(path === "/profile")}>Profile</span>
      </button>
    </div>
  );
}