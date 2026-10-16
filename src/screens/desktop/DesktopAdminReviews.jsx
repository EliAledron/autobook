import React, { useEffect, useState } from "react";
import { collection, onSnapshot, updateDoc, doc, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { colors, ConfirmModal, SuccessModal, ErrorModal, CustomDropdown } from "../dashboardShared";
import RoleBasedWrapper from "../../components/RoleBasedWrapper";
import { 
  Star, Archive, Search, MessageSquare, RotateCcw, Store, 
  Smartphone, Filter, Eye, AlertCircle, CheckCircle2, X, ExternalLink, User 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DesktopAdminReviews() {
  const navigate = useNavigate();
  const [platformReviews, setPlatformReviews] = useState([]);
  const [shopReviews, setShopReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all"); // "all" | "shop" | "platform"
  const [starFilter, setStarFilter] = useState("all"); // "all" | "5" | "4" | "3" | "2" | "1"
  const [showArchived, setShowArchived] = useState(false);

  // Actions & Detail Modal
  const [selectedReview, setSelectedReview] = useState(null);
  const [reviewToArchive, setReviewToArchive] = useState(null);
  const [reviewToRestore, setReviewToRestore] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let unsubPlatform = () => {};
    let unsubBookings = () => {};

    try {
      // 1. Listen to Platform App Reviews
      unsubPlatform = onSnapshot(collection(db, "reviews"), (snap) => {
        const list = snap.docs.map(d => ({
          id: d.id,
          source: "platform",
          rating: Number(d.data().rating) || 5,
          comment: d.data().comment || "",
          customerName: d.data().customerName || "Customer",
          customerId: d.data().customerId || null,
          shopName: "AutoBook Platform",
          shopId: null,
          serviceType: null,
          status: d.data().status || "active",
          createdAt: d.data().createdAt,
        }));
        setPlatformReviews(list);
      }, (err) => {
        console.warn("Platform reviews snapshot error:", err);
      });

      // 2. Listen to Auto Shop Reviews (from bookings with rating > 0)
      unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => {
        const list = snap.docs
          .map(d => {
            const data = d.data();
            return {
              id: d.id,
              source: "shop",
              rating: Number(data.rating),
              comment: data.review || "",
              customerName: data.customerName || "Customer",
              customerId: data.customerId || null,
              customerEmail: data.customerEmail || "",
              shopName: data.shopName || "Auto Shop",
              shopId: data.shopId || null,
              serviceType: data.serviceType || "Automotive Service",
              bookingDate: data.date,
              vehicleLabel: data.vehicleLabel,
              status: data.reviewStatus || (data.reviewHidden ? "archived" : "active"),
              createdAt: data.ratedAt || data.createdAt,
            };
          })
          .filter(b => b.rating && !isNaN(b.rating) && b.rating > 0);

        setShopReviews(list);
        setLoading(false);
      }, (err) => {
        console.warn("Bookings snapshot error:", err);
        setLoading(false);
      });
    } catch (e) {
      console.error("Reviews listener setup failed:", e);
      setLoading(false);
    }

    return () => {
      unsubPlatform();
      unsubBookings();
    };
  }, []);

  // Merge and sort all reviews newest first
  const allReviews = [...platformReviews, ...shopReviews].sort((a, b) => {
    const tA = a.createdAt?.seconds || 0;
    const tB = b.createdAt?.seconds || 0;
    return tB - tA;
  });

  // Calculate KPIs
  const totalCount = allReviews.length;
  const platformAvg = platformReviews.length > 0 
    ? (platformReviews.reduce((sum, r) => sum + r.rating, 0) / platformReviews.length).toFixed(1) 
    : "0.0";
  const shopAvg = shopReviews.length > 0 
    ? (shopReviews.reduce((sum, r) => sum + r.rating, 0) / shopReviews.length).toFixed(1) 
    : "0.0";
  const criticalCount = allReviews.filter(r => r.rating <= 2).length;

  const currentSourceReviews = sourceFilter === "shop" 
    ? shopReviews 
    : sourceFilter === "platform" 
    ? platformReviews 
    : allReviews;

  const starBreakdown = {
    5: currentSourceReviews.filter(r => Math.round(Number(r.rating)) === 5).length,
    4: currentSourceReviews.filter(r => Math.round(Number(r.rating)) === 4).length,
    3: currentSourceReviews.filter(r => Math.round(Number(r.rating)) === 3).length,
    2: currentSourceReviews.filter(r => Math.round(Number(r.rating)) === 2).length,
    1: currentSourceReviews.filter(r => Math.round(Number(r.rating)) === 1).length,
  };

  // Filtered reviews
  const filteredReviews = allReviews.filter(r => {
    // Archived filter
    if (showArchived) {
      if (r.status !== "archived") return false;
    } else {
      if (r.status === "archived") return false;
    }

    // Source filter
    if (sourceFilter !== "all" && r.source !== sourceFilter) return false;

    // Star filter
    if (starFilter !== "all" && Math.round(r.rating) !== Number(starFilter)) return false;

    // Search filter
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (r.customerName || "").toLowerCase().includes(s) ||
      (r.comment || "").toLowerCase().includes(s) ||
      (r.shopName || "").toLowerCase().includes(s) ||
      (r.serviceType || "").toLowerCase().includes(s)
    );
  });

  // Archive review handler (hides review from public profile)
  const confirmArchiveReview = async () => {
    if (!reviewToArchive) return;
    setActionLoading(true);
    try {
      if (reviewToArchive.source === "shop") {
        await updateDoc(doc(db, "bookings", reviewToArchive.id), {
          reviewHidden: true,
          reviewStatus: "archived"
        });
      } else {
        await updateDoc(doc(db, "reviews", reviewToArchive.id), {
          status: "archived"
        });
      }
      setSuccessMsg("Review has been archived and hidden from public display.");
      if (selectedReview?.id === reviewToArchive.id) {
        setSelectedReview(prev => prev ? { ...prev, status: "archived" } : null);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to archive review.");
    } finally {
      setActionLoading(false);
      setReviewToArchive(null);
    }
  };

  // Restore review handler
  const confirmRestoreReview = async () => {
    if (!reviewToRestore) return;
    setActionLoading(true);
    try {
      if (reviewToRestore.source === "shop") {
        await updateDoc(doc(db, "bookings", reviewToRestore.id), {
          reviewHidden: false,
          reviewStatus: "active"
        });
      } else {
        await updateDoc(doc(db, "reviews", reviewToRestore.id), {
          status: "active"
        });
      }
      setSuccessMsg("Review restored to active visibility.");
      if (selectedReview?.id === reviewToRestore.id) {
        setSelectedReview(prev => prev ? { ...prev, status: "active" } : null);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to restore review.");
    } finally {
      setActionLoading(false);
      setReviewToRestore(null);
    }
  };

  return (
    <>
      <SuccessModal message={successMsg} onClose={() => setSuccessMsg("")} />
      <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />

      <ConfirmModal 
        isOpen={!!reviewToArchive} 
        title="Archive Review" 
        message="Are you sure you want to archive this review? It will be hidden from public profiles and shop rating calculations." 
        onConfirm={confirmArchiveReview} 
        onCancel={() => setReviewToArchive(null)} 
        type="danger" 
        confirmText="Archive" 
      />

      <ConfirmModal 
        isOpen={!!reviewToRestore} 
        title="Restore Review" 
        message="Are you sure you want to restore this review? It will be made visible on the platform again." 
        onConfirm={confirmRestoreReview} 
        onCancel={() => setReviewToRestore(null)} 
        type="success" 
        confirmText="Restore" 
      />

      <RoleBasedWrapper title="Reviews & Ratings">
        <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "32px", fontFamily: "'Inter', sans-serif" }}>
          
          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 8px 0" }}>
                Reviews & Ratings Management
              </h1>
              <p style={{ margin: 0, color: colors.textSecondary, fontSize: "15px" }}>
                Unified moderation feed for both Auto Shop service reviews and AutoBook platform feedback.
              </p>
            </div>
          </div>

          {/* STATS OVERVIEW CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
            <div style={{ background: "#fff", padding: "20px", borderRadius: "18px", border: `1px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Total Reviews</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: colors.navy }}>{totalCount}</div>
              <div style={{ fontSize: "12px", color: colors.textMuted, marginTop: "4px" }}>
                {shopReviews.length} Shop • {platformReviews.length} App
              </div>
            </div>

            <div style={{ background: "#fff", padding: "20px", borderRadius: "18px", border: `1px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: colors.blue, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Shop Services Avg</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: colors.blue, display: "flex", alignItems: "center", gap: "6px" }}>
                {shopAvg} <Star size={24} fill="#f59e0b" color="#f59e0b" />
              </div>
              <div style={{ fontSize: "12px", color: colors.textMuted, marginTop: "4px" }}>Across {shopReviews.length} booking ratings</div>
            </div>

            <div style={{ background: "#fff", padding: "20px", borderRadius: "18px", border: `1px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: colors.navy, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Platform App Avg</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: colors.navy, display: "flex", alignItems: "center", gap: "6px" }}>
                {platformAvg} <Star size={24} fill="#f59e0b" color="#f59e0b" />
              </div>
              <div style={{ fontSize: "12px", color: colors.textMuted, marginTop: "4px" }}>Across {platformReviews.length} app reviews</div>
            </div>

            <div style={{ background: "#fff", padding: "20px", borderRadius: "18px", border: `1px solid ${colors.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: colors.danger, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Low Ratings (1–2★)</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: colors.danger }}>{criticalCount}</div>
              <div style={{ fontSize: "12px", color: colors.textMuted, marginTop: "4px" }}>Potential complaints or issues</div>
            </div>
          </div>

          {/* RATING DISTRIBUTION BREAKDOWN CARD */}
          <div style={{
            background: "#fff",
            padding: "20px 24px",
            borderRadius: "18px",
            border: `1px solid ${colors.border}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "32px",
            flexWrap: "wrap"
          }}>
            <div style={{ minWidth: "170px", borderRight: `1px solid ${colors.border}`, paddingRight: "24px" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                Rating Breakdown
              </div>
              <div style={{ fontSize: "12px", color: colors.textMuted }}>
                {sourceFilter === "shop" ? "Auto Shop Services" : sourceFilter === "platform" ? "Platform Feedback" : "All Review Sources"}
              </div>
              <div style={{ marginTop: "10px", display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "28px", fontWeight: "900", color: colors.navy }}>
                  {currentSourceReviews.length > 0
                    ? (currentSourceReviews.reduce((sum, r) => sum + Number(r.rating), 0) / currentSourceReviews.length).toFixed(1)
                    : "0.0"}
                </span>
                <span style={{ fontSize: "13px", fontWeight: "700", color: colors.textMuted }}>/ 5.0</span>
                <Star size={16} fill="#f59e0b" color="#f59e0b" style={{ marginLeft: "2px" }} />
              </div>
              <div style={{ fontSize: "11.5px", color: colors.textMuted, marginTop: "2px" }}>
                {currentSourceReviews.length} total rating{currentSourceReviews.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* 5★ to 1★ Distribution Bars */}
            <div style={{ flex: 1, minWidth: "260px", display: "flex", flexDirection: "column", gap: "7px" }}>
              {[5, 4, 3, 2, 1].map(star => {
                const count = starBreakdown[star] || 0;
                const pct = currentSourceReviews.length > 0 ? Math.round((count / currentSourceReviews.length) * 100) : 0;
                const isSelected = starFilter === String(star);

                return (
                  <div
                    key={star}
                    onClick={() => {
                      if (count > 0) {
                        setStarFilter(isSelected ? "all" : String(star));
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: count > 0 ? "pointer" : "default",
                      padding: "2px 8px",
                      borderRadius: "8px",
                      background: isSelected ? "rgba(37,99,235,0.08)" : "transparent",
                      transition: "all 0.15s ease"
                    }}
                    title={count > 0 ? `Click to filter table by ${star} star reviews` : "No reviews for this rating"}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "3px", width: "42px", flexShrink: 0 }}>
                      <span style={{ fontSize: "12.5px", fontWeight: isSelected ? "800" : "600", color: isSelected ? colors.blue : colors.textPrimary }}>{star}</span>
                      <Star size={12} fill="#f59e0b" color="#f59e0b" />
                    </div>

                    <div style={{ flex: 1, height: "9px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: isSelected
                          ? colors.blue
                          : star <= 2
                          ? "linear-gradient(90deg, #ef4444 0%, #f87171 100%)"
                          : "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)",
                        borderRadius: "999px",
                        transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                      }} />
                    </div>

                    <div style={{ width: "75px", textAlign: "right", fontSize: "12px", color: isSelected ? colors.blue : colors.textMuted, fontWeight: isSelected ? "700" : "500", flexShrink: 0 }}>
                      {count} <span style={{ opacity: 0.7 }}>({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CONTROLS & FILTERS */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#fff", padding: "16px 20px", borderRadius: "16px",
            border: `1px solid ${colors.border}`, marginBottom: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)", flexWrap: "wrap", gap: "16px"
          }}>
            {/* SOURCE PILLS */}
            <div style={{ display: "flex", gap: "6px", background: "#f1f5f9", padding: "4px", borderRadius: "12px" }}>
              {[
                { id: "all", label: "All Reviews", count: totalCount },
                { id: "shop", label: "Shop Reviews", count: shopReviews.length, icon: <Store size={14} /> },
                { id: "platform", label: "App Reviews", count: platformReviews.length, icon: <Smartphone size={14} /> }
              ].map(tab => {
                const isActive = sourceFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSourceFilter(tab.id)}
                    style={{
                      border: "none",
                      background: isActive ? "#fff" : "transparent",
                      color: isActive ? colors.navy : colors.textSecondary,
                      padding: "8px 14px", borderRadius: "8px",
                      fontWeight: isActive ? "700" : "600",
                      fontSize: "13px", cursor: "pointer",
                      boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                      display: "flex", alignItems: "center", gap: "6px",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                    <span style={{
                      background: isActive ? "rgba(26,58,92,0.1)" : "rgba(0,0,0,0.05)",
                      color: isActive ? colors.navy : colors.textSecondary,
                      fontSize: "10px", padding: "1px 6px", borderRadius: "8px", fontWeight: "800"
                    }}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* STAR FILTER, ARCHIVED TOGGLE, & SEARCH */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {/* STAR RATING DROPDOWN */}
              <CustomDropdown
                value={starFilter}
                onChange={setStarFilter}
                options={[
                  { value: "all", label: "All Star Ratings" },
                  { value: "5", label: "5 Stars (★★★★★)" },
                  { value: "4", label: "4 Stars (★★★★☆)" },
                  { value: "3", label: "3 Stars (★★★☆☆)" },
                  { value: "2", label: "2 Stars (★★☆☆☆)" },
                  { value: "1", label: "1 Star (★☆☆☆☆)" },
                ]}
                style={{
                  minWidth: "160px",
                  padding: "9px 32px 9px 12px",
                  borderRadius: "12px",
                  border: `1px solid ${colors.border}`,
                  backgroundColor: "#f8fafc",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: colors.textPrimary
                }}
              />

              {/* ARCHIVE TOGGLE */}
              <button 
                onClick={() => setShowArchived(!showArchived)}
                style={{
                  padding: "9px 14px", 
                  borderRadius: "12px", 
                  border: `1.5px solid ${showArchived ? colors.danger : colors.border}`,
                  background: showArchived ? colors.dangerBg : "#fff",
                  color: showArchived ? colors.danger : colors.textSecondary,
                  fontSize: "13px", fontWeight: "700", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "6px",
                  transition: "all 0.2s"
                }}
              >
                <Archive size={14} />
                {showArchived ? "Viewing Hidden" : "View Archived"}
              </button>

              {/* SEARCH BOX */}
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: "#f8fafc", padding: "9px 14px", borderRadius: "12px",
                border: `1px solid ${colors.border}`, width: "260px"
              }}>
                <Search size={15} color={colors.textMuted} />
                <input 
                  type="text" 
                  placeholder="Search customer, shop, comment..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "13px", color: colors.textPrimary }}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", color: colors.textMuted, padding: 0 }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* REVIEWS TABLE */}
          <div style={{ background: "#fff", borderRadius: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: `1px solid ${colors.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: `1px solid ${colors.border}` }}>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", width: "130px" }}>Rating</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Customer & Review</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", width: "220px" }}>Source / Target</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", width: "140px" }}>Date</th>
                  <th style={{ padding: "16px 20px", fontSize: "12px", fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right", width: "140px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>
                      Loading unified reviews...
                    </td>
                  </tr>
                ) : filteredReviews.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: "48px", textAlign: "center", color: colors.textMuted }}>
                      <MessageSquare size={36} color={colors.textMuted} style={{ marginBottom: "12px", opacity: 0.5 }} />
                      <div style={{ fontWeight: "700", color: colors.textPrimary, marginBottom: "4px" }}>No reviews found</div>
                      <div style={{ fontSize: "13px" }}>
                        {search || starFilter !== "all" || sourceFilter !== "all" 
                          ? "Try clearing active filters to see all reviews." 
                          : "No reviews have been left on the platform yet."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReviews.map(r => (
                    <tr key={`${r.source}-${r.id}`} style={{ borderBottom: `1px solid ${colors.border}`, transition: "background 0.15s ease" }} onMouseEnter={e => e.currentTarget.style.background = "#fafafa"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                      
                      {/* Rating Stars & Value */}
                      <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "16px", fontWeight: "800", color: colors.navy }}>{Number(r.rating).toFixed(1)}</span>
                          <div style={{ display: "flex", gap: "2px" }}>
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={14} fill={i < Math.round(r.rating) ? "#f59e0b" : "none"} color={i < Math.round(r.rating) ? "#f59e0b" : colors.border} />
                            ))}
                          </div>
                        </div>
                        {r.rating <= 2 && (
                          <span style={{ background: colors.dangerBg, color: colors.danger, padding: "2px 6px", borderRadius: "6px", fontSize: "10px", fontWeight: "800", textTransform: "uppercase" }}>
                            Low Rating
                          </span>
                        )}
                      </td>

                      {/* Review Comment & Customer */}
                      <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: colors.textPrimary, marginBottom: "4px" }}>
                          {r.customerName || "Customer"}
                        </div>
                        <div style={{ fontSize: "13.5px", color: colors.textSecondary, lineHeight: "1.5", fontStyle: r.comment ? "italic" : "normal" }}>
                          {r.comment ? `"${r.comment}"` : <span style={{ color: colors.textMuted }}>No written comment provided.</span>}
                        </div>
                        {r.serviceType && (
                          <div style={{ fontSize: "11px", color: colors.info, fontWeight: "700", marginTop: "6px", display: "inline-block", background: colors.infoBg, padding: "2px 8px", borderRadius: "6px" }}>
                            Service: {r.serviceType}
                          </div>
                        )}
                      </td>

                      {/* Source & Target Shop */}
                      <td style={{ padding: "16px 20px", verticalAlign: "top" }}>
                        {r.source === "shop" ? (
                          <div>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: "4px",
                              fontSize: "11px", fontWeight: "800", textTransform: "uppercase",
                              background: "rgba(37, 99, 235, 0.1)", color: colors.info,
                              padding: "2px 8px", borderRadius: "6px", marginBottom: "4px"
                            }}>
                              <Store size={12} /> Auto Shop
                            </span>
                            <div style={{ fontSize: "13.5px", fontWeight: "700", color: colors.textPrimary }}>
                              {r.shopName || "Auto Shop"}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: "4px",
                              fontSize: "11px", fontWeight: "800", textTransform: "uppercase",
                              background: "rgba(26, 58, 92, 0.1)", color: colors.navy,
                              padding: "2px 8px", borderRadius: "6px", marginBottom: "4px"
                            }}>
                              <Smartphone size={12} /> App Feedback
                            </span>
                            <div style={{ fontSize: "13.5px", fontWeight: "700", color: colors.navy }}>
                              AutoBook Platform
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: "16px 20px", verticalAlign: "top", fontSize: "13px", color: colors.textSecondary }}>
                        {r.createdAt?.seconds 
                          ? new Date(r.createdAt.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) 
                          : "Recently"}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "16px 20px", textAlign: "right", verticalAlign: "top" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                          <button
                            onClick={() => setSelectedReview(r)}
                            style={{
                              background: "#f1f5f9", color: colors.navy, border: "none",
                              borderRadius: "10px", padding: "8px", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center"
                            }}
                            title="View Review Details"
                          >
                            <Eye size={16} />
                          </button>

                          {r.status === "archived" ? (
                            <button 
                              onClick={() => setReviewToRestore(r)} 
                              style={{ 
                                width: "32px", height: "32px", borderRadius: "10px", 
                                background: colors.successBg, color: colors.success, 
                                border: "none", cursor: "pointer", 
                                display: "inline-flex", alignItems: "center", justifyContent: "center" 
                              }} 
                              title="Restore Review"
                            >
                              <RotateCcw size={16} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => setReviewToArchive(r)} 
                              style={{ 
                                width: "32px", height: "32px", borderRadius: "10px", 
                                background: colors.dangerBg, color: colors.danger, 
                                border: "none", cursor: "pointer", 
                                display: "inline-flex", alignItems: "center", justifyContent: "center" 
                              }} 
                              title="Archive Review"
                            >
                              <Archive size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </RoleBasedWrapper>

      {/* REVIEW DETAILS MODAL */}
      {selectedReview && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15, 38, 64, 0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 1300,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
            fontFamily: "'Inter', sans-serif"
          }}
          onClick={() => setSelectedReview(null)}
        >
          <div
            style={{
              background: colors.white,
              width: "100%", maxWidth: "520px",
              borderRadius: "24px",
              boxShadow: "0 25px 65px rgba(0,0,0,0.3)",
              overflow: "hidden", position: "relative",
              padding: "28px"
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedReview(null)}
              style={{
                position: "absolute", top: "20px", right: "20px",
                background: "#f3f4f6", border: "none",
                width: "32px", height: "32px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: colors.textSecondary
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <span style={{
                background: selectedReview.source === "shop" ? "rgba(37,99,235,0.1)" : "rgba(26,58,92,0.1)",
                color: selectedReview.source === "shop" ? colors.info : colors.navy,
                fontSize: "11px", fontWeight: "800", textTransform: "uppercase", padding: "4px 10px", borderRadius: "8px"
              }}>
                {selectedReview.source === "shop" ? "Auto Shop Review" : "Platform Review"}
              </span>
              {selectedReview.status === "archived" && (
                <span style={{ background: colors.dangerBg, color: colors.danger, fontSize: "11px", fontWeight: "800", textTransform: "uppercase", padding: "4px 10px", borderRadius: "8px" }}>
                  Archived / Hidden
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "2px" }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={22} fill={i < Math.round(selectedReview.rating) ? "#f59e0b" : "none"} color={i < Math.round(selectedReview.rating) ? "#f59e0b" : colors.border} />
                ))}
              </div>
              <span style={{ fontSize: "18px", fontWeight: "800", color: colors.navy }}>{Number(selectedReview.rating).toFixed(1)} / 5.0</span>
            </div>

            {/* REVIEW COMMENT */}
            <div style={{
              background: "#f8fafc", border: `1px solid ${colors.border}`,
              borderRadius: "16px", padding: "18px", fontSize: "14.5px",
              color: colors.textPrimary, lineHeight: "1.6", fontStyle: "italic",
              marginBottom: "20px"
            }}>
              "{selectedReview.comment || "No written comment provided."}"
            </div>

            {/* METADATA */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${colors.border}`, paddingBottom: "8px" }}>
                <span style={{ color: colors.textSecondary, fontWeight: "600" }}>Customer Name</span>
                <span style={{ color: colors.textPrimary, fontWeight: "700" }}>{selectedReview.customerName}</span>
              </div>
              {selectedReview.shopName && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${colors.border}`, paddingBottom: "8px" }}>
                  <span style={{ color: colors.textSecondary, fontWeight: "600" }}>Target Shop</span>
                  <span style={{ color: colors.textPrimary, fontWeight: "700" }}>{selectedReview.shopName}</span>
                </div>
              )}
              {selectedReview.serviceType && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${colors.border}`, paddingBottom: "8px" }}>
                  <span style={{ color: colors.textSecondary, fontWeight: "600" }}>Service Performed</span>
                  <span style={{ color: colors.textPrimary, fontWeight: "700" }}>{selectedReview.serviceType}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.textSecondary, fontWeight: "600" }}>Date Rated</span>
                <span style={{ color: colors.textPrimary, fontWeight: "700" }}>
                  {selectedReview.createdAt?.seconds ? new Date(selectedReview.createdAt.seconds * 1000).toLocaleString() : "Unknown"}
                </span>
              </div>
            </div>

            {/* ACTIONS */}
            <div style={{ display: "flex", gap: "10px" }}>
              {selectedReview.shopId && (
                <button
                  onClick={() => {
                    navigate("/customer/shop-profile", { state: { shopId: selectedReview.shopId } });
                  }}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "12px",
                    background: colors.white, border: `1.5px solid ${colors.navy}`,
                    color: colors.navy, fontWeight: "700", fontSize: "13px",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                  }}
                >
                  <ExternalLink size={15} /> Visit Shop
                </button>
              )}
              
              {selectedReview.status === "archived" ? (
                <button
                  onClick={() => {
                    setReviewToRestore(selectedReview);
                    setSelectedReview(null);
                  }}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "12px",
                    background: colors.successBg, border: `1.5px solid ${colors.success}`,
                    color: colors.success, fontWeight: "700", fontSize: "13px",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                  }}
                >
                  <RotateCcw size={15} /> Restore Review
                </button>
              ) : (
                <button
                  onClick={() => {
                    setReviewToArchive(selectedReview);
                    setSelectedReview(null);
                  }}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "12px",
                    background: colors.dangerBg, border: `1.5px solid ${colors.danger}`,
                    color: colors.danger, fontWeight: "700", fontSize: "13px",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                  }}
                >
                  <Archive size={15} /> Archive Review
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
