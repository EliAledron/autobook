import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { sh, colors, getGreeting, EmptyState } from "./dashboardShared";
import TopbarAvatar from "./TopbarAvatar";
import CarLoader from "./CarLoader";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IcoClip    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>;
const IcoPin     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcoUser    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;
const IcoFeed    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 10h16M4 14h10M4 18h7"/></svg>;
const IcoWrench  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>;

const QUICK_ACTIONS = [
  { id: "bookings",  Icon: IcoClip,   label: "My Bookings",   sub: "Assigned jobs",      path: "/mechanic/bookings",  iconColor: "#7c3aed", iconBg: "#ede9fe" },
  { id: "requests",  Icon: IcoPin,    label: "Visit Requests", sub: "On-site dispatches", path: "/mechanic/requests",  iconColor: "#059669", iconBg: "#d1fae5" },
  { id: "profile",   Icon: IcoUser,   label: "My Profile",    sub: "Skills & certs",     path: "/profile",            iconColor: "#1a3a5c", iconBg: "#e0f2fe" },
  { id: "feed",      Icon: IcoFeed,   label: "Shop Feed",     sub: "News & promos",      path: "/customer/feed",      iconColor: "#d97706", iconBg: "#fef3c7" },
];

const keyframes = `
  @keyframes mech-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
  @keyframes mech-ring  { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.2);opacity:0} }
  @keyframes mech-fade  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  @keyframes mech-bar   { from{width:0} to{width:var(--bar-w,0%)} }
  .mech-card { transition: all 0.2s cubic-bezier(0.4,0,0.2,1); }
  .mech-card:active { transform: scale(0.97); }
  ::-webkit-scrollbar { display:none; }
`;

const statusStyle = (s) => {
  const sl = (s || "").toLowerCase();
  if (sl === "completed")  return sh.badge(colors.successBg, colors.success);
  if (sl === "in progress") return sh.badge(colors.infoBg, colors.info);
  if (sl === "cancelled")  return sh.badge(colors.dangerBg, colors.danger);
  return sh.badge(colors.warningBg, colors.warning);
};

