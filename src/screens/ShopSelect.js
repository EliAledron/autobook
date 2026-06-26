import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { sh, colors } from "./dashboardShared";

export default function ShopSelect() {
  const navigate = useNavigate();
  const location = useLocation();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState(0);

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
              if (ratedBookings.length > 0) {
                const avg = ratedBookings.reduce((sum, b) => sum + Number(b.rating), 0) / ratedBookings.length;
                return { ...shop, rating: avg, reviews: ratedBookings.length };
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
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: colors.accent, fontSize: "18px", cursor: "pointer", padding: 0 }}>←</button>
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
      </div>

      {/* HERO */}
      <div style={sh.hero}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>Book a Service</span></div>
        <div style={sh.heroGreeting}>Choose a Shop</div>
        <div style={sh.heroSub}>Select which auto shop you'd like to book with.</div>
      </div>

      <div style={sh.content}>
        <div style={{ ...sh.sectionLabel, fontSize: "13px", color: colors.textPrimary, letterSpacing: "0.5px", marginBottom: "1rem" }}>Available shops</div>

        {/* SEARCH & FILTER */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px" }}>🔍</span>
            <input
              placeholder="Search shops or services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "12px 12px 12px 34px",
                borderRadius: "14px", border: `1px solid ${colors.border}`,
                fontSize: "13px", background: colors.white,
                color: colors.textPrimary, fontFamily: "inherit",
                boxSizing: "border-box", outline: "none",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: "16px", cursor: "pointer", color: colors.textMuted }}>×</button>
            )}
          </div>
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            style={{
              padding: "12px 14px", borderRadius: "14px", border: `1px solid ${colors.border}`,
              fontSize: "13px", background: colors.white, color: colors.textPrimary,
              fontFamily: "inherit", outline: "none", cursor: "pointer"
            }}
          >
            <option value={0}>All Ratings</option>
            <option value={4.5}>4.5+ Stars</option>
            <option value={4.0}>4.0+ Stars</option>
            <option value={3.0}>3.0+ Stars</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: colors.textMuted, fontSize: "13px" }}>Loading shops...</div>
        ) : filteredShops.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: colors.textMuted, fontSize: "13px" }}>{search || minRating > 0 ? "No shops match your search criteria." : "No shops available right now."}</div>
        ) : (
          filteredShops.map((shop) => (
            <div
              key={shop.id}
              onClick={() => navigate("/customer/book-service", { state: { shop, prefilledService: location.state?.prefilledService } })}
              style={{
                background: colors.white,
                borderRadius: "20px",
                border: `1px solid ${colors.border}`,
                cursor: "pointer",
                borderLeft: `5px solid ${shop.accent || colors.info}`,
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                padding: "20px",
                marginBottom: "1.25rem",
              }}
            >
              {/* Shop header */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "1.25rem" }}>
                <div style={{
                  width: "56px", height: "56px", borderRadius: "16px",
                  background: shop.bg || colors.infoBg, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "26px", flexShrink: 0,
                }}>
                  {shop.icon || "🏪"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>
                    {shop.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <span style={{ color: "#f59e0b", fontSize: "14px" }}>★</span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: colors.textPrimary }}>{shop.rating && !isNaN(Number(shop.rating)) && Number(shop.rating) > 0 ? Number(shop.rating).toFixed(1) : "New"}</span>
                    {shop.reviews > 0 && <span style={{ fontSize: "12px", color: colors.textMuted }}>({shop.reviews} review{shop.reviews !== 1 ? 's' : ''})</span>}
                  </div>
                  <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500" }}>{shop.tagline || "Quality auto services"}</div>
                </div>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.textSecondary, fontSize: "18px", fontWeight: "700" }}>›</div>
              </div>

              {/* CTA */}
              <div style={{
                marginTop: "1.25rem", padding: "14px",
                background: colors.bg, border: `1px solid ${colors.border}`,
                borderRadius: "14px", textAlign: "center",
                fontSize: "14px", fontWeight: "800", color: colors.navy,
              }}>
                Book with {shop.shortName || "Shop"} →
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}