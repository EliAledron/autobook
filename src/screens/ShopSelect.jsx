import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { sh, colors, EmptyState, SharedSearchBar, SharedFilterSelect } from "./dashboardShared";
import SkeletonLoader from "./SkeletonLoader";
import BackButton from "../components/BackButton";
import { Store, Star, Sparkles, X } from "lucide-react";

export const NEEDS_OPTIONS = ["Oil Change", "Brake Repair", "Tire Service", "Engine Diagnostics", "AC Cleaning", "Battery Replacement", "Paint & Body", "General Maintenance", "Transmission", "Detailing"];

export default function ShopSelect() {
  const navigate = useNavigate();
  const location = useLocation();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(location.state?.searchTerms || "");
  const [minRating, setMinRating] = useState(0);

  const [showNeedsModal, setShowNeedsModal] = useState(false);
  const [selectedNeeds, setSelectedNeeds] = useState([]);

  useEffect(() => {
    if (loading) return;
    const lastShown = localStorage.getItem('lastNeedsFormDate');
    const today = new Date().toDateString();
    if (lastShown !== today) {
      const t = setTimeout(() => {
        setShowNeedsModal(true);
        localStorage.setItem('lastNeedsFormDate', today);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [loading]);

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const snap = await getDocs(collection(db, "shops"));
        let shopsData = snap.docs.map((d) => {
          const shop = { id: d.id, ...d.data() };
          return shop;
        });
        shopsData = Array.from(new Map(shopsData.map(s => [s.id, s])).values());
        setShops(shopsData); // Set immediately so shops load even if bookings fail

        try {
          const shopsWithRatings = await Promise.all(shopsData.map(async (shop) => {
            try {
              const bQuery = query(collection(db, "bookings"), where("shopId", "==", shop.id));
              const bSnap = await getDocs(bQuery);
              let ratedBookings = bSnap.docs.map(d => d.data()).filter(b => b.rating && !isNaN(Number(b.rating)) && Number(b.rating) > 0);
              if (ratedBookings.length === 0 && shop.name) {
                const nQuery = query(collection(db, "bookings"), where("shopName", "==", shop.name));
                const nSnap = await getDocs(nQuery);
                ratedBookings = nSnap.docs.map(d => d.data()).filter(b => b.rating && !isNaN(Number(b.rating)) && Number(b.rating) > 0);
              }

              let directReviews = [];
              try {
                const rSnap = await getDocs(collection(db, "shops", shop.id, "reviews"));
                directReviews = rSnap.docs.map(d => d.data()).filter(r => r.rating && !isNaN(Number(r.rating)) && Number(r.rating) > 0);
              } catch(e) {}
              
              const allReviews = [...ratedBookings, ...directReviews];
              
              let reportCount = 0;
              try {
                const repSnap = await getDocs(query(collection(db, "adminAlerts"), where("type", "==", "shop_report"), where("shopId", "==", shop.id)));
                reportCount = repSnap.size;
              } catch(e) {}

              let avg = shop.rating || 0;
              let reviewCount = shop.reviews || 0;

              if (allReviews.length > 0) {
                avg = allReviews.reduce((sum, b) => sum + Number(b.rating), 0) / allReviews.length;
                reviewCount = allReviews.length;
              }

              if (avg > 0 && reportCount > 0) {
                avg = Math.max(0.5, avg - (reportCount * 0.5));
              }

              if (reviewCount > 0 || reportCount > 0) {
                return { ...shop, rating: avg, reviews: reviewCount };
              }
            } catch(e) {}
            return shop;
          }));
          setShops(shopsWithRatings);
        } catch(err) { console.error(err); }
      } catch (e) {
        console.error("Failed to load shops:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchShops();
  }, []);

  const filteredShops = shops.filter(shop => {
    if (shop.status === "restricted") return false;
    const s = search.toLowerCase();
    const matchSearch = (shop.name || "").toLowerCase().includes(s) || (shop.tagline || "").toLowerCase().includes(s);
    const safeRating = shop.rating && !isNaN(Number(shop.rating)) ? Number(shop.rating) : 0;
    const matchRating = safeRating >= minRating;
    return matchSearch && matchRating;
  });

  return (
    <div style={sh.page}>
      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BackButton />
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
      </div>

      {/* HERO */}
      <div style={sh.hero}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>Book a Service</span></div>
        <div style={sh.heroGreeting}>Choose a Shop</div>
        <div style={sh.heroSub}>Select which auto shop you'd like to book with.</div>
      </div>

      <div style={sh.content} className="stagger-slide-up">
        <div style={{ ...sh.sectionLabel, fontSize: "13px", color: colors.textPrimary, letterSpacing: "0.5px", marginBottom: "1rem" }}>Available shops</div>

        {/* SEARCH & FILTER */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem" }}>
          <button 
            onClick={() => setShowNeedsModal(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, color: "#fff", border: "none", borderRadius: "24px", padding: "0 20px", fontWeight: "700", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(26,58,92,0.15)" }}
          >
            <Sparkles size={16} /> Match
          </button>
          <SharedSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search shops or services..."
          />
          <SharedFilterSelect
            value={minRating}
            onChange={(val) => setMinRating(Number(val))}
            options={[
              { label: "All Ratings", value: 0 },
              { label: "4.5+ Stars", value: 4.5 },
              { label: "4.0+ Stars", value: 4.0 },
              { label: "3.0+ Stars", value: 3.0 },
            ]}
          />
        </div>

        {loading ? (
          <SkeletonLoader count={3} type="card" />
        ) : filteredShops.length === 0 ? (
          <EmptyState
            icon={<Store size={48} />}
            title="No shops found"
            subtitle={search || minRating > 0 ? "No shops match your search criteria." : "No shops available right now."}
          />
        ) : (
          filteredShops.map((shop) => (
            <div
              key={shop.id}
              style={{
                background: colors.white,
                borderRadius: "20px",
                border: `1px solid ${colors.border}`,
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                padding: "20px",
                marginBottom: "1.25rem",
              }}
            >
              {/* Shop header */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "1.25rem" }}>
                <div style={{
                  width: "56px", height: "56px", borderRadius: "16px",
                  background: colors.infoBg, display: "flex", alignItems: "center",
                  justifyContent: "center", color: colors.blue, fontSize: "26px", flexShrink: 0,
                }}>
                  {shop.icon || <Store size={26} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>
                    {shop.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <span style={{ color: "#f59e0b", fontSize: "14px" }}><Star fill="currentColor" size={14} /></span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: colors.textPrimary }}>{shop.rating && !isNaN(Number(shop.rating)) && Number(shop.rating) > 0 ? Number(shop.rating).toFixed(1) : "New"}</span>
                    {shop.reviews > 0 && <span style={{ fontSize: "12px", color: colors.textMuted }}>({shop.reviews} review{shop.reviews !== 1 ? 's' : ''})</span>}
                  </div>
                  <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500" }}>{shop.tagline || "Quality auto services"}</div>
                </div>
              </div>

              {/* CTA */}
              <div style={{ display: "flex", gap: "10px", marginTop: "1.25rem" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate("/customer/shop-profile", { state: { shopId: shop.id } }); }}
                  style={{ flex: 1, padding: "14px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: "14px", fontSize: "14px", fontWeight: "700", color: colors.textSecondary, cursor: "pointer" }}
                >
                  View Profile
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate("/customer/book-service", { state: { shop, prefilledService: location.state?.prefilledService } }); }}
                  style={{ flex: 1, padding: "14px", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, border: "none", borderRadius: "14px", fontSize: "14px", fontWeight: "800", color: "#fff", cursor: "pointer", boxShadow: "0 4px 12px rgba(26,58,92,0.2)" }}
                >
                  Book Now
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Smart Match Needs Assessment Modal */}
      {showNeedsModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setShowNeedsModal(false)}>
          <div style={{ background: colors.white, borderRadius: "24px", padding: "32px 24px", maxWidth: "420px", width: "100%", textAlign: "center", position: "relative", animation: "ab-slide-up-modal 0.3s ease-out" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowNeedsModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", fontSize: "20px", color: colors.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={24}/></button>
            
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: colors.infoBg, color: colors.info, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Sparkles size={32} />
            </div>
            
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: colors.textPrimary, margin: "0 0 8px 0" }}>What do you need today?</h2>
            <p style={{ fontSize: "14px", color: colors.textSecondary, marginBottom: "24px", lineHeight: "1.5" }}>Select the services you're looking for, and we'll intelligently match you with the best-rated shops.</p>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "32px" }}>
              {NEEDS_OPTIONS.map(need => {
                const isSelected = selectedNeeds.includes(need);
                return (
                  <button key={need} onClick={() => {
                    if (isSelected) setSelectedNeeds(selectedNeeds.filter(n => n !== need));
                    else setSelectedNeeds([...selectedNeeds, need]);
                  }} style={{ padding: "8px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", border: `1.5px solid ${isSelected ? colors.info : colors.border}`, background: isSelected ? colors.infoBg : "#fff", color: isSelected ? colors.info : colors.textSecondary, cursor: "pointer", transition: "all 0.2s" }}>
                    {need}
                  </button>
                )
              })}
            </div>
            
            <button onClick={() => {
              setShowNeedsModal(false);
              setSearch(selectedNeeds.join(" "));
            }} disabled={selectedNeeds.length === 0} style={{ width: "100%", padding: "16px", borderRadius: "16px", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, color: "#fff", fontSize: "15px", fontWeight: "800", border: "none", cursor: selectedNeeds.length === 0 ? "not-allowed" : "pointer", opacity: selectedNeeds.length === 0 ? 0.5 : 1, boxShadow: "0 4px 12px rgba(26,58,92,0.2)", transition: "opacity 0.2s" }}>
              Find My Perfect Shop
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
