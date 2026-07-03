import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, getDocs, updateDoc, doc, getDoc, addDoc, serverTimestamp,
} from "firebase/firestore";
import { sh, colors, EmptyState } from "./dashboardShared";
import SkeletonLoader from "./SkeletonLoader";
import BackButton from "../components/BackButton";

const STATUS_TABS = ["All", "Pending", "In Progress", "Completed", "Cancelled"];

const statusStyle = (s) => {
  const sl = (s || "").toLowerCase();
  if (sl === "completed")   return sh.badge(colors.successBg, colors.success);
  if (sl === "in progress") return sh.badge(colors.infoBg, colors.info);
  if (sl === "cancelled")   return sh.badge(colors.dangerBg, colors.danger);
  return sh.badge(colors.warningBg, colors.warning);
};

const statusIcon = (s) => {
  const sl = (s || "").toLowerCase();
  if (sl === "completed")   return "✅";
  if (sl === "in progress") return "🔧";
  if (sl === "cancelled")   return "❌";
  return "🕐";
};

function timeAgo(ts) {
  if (!ts?.seconds) return "";
  const diff = Date.now() - ts.seconds * 1000;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const keyframes = `
  @keyframes ab-fade-in { from { opacity:0 } to { opacity:1 } }
  @keyframes ab-slide-up { from { transform:translateY(100%);opacity:0 } to { transform:translateY(0);opacity:1 } }
  ::-webkit-scrollbar { display: none; }
`;

export default function MechanicBookings() {
  const navigate = useNavigate();
  const [uid, setUid] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/login"); return; }
      setUid(u.uid);
      await loadBookings(u.uid);
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const loadBookings = async (userId) => {
    try {
      const [snap1, snap2] = await Promise.all([
        getDocs(query(collection(db, "bookings"), where("mechanicId", "==", userId))),
        getDocs(query(collection(db, "bookings"), where("assignedMechanicId", "==", userId))),
      ]);
      const map = new Map();
      [...snap1.docs, ...snap2.docs].forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
      const list = Array.from(map.values()).sort((a, b) =>
        (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      setBookings(list);
    } catch (e) { setBookings([]); }
  };

  const updateStatus = async (bookingId, newStatus) => {
    setSaving(true);
    try {
      const booking = bookings.find(b => b.id === bookingId);
      await updateDoc(doc(db, "bookings", bookingId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Notify customer
      const customerId = booking?.customerId || booking?.userId;
      if (customerId) {
        const msgMap = {
          "In Progress": `Your booking for ${booking?.serviceType || "service"} is now in progress! Your mechanic is working on it.`,
          "Completed": `Your booking for ${booking?.serviceType || "service"} has been marked as completed. Thank you!`,
        };
        if (msgMap[newStatus]) {
          await addDoc(collection(db, "notifications"), {
            userId: customerId,
            title: newStatus === "In Progress" ? "Job Started 🔧" : "Job Completed ✅",
            message: msgMap[newStatus],
            type: "status_update",
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }

      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      if (selected?.id === bookingId) setSelected(prev => ({ ...prev, status: newStatus }));
      showToast(newStatus === "In Progress" ? "🔧 Job started!" : "✅ Marked as completed!");
    } catch (e) {
      showToast("❌ Failed to update. Try again.");
    }
    setSaving(false);
  };

  const filtered = bookings.filter(b => {
    if (activeTab === "All") return true;
    return (b.status || "Pending").toLowerCase() === activeTab.toLowerCase();
  });

  const stats = {
    total:      bookings.length,
    pending:    bookings.filter(b => (b.status || "Pending").toLowerCase() === "pending").length,
    inProgress: bookings.filter(b => (b.status || "").toLowerCase() === "in progress").length,
    completed:  bookings.filter(b => (b.status || "").toLowerCase() === "completed").length,
  };

  return (
    <div style={sh.page}>
      <style>{keyframes}</style>

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", background: colors.navy, color: "#fff", padding: "10px 20px", borderRadius: "12px", fontSize: "13px", fontWeight: "600", zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BackButton />
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
      </div>

      {/* HERO */}
      <div style={sh.hero}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>🔧 Mechanic</span></div>
        <div style={sh.heroGreeting}>My Bookings</div>
        <div style={sh.heroSub}>
          {stats.inProgress > 0 ? `${stats.inProgress} job${stats.inProgress > 1 ? "s" : ""} in progress` : stats.pending > 0 ? `${stats.pending} pending assignment${stats.pending > 1 ? "s" : ""}` : "All caught up!"}
        </div>
      </div>

      <div style={sh.content}>

        {/* STATS ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "1.25rem" }}>
          {[
            { label: "Total", value: stats.total, color: colors.navy },
            { label: "Pending", value: stats.pending, color: colors.warning },
            { label: "Active", value: stats.inProgress, color: colors.info },
            { label: "Done", value: stats.completed, color: colors.success },
          ].map(s => (
            <div key={s.label} style={{ background: colors.white, borderRadius: "14px", padding: "12px 8px", textAlign: "center", border: `1px solid ${colors.border}`, borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: "20px", fontWeight: "800", color: colors.textPrimary }}>{s.value}</div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.3px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "1rem", paddingBottom: "4px" }}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 14px", borderRadius: "20px", border: activeTab === tab ? "none" : `1px solid ${colors.border}`,
                cursor: "pointer", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap", fontFamily: "inherit",
                background: activeTab === tab ? `linear-gradient(135deg, ${colors.navy}, ${colors.blue})` : colors.white,
                color: activeTab === tab ? "#fff" : colors.textSecondary,
                boxShadow: activeTab === tab ? "0 2px 8px rgba(26,58,92,0.25)" : "none",
              }}
            >{tab}</button>
          ))}
        </div>

        {/* LIST */}
        <div style={sh.card}>
          {loading ? (
            <SkeletonLoader count={3} type="card" />
          ) : filtered.length === 0 ? (
            <EmptyState icon="🔧" title={`No ${activeTab !== "All" ? activeTab.toLowerCase() + " " : ""}bookings`} subtitle="No assigned bookings match this filter." />
          ) : (
            filtered.map((b, i) => (
              <div
                key={b.id}
                onClick={() => setSelected(b)}
                style={{
                  ...sh.rowItem,
                  borderBottom: i === filtered.length - 1 ? "none" : `1px solid #f1f5f9`,
                  cursor: "pointer", padding: "16px",
                  background: (b.status || "Pending").toLowerCase() === "in progress" ? colors.infoBg + "60" : "transparent",
                  borderRadius: (b.status || "Pending").toLowerCase() === "in progress" ? "12px" : "0",
                  marginBottom: (b.status || "Pending").toLowerCase() === "in progress" ? "4px" : "0",
                }}
              >
                <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                  {statusIcon(b.status)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>{b.serviceType || "Service"}</div>
                  <div style={{ fontSize: "12px", color: colors.textSecondary }}>{b.customerName || "Customer"} · {b.shopName || ""}</div>
                  <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>{b.date || timeAgo(b.createdAt) || "—"}</div>
                </div>
                <span style={{ ...statusStyle(b.status), padding: "4px 10px", borderRadius: "8px", fontSize: "11px" }}>{b.status || "Pending"}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* BOOKING DETAIL MODAL */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end", animation: "ab-fade-in 0.2s ease-out" }} onClick={() => setSelected(null)}>
          <div style={{ background: colors.white, borderRadius: "24px 24px 0 0", width: "100%", padding: "1.5rem 1.25rem", maxHeight: "90vh", overflowY: "auto", animation: "ab-slide-up 0.35s cubic-bezier(0.16,1,0.3,1) forwards" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ fontWeight: "800", fontSize: "17px", color: colors.navy }}>🔧 Booking Details</div>
              <button onClick={() => setSelected(null)} style={{ background: colors.bg, border: "none", width: "32px", height: "32px", borderRadius: "50%", fontSize: "18px", cursor: "pointer", color: colors.textSecondary, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>

            <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ ...statusStyle(selected.status), padding: "5px 12px", borderRadius: "10px" }}>{selected.status || "Pending"}</span>
              <span style={{ fontSize: "12px", color: colors.textMuted }}>{selected.date || timeAgo(selected.createdAt) || "—"}</span>
            </div>

            {[
              ["Service", selected.serviceType || "—"],
              ["Customer", selected.customerName || "—"],
              ["Shop", selected.shopName || "—"],
              ["Vehicle", selected.vehicleLabel || "—"],
              ["Price", selected.price ? `₱${Number(selected.price).toLocaleString()}` : "—"],
            ].map(([label, value]) => (
              <div key={label} style={{ marginBottom: "0.85rem" }}>
                <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", marginBottom: "3px" }}>{label}</div>
                <div style={{ fontSize: "14px", color: colors.textPrimary, fontWeight: "600" }}>{value}</div>
              </div>
            ))}

            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "10px" }}>
              {(selected.status || "Pending").toLowerCase() === "pending" && (
                <button
                  onClick={() => updateStatus(selected.id, "In Progress")}
                  disabled={saving}
                  style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${colors.info}, #1e40af)`, color: "#fff", fontSize: "14px", fontWeight: "700", border: "none", borderRadius: "14px", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
                >
                  {saving ? "Updating..." : "🔧 Start Working"}
                </button>
              )}
              {(selected.status || "").toLowerCase() === "in progress" && (
                <button
                  onClick={() => updateStatus(selected.id, "Completed")}
                  disabled={saving}
                  style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${colors.success}, #15803d)`, color: "#fff", fontSize: "14px", fontWeight: "700", border: "none", borderRadius: "14px", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(22,163,74,0.3)" }}
                >
                  {saving ? "Saving..." : "✅ Mark as Completed"}
                </button>
              )}
              {["completed", "cancelled"].includes((selected.status || "").toLowerCase()) && (
                <div style={{ fontSize: "13px", color: selected.status === "Completed" ? colors.success : colors.danger, fontWeight: "600", padding: "12px", background: selected.status === "Completed" ? colors.successBg : colors.dangerBg, borderRadius: "12px" }}>
                  {selected.status === "Completed" ? "✅ This job is completed." : "❌ This booking was cancelled."}
                </div>
              )}
              <button onClick={() => setSelected(null)} style={{ ...sh.outlineBtn, borderRadius: "14px", padding: "14px" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
