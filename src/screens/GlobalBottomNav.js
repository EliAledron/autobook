import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { colors } from "./dashboardShared";
import { useUser } from "../UserContext";

// ─── SVG Icon Components ───────────────────────────────────────────────────────
const IconHome = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? colors.navy : "#9ca3af"} strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const IconUsers = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? colors.navy : "#9ca3af"} strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="4" />
    <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
    <path d="M16 3.13a4 4 0 010 7.75" />
    <path d="M21 21v-2a4 4 0 00-3-3.87" />
  </svg>
);

const IconFeed = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? colors.navy : "#9ca3af"} strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h16M4 10h16M4 14h10M4 18h7" />
  </svg>
);

const IconBell = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? colors.navy : "#9ca3af"} strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

const IconWrench = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? colors.navy : "#9ca3af"} strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
  </svg>
);

const IconClipboard = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? colors.navy : "#9ca3af"} strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12h6M9 16h4" />
  </svg>
);

const IconProfile = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? colors.navy : "#9ca3af"} strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const IconWrench2 = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? colors.navy : "#9ca3af"} strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
  </svg>
);

const IconPin = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? colors.navy : "#9ca3af"} strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

// ─── Badge Component ───────────────────────────────────────────────────────────
const Badge = ({ count }) => {
  if (!count || count <= 0) return null;
  return (
    <span style={{
      position: "absolute", top: "2px", right: "2px",
      background: colors.danger, color: "#fff",
      fontSize: "9px", fontWeight: "700",
      borderRadius: "10px", padding: "1px 4px",
      minWidth: "14px", textAlign: "center",
      lineHeight: "14px", height: "14px",
      boxShadow: "0 1px 4px rgba(220,38,38,0.4)",
    }}>
      {count > 99 ? "99+" : count}
    </span>
  );
};

// ─── Nav Item Component ────────────────────────────────────────────────────────
const NavItem = ({ icon: Icon, label, isActive, onClick, badge }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "4px",
      cursor: "pointer",
      border: "none",
      background: "none",
      padding: "6px 4px",
      position: "relative",
      WebkitTapHighlightColor: "transparent",
    }}
  >
    {/* Icon pill — lights up when active */}
    <span style={{
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "44px",
      height: "28px",
      borderRadius: "14px",
      background: isActive ? "rgba(26,58,92,0.1)" : "transparent",
      transition: "background 0.2s ease",
    }}>
      <Icon active={isActive} />
      {badge !== undefined && <Badge count={badge} />}
    </span>

    {/* Label */}
    <span style={{
      fontSize: "10px",
      fontWeight: isActive ? "700" : "500",
      color: isActive ? colors.navy : "#9ca3af",
      letterSpacing: isActive ? "0.1px" : "0",
      transition: "all 0.2s ease",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {label}
    </span>

    {/* Active dot indicator */}
    {isActive && (
      <span style={{
        position: "absolute",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "20px",
        height: "3px",
        borderRadius: "0 0 3px 3px",
        background: colors.navy,
      }} />
    )}
  </button>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export default function GlobalBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, loadingUser, unreadAlertsCount, pendingBookingsCount } = useUser();

  const hiddenPaths = ["/", "/login", "/signup", "/pending", "/profile"];
  if (hiddenPaths.includes(location.pathname)) return null;
  if (loadingUser || !userProfile) return null;

  const role = (userProfile.role || "customer").toLowerCase();
  const path = location.pathname;

  const navStyle = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "#ffffff",
    borderTop: "1px solid #f1f5f9",
    boxShadow: "0 -8px 30px rgba(0,0,0,0.07)",
    display: "flex",
    padding: "0 8px 4px",
    zIndex: 100,
    paddingBottom: "calc(4px + env(safe-area-inset-bottom))",
  };

  // ─── OWNER / ADMIN NAV ───
  if (role === "owner" || role === "admin") {
    return (
      <div style={navStyle}>
        <NavItem
          icon={IconHome}
          label="Home"
          isActive={path === "/dashboard"}
          onClick={() => navigate("/dashboard")}
        />
        {role === "admin" && (
          <>
            <NavItem
              icon={IconUsers}
              label="Users"
              isActive={path === "/admin/users"}
              onClick={() => navigate("/admin/users")}
            />
            <NavItem
              icon={IconFeed}
              label="Feed"
              isActive={path === "/customer/feed"}
              onClick={() => navigate("/customer/feed")}
            />
            <NavItem
              icon={IconBell}
              label="Alerts"
              isActive={path === "/admin/alerts"}
              onClick={() => navigate("/admin/alerts")}
              badge={unreadAlertsCount}
            />
          </>
        )}
        {role === "owner" && (
          <>
            <NavItem
              icon={IconWrench}
              label="Mechanic"
              isActive={path === "/admin/mechanics"}
              onClick={() => navigate("/admin/mechanics")}
            />
            <NavItem
              icon={IconClipboard}
              label="Bookings"
              isActive={path === "/admin/bookings"}
              onClick={() => navigate("/admin/bookings")}
              badge={pendingBookingsCount}
            />
            <NavItem
              icon={IconBell}
              label="Alerts"
              isActive={path === "/admin/alerts"}
              onClick={() => navigate("/admin/alerts")}
              badge={unreadAlertsCount}
            />
          </>
        )}
      </div>
    );
  }

  // ─── MECHANIC NAV ───
  if (role === "mechanic") {
    return (
      <div style={navStyle}>
        <NavItem
          icon={IconHome}
          label="Home"
          isActive={path === "/mechanic/dashboard" || path === "/dashboard"}
          onClick={() => navigate("/mechanic/dashboard")}
        />
        <NavItem
          icon={IconWrench2}
          label="Jobs"
          isActive={path === "/mechanic/bookings"}
          onClick={() => navigate("/mechanic/bookings")}
          badge={unreadAlertsCount}
        />
        <NavItem
          icon={IconPin}
          label="Requests"
          isActive={path === "/mechanic/requests"}
          onClick={() => navigate("/mechanic/requests")}
        />
        <NavItem
          icon={IconProfile}
          label="Profile"
          isActive={path === "/profile"}
          onClick={() => navigate("/profile")}
        />
      </div>
    );
  }

  // ─── CUSTOMER NAV ───
  return (
    <div style={navStyle}>
      <NavItem
        icon={IconHome}
        label="Home"
        isActive={path === "/customer/dashboard"}
        onClick={() => navigate("/customer/dashboard")}
      />
      <NavItem
        icon={IconFeed}
        label="Feed"
        isActive={path === "/customer/feed"}
        onClick={() => navigate("/customer/feed")}
      />
      <NavItem
        icon={IconBell}
        label="Alerts"
        isActive={path === "/customer/alerts"}
        onClick={() => navigate("/customer/alerts")}
        badge={unreadAlertsCount}
      />
      <NavItem
        icon={IconProfile}
        label="Profile"
        isActive={path === "/profile"}
        onClick={() => navigate("/profile")}
      />
    </div>
  );
}
