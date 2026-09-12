import React, { useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot, orderBy, writeBatch, doc, limit } from "firebase/firestore";
import { colors } from "../screens/dashboardShared";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(list);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      if (!n.read) {
        batch.update(doc(db, "notifications", n.id), { read: true });
      }
    });
    try {
      await batch.commit();
    } catch (e) {
      console.error("Error marking all as read", e);
    }
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      markAllAsRead(); // Mark as read when opening
    }
    setIsOpen(!isOpen);
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        style={{
          background: "transparent", border: "none", cursor: "pointer",
          position: "relative", width: "40px", height: "40px",
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "50%", transition: "background 0.2s",
          color: colors.textPrimary, marginRight: "12px"
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <div style={{
            position: "absolute", top: "6px", right: "6px",
            background: colors.danger, color: "#fff",
            fontSize: "10px", fontWeight: "800",
            width: "18px", height: "18px", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 4px rgba(220,38,38,0.4)"
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: "absolute", top: "50px", right: "0",
          width: "320px", background: "#fff",
          borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
          border: `1px solid ${colors.border}`, zIndex: 1000,
          overflow: "hidden", animation: "ab-fade-in 0.2s ease-out"
        }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "16px", fontWeight: "800", color: colors.textPrimary }}>Notifications</div>
          </div>
          
          <div style={{ maxHeight: "360px", overflowY: "auto", padding: "8px 0" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: colors.textSecondary, fontSize: "14px" }}>
                You have no notifications right now.
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{ 
                  padding: "16px 20px", borderBottom: `1px solid ${colors.border}`,
                  background: n.read ? "transparent" : "rgba(42,82,152,0.03)",
                  transition: "background 0.2s"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: colors.textPrimary }}>{n.title}</div>
                    <div style={{ fontSize: "11px", color: colors.textSecondary, whiteSpace: "nowrap", marginLeft: "12px" }}>{formatTime(n.createdAt)}</div>
                  </div>
                  <div style={{ fontSize: "13px", color: colors.textSecondary, lineHeight: "1.4" }}>
                    {n.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
