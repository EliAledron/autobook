import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp,
} from "firebase/firestore";
import { sh, colors, EmptyState } from "./dashboardShared";
import SkeletonLoader from "./SkeletonLoader";
import BackButton from "../components/BackButton";

const STATUS_TABS = ["All", "Accepted", "Completed", "Declined"];

const statusStyle = (s) => {
  const sl = (s || "").toLowerCase();
  if (sl === "accepted")  return sh.badge(colors.infoBg, colors.info);
  if (sl === "completed") return sh.badge(colors.successBg, colors.success);
  if (sl === "declined" || sl === "cancelled") return sh.badge(colors.dangerBg, colors.danger);
  return sh.badge(colors.warningBg, colors.warning);
};

const statusIcon = (s) => {
  const sl = (s || "").toLowerCase();
  if (sl === "accepted")  return "✅";
  if (sl === "completed") return "🏁";
  if (sl === "declined" || sl === "cancelled") return "❌";
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
  @keyframes ab-fade-in { from{opacity:0} to{opacity:1} }
  @keyframes ab-slide-up { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
  ::-webkit-scrollbar { display:none; }
`;

export default function MechanicVisitRequests() {
  const navigate = useNavigate();
  const [uid, setUid] = useState(null);
  const [requests, setRequests] = useState([]);
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
      await loadRequests(u.uid);
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const loadRequests = async (userId) => {
    try {
      const snap = await getDocs(query(collection(db, "mechanicRequests"), where("assignedMechanicId", "==", userId)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRequests(list);
    } catch (e) { setRequests([]); }
  };

  const markCompleted = async (requestId) => {
    setSaving(true);
    try {
      const request = requests.find(r => r.id === requestId);
      await updateDoc(doc(db, "mechanicRequests", requestId), {
        status: "Completed",
        updatedAt: serverTimestamp(),
      });

      // Notify customer
      if (request?.customerId) {
        await addDoc(collection(db, "notifications"), {
          userId: request.customerId,
          title: "Visit Completed! 🏁",
          message: `Your visit request at ${request.address || "your location"} has been completed. Thank you for choosing AutoBook!`,
          type: "request_update",
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: "Completed" } : r));
      if (selected?.id === requestId) setSelected(prev => ({ ...prev, status: "Completed" }));
      showToast("🏁 Visit marked as completed!");
    } catch (e) {
      showToast("❌ Failed to update. Try again.");
    }
    setSaving(false);
  };

  const filtered = requests.filter(r => {
    if (activeTab === "All") return true;
    return (r.status || "Accepted").toLowerCase() === activeTab.toLowerCase();
  });

  const stats = {
    total:     requests.length,
    active:    requests.filter(r => ["accepted", "pending"].includes((r.status || "").toLowerCase())).length,
    completed: requests.filter(r => (r.status || "").toLowerCase() === "completed").length,
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
        {stats.active > 0 && (
          <div style={{ background: colors.danger, color: "#fff", fontSize: "11px", fontWeight: "700", borderRadius: "20px", padding: "4px 10px" }}>
            {stats.active} active
          </div>
        )}
      </div>

      {/* HERO */}
      <div style={sh.hero}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>📍 Dispatches</span></div>
        <div style={sh.heroGreeting}>Visit Requests</div>
        <div style={sh.heroSub}>
          {stats.active > 0 ? `${stats.active} active dispatch${stats.active > 1 ? "es" : ""}` : "No active dispatches."}
        </div>
      </div>

      <div style={sh.content}>

        {/* STATS ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "1.25rem" }}>
          {[
            { label: "Total", value: stats.total, color: colors.navy },
            { label: "Active", value: stats.active, color: colors.info },
            { label: "Done", value: stats.completed, color: colors.success },
          ].map(s => (
            <div key={s.label} style={{ background: colors.white, borderRadius: "14px", padding: "14px 8px", textAlign: "center", border: `1px solid ${colors.border}`, borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: "22px", fontWeight: "800", color: colors.textPrimary }}>{s.value}</div>
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
        <div style={{ fontSize: "11px", fontWeight: "700", color: colors.textMuted, letterSpacing: "0.7px", textTransform: "uppercase", marginBottom: "0.6rem" }}>Requests ({filtered.length})</div>
        <div style={sh.card}>
          {loading ? (
            <SkeletonLoader count={3} type="card" />
          ) : filtered.length === 0 ? (
            <EmptyState icon="📍" title="No requests" subtitle="Visit requests assigned to you by owners will appear here." />
          ) : (
            filtered.map((r, i) => (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                style={{
                  ...sh.rowItem,
                  borderBottom: i === filtered.length - 1 ? "none" : `1px solid #f1f5f9`,
                  cursor: "pointer", padding: "16px",
                  background: ["accepted", "pending"].includes((r.status || "").toLowerCase()) ? colors.warningBg + "80" : "transparent",
                  borderRadius: ["accepted", "pending"].includes((r.status || "").toLowerCase()) ? "12px" : "0",
                  marginBottom: ["accepted", "pending"].includes((r.status || "").toLowerCase()) ? "4px" : "0",
                }}
              >
                <div style={{ ...sh.rowIcon(colors.warningBg), fontSize: "18px", width: "44px", height: "44px", borderRadius: "14px" }}>
                  {statusIcon(r.status)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>{r.customerName || "Customer"}</div>
                  <div style={{ fontSize: "12px", color: colors.textSecondary }}>📍 {r.address || "No address"}</div>
                  {r.notes && <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>"{r.notes.length > 45 ? r.notes.slice(0, 45) + "…" : r.notes}"</div>}
                  <div style={{ fontSize: "10px", color: colors.textMuted, marginTop: "3px" }}>{timeAgo(r.createdAt)}</div>
                </div>
                <span style={{ ...statusStyle(r.status), padding: "4px 10px", borderRadius: "8px", fontSize: "11px" }}>{r.status || "Accepted"}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* REQUEST DETAIL MODAL */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end", animation: "ab-fade-in 0.2s ease-out" }} onClick={() => setSelected(null)}>
          <div style={{ background: colors.white, borderRadius: "24px 24px 0 0", width: "100%", padding: "1.5rem 1.25rem", maxHeight: "90vh", overflowY: "auto", animation: "ab-slide-up 0.35s cubic-bezier(0.16,1,0.3,1) forwards" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ fontWeight: "800", fontSize: "17px", color: colors.navy }}>📍 Visit Request</div>
              <button onClick={() => setSelected(null)} style={{ background: colors.bg, border: "none", width: "32px", height: "32px", borderRadius: "50%", fontSize: "18px", cursor: "pointer", color: colors.textSecondary, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>

            <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ ...statusStyle(selected.status), padding: "5px 12px", borderRadius: "10px" }}>{selected.status || "Accepted"}</span>
              <span style={{ fontSize: "12px", color: colors.textMuted }}>{timeAgo(selected.createdAt)}</span>
            </div>

            {[
              ["Customer", selected.customerName || "Unknown"],
              ["Address / Location", selected.address || "N/A"],
              ["Shop", selected.shopName || "N/A"],
              ["Notes", selected.notes || "None"],
            ].map(([label, value]) => (
              <div key={label} style={{ marginBottom: "0.85rem" }}>
                <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", marginBottom: "3px" }}>{label}</div>
                <div style={{ fontSize: "14px", color: colors.textPrimary, fontWeight: "600", lineHeight: "1.4" }}>{value}</div>
              </div>
            ))}

            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "10px" }}>
              {["accepted", "pending"].includes((selected.status || "").toLowerCase()) && (
                <button
                  onClick={() => markCompleted(selected.id)}
                  disabled={saving}
                  style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, color: "#fff", fontSize: "14px", fontWeight: "700", border: "none", borderRadius: "14px", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(26,58,92,0.25)" }}
                >
                  {saving ? "Saving..." : "🏁 Mark as Completed"}
                </button>
              )}
              {selected.status === "Completed" && (
                <div style={{ fontSize: "13px", color: colors.success, fontWeight: "600", padding: "12px", background: colors.successBg, borderRadius: "12px", border: `1px solid rgba(22,163,74,0.3)` }}>
                  ✅ This visit has been completed.
                </div>
              )}
              {["declined", "cancelled"].includes((selected.status || "").toLowerCase()) && (
                <div style={{ fontSize: "13px", color: colors.danger, fontWeight: "600", padding: "12px", background: colors.dangerBg, borderRadius: "12px" }}>
                  ❌ This request was {(selected.status || "declined").toLowerCase()}.
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
