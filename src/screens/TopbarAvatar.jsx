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
  const { userProfile } = useUser();
  const photo = userProfile?.photoURL;
  const name = userProfile?.displayName || "";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
    <div
      onClick={onClick}
      className="touch-feedback"
      style={{
        width: size + 6,
        height: size + 6,
        borderRadius: "50%",
        background: `linear-gradient(45deg, ${colors.accent}, ${colors.blue}, #8b5cf6)`,
        padding: "2.5px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        boxShadow: "0 4px 12px rgba(37,99,235,0.25)"
      }}
    >
      <div
        style={{
          ...sh.avatar,
          width: "100%",
          height: "100%",
          overflow: "hidden",
          padding: 0,
          background: photo ? "#fff" : `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
          border: "2px solid #fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt="avatar"
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
          />
        ) : (
          <span style={{ fontSize: size * 0.35, fontWeight: "800", color: "#fff" }}>
            {getInitials(name)}
          </span>
        )}
      </div>
    </div>
    </div>
  );
}
