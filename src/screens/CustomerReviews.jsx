import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { sh, colors, EmptyState } from "./dashboardShared";
import SkeletonLoader from "./SkeletonLoader";
import BackButton from "../components/BackButton";
import { Star, Wrench, Store } from "lucide-react";

function timeAgo(timestamp) {
  if (!timestamp) return "Just now";
  let ts;
  if (timestamp.toDate) ts = timestamp.toDate().getTime();
  else if (timestamp.seconds) ts = timestamp.seconds * 1000;
  else if (typeof timestamp === "number") ts = timestamp;
  else ts = new Date(timestamp).getTime();

  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function CustomerReviews() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/login"); return; }
      try {
        const q = query(collection(db, "bookings"), where("customerId", "==", u.uid));
        const snap = await getDocs(q);
        const rated = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(b => b.rating && b.rating > 0)
          .sort((a, b) => {
            const tA = a.ratedAt?.seconds || a.createdAt?.seconds || 0;
            const tB = b.ratedAt?.seconds || b.createdAt?.seconds || 0;
            return tB - tA;
          });
        setReviews(rated);
      } catch (e) {
        setReviews([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  return (
    <div style={sh.page}>
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BackButton />
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
      </div>

      <div style={sh.hero}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>My Feedback</span></div>
        <div style={sh.heroGreeting}>My Reviews</div>
        <div style={sh.heroSub}>Shops you have rated and reviewed after your service.</div>
      </div>

      <div style={sh.content} className="stagger-slide-up">
        {loading ? (
          <SkeletonLoader count={3} type="card" />
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={<Star fill="currentColor" size={48} />}
            title="No reviews yet"
            subtitle="After completing a service, you can rate and review the shop from your Booking History."
          />
        ) : (
          <>
            <div style={{ ...sh.card, display: "flex", alignItems: "center", gap: "20px", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "48px", fontWeight: "800", color: colors.navy, lineHeight: 1 }}>
                {(reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length).toFixed(1)}
              </div>
              <div>
                <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                  {[1, 2, 3, 4, 5].map(star => {
                    const avg = reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length;
                    return (
                      <span key={star} style={{ color: avg >= star - 0.5 ? "#f59e0b" : "#e2e8f0", display: "flex", alignItems: "center" }}>
                        <Star fill="currentColor" size={20} />
                      </span>
                    );
                  })}
                </div>
                <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "600" }}>
                  Your average across {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            <div style={{ ...sh.sectionLabel, marginBottom: "1rem" }}>All Reviews ({reviews.length})</div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {reviews.map(r => (
                <div key={r.id} style={{ ...sh.card, marginBottom: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.info }}>
                        <Store size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "15px", color: colors.textPrimary }}>{r.shopName || "Auto Shop"}</div>
                        <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>{timeAgo(r.ratedAt || r.createdAt)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "2px" }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <span key={star} style={{ color: r.rating >= star ? "#f59e0b" : "#e2e8f0", display: "flex", alignItems: "center" }}>
                          <Star fill="currentColor" size={16} />
                        </span>
                      ))}
                    </div>
                  </div>

                  {r.serviceType && (
                    <div style={{ fontSize: "12px", color: colors.info, fontWeight: "700", background: colors.infoBg, display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "8px", marginBottom: "12px" }}>
                      <Wrench size={14} /> {r.serviceType}
                    </div>
                  )}

                  {r.review ? (
                    <div style={{ fontSize: "14px", color: colors.textSecondary, fontStyle: "italic", lineHeight: "1.6" }}>
                      "{r.review}"
                    </div>
                  ) : (
                    <div style={{ fontSize: "13px", color: colors.textMuted }}>No written review provided.</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