function StatCard({ label, value, color, bg }) {
  return (
    <div style={{
      background: colors.white, borderRadius: "18px", padding: "16px",
      border: `1px solid ${colors.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
      borderLeft: `4px solid ${color}`, display: "flex", flexDirection: "column", gap: "4px",
    }}>
      <div style={{ fontSize: "11px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ fontSize: "28px", fontWeight: "800", color: colors.textPrimary, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export default function MechanicDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { navigate("/login"); return; }

      try {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) setUser({ id: snap.id, ...snap.data() });
      } catch (e) {}

      // Load assigned bookings (by mechanicId OR assignedMechanicId matching uid)
      try {
        const uid = firebaseUser.uid;
        const [bSnap1, bSnap2] = await Promise.all([
          getDocs(query(collection(db, "bookings"), where("mechanicId", "==", uid))),
          getDocs(query(collection(db, "bookings"), where("assignedMechanicId", "==", uid))),
        ]);
        const bMap = new Map();
        [...bSnap1.docs, ...bSnap2.docs].forEach(d => bMap.set(d.id, { id: d.id, ...d.data() }));
        const bList = Array.from(bMap.values()).sort((a, b) =>
          (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );
        setBookings(bList);
      } catch (e) { setBookings([]); }

      // Load assigned visit requests
      try {
        const uid = firebaseUser.uid;
        const rSnap = await getDocs(query(collection(db, "mechanicRequests"), where("assignedMechanicId", "==", uid)));
        const rList = rSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setRequests(rList);
      } catch (e) { setRequests([]); }

      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  if (loading) return <CarLoader text="Loading your dashboard" />;

  const firstName = user?.displayName?.split(" ")[0] || "there";
  const allJobs = bookings;
  const stats = {
    total:      allJobs.length,
    pending:    allJobs.filter(b => (b.status || "Pending").toLowerCase() === "pending").length,
    inProgress: allJobs.filter(b => (b.status || "").toLowerCase() === "in progress").length,
    completed:  allJobs.filter(b => (b.status || "").toLowerCase() === "completed").length,
  };
  const activeBookings = allJobs.filter(b => ["in progress", "pending"].includes((b.status || "").toLowerCase()));
  const pendingRequests = requests.filter(r => !["completed", "declined", "cancelled"].includes((r.status || "").toLowerCase()));

  return (
    <div style={sh.page}>
      <style>{keyframes}</style>

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        <div style={sh.topbarRight}>
          <div style={sh.topbarMeta}>
            <div style={sh.topbarName}>{user?.displayName}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px" }}>Mechanic</div>
          </div>
          <TopbarAvatar onClick={() => navigate("/profile")} />
        </div>
      </div>

      {/* HERO */}
      <div style={{
        background: `linear-gradient(135deg, #0f2942 0%, #1a3a5c 50%, #1e4d8c 100%)`,
        padding: "1.5rem 1.25rem 4.5rem", position: "relative", overflow: "hidden",
      }}>
        {/* Decorative wrenches */}
        <div style={{ position: "absolute", right: "-20px", top: "-20px", opacity: 0.06, fontSize: "120px", transform: "rotate(30deg)", userSelect: "none" }}>🔧</div>
        <div style={{ position: "absolute", right: "60px", bottom: "-30px", opacity: 0.05, fontSize: "80px", transform: "rotate(-15deg)", userSelect: "none" }}>⚙️</div>

        <div style={sh.rolePill}>
          <div style={sh.roleDot} />
          <span style={sh.roleText}>🔧 Mechanic</span>
        </div>
        <div style={{ fontSize: "24px", fontWeight: "800", color: "#fff", marginBottom: "0.25rem", letterSpacing: "-0.3px" }}>
          {getGreeting()}, {firstName}!
        </div>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.72)" }}>
          {user?.shopName ? `${user.shopName} · ` : ""}{stats.inProgress > 0 ? `${stats.inProgress} job${stats.inProgress > 1 ? "s" : ""} in progress` : "No active jobs right now."}
        </div>

        {/* Floating stat pills */}
        <div style={{ display: "flex", gap: "8px", marginTop: "1.25rem", flexWrap: "wrap" }}>
          {[
            { label: "Active", value: stats.inProgress, color: colors.info },
            { label: "Pending", value: stats.pending, color: colors.warning },
            { label: "Done", value: stats.completed, color: colors.success },
          ].map(p => (
            <div key={p.label} style={{
              background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px",
              padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px",
            }}>
              <span style={{ fontSize: "16px", fontWeight: "800", color: "#fff" }}>{p.value}</span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontWeight: "600" }}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...sh.content, marginTop: "0", position: "relative", zIndex: 2 }} className="stagger-slide-up">

        {/* STAT GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginBottom: "1.5rem" }}>
          <StatCard label="Total Jobs"  value={stats.total}      color={colors.navy}    />
          <StatCard label="In Progress" value={stats.inProgress} color={colors.info}    />
          <StatCard label="Completed"   value={stats.completed}  color={colors.success} />
          <StatCard label="Requests"    value={requests.length}  color={colors.warning} />
        </div>

        {/* QUICK ACTIONS */}
        <div style={{ fontSize: "11px", fontWeight: "700", color: colors.textMuted, letterSpacing: "0.7px", textTransform: "uppercase", marginBottom: "0.75rem" }}>Quick Actions</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "1.5rem" }}>
          {QUICK_ACTIONS.map(({ id, Icon, label, sub, path, iconColor, iconBg }) => (
            <div
              key={id}
              className="mech-card"
              style={{ background: colors.white, borderRadius: "20px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "12px", cursor: "pointer", border: `1px solid ${colors.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
              onClick={() => navigate(path)}
            >
              <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor }}>
                <Icon />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>{label}</div>
                <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "500" }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ACTIVE JOBS */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: colors.textMuted, letterSpacing: "0.7px", textTransform: "uppercase" }}>Active Jobs</div>
          {activeBookings.length > 0 && (
            <button onClick={() => navigate("/mechanic/bookings")} style={{ background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, color: "#fff", border: "none", borderRadius: "10px", padding: "6px 14px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>View All</button>
          )}
        </div>
        <div style={{ background: colors.white, borderRadius: "20px", border: `1px solid ${colors.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: "1.5rem" }}>
          {activeBookings.length === 0 ? (
            <EmptyState icon="🔧" title="No active jobs" subtitle="You'll see your assigned bookings here once an owner assigns you." />
          ) : (
            activeBookings.slice(0, 5).map((b, i) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", borderBottom: i === Math.min(activeBookings.length, 5) - 1 ? "none" : `1px solid #f1f5f9` }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>🔧</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>{b.serviceType || "Service"}</div>
                  <div style={{ fontSize: "12px", color: colors.textSecondary }}>{b.customerName || "Customer"} · {b.shopName || ""}</div>
                  <div style={{ fontSize: "11px", color: colors.textMuted }}>{b.date || "—"}</div>
                </div>
                <span style={{ ...statusStyle(b.status), padding: "4px 10px", borderRadius: "8px", fontSize: "11px" }}>{b.status || "Pending"}</span>
              </div>
            ))
          )}
        </div>

        {/* PENDING VISIT REQUESTS */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: colors.textMuted, letterSpacing: "0.7px", textTransform: "uppercase" }}>Visit Requests
            {pendingRequests.length > 0 && <span style={{ marginLeft: "8px", background: colors.danger, color: "#fff", fontSize: "10px", fontWeight: "800", borderRadius: "10px", padding: "2px 7px" }}>{pendingRequests.length}</span>}
          </div>
          {requests.length > 0 && (
            <button onClick={() => navigate("/mechanic/requests")} style={{ background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, color: "#fff", border: "none", borderRadius: "10px", padding: "6px 14px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>View All</button>
          )}
        </div>
        <div style={{ background: colors.white, borderRadius: "20px", border: `1px solid ${colors.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: "1.5rem" }}>
          {requests.length === 0 ? (
            <EmptyState icon="📍" title="No visit requests" subtitle="Dispatched visit requests from owners will appear here." />
          ) : (
            requests.slice(0, 3).map((r, i) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", borderBottom: i === Math.min(requests.length, 3) - 1 ? "none" : `1px solid #f1f5f9` }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: colors.warningBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>📍</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>{r.customerName || "Customer"}</div>
                  <div style={{ fontSize: "12px", color: colors.textSecondary }}>{r.address || "No address"}</div>
                </div>
                <span style={{ ...statusStyle(r.status), padding: "4px 10px", borderRadius: "8px", fontSize: "11px" }}>{r.status || "Pending"}</span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
