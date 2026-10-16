import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc, updateDoc, query, where, writeBatch } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import RoleBasedWrapper from "../components/RoleBasedWrapper";
import { sh, colors, getInitials, EmptyState, SuccessModal } from "./dashboardShared";
import SkeletonLoader from "./SkeletonLoader";
import TopbarAvatar from "./TopbarAvatar";
import BackButton from "../components/BackButton";
import { Star, Wrench, Flag } from "lucide-react";

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

import DesktopAdminReviews from "./desktop/DesktopAdminReviews";
import { useUser } from "../UserContext";
import ReportReviewModal from "../components/ReportReviewModal";

export default function AdminReviews() {
  const { userProfile } = useUser();
  if (userProfile?.role?.toLowerCase() === "admin") return <DesktopAdminReviews />;

  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [shopData, setShopData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(0);
  const [selectedStarFilter, setSelectedStarFilter] = useState(0);
  const [reviewToReport, setReviewToReport] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        const userObj = snap.exists() ? { id: snap.id, ...snap.data() } : { id: firebaseUser.uid };
        setCurrentUser(userObj);
        
        const isAdmin = (userObj.role || "").toLowerCase() === "admin";
        let shopId = userObj?.shopId;
        if (!isAdmin && userObj?.shopName) {
          const sName = userObj.shopName.toUpperCase();
          if (sName.includes("JME")) shopId = "JME";
          else if (sName.includes("GRHE")) shopId = "GRHE";
        }
        if (!isAdmin && userObj.id) {
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
        await fetchReviews(shopId);
      } else {
        navigate("/");
      }
    });
    return () => unsub();
  }, [navigate]);

  const fetchReviews = async (shopId) => {
    if (!shopId) {
      setLoading(false);
      return;
    }
    
    try {
      // Fetch shop data for overall ratings
      const shopSnap = await getDoc(doc(db, "shops", shopId));
      if (shopSnap.exists()) setShopData(shopSnap.data());

      // Fetch bookings to get reviews
      const bQuery = query(collection(db, "bookings"), where("shopId", "==", shopId));
      const bSnap = await getDocs(bQuery);
      
      const bList = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const ratedBookings = bList.filter(b => b.rating && b.rating > 0 && !b.reviewHidden && b.reviewStatus !== "archived");
      
      // Sort newest reviews first
      ratedBookings.sort((a, b) => {
        const tA = a.ratedAt?.seconds || a.createdAt?.seconds || 0;
        const tB = b.ratedAt?.seconds || b.createdAt?.seconds || 0;
        return tB - tA;
      });

      // Dynamically calculate the real average based on fetched reviews
      if (ratedBookings.length > 0) {
        const calculatedAvg = ratedBookings.reduce((sum, r) => sum + r.rating, 0) / ratedBookings.length;
        setAvgRating(calculatedAvg);
        
        // Sync the calculated rating back to the database for customers to see
        if (shopSnap.exists() && (shopSnap.data().rating !== calculatedAvg || shopSnap.data().reviews !== ratedBookings.length)) {
          await updateDoc(doc(db, "shops", shopId), { rating: calculatedAvg, reviews: ratedBookings.length });
        }
      } else {
        if (shopSnap.exists()) {
          setAvgRating(shopSnap.data().rating || 0);
        }
      }

      setReviews(ratedBookings);

      // Mark unread new_rating alerts as read
      try {
        const aQuery = query(collection(db, "adminAlerts"), where("shopId", "==", shopId));
        const aSnap = await getDocs(aQuery);
        const unreadAlerts = aSnap.docs.filter(d => d.data().type === "new_rating" && !d.data().read);
        if (unreadAlerts.length > 0) {
          const batch = writeBatch(db);
          unreadAlerts.forEach(d => batch.update(doc(db, "adminAlerts", d.id), { read: true }));
          await batch.commit();
        }
      } catch (e) {
        console.error("Failed to mark review alerts as read:", e);
      }
    } catch (e) {
      console.error("Failed to fetch reviews:", e);
    }
    setLoading(false);
  };

  const starCounts = {
    5: reviews.filter(r => Math.round(Number(r.rating)) === 5).length,
    4: reviews.filter(r => Math.round(Number(r.rating)) === 4).length,
    3: reviews.filter(r => Math.round(Number(r.rating)) === 3).length,
    2: reviews.filter(r => Math.round(Number(r.rating)) === 2).length,
    1: reviews.filter(r => Math.round(Number(r.rating)) === 1).length,
  };

  const filteredReviews = selectedStarFilter > 0
    ? reviews.filter(r => Math.round(Number(r.rating)) === selectedStarFilter)
    : reviews;

  return (
    <RoleBasedWrapper title="Management">
      {/* TOPBAR */}
      <div style={sh.hero}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>Feedback</span></div>
        <div style={sh.heroGreeting}>Customer Reviews</div>
        <div style={sh.heroSub}>See what customers are saying about your services.</div>
      </div>

      <div style={sh.content} className="stagger-slide-up">
        {loading ? (
          <SkeletonLoader count={3} type="card" />
        ) : (
          <>
            {/* OVERALL RATING & 5★ to 1★ BREAKDOWN CARD */}
            <div style={{ ...sh.card, display: "flex", flexDirection: "column", gap: "18px", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
                {/* Left: Overall Score */}
                <div style={{ textAlign: "center", minWidth: "120px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingRight: "16px", borderRight: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: "44px", fontWeight: "900", color: colors.navy, lineHeight: 1 }}>
                    {avgRating > 0 ? avgRating.toFixed(1) : "0.0"}
                  </div>
                  <div style={{ display: "flex", gap: "3px", margin: "8px 0 4px" }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <span key={star} style={{ color: avgRating >= star - 0.5 ? "#f59e0b" : "#e2e8f0", display: "flex", alignItems: "center" }}>
                        <Star fill="currentColor" size={17} />
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600" }}>
                    {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                  </div>
                </div>

                {/* Right: 5★ to 1★ Distribution Bars */}
                <div style={{ flex: 1, minWidth: "220px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = starCounts[star] || 0;
                    const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                    const isSelected = selectedStarFilter === star;

                    return (
                      <div
                        key={star}
                        onClick={() => count > 0 && setSelectedStarFilter(isSelected ? 0 : star)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: count > 0 ? "pointer" : "default",
                          padding: "2px 6px",
                          borderRadius: "8px",
                          background: isSelected ? "rgba(37,99,235,0.08)" : "transparent",
                          transition: "all 0.15s ease"
                        }}
                        title={count > 0 ? `Click to filter by ${star} star reviews` : "No reviews for this rating"}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "2px", width: "36px", flexShrink: 0 }}>
                          <span style={{ fontSize: "12px", fontWeight: isSelected ? "800" : "600", color: isSelected ? colors.blue : colors.textPrimary }}>{star}</span>
                          <Star size={11} fill="#f59e0b" color="#f59e0b" />
                        </div>

                        <div style={{ flex: 1, height: "8px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: isSelected ? colors.blue : "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)",
                            borderRadius: "999px",
                            transition: "width 0.4s ease, background 0.2s ease"
                          }} />
                        </div>

                        <div style={{ width: "65px", textAlign: "right", fontSize: "11px", color: isSelected ? colors.blue : colors.textMuted, fontWeight: isSelected ? "700" : "500", flexShrink: 0 }}>
                          {count} <span style={{ opacity: 0.7 }}>({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Filter Chips */}
              {reviews.length > 0 && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexWrap: "wrap",
                  borderTop: `1px solid ${colors.border}`,
                  paddingTop: "12px"
                }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: colors.textSecondary, marginRight: "2px" }}>Filter:</span>
                  <button
                    onClick={() => setSelectedStarFilter(0)}
                    style={{
                      border: selectedStarFilter === 0 ? "none" : `1px solid ${colors.border}`,
                      background: selectedStarFilter === 0 ? colors.navy : "#f8fafc",
                      color: selectedStarFilter === 0 ? "#fff" : colors.textSecondary,
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    All ({reviews.length})
                  </button>

                  {[5, 4, 3, 2, 1].map(star => {
                    const count = starCounts[star] || 0;
                    const isSelected = selectedStarFilter === star;
                    return (
                      <button
                        key={star}
                        onClick={() => setSelectedStarFilter(isSelected ? 0 : star)}
                        style={{
                          border: isSelected ? "none" : `1px solid ${colors.border}`,
                          background: isSelected ? colors.blue : "#f8fafc",
                          color: isSelected ? "#fff" : count > 0 ? colors.textPrimary : colors.textMuted,
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "11px",
                          fontWeight: isSelected ? "700" : "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                          opacity: count === 0 && !isSelected ? 0.5 : 1,
                          transition: "all 0.15s ease"
                        }}
                      >
                        <span>{star}</span>
                        <Star size={10} fill={isSelected ? "#fff" : "#f59e0b"} color={isSelected ? "#fff" : "#f59e0b"} />
                        <span>({count})</span>
                      </button>
                    );
                  })}

                  {selectedStarFilter > 0 && (
                    <button
                      onClick={() => setSelectedStarFilter(0)}
                      style={{
                        marginLeft: "auto",
                        border: "none",
                        background: "transparent",
                        color: colors.danger,
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                        textDecoration: "underline"
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            <div style={{ ...sh.sectionLabel, marginBottom: "1rem" }}>
              {selectedStarFilter > 0 ? `${selectedStarFilter}-Star Reviews (${filteredReviews.length})` : `All Reviews (${reviews.length})`}
            </div>

            {filteredReviews.length === 0 ? (
              <EmptyState
                icon={<Star fill="currentColor" size={48} />}
                title={selectedStarFilter > 0 ? `No ${selectedStarFilter}-star reviews found` : "No reviews yet"}
                subtitle={selectedStarFilter > 0 ? "No customers have left a rating for this star tier yet." : "When customers complete a service and leave a rating, it will appear here."}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {filteredReviews.map(r => (
                  <div key={r.id} style={{ ...sh.card, marginBottom: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.info, fontWeight: "800", fontSize: "15px" }}>
                          {getInitials(r.customerName || "C")}
                        </div>
                        <div>
                          <div style={{ fontWeight: "800", fontSize: "15px", color: colors.textPrimary }}>{r.customerName || "Customer"}</div>
                          <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>{timeAgo(r.ratedAt || r.createdAt)}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ display: "flex", gap: "2px" }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} style={{ color: r.rating >= star ? "#f59e0b" : "#e2e8f0", fontSize: "16px", display: "flex", alignItems: "center" }}>
                              <Star fill="currentColor" size={16} />
                            </span>
                          ))}
                        </div>
                        {r.isReported ? (
                          <span style={{ fontSize: "11px", fontWeight: "700", color: colors.danger, background: colors.dangerBg, padding: "3px 8px", borderRadius: "6px" }}>
                            Disputed
                          </span>
                        ) : (
                          <button
                            onClick={() => setReviewToReport({
                              ...r,
                              source: "shop",
                              shopId: shopData?.id || currentUser?.shopId,
                              shopName: shopData?.name || currentUser?.shopName || "Auto Shop"
                            })}
                            title="Dispute or report this review"
                            style={{
                              background: "none",
                              border: "none",
                              color: colors.textMuted,
                              cursor: "pointer",
                              padding: "4px 6px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                              borderRadius: "6px",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.color = colors.danger;
                              e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color = colors.textMuted;
                              e.currentTarget.style.background = "none";
                            }}
                          >
                            <Flag size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {r.serviceType && (
                      <div style={{ fontSize: "12px", color: colors.info, fontWeight: "700", background: colors.infoBg, display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "8px", marginBottom: "12px" }}>
                        <Wrench size={14} /> {r.serviceType}
                      </div>
                    )}
                    
                    {r.review && (
                      <div style={{ fontSize: "14px", color: colors.textSecondary, fontStyle: "italic", lineHeight: "1.5", marginBottom: r.reviewImage ? "12px" : 0 }}>
                        "{r.review}"
                      </div>
                    )}
                    
                    {r.reviewImage && (
                      <div style={{ borderRadius: "12px", overflow: "hidden", border: `1px solid ${colors.border}` }}>
                        <img src={r.reviewImage} alt="Review attachment" style={{ width: "100%", maxHeight: "250px", objectFit: "cover", display: "block" }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <SuccessModal message={successMsg} onClose={() => setSuccessMsg("")} />

      {reviewToReport && (
        <ReportReviewModal
          isOpen={!!reviewToReport}
          review={reviewToReport}
          currentUser={currentUser}
          onClose={() => setReviewToReport(null)}
          onSuccess={(msg) => setSuccessMsg(msg)}
        />
      )}
    </RoleBasedWrapper>
  );
}
