import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, getDocs, updateDoc, doc,
  orderBy, addDoc, serverTimestamp, getDoc,
} from "firebase/firestore";
import { sh, colors, getInitials, EmptyState } from "./dashboardShared";
import CarLoader from "./CarLoader";

const STATUS_TABS = ["All", "Pending", "Accepted", "Completed", "Declined", "Cancelled"];

const statusStyle = (s) => {
  const sl = (s || "").toLowerCase();
  if (sl === "accepted")  return sh.badge(colors.infoBg, colors.info);
  if (sl === "completed") return sh.badge(colors.successBg, colors.success);
  if (sl === "declined" || sl === "cancelled")  return sh.badge(colors.dangerBg, colors.danger);
  return sh.badge(colors.warningBg, colors.warning);
};

const statusIcon = (s) => {
  const sl = (s || "").toLowerCase();
  if (sl === "accepted")  return "✅";
  if (sl === "completed") return "🏁";
  if (sl === "declined" || sl === "cancelled")  return "❌";
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
  @keyframes pulse-warning {
    0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
    100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
  }
  @keyframes ab-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
`;

export default function MechanicRequests() {
  const navigate = useNavigate();
  const [uid, setUid] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [mechanicName, setMechanicName] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [mechanics, setMechanics] = useState([]);
  const [newMechanic, setNewMechanic] = useState("");

  const loadMechanics = async (userObj) => {
    try {
      const isAdmin = (userObj?.role || "").toLowerCase() === "admin";
      let shopId = userObj?.shopId;
      if (!isAdmin && userObj?.shopName) {
        const sName = userObj.shopName.toUpperCase();
        if (sName.includes("JME")) shopId = "JME";
        else if (sName.includes("GRHE")) shopId = "GRHE";
      }
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

      let merged = [];
      if (isAdmin) {
        const snap = await getDocs(collection(db, "shopMechanics"));
        merged = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } else {
        const snap1 = await getDocs(query(collection(db, "shopMechanics"), where("shopId", "==", shopId || "invalid")));
        let mechs1 = snap1.docs.map((d) => ({ id: d.id, ...d.data() }));
        
        let mechs2 = [];
        if (userObj?.id) {
          const snap2 = await getDocs(query(collection(db, "shopMechanics"), where("ownerId", "==", userObj.id)));
          mechs2 = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
        }
        
        merged = [...mechs1, ...mechs2];
      }
      
      const uniqueMerged = Array.from(new Map(merged.map(m => [m.id, m])).values());
      setMechanics(uniqueMerged);
    } catch (e) {
      console.error("Failed to load mechanics", e);
      setMechanics([]);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/login"); return; }
      setUid(u.uid);
      
      const userSnap = await getDoc(doc(db, "users", u.uid));
      let userObj = { id: u.uid };
      if (userSnap.exists()) userObj = { ...userObj, ...userSnap.data() };
      
      await Promise.all([loadRequests(userObj), loadMechanics(userObj)]);
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const loadRequests = async (userObj) => {
  try {
    const role = (userObj?.role || "").toLowerCase();
    const isAdmin = role === "admin";
    setUserRole(role);

    let shopId = userObj?.shopId;
    if (!isAdmin && userObj?.shopName) {
      const sName = userObj.shopName.toUpperCase();
      if (sName.includes("JME")) shopId = "JME";
      else if (sName.includes("GRHE")) shopId = "GRHE";
    }
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

    let merged = [];
    if (isAdmin) {
      const snap = await getDocs(collection(db, "mechanicRequests"));
      merged = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      const snap1 = await getDocs(query(collection(db, "mechanicRequests"), where("shopId", "==", shopId || "invalid")));
      let reqs1 = snap1.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      let reqs2 = [];
      if (userObj?.id) {
        const snap2 = await getDocs(query(collection(db, "mechanicRequests"), where("ownerId", "==", userObj.id)));
        reqs2 = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      
      merged = [...reqs1, ...reqs2];
    }
    const uniqueMerged = Array.from(new Map(merged.map(r => [r.id, r])).values());

    // Sort newest requests first
    uniqueMerged.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setRequests(uniqueMerged);
    setMechanicName(uniqueMerged[0]?.mechanicName || uniqueMerged[0]?.assignedMechanicName || "");
  } catch (e) {
    console.error("Failed to load requests:", e);
    setRequests([]);
  }
};

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const updateStatus = async (requestId, newStatus, customerId, customerMsg) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "mechanicRequests", requestId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Notify the customer
      if (customerId) {
        await addDoc(collection(db, "notifications"), {
          userId: customerId,
          title: newStatus === "Accepted"
            ? "Request Accepted! 🎉"
            : newStatus === "Declined"
            ? "Request Declined ❌"
            : "Job Completed! ✅",
          message: customerMsg,
          type: "request_update",
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      // Update local state
      setRequests((prev) => {
        const nextReqs = prev.map((r) => r.id === requestId ? { ...r, status: newStatus } : r);
        const request = nextReqs.find((r) => r.id === requestId);
        if (request?.assignedMechanicId) {
          const mId = request.assignedMechanicId;
          const hasActive = nextReqs.some(r => r.assignedMechanicId === mId && ["accepted"].includes((r.status || "").toLowerCase()));
          updateDoc(doc(db, "shopMechanics", mId), { available: !hasActive }).catch(()=>{});
          setMechanics((mPrev) => mPrev.map((m) => m.id === mId ? { ...m, available: !hasActive } : m));
        }
        return nextReqs;
      });
      if (selected?.id === requestId) setSelected((prev) => ({ ...prev, status: newStatus }));

      showToast(
        newStatus === "Accepted" ? "✅ Request accepted!" :
        newStatus === "Declined" ? "❌ Request declined." :
        "🏁 Marked as completed!"
      );
    } catch (e) {
      showToast("❌ Failed to update. Try again.");
    }
    setSaving(false);
  };

  const filtered = requests.filter((r) => {
    if (activeTab === "All") return true;
    return (r.status || "Pending").toLowerCase() === activeTab.toLowerCase();
  });

  const pendingCount = requests.filter((r) => (r.status || "Pending") === "Pending").length;

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => (r.status || "Pending") === "Pending").length,
    accepted: requests.filter((r) => r.status === "Accepted").length,
    completed: requests.filter((r) => r.status === "Completed").length,
    declined: requests.filter((r) => r.status === "Declined" || r.status === "Cancelled").length,
  };

  return (
    <div style={sh.page}>
      <style>{keyframes}</style>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)",
          background: colors.navy, color: "#fff", padding: "10px 20px",
          borderRadius: "12px", fontSize: "13px", fontWeight: "600",
          zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: colors.accent, fontSize: "18px", cursor: "pointer", padding: 0 }}>←</button>
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
        {pendingCount > 0 && (
          <div style={{
            background: colors.danger, color: "#fff",
            fontSize: "11px", fontWeight: "700",
            borderRadius: "20px", padding: "4px 10px",
          }}>
            {pendingCount} pending
          </div>
        )}
      </div>

      {/* HERO */}
      <div style={sh.hero}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>Requests</span></div>
        <div style={sh.heroGreeting}>Visit Requests</div>
        <div style={sh.heroSub}>
          {pendingCount > 0
            ? `You have ${pendingCount} pending request${pendingCount > 1 ? "s" : ""}.`
            : "No pending requests right now."}
        </div>
      </div>

      <div style={sh.content}>

        {/* STATS */}
        <div style={sh.sectionLabel}>Overview</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "1rem" }}>
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
                    ${colors.info} ${(stats.pending / stats.total) * 50}% ${((stats.pending + stats.accepted) / stats.total) * 50}%,
                    ${colors.success} ${((stats.pending + stats.accepted) / stats.total) * 50}% ${((stats.pending + stats.accepted + stats.completed) / stats.total) * 50}%,
                    ${colors.danger} ${((stats.pending + stats.accepted + stats.completed) / stats.total) * 50}% 50%,
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
                <span style={{ fontSize: "8px", color: colors.textSecondary, fontWeight: "700", marginTop: "2px" }}>REQ.</span>
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
                  <span style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600" }}>Accepted</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary }}>{stats.accepted}</span>
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
                  <span style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600" }}>Declined</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary }}>{stats.declined}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FILTER TABS */}
        <div style={sh.sectionLabel}>Filter</div>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "1rem", paddingBottom: "4px" }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 14px", borderRadius: "20px",
                border: activeTab === tab ? "none" : `1px solid ${colors.border}`,
                cursor: "pointer", fontSize: "12px", fontWeight: "600",
                whiteSpace: "nowrap", fontFamily: "inherit",
                background: activeTab === tab
                  ? `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`
                  : colors.white,
                color: activeTab === tab ? "#fff" : colors.textSecondary,
                boxShadow: activeTab === tab ? "0 2px 8px rgba(26,58,92,0.25)" : "none",
              }}
            >
              {tab}
              {tab === "Pending" && pendingCount > 0 && (
                <span style={{ marginLeft: "6px", background: colors.danger, color: "#fff", fontSize: "10px", fontWeight: "700", borderRadius: "10px", padding: "1px 5px" }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* REQUESTS LIST */}
        <div style={sh.sectionLabel}>Requests ({filtered.length})</div>
        <div style={sh.card}>
          {loading ? (
            <CarLoader text="Loading requests" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="📍"
              title={`No ${activeTab !== "All" ? activeTab.toLowerCase() + " " : ""}requests`}
              subtitle="There are currently no requests matching this filter."
            />
          ) : (
            filtered.map((r, i) => {
              const isNewRequest = !r.assignedMechanicId && (r.status || "Pending").toLowerCase() === "pending";
              return (
              <div
                key={r.id}
                style={{
                  ...sh.rowItem,
                  borderBottom: i === filtered.length - 1 ? "none" : `1px solid ${colors.border}`,
                  cursor: "pointer",
                  background: (r.status || "Pending") === "Pending" ? colors.warningBg : "transparent",
                  borderRadius: (r.status || "Pending") === "Pending" ? "12px" : "0",
                  marginBottom: (r.status || "Pending") === "Pending" ? "4px" : "0",
                }}
                onClick={() => {
                  setSelected(r);
                  setNewMechanic(r.assignedMechanicId || "");
                }}
              >
                <div style={{ ...sh.rowIcon(colors.warningBg), fontSize: "18px" }}>
                  {statusIcon(r.status)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "600", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                    {r.customerName || "Customer"}
                    {isNewRequest && (
                      <span style={{ fontSize: "9px", fontWeight: "800", background: colors.danger, color: "#fff", padding: "2px 5px", borderRadius: "6px", letterSpacing: "0.5px", boxShadow: "0 2px 4px rgba(220,38,38,0.3)" }}>NEW</span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "1px" }}>
                    📍 {r.address || "No address"}
                  </div>
                  {r.notes ? (
                    <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "1px" }}>
                      "{r.notes.length > 40 ? r.notes.slice(0, 40) + "…" : r.notes}"
                    </div>
                  ) : null}
                  <div style={{ fontSize: "10px", color: colors.textMuted, marginTop: "3px" }}>
                    {timeAgo(r.createdAt)}
                    {r.status === "Accepted" && (
                      <span style={{ marginLeft: "8px", color: r.assignedMechanicId ? colors.info : colors.warning, fontWeight: "800", animation: !r.assignedMechanicId ? "pulse-warning 2s infinite" : "none", borderRadius: "8px", padding: !r.assignedMechanicId ? "2px 6px" : "0", background: !r.assignedMechanicId ? colors.warningBg : "transparent" }}>
                        • {r.assignedMechanicName ? `👷 ${r.assignedMechanicName}` : "⚠️ Needs Mechanic"}
                      </span>
                    )}
                  </div>
                </div>
                <span style={statusStyle(r.status)}>{r.status || "Pending"}</span>
              </div>
              );
            })
          )}
        </div>
      </div>

      {/* REQUEST DETAIL MODAL */}
      {selected && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "flex-end" }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{ background: colors.white, borderRadius: "24px 24px 0 0", width: "100%", padding: "1.5rem 1.25rem", maxHeight: "88vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ fontWeight: "700", fontSize: "16px" }}>📍 Visit Request</div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: colors.textMuted }}>×</button>
            </div>

            {/* Status badge */}
            <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={statusStyle(selected.status)}>{selected.status || "Pending"}</span>
              <span style={{ fontSize: "11px", color: colors.textMuted }}>{timeAgo(selected.createdAt)}</span>
            </div>

            {[
              ["Customer", selected.customerName || "Unknown"],
              ["Address / Location", selected.address || "N/A"],
              ["Notes", selected.notes || "None"],
            ].map(([label, value]) => (
              <div key={label} style={{ marginBottom: "0.85rem" }}>
                <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", marginBottom: "3px" }}>{label}</div>
                <div style={{ fontSize: "14px", color: colors.textPrimary, lineHeight: "1.4" }}>{value}</div>
              </div>
            ))}

            {/* Action buttons based on current status */}
            <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "10px" }}>

              {(selected.status || "Pending") === "Pending" && (
                <>
                  <button
                    onClick={() => updateStatus(
                      selected.id, "Accepted", selected.customerId,
                      `Your visit request has been accepted! A mechanic will be assigned shortly.`
                    )}
                    disabled={saving}
                    style={{
                      width: "100%", padding: "13px",
                      background: `linear-gradient(135deg, ${colors.success}, #15803d)`,
                      color: "#fff", fontSize: "14px", fontWeight: "600",
                      border: "none", borderRadius: "12px", cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {saving ? "Saving..." : "✅ Accept Request"}
                  </button>
                  <button
                    onClick={() => updateStatus(
                      selected.id, "Declined", selected.customerId,
                      `Unfortunately, your visit request was declined by the mechanic. Please try another mechanic or book a service instead.`
                    )}
                    disabled={saving}
                    style={{
                      width: "100%", padding: "13px",
                      background: colors.dangerBg, color: colors.danger,
                      fontSize: "14px", fontWeight: "600",
                      border: `1px solid ${colors.danger}`, borderRadius: "12px",
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {saving ? "Saving..." : "❌ Decline Request"}
                  </button>
                </>
              )}

              {selected.status === "Accepted" && (
                <>
                  <div style={{ marginBottom: "1rem", padding: !selected.assignedMechanicId ? "16px" : "0", background: !selected.assignedMechanicId ? colors.warningBg : "transparent", borderRadius: "16px", border: !selected.assignedMechanicId ? `2px dashed ${colors.warning}` : "none" }}>
                    <div style={{ fontSize: "12px", color: !selected.assignedMechanicId ? colors.warning : colors.textMuted, fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      {!selected.assignedMechanicId && <span style={{ fontSize: "18px", animation: "ab-bounce 1s infinite" }}>⚠️</span>} 
                      Assign Mechanic
                    </div>
                    {!selected.assignedMechanicId && (
                      <div style={{ fontSize: "13px", color: colors.warning, fontWeight: "600", marginBottom: "12px", lineHeight: "1.4" }}>
                        Please select a mechanic from the list below to dispatch them for this request.
                      </div>
                    )}
                    {mechanics.length === 0 ? (
                      <div style={{ fontSize: "12px", color: colors.danger, padding: "8px 10px", background: colors.dangerBg, borderRadius: "8px" }}>
                        ⚠ No mechanics found. Add mechanics from the Owner Dashboard first.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "240px", overflowY: "auto", padding: "2px" }}>
                        <div 
                          onClick={() => setNewMechanic("")}
                          style={{ padding: "12px 16px", borderRadius: "14px", border: newMechanic === "" ? `2px solid ${colors.blue}` : `1.5px solid ${colors.border}`, background: newMechanic === "" ? colors.infoBg : colors.white, cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", transition: "all 0.2s ease" }}
                        >
                          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🚫</div>
                          <div style={{ fontSize: "14px", fontWeight: "700", color: newMechanic === "" ? colors.blue : colors.textPrimary }}>Leave Unassigned</div>
                          {newMechanic === "" && <div style={{ marginLeft: "auto", color: colors.blue, fontSize: "18px", fontWeight: "800" }}>✓</div>}
                        </div>
                        {mechanics.filter(m => {
                          if (selected.shopId) {
                            if (m.shopId) return m.shopId === selected.shopId;
                            if (m.ownerId) return m.ownerId === uid;
                            return false;
                          } else if (userRole !== "admin") {
                            return m.ownerId === uid;
                          }
                          return true;
                        }).map((m) => {
                          const isSelected = newMechanic === m.id;
                          const displaySpec = m.specializations && m.specializations.length > 0 ? m.specializations.join(", ") : (m.specialization || "General Mechanic");
                          const isAvailable = m.available !== false;
                          return (
                            <div 
                              key={m.id}
                              onClick={() => { if (isAvailable) setNewMechanic(m.id); }}
                              style={{ padding: "12px 16px", borderRadius: "14px", border: isSelected ? `2px solid ${colors.blue}` : `1.5px solid ${colors.border}`, background: isSelected ? colors.infoBg : (isAvailable ? colors.white : "#f8fafc"), cursor: isAvailable ? "pointer" : "not-allowed", opacity: isAvailable ? 1 : 0.6, display: "flex", alignItems: "center", gap: "12px", transition: "all 0.2s ease", boxShadow: isSelected ? "0 4px 12px rgba(37,99,235,0.1)" : "none" }}
                            >
                              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: isSelected ? colors.blue : colors.infoBg, color: isSelected ? "#fff" : colors.info, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "800", flexShrink: 0 }}>{getInitials(m.name || m.displayName)}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "14px", fontWeight: "800", color: isSelected ? colors.blue : colors.textPrimary, display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                                  {m.name || m.displayName || "Mechanic"}
                                  {!isAvailable && <span style={{ fontSize: "10px", background: colors.dangerBg, color: colors.danger, padding: "2px 6px", borderRadius: "6px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>Unavailable</span>}
                                </div>
                                <div style={{ fontSize: "12px", color: colors.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500" }}>{displaySpec}</div>
                              </div>
                              {isSelected && <div style={{ color: colors.blue, fontSize: "18px", fontWeight: "800" }}>✓</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {newMechanic && newMechanic !== selected.assignedMechanicId && (
                      <button
                        onClick={async () => {
                          setSaving(true);
                          try {
                            const mechanic = mechanics.find(m => m.id === newMechanic);
                            await updateDoc(doc(db, "mechanicRequests", selected.id), {
                              assignedMechanicId: newMechanic,
                              assignedMechanicName: mechanic?.displayName || mechanic?.name || "Mechanic",
                              updatedAt: serverTimestamp(),
                            });
                            
                            setRequests(prev => {
                              const nextReqs = prev.map(r => r.id === selected.id ? { ...r, assignedMechanicId: newMechanic, assignedMechanicName: mechanic?.displayName || mechanic?.name || "Mechanic" } : r);
                              const hasActive = nextReqs.some(r => r.assignedMechanicId === newMechanic && ["accepted"].includes((r.status || "").toLowerCase()));
                              try {
                                updateDoc(doc(db, "shopMechanics", newMechanic), { available: !hasActive });
                                setMechanics(mPrev => mPrev.map(m => m.id === newMechanic ? { ...m, available: !hasActive } : m));
                              } catch (err) {}
                              return nextReqs;
                            });

                            if (selected.customerId) {
                              await addDoc(collection(db, "notifications"), {
                                userId: selected.customerId,
                                title: "Mechanic Assigned 🔧",
                                message: `${mechanic?.displayName || mechanic?.name || "A mechanic"} has been assigned to your request at ${selected.address}.`,
                                type: "request_update",
                                read: false,
                                createdAt: serverTimestamp(),
                              });
                            }

                            setSelected(prev => ({ ...prev, assignedMechanicId: newMechanic, assignedMechanicName: mechanic?.displayName || mechanic?.name || "Mechanic" }));
                            showToast("✅ Mechanic assigned successfully!");
                          } catch(e) {
                            showToast("❌ Failed to assign mechanic.");
                          }
                          setSaving(false);
                        }}
                        disabled={saving}
                        style={{
                          marginTop: "12px", width: "100%", padding: "14px",
                          background: `linear-gradient(135deg, ${colors.info}, #1e40af)`, color: "#fff",
                          fontSize: "14px", fontWeight: "700",
                          border: "none", borderRadius: "12px", cursor: "pointer", fontFamily: "inherit",
                          boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                        }}
                      >
                        {saving ? "Assigning..." : "Assign Selected Mechanic"}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => updateStatus(
                      selected.id, "Completed", selected.customerId,
                      `Your visit request has been marked as completed. Thank you for choosing AutoBook!`
                    )}
                    disabled={saving}
                    style={{
                      width: "100%", padding: "13px",
                      background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
                      color: "#fff", fontSize: "14px", fontWeight: "600",
                      border: "none", borderRadius: "12px", cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {saving ? "Saving..." : "🏁 Mark as Completed"}
                  </button>
                </>
              )}

              {(selected.status === "Completed" || selected.status === "Declined" || selected.status === "Cancelled") && (
                <div style={{ fontSize: "13px", color: selected.status === "Completed" ? colors.success : colors.danger, fontWeight: "600", padding: "10px", background: selected.status === "Completed" ? colors.successBg : colors.dangerBg, borderRadius: "10px", border: `1px solid ${selected.status === "Completed" ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.3)"}` }}>
                  {selected.status === "Completed"
                    ? "✅ This request is completed."
                    : `❌ This request was ${(selected.status || "declined").toLowerCase()}.`}
                </div>
              )}

              <button onClick={() => setSelected(null)} style={sh.outlineBtn}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}