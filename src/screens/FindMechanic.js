import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { sh, colors } from "./dashboardShared";

export default function FindMechanic() {
  const navigate = useNavigate();
  const [uid, setUid] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [selected, setSelected] = useState(null);   // selected shop
  const [requestAddress, setRequestAddress] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [shops, setShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const snap = await getDocs(collection(db, "shops"));
        let shopsData = snap.docs.map((d) => {
          const shop = { id: d.id, ...d.data() };
          const sName = (shop.name || "").toUpperCase();
          if (sName.includes("JME")) shop.id = "JME";
          else if (sName.includes("GRHE")) shop.id = "GRHE";
          return shop;
        });
        shopsData = Array.from(new Map(shopsData.map(s => [s.id, s])).values());
        setShops(shopsData); // Set immediately so shops load even if bookings fail

        try {
          const shopsWithRatings = await Promise.all(shopsData.map(async (shop) => {
            try {
              const bQuery = query(collection(db, "bookings"), where("shopId", "==", shop.id));
              const bSnap = await getDocs(bQuery);
              const ratedBookings = bSnap.docs.map(d => d.data()).filter(b => b.rating && b.rating > 0);
              if (ratedBookings.length > 0) {
                const avg = ratedBookings.reduce((sum, b) => sum + b.rating, 0) / ratedBookings.length;
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
        setLoadingShops(false);
      }
    };
    fetchShops();

    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { navigate("/login"); return; }
      setUid(u.uid);
      setCustomerName(u.displayName || u.email || "Customer");
    });
    return () => unsub();
  }, [navigate]);

  const handlePreSubmit = () => {
    if (!requestAddress.trim() || !selected) return;
    setShowConfirm(true);
  };

  const handleSendRequest = async () => {
    setShowConfirm(false);
    setSaving(true);
    try {
      await addDoc(collection(db, "mechanicRequests"), {
        customerId: uid,
        customerName,
        shopId: selected.id,
        shopName: selected.name,
        ownerId: selected.ownerId || null,
        address: requestAddress.trim(),
        notes: requestNote.trim(),
        status: "Pending",
        createdAt: serverTimestamp(),
      });

      // Notify the shop owner
      await addDoc(collection(db, "adminAlerts"), {
        shopId: selected.id,
        title: "New Mechanic Request 📍",
        message: `${customerName} is requesting a mechanic visit at: ${requestAddress.trim()}`,
        type: "visit_request",
        read: false,
        createdAt: serverTimestamp(),
      });

      // Notify the customer
      await addDoc(collection(db, "notifications"), {
        userId: uid,
        title: "Request Sent! ✅",
        message: `Your visit request has been sent to ${selected.name}. They will assign a mechanic shortly.`,
        type: "request_sent",
        read: false,
        createdAt: serverTimestamp(),
      });

      setRequestSent(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "14px 16px", borderRadius: "14px",
    border: `1.5px solid ${colors.border}`, fontSize: "14px",
    background: "#f9fafb", color: colors.textPrimary,
    fontFamily: "inherit", boxSizing: "border-box", outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const filteredShops = shops.filter(shop => {
    const s = search.toLowerCase();
    const matchSearch = (shop.name || "").toLowerCase().includes(s) || (shop.tagline || "").toLowerCase().includes(s);
    const matchRating = (shop.rating || 0) >= minRating;
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
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>Mechanics</span></div>
        <div style={sh.heroGreeting}>Request a Mechanic</div>
        <div style={sh.heroSub}>Choose a shop and we'll send a mechanic to you.</div>
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

        {loadingShops ? (
          <div style={{ padding: "40px", textAlign: "center", color: colors.textMuted, fontSize: "13px" }}>Loading shops...</div>
        ) : filteredShops.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: colors.textMuted, fontSize: "13px" }}>{search || minRating > 0 ? "No shops match your search criteria." : "No shops available right now."}</div>
        ) : (
          filteredShops.map((shop) => (
            <div
              key={shop.id}
              onClick={() => { setSelected(shop); setRequestSent(false); setRequestAddress(""); setRequestNote(""); }}
              style={{
                background: colors.white,
                borderRadius: "20px",
                border: `1px solid ${selected?.id === shop.id ? (shop.accent || colors.info) : colors.border}`,
                cursor: "pointer",
                borderLeft: `5px solid ${shop.accent || colors.info}`,
                boxShadow: selected?.id === shop.id ? `0 8px 24px ${shop.accent || colors.info}30` : "0 4px 20px rgba(0,0,0,0.05)",
                padding: "20px",
                marginBottom: "1.25rem",
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "1.25rem" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: shop.bg || colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", flexShrink: 0 }}>
                  {shop.icon || "🏪"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>{shop.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <span style={{ color: "#f59e0b", fontSize: "14px" }}>★</span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: colors.textPrimary }}>{shop.rating && !isNaN(Number(shop.rating)) && Number(shop.rating) > 0 ? Number(shop.rating).toFixed(1) : "New"}</span>
                    {shop.reviews > 0 && <span style={{ fontSize: "12px", color: colors.textMuted }}>({shop.reviews} review{shop.reviews !== 1 ? 's' : ''})</span>}
                  </div>
                  <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500" }}>{shop.tagline || "Quality auto services"}</div>
                </div>
                {selected?.id === shop.id
                  ? <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: shop.accent || colors.info, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "16px", fontWeight: "700" }}>✓</div>
                  : <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.textSecondary, fontSize: "18px", fontWeight: "700" }}>›</div>
                }
              </div>
            </div>
          ))
        )}

        {/* REQUEST FORM — shows below once a shop is selected */}
        {selected && !requestSent && (
          <div style={{ background: colors.white, borderRadius: "20px", border: `1px solid ${colors.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", padding: "20px", marginTop: "0.5rem", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "16px", fontWeight: "800", marginBottom: "1.25rem", color: colors.navy }}>
              📍 Request from {selected.shortName}
            </div>

            <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Your address / location *</div>
            <input
              style={{ ...inputStyle, marginBottom: "12px" }}
              placeholder="Enter your address..."
              value={requestAddress}
              onChange={(e) => setRequestAddress(e.target.value)}
            />

            <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>What do you need help with? (optional)</div>
            <textarea
              style={{ ...inputStyle, minHeight: "80px", resize: "vertical", marginBottom: "1.5rem" }}
              placeholder="e.g. Car won't start, aircon not cooling..."
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
            />

            <button
              onClick={handlePreSubmit}
              disabled={saving || !requestAddress.trim()}
              style={{ ...sh.primaryBtn, padding: "16px", borderRadius: "16px", fontSize: "15px", boxShadow: "0 8px 20px rgba(42,82,152,0.25)", opacity: saving || !requestAddress.trim() ? 0.6 : 1 }}
            >
              {saving ? "Sending..." : `Send Request to ${selected.shortName} →`}
            </button>
            <div style={{ height: "12px" }} />
            <button onClick={() => setSelected(null)} style={{ ...sh.outlineBtn, padding: "16px", borderRadius: "16px", fontSize: "15px", border: "none", background: colors.bg, color: colors.textSecondary, fontWeight: "700" }}>Cancel</button>
          </div>
        )}

        {/* SUCCESS STATE */}
        {requestSent && (
          <div style={{ background: colors.white, borderRadius: "20px", border: `1px solid ${colors.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", padding: "2.5rem 1.5rem", textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "42px", marginBottom: "10px" }}>✅</div>
            <div style={{ fontWeight: "800", fontSize: "18px", marginBottom: "6px", color: colors.textPrimary }}>Request Sent!</div>
            <div style={{ fontSize: "14px", color: colors.textSecondary, marginBottom: "1.5rem" }}>
              {selected.name} will assign a mechanic and confirm shortly.
            </div>
            <button onClick={() => { setSelected(null); setRequestSent(false); }} style={{ ...sh.outlineBtn, padding: "16px", borderRadius: "16px", fontSize: "15px", border: "none", background: colors.bg, color: colors.textSecondary, fontWeight: "700" }}>
              Send Another Request
            </button>
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowConfirm(false)}>
          <div style={{ background: colors.white, borderRadius: "24px", width: "90%", maxWidth: "340px", padding: "24px", textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: colors.warningBg, color: colors.warning, fontSize: "28px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>📍</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: colors.textPrimary, fontWeight: "800" }}>Confirm Request</h3>
            <p style={{ margin: "0 0 24px", fontSize: "13px", color: colors.textSecondary, lineHeight: "1.5" }}>
              Are you sure you want to request a mechanic from <strong>{selected?.name}</strong> to <strong>{requestAddress}</strong>?
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: colors.bg, border: `1px solid ${colors.border}`, color: colors.textSecondary, fontWeight: "700", cursor: "pointer", fontFamily: "inherit", fontSize: "14px" }}>Cancel</button>
              <button onClick={handleSendRequest} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, border: "none", color: "#fff", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", fontSize: "14px", boxShadow: "0 4px 12px rgba(26,58,92,0.2)" }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}