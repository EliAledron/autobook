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
import { Wrench, CheckCircle2, XCircle, Clock, AlertTriangle, Calendar, Car } from "lucide-react";

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
  if (sl === "completed")   return <CheckCircle2 size={16} />;
  if (sl === "in progress") return <Wrench size={16} />;
  if (sl === "cancelled")   return <XCircle size={16} />;
  return <Clock size={16} />;
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

import { sendPushNotification } from "../utils/notifications";
export default function MechanicBookings() {
  const navigate = useNavigate();
  const [uid, setUid] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [newReadyTime, setNewReadyTime] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [updatingTime, setUpdatingTime] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/"); return; }
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
      const list = Array.from(map.values())
        .filter(b => b.archived !== true)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
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
            title: newStatus === "In Progress" ? "Job Started" : "Job Completed",
            message: msgMap[newStatus],
            type: "status_update",
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }

      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      if (selected?.id === bookingId) setSelected(prev => ({ ...prev, status: newStatus }));
      showToast(newStatus === "In Progress" ? "Job started!" : "Marked as completed!");
    } catch (e) {
      showToast("Failed to update. Try again.");
    }
    setSaving(false);
  };

  const handleUpdateReadyTime = async () => {
    if (!selected) return;
    if (!newReadyTime.trim()) {
      showToast("Please provide an estimated completion time.");
      return;
    }

    setUpdatingTime(true);
    try {
      const updates = {
        estimatedCompletionTime: newReadyTime.trim(),
        delayNote: delayReason.trim() || null,
        lastDelayedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "bookings", selected.id), updates);

      const customerId = selected?.customerId || selected?.userId;
      if (customerId) {
        await addDoc(collection(db, "notifications"), {
          userId: customerId,
          title: "Service Time Updated ⏱️",
          message: `Your mechanic updated the estimated ready time for ${selected.serviceType || "your service"} to ~${newReadyTime.trim()}.${delayReason.trim() ? ` Note: "${delayReason.trim()}"` : ""}`,
          type: "time_updated",
          bookingId: selected.id,
          read: false,
          createdAt: serverTimestamp(),
        });
        try {
          await sendPushNotification(customerId, "Service Time Updated ⏱️", `Estimated completion is now ~${newReadyTime.trim()}`);
        } catch (err) {}
      }

      setBookings(prev => prev.map(b => b.id === selected.id ? { ...b, ...updates } : b));
      setSelected(prev => ({ ...prev, ...updates }));
      setShowDelayModal(false);
      showToast("Ready time updated & customer notified!");
    } catch (e) {
      console.error("Error updating ready time:", e);
      showToast("Failed to update ready time.");
    }
    setUpdatingTime(false);
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
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}><Wrench size={10} style={{verticalAlign: 'middle', marginRight: '2px'}} /> Mechanic</span></div>
        <div style={sh.heroGreeting}>My Bookings</div>
        <div style={sh.heroSub}>
          {stats.inProgress > 0 ? `${stats.inProgress} job${stats.inProgress > 1 ? "s" : ""} in progress` : stats.pending > 0 ? `${stats.pending} pending assignment${stats.pending > 1 ? "s" : ""}` : "All caught up!"}
        </div>
      </div>

      <div style={sh.content} className="stagger-slide-up">

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
            <EmptyState icon={<Wrench size={48} color={colors.info} />} title={`No ${activeTab !== "All" ? activeTab.toLowerCase() + " " : ""}bookings`} subtitle="No assigned bookings match this filter." />
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
                  <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span>{b.date || timeAgo(b.createdAt) || "—"}</span>
                    <span>•</span>
                    <span>Drop-off: <strong>{b.dropOffTime || b.time || "—"}</strong></span>
                    {(b.estimatedCompletionTime || b.expectedReadyTime) && (
                      <>
                        <span>•</span>
                        <span style={{ color: b.delayNote ? "#b45309" : colors.info, fontWeight: "700" }}>
                          Est: ~{b.estimatedCompletionTime || b.expectedReadyTime}
                        </span>
                      </>
                    )}
                  </div>
                  {b.delayNote && (
                    <div style={{ fontSize: "10px", color: "#b45309", background: "#fef3c7", padding: "2px 8px", borderRadius: "6px", marginTop: "4px", display: "inline-block", fontWeight: "700" }}>
                      ⚠️ Delay: {b.delayNote}
                    </div>
                  )}
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
              <div style={{ fontWeight: "800", fontSize: "17px", color: colors.navy, display: "flex", alignItems: "center", gap: "6px" }}><Wrench size={18} /> Booking Details</div>
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
              ["Drop-off Time", (selected.dropOffTime || selected.time) ? `${selected.date || ""} at ${selected.dropOffTime || selected.time}` : "—"],
              ["Est. Duration", selected.estimatedDuration || "Standard (~1 – 2 hrs)"],
              ["Est. Ready Time", selected.estimatedCompletionTime || selected.expectedReadyTime ? `~${selected.estimatedCompletionTime || selected.expectedReadyTime}` : "—"],
              ["Customer Notes", selected.notes || "None"],
            ].map(([label, value]) => (
              <div key={label} style={{ marginBottom: "0.85rem" }}>
                <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600", textTransform: "uppercase", marginBottom: "3px" }}>{label}</div>
                <div style={{ fontSize: "14px", color: colors.textPrimary, fontWeight: "600" }}>{value}</div>
              </div>
            ))}

            {selected.delayNote && (
              <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "14px", padding: "12px 14px", marginBottom: "1rem" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#b45309", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertTriangle size={14} /> Reported Delay / Notice
                </div>
                <div style={{ fontSize: "13px", color: "#92400e", marginTop: "4px", fontWeight: "600", lineHeight: "1.4" }}>
                  "{selected.delayNote}"
                </div>
              </div>
            )}

            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "10px" }}>
              {["pending", "in progress"].includes((selected.status || "").toLowerCase()) && (
                <button
                  onClick={() => {
                    setNewReadyTime(selected.estimatedCompletionTime || selected.expectedReadyTime || "");
                    setDelayReason(selected.delayNote || "");
                    setShowDelayModal(true);
                  }}
                  style={{
                    width: "100%", padding: "12px", background: "#f0f9ff", color: "#0369a1",
                    fontSize: "13px", fontWeight: "700", border: `1.5px solid #bae6fd`,
                    borderRadius: "14px", cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    transition: "all 0.2s"
                  }}
                >
                  <Clock size={16} /> Update Ready Time / Report Delay
                </button>
              )}

              {(selected.status || "Pending").toLowerCase() === "pending" && (
                <button
                  onClick={() => updateStatus(selected.id, "In Progress")}
                  disabled={saving}
                  style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${colors.info}, #1e40af)`, color: "#fff", fontSize: "14px", fontWeight: "700", border: "none", borderRadius: "14px", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(37,99,235,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  {saving ? "Updating..." : <><Wrench size={16} /> Start Working</>}
                </button>
              )}
              {(selected.status || "").toLowerCase() === "in progress" && (
                <button
                  onClick={() => updateStatus(selected.id, "Completed")}
                  disabled={saving}
                  style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${colors.success}, #15803d)`, color: "#fff", fontSize: "14px", fontWeight: "700", border: "none", borderRadius: "14px", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(22,163,74,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  {saving ? "Saving..." : <><CheckCircle2 size={16} /> Mark as Completed</>}
                </button>
              )}
              {["completed", "cancelled"].includes((selected.status || "").toLowerCase()) && (
                <div style={{ fontSize: "13px", color: selected.status === "Completed" ? colors.success : colors.danger, fontWeight: "600", padding: "12px", background: selected.status === "Completed" ? colors.successBg : colors.dangerBg, borderRadius: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  {selected.status === "Completed" ? <><CheckCircle2 size={16} /> This job is completed.</> : <><XCircle size={16} /> This booking was cancelled.</>}
                </div>
              )}
              <button onClick={() => setSelected(null)} style={{ ...sh.outlineBtn, borderRadius: "14px", padding: "14px" }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE READY TIME / REPORT DELAY MODAL */}
      {showDelayModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setShowDelayModal(false)}>
          <div style={{ background: colors.white, borderRadius: "24px", width: "100%", maxWidth: "380px", padding: "24px", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.info }}>
                <Clock size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: colors.navy }}>Update Ready Time</h3>
                <div style={{ fontSize: "12px", color: colors.textSecondary }}>Notify the customer in real-time</div>
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", marginBottom: "6px" }}>
                Estimated Ready Time <span style={{ color: colors.danger }}>*</span>
              </div>
              <input
                type="text"
                placeholder="e.g. 11:30 AM or 03:00 PM"
                value={newReadyTime}
                onChange={e => setNewReadyTime(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: "12px",
                  border: `1.5px solid ${colors.border}`, fontSize: "14px", fontWeight: "600",
                  outline: "none", boxSizing: "border-box", background: "#f8fafc"
                }}
              />
              <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                {["+30 mins", "+1 hour", "+2 hours"].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      const base = selected?.estimatedCompletionTime || selected?.expectedReadyTime || selected?.dropOffTime || selected?.time || "10:00 AM";
                      const mins = preset.includes("30") ? 30 : preset.includes("1") ? 60 : 120;
                      const parts = base.split(" ");
                      if (parts.length >= 2) {
                        let [h, m] = parts[0].split(":").map(Number);
                        if (parts[1] === "PM" && h !== 12) h += 12;
                        if (parts[1] === "AM" && h === 12) h = 0;
                        const total = h * 60 + (m || 0) + mins;
                        let eh = Math.floor(total / 60);
                        const em = total % 60;
                        const mod = eh >= 12 ? "PM" : "AM";
                        if (eh > 12) eh -= 12;
                        if (eh === 0) eh = 12;
                        setNewReadyTime(`${eh}:${String(em).padStart(2, "0")} ${mod}`);
                      }
                    }}
                    style={{
                      background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: "8px",
                      padding: "4px 10px", fontSize: "11px", fontWeight: "700", color: colors.navy, cursor: "pointer"
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", marginBottom: "6px" }}>
                Reason / Note for Customer (Optional)
              </div>
              <textarea
                placeholder="e.g. Extra time needed for brake rotor resurfacing, or waiting on parts delivery..."
                value={delayReason}
                onChange={e => setDelayReason(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "12px",
                  border: `1.5px solid ${colors.border}`, fontSize: "13px",
                  outline: "none", boxSizing: "border-box", minHeight: "70px", resize: "vertical", background: "#f8fafc"
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowDelayModal(false)}
                style={{ flex: 1, padding: "12px", borderRadius: "12px", background: colors.bg, border: `1px solid ${colors.border}`, color: colors.textSecondary, fontWeight: "700", cursor: "pointer", fontFamily: "inherit", fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateReadyTime}
                disabled={updatingTime}
                style={{ flex: 1, padding: "12px", borderRadius: "12px", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, border: "none", color: "#fff", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", boxShadow: "0 4px 12px rgba(26,58,92,0.2)" }}
              >
                {updatingTime ? "Updating..." : "Save & Notify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
