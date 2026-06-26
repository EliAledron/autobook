import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc, updateDoc, query, where, writeBatch } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { sh, colors, getInitials } from "./dashboardShared";
import TopbarAvatar from "./TopbarAvatar";

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

export default function AdminReviews() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [shopData, setShopData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(0);

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
        navigate("/login");
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
      const ratedBookings = bList.filter(b => b.rating && b.rating > 0);
      
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

  return (
    <div style={sh.page}>
      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: colors.accent, fontSize: "18px", cursor: "pointer", padding: 0 }}>←</button>
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
        <div style={sh.topbarRight}>
          <div style={sh.topbarMeta}>
            <div style={sh.topbarName}>{currentUser?.displayName || "Owner"}</div>
            <div>{currentUser?.role || "Owner"}</div>
          </div>
          <TopbarAvatar onClick={() => navigate("/profile")} />
        </div>
      </div>

      {/* HERO */}
      <div style={sh.hero}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>Feedback</span></div>
        <div style={sh.heroGreeting}>Customer Reviews</div>
        <div style={sh.heroSub}>See what customers are saying about your services.</div>
      </div>

      <div style={sh.content}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: colors.textMuted, fontSize: "13px" }}>Loading reviews...</div>
        ) : (
          <>
            {/* OVERALL RATING CARD */}
            <div style={{ ...sh.card, display: "flex", alignItems: "center", gap: "20px", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "48px", fontWeight: "800", color: colors.navy, lineHeight: 1 }}>
                {avgRating > 0 ? avgRating.toFixed(1) : "0.0"}
              </div>
              <div>
                <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} style={{ fontSize: "20px", color: avgRating >= star - 0.5 ? "#f59e0b" : "#e2e8f0" }}>★</span>
                  ))}
                </div>
                <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "600" }}>
                  Based on {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            <div style={{ ...sh.sectionLabel, marginBottom: "1rem" }}>All Reviews ({reviews.length})</div>

            {reviews.length === 0 ? (
              <div style={{ ...sh.card, textAlign: "center", padding: "3rem 1rem" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>⭐</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: colors.textPrimary, marginBottom: "6px" }}>No reviews yet</div>
                <div style={{ fontSize: "13px", color: colors.textMuted }}>When customers complete a service and leave a rating, it will appear here.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {reviews.map(r => (
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
                      <div style={{ display: "flex", gap: "2px" }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <span key={star} style={{ color: r.rating >= star ? "#f59e0b" : "#e2e8f0", fontSize: "16px" }}>★</span>
                        ))}
                      </div>
                    </div>
                    
                    {r.serviceType && (
                      <div style={{ fontSize: "12px", color: colors.info, fontWeight: "700", background: colors.infoBg, display: "inline-block", padding: "4px 10px", borderRadius: "8px", marginBottom: "12px" }}>
                        🔧 {r.serviceType}
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
    </div>
  );
}