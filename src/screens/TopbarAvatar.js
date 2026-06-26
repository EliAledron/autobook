import React from "react";
import { useUser } from "../UserContext";
import { getInitials, colors, sh } from "./dashboardShared";

/**
 * Drop-in avatar for any topbar.
 * Reads photo + name from the global UserContext so it
 * updates instantly everywhere when the profile is saved.
 *
 * Usage:
 *   import TopbarAvatar from "./TopbarAvatar";
 *   <TopbarAvatar onClick={() => navigate("/profile")} />
 */
export default function TopbarAvatar({ onClick, size = 34 }) {
  const { userProfile, unreadAlertsCount } = useUser();
  const photo = userProfile?.photoURL;
  const name = userProfile?.displayName || "";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
    <div
      onClick={onClick}
      style={{
        ...sh.avatar,
        width: size,
        height: size,
        overflow: "hidden",
        padding: 0,
        flexShrink: 0,
        cursor: "pointer",
      }}
    >
      {photo ? (
        <img
          src={photo}
          alt="avatar"
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
        />
      ) : (
        <span style={{ fontSize: size * 0.35, fontWeight: "700", color: colors.navy }}>
          {getInitials(name)}
        </span>
      )}
    </div>
      {unreadAlertsCount > 0 && (
        <div style={{
          position: "absolute",
          top: "-4px",
          right: "-4px",
          background: colors.danger,
          color: "#fff",
          fontSize: "9px",
          fontWeight: "800",
          height: "16px",
          minWidth: "16px",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `2px solid ${colors.navy}`,
          padding: "0 3px",
          boxSizing: "border-box",
          pointerEvents: "none"
        }}>
          {unreadAlertsCount > 99 ? "99+" : unreadAlertsCount}
        </div>
      )}
    </div>
  );
}