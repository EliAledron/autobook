import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, updateDoc, doc, orderBy, writeBatch } from "firebase/firestore";
import { sh, colors, EmptyState } from "./dashboardShared";
import CarLoader from "./CarLoader";

const typeIcon = (type) => {
  switch (type) {
    case "booking_confirmed": return "🎉";
    case "booking_cancelled": return "❌";
    case "visit_request":     return "📍";
    case "request_sent":      return "✅";
    case "status_update":     return "🔧";
    case "request_update":    return "📢";
    default:                  return "🔔";
  }
};

const typeBg = (type) => {
  switch (type) {
    case "booking_confirmed": return colors.successBg;
    case "booking_cancelled": return colors.dangerBg;
    case "visit_request":     return colors.warningBg;
    case "request_sent":      return colors.successBg;
    case "status_update":     return colors.infoBg;
    case "request_update":    return colors.infoBg;
    default:                  return colors.bg;
  }
};

function timeAgo(timestamp) {
  if (!timestamp?.seconds) return "";
  const diff = Date.now() - timestamp.seconds * 1000;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Alerts() {
  const navigate = useNavigate();
  const [uid, setUid] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/login"); return; }
      setUid(u.uid);
      await loadNotifications(u.uid);
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const loadNotifications = async (userId) => {
    // Try with orderBy first (requires composite index).
    // Falls back to a simple query + JS sort if the index isn't ready yet.
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn("Notifications index not ready, falling back:", e.message);
      try {
        const q2 = query(collection(db, "notifications"), where("userId", "==", userId));
        const snap2 = await getDocs(q2);
        const sorted = snap2.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setNotifications(sorted);
      } catch (e2) {
        setNotifications([]);
      }
    }
  };

  const markRead = async (id) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    if (!uid) return;
    const unread = notifications.filter((n) => !n.read);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => batch.update(doc(db, "notifications", n.id), { read: true }));
      await batch.commit();
    } catch (e) { console.error(e); }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div style={sh.page}>
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: colors.accent, fontSize: "18px", cursor: "pointer", padding: 0 }}>←</button>
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: "11px", fontWeight: "600", padding: "5px 12px", borderRadius: "20px", cursor: "pointer", fontFamily: "inherit" }}
          >
            Mark all read
          </button>
        )}
      </div>

      <div style={sh.hero}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>Customer</span></div>
        <div style={sh.heroGreeting}>Notifications</div>
        <div style={sh.heroSub}>
          {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "You're all caught up!"}
        </div>
      </div>

      <div style={sh.content}>
        {loading ? (
          <CarLoader text="Loading alerts" />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="You're all caught up!"
            subtitle="Notifications about your bookings and maintenance will appear here."
          />
        ) : (
          <>
            {unreadCount > 0 && (
              <>
                <div style={sh.sectionLabel}>Unread ({unreadCount})</div>
                <div style={sh.card}>
                  {notifications.filter((n) => !n.read).map((n, i, arr) => (
                    <div
                      key={n.id}
                      style={{
                        display: "flex", gap: "12px", padding: "0.75rem 0",
                        borderBottom: i < arr.length - 1 ? `1px solid ${colors.border}` : "none",
                        cursor: "pointer",
                      }}
                      onClick={() => markRead(n.id)}
                    >
                      <div style={{
                        width: "40px", height: "40px", borderRadius: "12px",
                        background: typeBg(n.type), display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: "18px", flexShrink: 0,
                      }}>
                        {typeIcon(n.type)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ fontWeight: "700", fontSize: "13px", color: colors.textPrimary, flex: 1, paddingRight: "8px" }}>
                            {n.title}
                          </div>
                          <div style={{ fontSize: "10px", color: colors.textMuted, whiteSpace: "nowrap" }}>{timeAgo(n.createdAt)}</div>
                        </div>
                        <div style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "3px", lineHeight: "1.4" }}>
                          {n.message}
                        </div>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.info, marginTop: "6px" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {notifications.filter((n) => n.read).length > 0 && (
              <>
                <div style={sh.sectionLabel}>Earlier</div>
                <div style={sh.card}>
                  {notifications.filter((n) => n.read).map((n, i, arr) => (
                    <div
                      key={n.id}
                      style={{
                        display: "flex", gap: "12px", padding: "0.75rem 0",
                        borderBottom: i < arr.length - 1 ? `1px solid ${colors.border}` : "none",
                        opacity: 0.65,
                      }}
                    >
                      <div style={{
                        width: "40px", height: "40px", borderRadius: "12px",
                        background: typeBg(n.type), display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: "18px", flexShrink: 0,
                      }}>
                        {typeIcon(n.type)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ fontWeight: "600", fontSize: "13px", color: colors.textPrimary, flex: 1, paddingRight: "8px" }}>{n.title}</div>
                          <div style={{ fontSize: "10px", color: colors.textMuted, whiteSpace: "nowrap" }}>{timeAgo(n.createdAt)}</div>
                        </div>
                        <div style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "3px", lineHeight: "1.4" }}>{n.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

    </div>
  );
}