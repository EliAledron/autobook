import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, updateDoc, doc, orderBy, query, writeBatch, where } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { sh, colors, getInitials, EmptyState } from "./dashboardShared";
import CarLoader from "./CarLoader";

const typeIcon = (type) => {
  switch (type) {
    case "job_started":            return "🔧";
    case "job_completed":          return "✅";
    case "job_cancelled":          return "❌";
    case "mechanic_availability":  return "🟢";
    case "booking_created":        return "📅";
    case "job_assigned":           return "📋";
    case "new_user":               return "👤";
    case "visit_request":          return "📍";
    case "new_rating":             return "⭐";
    default:                       return "🔔";
  }
};

const typeBg = (type) => {
  switch (type) {
    case "job_started":            return colors.infoBg;
    case "job_completed":          return colors.successBg;
    case "job_cancelled":          return colors.dangerBg;
    case "mechanic_availability":  return colors.warningBg;
    case "booking_created":        return colors.infoBg;
    case "job_assigned":           return colors.infoBg;
    case "new_user":               return colors.warningBg;
    case "visit_request":          return colors.warningBg;
    case "new_rating":             return colors.warningBg;
    default:                       return colors.bg;
  }
};

const typeColor = (type) => {
  switch (type) {
    case "job_started":            return colors.info;
    case "job_completed":          return colors.success;
    case "job_cancelled":          return colors.danger;
    case "mechanic_availability":  return colors.warning;
    case "booking_created":        return colors.info;
    case "job_assigned":           return colors.info;
    case "new_user":               return colors.warning;
    case "visit_request":          return colors.warning;
    case "new_rating":             return colors.warning;
    default:                       return colors.textMuted;
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

export default function AdminAlerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { navigate("/login"); return; }
      const { getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      let userObj = { id: firebaseUser.uid };
      if (snap.exists()) userObj = { ...userObj, ...snap.data() };
      setCurrentUser(userObj);
      await loadAlerts(userObj);
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const loadAlerts = async (userObj) => {
    const isAdmin = (userObj?.role || "").toLowerCase() === "admin";
    let shopId = userObj?.shopId;

    if (!isAdmin && userObj?.shopName) {
      const sName = userObj.shopName.toUpperCase();
      if (sName.includes("JME")) shopId = "JME";
      else if (sName.includes("GRHE")) shopId = "GRHE";
    }

    try {
      if (!isAdmin && userObj?.id) {
        try {
          const sQuery = query(collection(db, "shops"), where("ownerId", "==", userObj.id));
          const sSnap = await getDocs(sQuery);
          if (!sSnap.empty) {
            if (!shopId) shopId = sSnap.docs[0].id;
            for (const docSnap of sSnap.docs) {
              const fetchedName = (docSnap.data().name || "").toUpperCase();
              if (fetchedName.includes("JME")) { shopId = "JME"; break; }
              if (fetchedName.includes("GRHE")) { shopId = "GRHE"; break; }
            }
          }
        } catch(e) {}
      }

      const q = isAdmin
        ? query(collection(db, "adminAlerts"), where("type", "==", "new_user"), orderBy("createdAt", "desc"))
        : query(collection(db, "adminAlerts"), where("shopId", "==", shopId || ""), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      // Fallback without orderBy if index not ready
      try {
        const q2 = isAdmin
          ? query(collection(db, "adminAlerts"), where("type", "==", "new_user"))
          : query(collection(db, "adminAlerts"), where("shopId", "==", shopId || ""));
        const snap2 = await getDocs(q2);
        const sorted = snap2.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setAlerts(sorted);
      } catch (e2) { setAlerts([]); }
    }
  };

  const markRead = async (id) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
    try {
      await updateDoc(doc(db, "adminAlerts", id), { read: true });
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    const unread = alerts.filter((a) => !a.read);
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    try {
      const batch = writeBatch(db);
      unread.forEach((a) => batch.update(doc(db, "adminAlerts", a.id), { read: true }));
      await batch.commit();
    } catch (e) { console.error(e); }
  };

  const unreadCount = alerts.filter((a) => !a.read).length;
  const unreadAlerts = alerts.filter((a) => !a.read);
  const readAlerts = alerts.filter((a) => a.read);

  const AlertRow = ({ a, i, arr, isUnread }) => (
    <div
      key={a.id}
      style={{
        display: "flex", gap: "12px", padding: "0.75rem 0",
        borderBottom: i < arr.length - 1 ? `1px solid ${colors.border}` : "none",
        cursor: isUnread ? "pointer" : "default",
        opacity: isUnread ? 1 : 0.6,
      }}
      onClick={() => isUnread && markRead(a.id)}
    >
      <div style={{
        width: "42px", height: "42px", borderRadius: "12px",
        background: typeBg(a.type),
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "18px", flexShrink: 0,
        border: isUnread ? `1.5px solid ${typeColor(a.type)}` : "none",
      }}>
        {typeIcon(a.type)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontWeight: isUnread ? "700" : "600", fontSize: "13px", color: colors.textPrimary, flex: 1, paddingRight: "8px" }}>
            {a.title}
          </div>
          <div style={{ fontSize: "10px", color: colors.textMuted, whiteSpace: "nowrap" }}>{timeAgo(a.createdAt)}</div>
        </div>
        <div style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "3px", lineHeight: "1.4" }}>
          {a.message}
        </div>
        {/* Quick-action shortcuts */}
        {isUnread && (a.type === "job_started" || a.type === "job_completed" || a.type === "job_cancelled") && (
          <button
            onClick={(e) => { e.stopPropagation(); markRead(a.id); navigate("/admin/bookings"); }}
            style={{
              marginTop: "6px", padding: "4px 10px", fontSize: "11px",
              fontWeight: "600", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
              color: "#fff", border: "none", borderRadius: "8px",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            View Booking →
          </button>
        )}
        {isUnread && a.type === "mechanic_availability" && (
          <button
            onClick={(e) => { e.stopPropagation(); markRead(a.id); navigate("/admin/mechanics"); }}
            style={{
              marginTop: "6px", padding: "4px 10px", fontSize: "11px",
              fontWeight: "600", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
              color: "#fff", border: "none", borderRadius: "8px",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            View Mechanics →
          </button>
        )}
        {isUnread && a.type === "new_user" && (
          <button
            onClick={(e) => { e.stopPropagation(); markRead(a.id); navigate("/admin/users"); }}
            style={{
              marginTop: "6px", padding: "4px 10px", fontSize: "11px",
              fontWeight: "600", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
              color: "#fff", border: "none", borderRadius: "8px",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Review Users →
          </button>
        )}
        {isUnread && a.type === "visit_request" && (
          <button
            onClick={(e) => { e.stopPropagation(); markRead(a.id); navigate("/mechanic/requests"); }}
            style={{
              marginTop: "6px", padding: "4px 10px", fontSize: "11px",
              fontWeight: "600", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
              color: "#fff", border: "none", borderRadius: "8px",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            View Requests →
          </button>
        )}
        {isUnread && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: typeColor(a.type), marginTop: "6px" }} />}
      </div>
    </div>
  );

  return (
    <div style={sh.page}>
      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: "none", border: "none", color: colors.accent, fontSize: "18px", cursor: "pointer", padding: 0 }}
          >
            ←
          </button>
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

      {/* HERO */}
      <div style={sh.hero}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>{currentUser?.role || "Owner"}</span></div>
        <div style={sh.heroGreeting}>System Alerts</div>
        <div style={sh.heroSub}>
          {unreadCount > 0
            ? `${unreadCount} new alert${unreadCount > 1 ? "s" : ""} need your attention`
            : "All caught up! No new alerts."}
        </div>
      </div>

      <div style={sh.content}>
        {loading ? (
          <CarLoader text="Loading alerts" />
        ) : alerts.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="No system alerts yet"
            subtitle="Activity from mechanics and bookings will appear here."
          />
        ) : (
          <>
            {unreadAlerts.length > 0 && (
              <>
                <div style={sh.sectionLabel}>New ({unreadAlerts.length})</div>
                <div style={sh.card}>
                  {unreadAlerts.map((a, i) => (
                    <AlertRow key={a.id} a={a} i={i} arr={unreadAlerts} isUnread={true} />
                  ))}
                </div>
              </>
            )}

            {readAlerts.length > 0 && (
              <>
                <div style={sh.sectionLabel}>Earlier</div>
                <div style={sh.card}>
                  {readAlerts.map((a, i) => (
                    <AlertRow key={a.id} a={a} i={i} arr={readAlerts} isUnread={false} />
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