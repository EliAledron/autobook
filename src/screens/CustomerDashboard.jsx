import React from "react";
import NotificationBell from "../components/NotificationBell";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { sh, colors, getGreeting, EmptyState } from "./dashboardShared";
import TopbarAvatar from "./TopbarAvatar";
import CarLoader from "./CarLoader";
import { Droplet, Settings, ShieldAlert, Snowflake, AlertTriangle, Calendar, Wrench } from "lucide-react";

// ─── Quick Action SVG Icons ────────────────────────────────────────────────────
const IcoBook    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
const IcoDiag    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>;
const IcoFeed    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 10h16M4 14h10M4 18h7"/></svg>;
const IcoSearch  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>;
const IcoCar     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>;
const IcoHistory = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>;
const IcoStar    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;

const QUICK_ACTIONS = [
  { id: "book",     Icon: IcoBook,    label: "Book a Service",   sub: "Schedule a repair",  path: "/customer/shop-select", iconColor: "#2a5298", iconBg: "#dbeafe" },
  // Hidden: { id: "checkup", Icon: IcoDiag, label: "Diagnostic Check", sub: "Analyze symptoms", path: "/customer/checkup", iconColor: "#7c3aed", iconBg: "#ede9fe" },
  { id: "reviews",  Icon: IcoStar,    label: "My Reviews",       sub: "Shops I've rated",   path: "/customer/reviews",     iconColor: "#7c3aed", iconBg: "#ede9fe" },
  { id: "feed",     Icon: IcoFeed,    label: "Shop Feed",        sub: "News & promos",      path: "/customer/feed",        iconColor: "#d97706", iconBg: "#fef3c7" },
  { id: "mechanic", Icon: IcoSearch,  label: "Find Mechanic",    sub: "Browse available",   path: "/customer/mechanics",   iconColor: "#059669", iconBg: "#d1fae5" },
  { id: "vehicles", Icon: IcoCar,     label: "My Vehicles",      sub: "Manage your cars",   path: "/customer/vehicles",    iconColor: "#1a3a5c", iconBg: "#e0f2fe" },
  { id: "history",  Icon: IcoHistory, label: "Bookings History", sub: "Past services",      path: "/customer/history",     iconColor: "#dc2626", iconBg: "#fee2e2" },
];

const keyframes = `
  @keyframes ab-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.3); }
  }
  @keyframes ab-ring {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  .customer-card {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .customer-list-item {
    transition: all 0.15s ease-in-out;
  }
  
  
  
  
  
  ::-webkit-scrollbar { display: none; }
`;

function PulseDot({ color = colors.danger, size = 9 }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: color, animation: "ab-ring 1.2s ease-out infinite" }} />
      <span style={{ width: size, height: size, borderRadius: "50%", background: color, animation: "ab-pulse 1.2s ease-in-out infinite", position: "relative" }} />
    </span>
  );
}

const statusStyle = (s) => {
  if ((s || "").toLowerCase() === "completed") return sh.badge(colors.successBg, colors.success);
  if ((s || "").toLowerCase() === "in progress") return sh.badge(colors.infoBg, colors.info);
  if ((s || "").toLowerCase() === "cancelled") return sh.badge(colors.dangerBg, colors.danger);
  return sh.badge(colors.warningBg, colors.warning);
};

const SectionTitle = ({ title, badge, action }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", marginTop: "2rem" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ width: "5px", height: "20px", borderRadius: "3px", background: colors.accent }}></div>
      <span style={{ fontSize: "18px", fontWeight: "800", color: colors.textPrimary, letterSpacing: "-0.3px" }}>{title}</span>
      {badge > 0 && (
        <span style={{ background: colors.danger, color: "#fff", fontSize: "11px", fontWeight: "800", borderRadius: "12px", padding: "3px 8px", boxShadow: "0 2px 6px rgba(220,38,38,0.3)" }}>{badge}</span>
      )}
    </div>
    {action}
  </div>
);

