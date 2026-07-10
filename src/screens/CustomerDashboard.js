import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { sh, colors, getGreeting, EmptyState } from "./dashboardShared";
import TopbarAvatar from "./TopbarAvatar";
import CarLoader from "./CarLoader";

// ─── Quick Action SVG Icons ────────────────────────────────────────────────────
const IcoBook    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
const IcoDiag    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>;
const IcoFeed    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 10h16M4 14h10M4 18h7"/></svg>;
const IcoSearch  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>;
const IcoCar     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>;
const IcoHistory = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>;

const QUICK_ACTIONS = [
  { id: "book",     Icon: IcoBook,    label: "Book a Service",   sub: "Schedule a repair",    path: "/customer/shop-select", iconColor: "#2a5298", iconBg: "#dbeafe" },
  { id: "checkup",  Icon: IcoDiag,    label: "Diagnostic Check", sub: "Analyze symptoms",     path: "/customer/checkup",     iconColor: "#7c3aed", iconBg: "#ede9fe" },
  { id: "feed",     Icon: IcoFeed,    label: "Shop Feed",        sub: "News & promos",        path: "/customer/feed",        iconColor: "#d97706", iconBg: "#fef3c7" },
  { id: "mechanic", Icon: IcoSearch,  label: "Find Mechanic",    sub: "Browse available",     path: "/customer/mechanics",  iconColor: "#059669", iconBg: "#d1fae5" },
  { id: "vehicles", Icon: IcoCar,     label: "My Vehicles",      sub: "Manage your cars",     path: "/customer/vehicles",   iconColor: "#1a3a5c", iconBg: "#e0f2fe" },
  { id: "history",  Icon: IcoHistory, label: "History",          sub: "Past services",        path: "/customer/history",    iconColor: "#dc2626", iconBg: "#fee2e2" },
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
  @property --fill-angle {
    syntax: "<angle>";
    inherits: false;
    initial-value: 0deg;
  }
  @keyframes gauge-fill {
    from { --fill-angle: 0deg; }
    to { --fill-angle: 180deg; }
  }
  .gauge-chart-mask {
    position: absolute; top: -1px; left: -1px; width: calc(100% + 2px); height: calc(200% + 2px); border-radius: 50%;
    background: conic-gradient(from 270deg, transparent 0deg, transparent var(--fill-angle, 180deg), var(--card-bg, #ffffff) var(--fill-angle, 180deg), var(--card-bg, #ffffff) 180deg, transparent 180deg);
    animation: gauge-fill 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .gauge-needle {
    position: absolute; bottom: 0; left: 50%; width: 4px; height: calc(100% - 12px);
    background: #111827; border-radius: 4px 4px 0 0;
    transform-origin: bottom center;
    transform: translateX(-50%) rotate(calc(var(--fill-angle, 180deg) - 90deg));
    animation: gauge-fill 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    z-index: 2;
  }
  .gauge-needle::after {
    content: ""; position: absolute; bottom: -4px; left: -4px; width: 12px; height: 12px;
    background: #111827; border-radius: 50%;
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
  { key: "oil", label: "Oil Change", icon: "🛢️", intervalDays: 180, defaultDaysSince: 175 },
  { key: "tire", label: "Tire Rotation", icon: "⚙️", intervalDays: 365, defaultDaysSince: 150 },
  { key: "brake", label: "Brake Inspection", icon: "🛑", intervalDays: 365, defaultDaysSince: 290 },
  { key: "aircon", label: "Aircon Cleaning", icon: "❄️", intervalDays: 365, defaultDaysSince: 40 },
];

const getLastServiceDate = (bookings, keyword) => {
  const completed = bookings.filter(b => (b.status || "").toLowerCase() === "completed" && (b.serviceType || "").toLowerCase().includes(keyword.toLowerCase()));
  if (completed.length === 0) return null;
  completed.sort((a, b) => {
    const tA = a.date ? new Date(a.date).getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
    const tB = b.date ? new Date(b.date).getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
    return tB - tA;
  });
  const best = completed[0];
  return best.date ? new Date(best.date) : (best.createdAt?.seconds ? new Date(best.createdAt.seconds * 1000) : new Date());
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
          const lastDate = getLastServiceDate(fetchedBookings, rule.key);
          if (lastDate) {
            const daysSince = Math.floor((now - lastDate.getTime()) / (1000 * 3600 * 24));
            const progress = Math.min(100, Math.max(0, Math.round((daysSince / rule.intervalDays) * 100)));

            if (progress >= 90) {
              const lastNotified = userData.lastMaintenanceAlerts?.[rule.key];
              const daysSinceLastAlert = lastNotified ? Math.floor((now - lastNotified) / (1000 * 3600 * 24)) : Infinity;

              if (daysSinceLastAlert > 30) {
                const alertTitle = `${rule.label} Due Soon! 🚗`;
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
          <TopbarAvatar onClick={() => navigate("/profile")} />
        </div>
      </div>

      {/* HERO */}
      <div style={{ ...sh.hero, paddingBottom: "2.5rem", borderRadius: "0 0 24px 24px", marginBottom: "0", position: "relative", zIndex: 1 }}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>Customer</span></div>
        <div style={{ fontSize: "24px", fontWeight: "800", color: "#fff", marginBottom: "0.25rem" }}>{getGreeting()}, {firstName}!</div>
        <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)" }}>Ready to book your next service?</div>
      </div>

      <div style={{ ...sh.content, position: "relative", zIndex: 2 }} className="stagger-slide-up">

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
              {stats.total > 0 && <div className="gauge-chart-mask" style={{ "--card-bg": colors.white }} />}
              <div className="gauge-needle" />
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

      <SectionTitle title="Maintenance Roadmap" />
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "1.5rem" }}>
        {MAINTENANCE_RULES.map(rule => {
          const actualLastDate = getLastServiceDate(bookings, rule.key);
          const hasRecord = !!actualLastDate;
          
          const daysSince = hasRecord ? Math.floor((Date.now() - actualLastDate.getTime()) / (1000 * 3600 * 24)) : (rule.defaultDaysSince || 0);
          const progress = Math.min(100, Math.max(0, Math.round((daysSince / rule.intervalDays) * 100)));
          const daysRemaining = rule.intervalDays - daysSince;
          
          let statusText = "Good condition";
          let color = colors.success;
          let bgColor = colors.successBg;
          let estimatedText = "Now";

          if (progress < 60) {
            statusText = "Good condition";
            color = colors.success;
            bgColor = colors.successBg;
          } else if (progress < 90) {
            statusText = "Due soon";
            color = colors.warning;
            bgColor = colors.warningBg;
          } else {
            statusText = "⚠️ Service recommended";
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

          return (
            <div key={rule.key} className="customer-card" style={{ background: colors.white, borderRadius: "24px", padding: "20px", border: `1px solid ${colors.border}`, display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 8px 24px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden" }}>
              {/* Subtle background glow based on status */}
              <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", background: bgColor, borderRadius: "50%", filter: "blur(40px)", opacity: 0.6, zIndex: 0 }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: bgColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0, border: `1px solid ${color}30` }}>{rule.icon}</div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: colors.textPrimary, marginBottom: "4px", letterSpacing: "-0.2px" }}>{rule.label}</div>
                    <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>🗓️ {hasRecord ? actualLastDate.toLocaleDateString() : "No record"}</span>
                      <span style={{ color: colors.border }}>|</span>
                      <span style={{ color }}>{estimatedText}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: colors.textPrimary }}>Wear Progress</span>
                  <span style={{ fontSize: "13px", fontWeight: "800", color }}>{progress}%</span>
                </div>
                <div style={{ width: "100%", height: "10px", background: colors.bg, borderRadius: "5px", overflow: "hidden", border: `1px solid ${colors.border}` }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: color, borderRadius: "5px", transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                </div>
                <div style={{ textAlign: "right", marginTop: "6px", fontSize: "11px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Status: <span style={{ color }}>{statusText}</span>
                </div>
              </div>

              {progress >= 90 && (
                <button onClick={() => navigate("/customer/shop-select", { state: { prefilledService: rule.label } })} style={{ position: "relative", zIndex: 1, width: "100%", padding: "14px", borderRadius: "14px", border: "none", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, color: "#fff", fontSize: "14px", fontWeight: "800", cursor: "pointer", marginTop: "4px", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(42,82,152,0.2)" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>⚠️ Schedule {rule.label} Now</button>
              )}
            </div>
          );
        })}
      </div>

        <SectionTitle title="Recent Activity" action={
          <button onClick={() => navigate("/customer/history")} style={{ background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, color: "#fff", border: "none", borderRadius: "12px", padding: "8px 16px", fontSize: "12px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(26,58,92,0.2)" }}>
            View All
          </button>
        } />
        <div style={{ background: colors.white, borderRadius: "24px", border: `1px solid ${colors.border}`, boxShadow: "0 4px 24px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: "1.5rem" }}>
          {bookings.length === 0 ? (
            <EmptyState
              icon="📅"
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
                <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "700", color: colors.info, flexShrink: 0 }}>
                  🔧
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
