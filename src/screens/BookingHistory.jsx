import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, updateDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { sh, colors, EmptyState, getInitials, SharedSearchBar } from "./dashboardShared";
import SkeletonLoader from "./SkeletonLoader";
import BackButton from "../components/BackButton";
import { CheckCircle2, Wrench, XCircle, Clock, ClipboardList, Store, Calendar, Car, X, RefreshCw } from "lucide-react";

const STATUS_TABS = ["All", "Pending", "In Progress", "Completed", "Cancelled", "Archived"];

const statusStyle = (s) => {
  if ((s || "").toLowerCase() === "completed") return sh.badge(colors.successBg, colors.success);
  if ((s || "").toLowerCase() === "in progress") return sh.badge(colors.infoBg, colors.info);
  if ((s || "").toLowerCase() === "cancelled") return sh.badge(colors.dangerBg, colors.danger);
  return sh.badge(colors.warningBg, colors.warning);
};

const statusIcon = (s) => {
  if ((s || "").toLowerCase() === "completed") return <CheckCircle2 size={20} />;
  if ((s || "").toLowerCase() === "in progress") return <Wrench size={20} />;
  if ((s || "").toLowerCase() === "cancelled") return <XCircle size={20} />;
  return <Clock size={20} />;
};

function timeAgo(timestamp) {
  if (!timestamp) return "Just now";
  let ts;
  if (timestamp.toDate) ts = timestamp.toDate().getTime();
  else if (timestamp.seconds) ts = timestamp.seconds * 1000;
  else if (typeof timestamp === 'number') ts = timestamp;
  else ts = new Date(timestamp).getTime();

  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function BookingStepper({ status }) {
  const currentStatus = (status || "Pending").toLowerCase();
  const isCancelled = currentStatus === "cancelled";

  if (isCancelled) {
    return (
      <div style={{ padding: "16px", background: colors.dangerBg, borderRadius: "16px", textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{ color: colors.danger, fontWeight: "800", fontSize: "16px", marginBottom: "4px" }}>Booking Cancelled</div>
        <div style={{ color: colors.textSecondary, fontSize: "13px" }}>This service request was cancelled.</div>
      </div>
    );
  }

  const steps = [
    { key: "pending", label: "Booked", desc: "Waiting for shop to assign a mechanic" },
    { key: "in progress", label: "In Progress", desc: "Mechanic is working on your vehicle" },
    { key: "completed", label: "Completed", desc: "Service is finished" }
  ];

  let activeIndex = 0;
  if (currentStatus === "in progress") activeIndex = 1;
  if (currentStatus === "completed") activeIndex = 2;

  return (
    <div style={{ padding: "20px", background: "#f9fafb", borderRadius: "20px", marginBottom: "1.5rem", border: `1px solid ${colors.border}` }}>
      {steps.map((step, index) => {
        const isPast = index < activeIndex;
        const isActive = index === activeIndex;
        const isLast = index === steps.length - 1;

        let dotColor = colors.border;
        if (isActive) dotColor = colors.navy;
        if (isPast) dotColor = colors.success;

        return (
          <div key={step.key} style={{ display: "flex", gap: "16px", position: "relative", minHeight: isLast ? "auto" : "60px" }}>
            {/* Timeline Line */}
            {!isLast && (
              <div style={{ position: "absolute", left: "11px", top: "24px", bottom: "-8px", width: "2px", background: isPast ? colors.success : colors.border }} />
            )}
            
            {/* Dot */}
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: dotColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 2, marginTop: "2px", border: isActive ? `4px solid ${colors.infoBg}` : 'none', boxSizing: "content-box", transform: isActive ? "translateX(-4px)" : "none" }}>
              {isPast ? <CheckCircle2 size={16} color="#fff" /> : <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#fff" }} />}
            </div>

            {/* Content */}
            <div style={{ paddingBottom: isLast ? "0" : "20px" }}>
              <div style={{ fontSize: "15px", fontWeight: isActive ? "800" : "600", color: isActive || isPast ? colors.textPrimary : colors.textMuted }}>{step.label}</div>
              <div style={{ fontSize: "13px", color: isActive ? colors.textSecondary : colors.textMuted, marginTop: "4px" }}>{step.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const keyframes = `
  @keyframes ab-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes ab-slide-up {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  
  
  
  
`;

export default function BookingHistory() {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(false);
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);
  const [uid, setUid] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [selected, setSelected] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [search, setSearch] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const loadBookings = useCallback(async (customerId) => {
    try {
      const q = query(
        collection(db, "bookings"),
        where("customerId", "==", customerId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const allBookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBookings(allBookings);
    } catch (e) { setBookings([]); }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/login"); return; }
      setUid(u.uid);
      await loadBookings(u.uid);
      setLoading(false);
    });
    return () => unsub();
  }, [navigate, loadBookings]);

  const handleCancel = async () => {
    if (!selected) return;
    if (!cancelReason.trim()) return; // reason is required
    setShowCancelConfirm(false);
    setCancelling(true);
    try {
      await updateDoc(doc(db, "bookings", selected.id), { status: "Cancelled", cancelReason: cancelReason.trim() });

      // Notify customer
      await addDoc(collection(db, "notifications"), {
        userId: uid,
        title: "Booking Cancelled",
        message: `Your booking for ${selected.serviceType} at ${selected.shopName} has been cancelled. Reason: ${cancelReason.trim()}`,
        type: "booking_cancelled",
        read: false,
        createdAt: serverTimestamp(),
      });

      // Notify Admin
      await addDoc(collection(db, "adminAlerts"), {
        type: "job_cancelled",
        title: "Booking Cancelled",
        message: `Customer ${selected.customerName || "A customer"} cancelled their booking for ${selected.serviceType} at ${selected.shopName}. Reason: ${cancelReason.trim()}`,
        shopId: selected.shopId || null,
        read: false,
        createdAt: serverTimestamp(),
      });

      setBookings((prev) => prev.map((b) => b.id === selected.id ? { ...b, status: "Cancelled", cancelReason: cancelReason.trim() } : b));
      setCancelReason("");
      setSelected(null);
    } catch (e) { console.error(e); }
    setCancelling(false);
  };

  const handleRestore = async () => {
    if (!selected) return;
    setCancelling(true);
    try {
      await updateDoc(doc(db, "bookings", selected.id), { status: "Pending" });

      // Notify Admin
      await addDoc(collection(db, "adminAlerts"), {
        type: "booking_created",
        title: "Booking Restored",
        message: `Customer ${selected.customerName || "A customer"} restored their cancelled booking for ${selected.serviceType} at ${selected.shopName}.`,
        shopId: selected.shopId || null,
        read: false,
        createdAt: serverTimestamp(),
      });

      setBookings((prev) => prev.map((b) => b.id === selected.id ? { ...b, status: "Pending" } : b));
      setSelected((prev) => ({ ...prev, status: "Pending" }));
    } catch (e) { console.error(e); }
    setCancelling(false);
  };

  const filtered = bookings.filter((b) => {
    if (activeTab === "Archived") {
      if (b.archived !== true) return false;
    } else {
      if (b.archived === true) return false;
      if (activeTab !== "All" && (b.status || "Pending").toLowerCase() !== activeTab.toLowerCase()) return false;
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      const matchService = (b.serviceType || "").toLowerCase().includes(s);
      const matchShop = (b.shopName || "").toLowerCase().includes(s);
      if (!matchService && !matchShop) return false;
    }
    return true;
  });

  const statsBookings = bookings.filter(b => !b.archived);
  const stats = {
    total: statsBookings.length,
    pending: statsBookings.filter((b) => (b.status || "Pending").toLowerCase() === "pending").length,
    inProgress: statsBookings.filter((b) => (b.status || "").toLowerCase() === "in progress").length,
    completed: statsBookings.filter((b) => (b.status || "").toLowerCase() === "completed").length,
    cancelled: statsBookings.filter((b) => (b.status || "").toLowerCase() === "cancelled").length,
  };

  return (
    <div style={sh.page}>
      <style>{keyframes}</style>

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BackButton />
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
      </div>

      {/* HERO */}
      <div style={sh.hero}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>Bookings History</span></div>
        <div style={sh.heroGreeting}>My Bookings</div>
        <div style={sh.heroSub}>Track all your service appointments.</div>
      </div>

      <div style={sh.content} className="stagger-slide-up">
        {/* BOOK AGAIN CTA */}
        <button onClick={() => navigate("/customer/shop-select")} style={{ ...sh.primaryBtn, padding: "16px", borderRadius: "16px", fontSize: "15px", boxShadow: "0 8px 20px rgba(42,82,152,0.25)", marginBottom: "1.5rem" }}>
          + Book a New Service
        </button>

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

        {/* FILTER TABS */}
        <div style={{ ...sh.sectionLabel, fontSize: "13px", color: colors.textPrimary, letterSpacing: "0.5px", marginBottom: "1rem" }}>Filter</div>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "1.5rem", paddingBottom: "4px" }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 18px", borderRadius: "20px", fontSize: "13px",
                fontWeight: "700", whiteSpace: "nowrap", cursor: "pointer", fontFamily: "inherit",
                background: activeTab === tab ? `linear-gradient(135deg, ${colors.navy}, ${colors.blue})` : colors.white,
                color: activeTab === tab ? "#fff" : colors.textSecondary,
                border: activeTab === tab ? "none" : `1px solid ${colors.border}`,
                boxShadow: activeTab === tab ? "0 4px 12px rgba(26,58,92,0.2)" : "none",
                transition: "all 0.2s",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* SEARCH BAR */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem" }}>
          <SharedSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by service or shop name..."
          />
        </div>

        {/* BOOKINGS LIST */}
        <div style={{ ...sh.sectionLabel, fontSize: "13px", color: colors.textPrimary, letterSpacing: "0.5px" }}>Bookings ({filtered.length})</div>
        {loading ? (
          <SkeletonLoader count={3} type="card" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={48} />}
            title={`No ${activeTab !== "All" ? activeTab.toLowerCase() + " " : ""}bookings found`}
            subtitle="Your service history will appear here once you book a service."
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginBottom: "1.5rem" }}>
            {filtered.map((b) => (
                <div key={b.id} style={{
                  background: colors.white,
                  borderRadius: "16px",
                  border: `1px solid ${colors.border}`,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  padding: "16px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }} 
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)"; }}
                onClick={() => setSelected(b)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ ...statusStyle(b.status), padding: "4px 10px", borderRadius: "8px", fontSize: "11px", display: "inline-block" }}>{b.status || "Pending"}</span>
                  </div>

                  <div>
                    <div style={{ fontWeight: "800", fontSize: "16px", color: colors.textPrimary, marginBottom: "8px", lineHeight: 1.3 }}>
                      {b.serviceType || "Service"}
                    </div>
                    <div style={{ fontSize: "13px", color: colors.textSecondary, display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <Store size={14} /> {b.shopName || "AutoBook"}
                    </div>
                    <div style={{ fontSize: "13px", color: colors.textSecondary, display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <Calendar size={14} /> {b.date || "No date"} {b.time && `• ${b.time}`}
                    </div>
                    {b.vehicleLabel && (
                      <div style={{ fontSize: "13px", color: colors.textSecondary, display: "flex", alignItems: "center", gap: "8px" }}>
                        <Car size={14} /> {b.vehicleLabel}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: `1px solid ${colors.bg}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {b.mechanicId ? (
                      <div style={{ fontSize: "12px", color: colors.info, fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
                          {getInitials(b.mechanicName || "M")}
                        </div>
                        {b.mechanicName || "Assigned"}
                      </div>
                    ) : (
                      <div style={{ fontSize: "12px", color: colors.warning, fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: colors.warningBg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.warning }}>
                          <Clock size={12} />
                        </div>
                        Waiting for mechanic
                      </div>
                    )}
                    <div style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600" }}>{timeAgo(b.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* BOOKING DETAIL MODAL */}
      {selected && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 110, display: "flex", alignItems: "flex-end", animation: "ab-fade-in 0.2s ease-out" }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{ background: colors.white, borderRadius: "28px 28px 0 0", width: "100%", padding: "2rem 1.5rem", maxHeight: "90vh", overflowY: "auto", animation: "ab-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards", boxShadow: "0 -4px 24px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontWeight: "800", fontSize: "18px", color: colors.navy }}>Booking Details</div>
              <button onClick={() => setSelected(null)} style={{ background: colors.bg, border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", cursor: "pointer", color: colors.textSecondary }}>×</button>
            </div>

            <BookingStepper status={selected.status} />

            {[
              ["Shop", selected.shopName],
              ["Service Type", selected.serviceType],
              ["Date", selected.date],
              ["Time", selected.time],
              ["Vehicle", selected.vehicleLabel || "Not specified"],
              ["Notes", selected.notes || "None"],
            ].map(([label, value]) => value && (
              <div key={label} style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{label}</div>
                <div style={{ fontSize: "15px", color: colors.textPrimary, fontWeight: "500" }}>{value}</div>
              </div>
            ))}

            {/* Cancel option - only for pending bookings */}
            {(selected.status || "Pending").toLowerCase() === "pending" && (
              <>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={cancelling}
                  style={{
                    width: "100%", padding: "16px",
                    background: colors.dangerBg, color: colors.danger,
                    fontSize: "15px", fontWeight: "700",
                    border: `1.5px solid rgba(220,38,38,0.3)`, borderRadius: "16px",
                    cursor: "pointer", fontFamily: "inherit", marginBottom: "12px",
                    opacity: cancelling ? 0.7 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    transition: "all 0.2s ease",
                  }}
                >
                  <X size={18} />
                  {cancelling ? "Cancelling..." : "Cancel this booking"}
                </button>
              </>
            )}

            {/* Restore option - only for cancelled bookings */}
            {(selected.status || "").toLowerCase() === "cancelled" && (
              <>
                <button
                  onClick={handleRestore}
                  disabled={cancelling}
                  style={{
                    width: "100%", padding: "16px",
                    background: colors.warningBg, color: colors.warning,
                    fontSize: "15px", fontWeight: "700",
                    border: `1.5px solid rgba(245,158,11,0.3)`, borderRadius: "16px",
                    cursor: "pointer", fontFamily: "inherit", marginBottom: "12px",
                    opacity: cancelling ? 0.7 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    transition: "all 0.2s ease",
                  }}
                >
                  <RefreshCw size={18} />
                  {cancelling ? "Restoring..." : "Restore this booking"}
                </button>
              </>
            )}

            <button onClick={() => setSelected(null)} style={{ ...sh.outlineBtn, padding: "16px", borderRadius: "16px", fontSize: "15px", border: "none", background: colors.bg, color: colors.textSecondary, fontWeight: "700" }}>Close</button>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {showCancelConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", animation: "ab-fade-in 0.2s ease-out" }} onClick={() => { setShowCancelConfirm(false); setCancelReason(""); }}>
          <div style={{ background: colors.white, borderRadius: "24px", width: "100%", maxWidth: "340px", padding: "28px 24px", textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: colors.dangerBg, color: colors.danger, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><X size={28} /></div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: colors.textPrimary, fontWeight: "800" }}>Cancel Booking?</h3>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: colors.textSecondary, lineHeight: "1.5" }}>
              You're about to cancel your <strong>{selected?.serviceType}</strong> booking at <strong>{selected?.shopName}</strong>.
            </p>

            <div style={{ textAlign: "left", marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                Reason for cancellation <span style={{ color: colors.danger }}>*</span>
              </div>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule conflict, found another shop, emergency..."
                rows={3}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: "12px",
                  border: `1.5px solid ${cancelReason.trim() ? colors.border : colors.border}`,
                  fontSize: "13px", fontFamily: "inherit", outline: "none",
                  background: "#f9fafb", color: colors.textPrimary,
                  resize: "none", boxSizing: "border-box", lineHeight: "1.5"
                }}
              />
              {!cancelReason.trim() && (
                <div style={{ fontSize: "11px", color: colors.danger, marginTop: "4px", fontWeight: "600" }}>
                  Please provide a reason before cancelling.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => { setShowCancelConfirm(false); setCancelReason(""); }} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: colors.bg, border: `1px solid ${colors.border}`, color: colors.textSecondary, fontWeight: "700", cursor: "pointer", fontFamily: "inherit", fontSize: "14px" }}>No, keep it</button>
              <button onClick={handleCancel} disabled={cancelling || !cancelReason.trim()} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: colors.danger, border: "none", color: "#fff", fontWeight: "700", cursor: cancelReason.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: "14px", opacity: (cancelling || !cancelReason.trim()) ? 0.5 : 1 }}>
                {cancelling ? "Cancelling..." : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

          </div>
  );
}