const MAINTENANCE_RULES = [
  { key: "oil",     label: "Oil Change",       icon: <Droplet size={22} />,    intervalDays: 180, keywords: ["oil"] },
  { key: "tire",    label: "Tire Rotation",    icon: <Settings size={22} />,   intervalDays: 365, keywords: ["tire"] },
  { key: "brake",   label: "Brake Inspection", icon: <ShieldAlert size={22} />,intervalDays: 365, keywords: ["brake"] },
  { key: "aircon",  label: "Aircon Cleaning",  icon: <Snowflake size={22} />,  intervalDays: 365, keywords: ["aircon", "air con", "ac "] },
  { key: "battery", label: "Battery Check",    icon: <AlertTriangle size={22} />, intervalDays: 730, keywords: ["battery"] },
  { key: "checkup", label: "General Checkup",  icon: <Wrench size={22} />,     intervalDays: 365, keywords: ["checkup", "general", "pms"] },
];

const getLastServiceDate = (bookings, keywords, vehicleId) => {
  const completed = bookings.filter(b => {
    if ((b.status || "").toLowerCase() !== "completed") return false;
    if (vehicleId && b.vehicleId && b.vehicleId !== vehicleId) return false;
    const sType = (b.serviceType || "").toLowerCase();
    return keywords.some(kw => sType.includes(kw.toLowerCase()));
  });
  if (completed.length === 0) return null;
  completed.sort((a, b) => {
    const tA = a.date ? new Date(a.date).getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
    const tB = b.date ? new Date(b.date).getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
    return tB - tA;
  });
  const best = completed[0];
  return best.date ? new Date(best.date) : (best.createdAt?.seconds ? new Date(best.createdAt.seconds * 1000) : null);
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (loading) return;
    setAnimate(false);
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { navigate("/login"); return; }
      
      let userData = {};
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (snap.exists()) {
        userData = snap.data();
        setUser({ id: snap.id, ...userData });
      }

      try {
        const bQuery = query(
          collection(db, "bookings"),
          where("customerId", "==", firebaseUser.uid),
          orderBy("createdAt", "desc")
        );
        const bSnap = await getDocs(bQuery);
        const fetchedBookings = bSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBookings(fetchedBookings);

        // --- FREE TIER BROWSER PUSH NOTIFICATIONS ---
        const now = Date.now();
        let updatesNeeded = false;
        const userUpdates = {};

        MAINTENANCE_RULES.forEach(rule => {
          const lastDate = getLastServiceDate(fetchedBookings, rule.keywords, null);
          if (lastDate) {
            const daysSince = Math.floor((now - lastDate.getTime()) / (1000 * 3600 * 24));
            const progress = Math.min(100, Math.max(0, Math.round((daysSince / rule.intervalDays) * 100)));

            if (progress >= 90) {
              const lastNotified = userData.lastMaintenanceAlerts?.[rule.key];
              const daysSinceLastAlert = lastNotified ? Math.floor((now - lastNotified) / (1000 * 3600 * 24)) : Infinity;

              if (daysSinceLastAlert > 30) {
                const alertTitle = `${rule.label} Due Soon!`;
                const alertBody = `Your ${rule.label} progress is at ${progress}%. It's recommended to book a service soon.`;

                // 1. Add to App Alerts
                addDoc(collection(db, "notifications"), { userId: firebaseUser.uid, title: alertTitle, message: alertBody, type: "status_update", read: false, createdAt: serverTimestamp() });

                // 2. Trigger FREE Native System Push Notification (Mobile Safe)
                try {
                  if ("Notification" in window && window.Notification) {
                    if (Notification.permission === "granted") {
                      new Notification(alertTitle, { body: alertBody });
                    } else if (Notification.permission !== "denied") {
                      Notification.requestPermission().then(permission => {
                        if (permission === "granted") new Notification(alertTitle, { body: alertBody });
                      }).catch(() => {}); // Catch older mobile browser promise rejections
                    }
                  }
                } catch (err) {
                  console.log("System notifications restricted in this mobile view.");
                }

                if (!userUpdates.lastMaintenanceAlerts) userUpdates.lastMaintenanceAlerts = { ...userData.lastMaintenanceAlerts };
                userUpdates.lastMaintenanceAlerts[rule.key] = now;
                updatesNeeded = true;
              }
            }
          }
        });

        if (updatesNeeded) await updateDoc(doc(db, "users", firebaseUser.uid), userUpdates);
        // --- END FREE TIER ---

        // Fetch customer's registered vehicles
        try {
          const vSnap = await getDocs(query(collection(db, "vehicles"), where("ownerId", "==", firebaseUser.uid)));
          const fetchedVehicles = vSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setVehicles(fetchedVehicles);
          if (fetchedVehicles.length > 0) setSelectedVehicleId(fetchedVehicles[0].id);
        } catch (e) { setVehicles([]); }

      } catch (e) { setBookings([]); }

      try {
        const nQuery = query(
          collection(db, "notifications"),
          where("userId", "==", firebaseUser.uid),
          where("read", "==", false)
        );
        const nSnap = await getDocs(nQuery);
        setUnreadCount(nSnap.size);
      } catch (e) { setUnreadCount(0); }

      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  if (loading) return <CarLoader text="Loading your dashboard" />;

  const firstName = user?.displayName?.split(" ")[0] || "there";
  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => (b.status || "Pending").toLowerCase() === "pending").length,
    inProgress: bookings.filter((b) => (b.status || "").toLowerCase() === "in progress").length,
    completed: bookings.filter((b) => (b.status || "").toLowerCase() === "completed").length,
    cancelled: bookings.filter((b) => (b.status || "").toLowerCase() === "cancelled").length,
  };

  return (
    <div style={sh.page}>
      <style>{keyframes}</style>

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        <div style={sh.topbarRight}>
          <div style={sh.topbarMeta}>
            <div style={sh.topbarName}>{user?.displayName}</div>
            <div>{user?.role}</div>
          </div>
          {/* Uses global context — updates instantly when profile photo changes */}
          <NotificationBell />
            <TopbarAvatar onClick={() => navigate("/profile")} />
        </div>
      </div>

      {/* HERO */}
      <div style={{ ...sh.hero, paddingBottom: "2.5rem", borderRadius: "0 0 24px 24px", marginBottom: "0", position: "relative", zIndex: 1, overflow: "hidden" }}>
        {/* Decorative icons */}
        <div style={{ position: "absolute", right: "-20px", top: "-20px", opacity: 0.08, transform: "rotate(30deg)", userSelect: "none", pointerEvents: "none" }}>
          <svg width="140" height="140" viewBox="0 0 24 24" fill="#fff"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
        </div>
        <div style={{ position: "absolute", right: "70px", bottom: "-30px", opacity: 0.05, transform: "rotate(-15deg)", userSelect: "none", pointerEvents: "none" }}>
          <svg width="100" height="100" viewBox="0 0 24 24" fill="#fff"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
        </div>

        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>Customer</span></div>
        <div style={{ fontSize: "24px", fontWeight: "800", color: "#fff", marginBottom: "0.25rem" }}>{getGreeting()}, {firstName}!</div>
        <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)" }}>Ready to book your next service?</div>
      </div>

      <div style={{ ...sh.content, paddingTop: "2rem", position: "relative", zIndex: 2 }} className="stagger-slide-up">

        {unreadCount > 0 && (
          <div className="customer-card" onClick={() => navigate("/customer/alerts")} style={{ background: colors.white, borderRadius: "16px", padding: "16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: `1px solid ${colors.border}` }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: colors.dangerBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PulseDot color={colors.danger} size={12} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "15px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>{unreadCount} unread notification{unreadCount > 1 ? "s" : ""}</div>
              <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500" }}>Tap to view alerts</div>
            </div>
            <div style={{ color: colors.textMuted, fontSize: "20px" }}>›</div>
          </div>
        )}

        <SectionTitle title="My Bookings" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "1.5rem" }}>
          <div style={{ ...sh.card, display: "flex", alignItems: "center", gap: "20px", marginBottom: 0 }}>
            <div style={{
              width: "120px", height: "60px", flexShrink: 0, position: "relative", overflow: "hidden",
              display: "flex", alignItems: "flex-end", justifyContent: "center"
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, width: "120px", height: "120px", borderRadius: "50%",
                background: stats.total > 0
                ? `conic-gradient(from 270deg,
                    ${colors.warning} 0% ${(stats.pending / stats.total) * 50}%,
                    ${colors.info} ${(stats.pending / stats.total) * 50}% ${((stats.pending + stats.inProgress) / stats.total) * 50}%,
                    ${colors.success} ${((stats.pending + stats.inProgress) / stats.total) * 50}% ${((stats.pending + stats.inProgress + stats.completed) / stats.total) * 50}%,
                    ${colors.danger} ${((stats.pending + stats.inProgress + stats.completed) / stats.total) * 50}% 50%,
                    transparent 50%
                  )`
                : `conic-gradient(from 270deg, ${colors.border} 0% 50%, transparent 50%)`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }} />
              {stats.total > 0 && (
                    <div style={{
                      position: "absolute", top: 0, left: 0, width: "100%", height: "200%", borderRadius: "50%",
                      background: colors.white,
                      clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)",
                      transform: `rotate(${animate ? 180 : 0}deg)`,
                      transformOrigin: "center center",
                      transition: "transform 1s cubic-bezier(0.16, 1, 0.3, 1)"
                    }} />
                  )}
              <div style={{
                    position: "absolute", bottom: 0, left: "50%", width: "4px", height: "100%",
                    background: "#111827", borderRadius: "4px 4px 0 0",
                    transformOrigin: "bottom center",
                    transform: `translateX(-50%) rotate(${animate ? 90 : -90}deg)`,
                    transition: "transform 1s cubic-bezier(0.16, 1, 0.3, 1)",
                    zIndex: 2
                  }}>
                    <div style={{
                      position: "absolute", bottom: "-4px", left: "-4px", width: "12px", height: "12px",
                      background: "#111827", borderRadius: "50%"
                    }} />
                  </div>
              <div style={{
                width: "80px", height: "40px", background: colors.white, borderRadius: "40px 40px 0 0",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                paddingBottom: "4px", position: "relative", zIndex: 3, boxShadow: "inset 0 4px 8px rgba(0,0,0,0.05)"
              }}>
                <span style={{ fontSize: "20px", fontWeight: "800", color: colors.textPrimary, lineHeight: 1 }}>{stats.total}</span>
                <span style={{ fontSize: "8px", color: colors.textSecondary, fontWeight: "700", marginTop: "2px" }}>JOBS</span>
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: colors.warning }}></div>
                  <span style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600" }}>Pending</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary }}>{stats.pending}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: colors.info }}></div>
                  <span style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600" }}>In Progress</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary }}>{stats.inProgress}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: colors.success }}></div>
                  <span style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600" }}>Completed</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary }}>{stats.completed}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: colors.danger }}></div>
                  <span style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600" }}>Cancelled</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary }}>{stats.cancelled}</span>
              </div>
            </div>
          </div>
        </div>

        <SectionTitle title="Quick Actions" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "1.5rem" }}>
          {QUICK_ACTIONS.map(({ id, Icon, label, sub, path, iconColor, iconBg }) => (
            <div
              key={id}
              className="customer-card"
              style={{ background: colors.white, borderRadius: "20px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "12px", cursor: "pointer", border: `1px solid ${colors.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
              onClick={() => navigate(path)}
            >
              <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor }}>
                <Icon />
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>{label}</div>
                <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "500" }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

      {/* MAINTENANCE ROADMAP */}
      <SectionTitle
        title="Maintenance Roadmap"
        action={
          <button onClick={() => navigate("/customer/vehicles")} style={{ background: "transparent", border: `1px solid ${colors.border}`, borderRadius: "10px", padding: "6px 12px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", color: colors.textSecondary }}>
            + Add Vehicle
          </button>
        }
      />

      {vehicles.length === 0 ? (
        /* No vehicles registered */
        <div style={{ background: colors.white, borderRadius: "20px", padding: "32px 20px", textAlign: "center", border: `1px solid ${colors.border}`, marginBottom: "1.5rem", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "18px", background: colors.infoBg, display: "inline-flex", alignItems: "center", justifyContent: "center", color: colors.info, marginBottom: "16px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>
          </div>
          <div style={{ fontSize: "15px", fontWeight: "800", color: colors.textPrimary, marginBottom: "6px" }}>No vehicle registered yet</div>
          <div style={{ fontSize: "13px", color: colors.textSecondary, marginBottom: "20px", lineHeight: "1.5" }}>Add your vehicle to get a personalized maintenance roadmap based on your actual service history.</div>
          <button onClick={() => navigate("/customer/vehicles")} style={{ padding: "12px 28px", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, color: "#fff", border: "none", borderRadius: "14px", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}>
            Add My Vehicle
          </button>
        </div>
      ) : (
        <>
          {/* Vehicle selector tabs — shown only when 2+ vehicles */}
          {vehicles.length > 1 && (
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", marginBottom: "1rem" }}>
              {vehicles.map(v => {
                const isSelected = selectedVehicleId === v.id;
                const label = [v.year, v.make, v.model].filter(Boolean).join(" ") || v.plate || "Vehicle";
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVehicleId(v.id)}
                    style={{
                      padding: "8px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "700",
                      whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
                      background: isSelected ? `linear-gradient(135deg, ${colors.navy}, ${colors.blue})` : colors.white,
                      color: isSelected ? "#fff" : colors.textSecondary,
                      border: isSelected ? "none" : `1px solid ${colors.border}`,
                      boxShadow: isSelected ? "0 4px 12px rgba(26,58,92,0.2)" : "none",
                      transition: "all 0.2s",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Vehicle label above roadmap */}
          {(() => {
            const v = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];
            const label = [v?.year, v?.make, v?.model].filter(Boolean).join(" ") || v?.plate || "Your Vehicle";
            return (
              <div style={{ fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1rem" }}>
                Tracking: <span style={{ color: colors.navy }}>{label}</span>
              </div>
            );
          })()}

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "1.5rem" }}>
            {MAINTENANCE_RULES.map(rule => {
              const actualLastDate = getLastServiceDate(bookings, rule.keywords, selectedVehicleId);
              const hasRecord = !!actualLastDate;

              const daysSince = hasRecord ? Math.floor((Date.now() - actualLastDate.getTime()) / (1000 * 3600 * 24)) : null;
              const progress = hasRecord ? Math.min(100, Math.max(0, Math.round((daysSince / rule.intervalDays) * 100))) : 0;
              const daysRemaining = hasRecord ? rule.intervalDays - daysSince : null;

              let statusText = "No record yet";
              let color = colors.textMuted;
              let bgColor = colors.bg;
              let estimatedText = "—";

              if (hasRecord) {
                if (progress < 60) {
                  statusText = "Good condition";
                  color = colors.success;
                  bgColor = colors.successBg;
                } else if (progress < 90) {
                  statusText = "Due soon";
                  color = colors.warning;
                  bgColor = colors.warningBg;
                } else {
                  statusText = "Service recommended";
                  color = colors.danger;
                  bgColor = colors.dangerBg;
                }

                if (daysRemaining > 30) {
                  estimatedText = `Due in ~${Math.floor(daysRemaining / 30)} mo`;
                } else if (daysRemaining > 0) {
                  estimatedText = `Due in ${daysRemaining} days`;
                } else {
                  estimatedText = "Overdue";
                }
              }

              return (
                <div key={rule.key} className="customer-card" style={{ background: colors.white, borderRadius: "24px", padding: "20px", border: `1px solid ${hasRecord ? colors.border : colors.border}`, display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 8px 24px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden" }}>
                  {/* Status glow */}
                  <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", background: bgColor, borderRadius: "50%", filter: "blur(40px)", opacity: 0.6, zIndex: 0 }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: hasRecord ? bgColor : colors.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0, border: `1px solid ${hasRecord ? color + "30" : colors.border}`, color: hasRecord ? color : colors.textMuted }}>
                        {rule.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: "16px", fontWeight: "800", color: colors.textPrimary, marginBottom: "4px", letterSpacing: "-0.2px" }}>{rule.label}</div>
                        <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Calendar size={12} />
                            {hasRecord ? `Last: ${actualLastDate.toLocaleDateString()}` : "No service logged yet"}
                          </span>
                          {hasRecord && (
                            <>
                              <span style={{ color: colors.border }}>|</span>
                              <span style={{ color }}>{estimatedText}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: hasRecord ? color : colors.textMuted, background: hasRecord ? bgColor : colors.bg, padding: "4px 10px", borderRadius: "20px", whiteSpace: "nowrap", border: `1px solid ${hasRecord ? color + "30" : colors.border}` }}>
                      {`Every ${rule.intervalDays >= 365 ? Math.round(rule.intervalDays / 365) + "yr" : rule.intervalDays / 30 + "mo"}`}
                    </div>
                  </div>

                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: colors.textPrimary }}>Wear Progress</span>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: hasRecord ? color : colors.textMuted }}>{hasRecord ? `${progress}%` : "—"}</span>
                    </div>
                    <div style={{ width: "100%", height: "10px", background: colors.bg, borderRadius: "5px", overflow: "hidden", border: `1px solid ${colors.border}` }}>
                      <div style={{ width: `${progress}%`, height: "100%", background: hasRecord ? color : colors.border, borderRadius: "5px", transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                    </div>
                    <div style={{ textAlign: "right", marginTop: "6px", fontSize: "11px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Status: <span style={{ color: hasRecord ? color : colors.textMuted }}>{statusText}</span>
                    </div>
                  </div>

                  {!hasRecord ? (
                    <button onClick={() => navigate("/customer/shop-select", { state: { prefilledService: rule.label } })} style={{ position: "relative", zIndex: 1, width: "100%", padding: "12px", borderRadius: "14px", border: `1px solid ${colors.border}`, background: colors.bg, color: colors.textSecondary, fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                      Book First {rule.label}
                    </button>
                  ) : progress >= 90 && (
                    <button onClick={() => navigate("/customer/shop-select", { state: { prefilledService: rule.label } })} style={{ position: "relative", zIndex: 1, width: "100%", padding: "14px", borderRadius: "14px", border: "none", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, color: "#fff", fontSize: "14px", fontWeight: "800", cursor: "pointer", marginTop: "4px", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(42,82,152,0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                      <AlertTriangle size={14} /> Schedule {rule.label} Now
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

        <SectionTitle title="Recent Activity" action={
          <button onClick={() => navigate("/customer/history")} style={{ background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, color: "#fff", border: "none", borderRadius: "12px", padding: "8px 16px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(26,58,92,0.2)" }}>
            View All
          </button>
        } />
        <div style={{ background: colors.white, borderRadius: "24px", border: `1px solid ${colors.border}`, boxShadow: "0 4px 24px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: "1.5rem" }}>
          {bookings.length === 0 ? (
            <EmptyState
              icon={<Calendar size={48} color={colors.info} />}
              title="No bookings yet"
              subtitle="Book your first service and it'll show up right here."
              action={
                <button onClick={() => navigate("/customer/shop-select")} style={{ ...sh.primaryBtn, width: "auto", padding: "12px 28px", fontSize: "14px", borderRadius: "14px" }}>
                  Book a Service
                </button>
              }
            />
          ) : (
            bookings.slice(0, 5).map((b, i) => (
              <div key={b.id} className="customer-list-item" style={{ ...sh.rowItem, padding: "16px", borderBottom: i === Math.min(bookings.length, 5) - 1 ? "none" : `1px solid #f1f5f9` }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.info, flexShrink: 0 }}>
                  <Wrench size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>{b.serviceType || "Service"}</div>
                  <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500" }}>
                    {b.shopName || "AutoBook"} · {b.date || (b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000).toLocaleDateString() : "—")}
                  </div>
                </div>
                <span style={{ ...statusStyle(b.status), padding: "4px 10px", borderRadius: "8px", fontSize: "12px" }}>{b.status || "Pending"}</span>
              </div>
            ))
          )}
        </div>
      </div>

          </div>
  );
}
