import React from "react";
import { Bell } from "lucide-react";

export default function NotificationBell() {
  return (
    <div style={{ position: "relative", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", borderRadius: "50%", background: "#f1f5f9", color: "#64748b" }}>
      <Bell size={20} />
    </div>
  );
}
