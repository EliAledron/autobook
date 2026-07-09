import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, getDocs, getDoc, doc, query, where, serverTimestamp } from "firebase/firestore";
import { sh, colors } from "./dashboardShared";
import SkeletonLoader from "./SkeletonLoader";
import BackButton from "../components/BackButton";

const CLOUDINARY_CLOUD = "dpwojan8w";
const CLOUDINARY_PRESET = "autobook_uploads";

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Upload failed: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

export default function BookService() {
  const navigate = useNavigate();
  const location = useLocation();
  const shop = location.state?.shop;

  const [uid, setUid] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [shopBookings, setShopBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [customService, setCustomService] = useState(location.state?.prefilledService || "");
  const [vehicleId, setVehicleId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [issuePhotoFile, setIssuePhotoFile] = useState(null);
  const [issuePhotoPreview, setIssuePhotoPreview] = useState(null);
  const [error, setError] = useState("");

  const [currentDate, setCurrentDate] = useState(new Date());
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const days = Array(startDay).fill(null).concat(Array.from({ length: daysInMon }, (_, i) => i + 1));
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  useEffect(() => {
    if (!shop) { navigate("/customer/shop-select"); return; }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/login"); return; }
      setUid(u.uid);
      setCustomerName(u.displayName || u.email || "Customer");

      try {
        const userSnap = await getDoc(doc(db, "users", u.uid));
        const name = userSnap.exists()
          ? userSnap.data().displayName || u.displayName || "Unknown"
          : u.displayName || "Unknown";
        setCustomerName(name);
      } catch (e) {
        setCustomerName(u.displayName || "Unknown");
      }

      try {
        const vSnap = await getDocs(query(collection(db, "vehicles"), where("ownerId", "==", u.uid)));
        const vList = vSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVehicles(vList);
        if (vList.length > 0) setVehicleId(vList[0].id);
      } catch (e) { setVehicles([]); }

      try {
        const bSnap = await getDocs(query(collection(db, "bookings"), where("shopId", "==", shop.id)));
        const bList = bSnap.docs.map((d) => d.data()).filter((b) => (b.status || "Pending").toLowerCase() !== "cancelled");
        setShopBookings(bList);
      } catch (e) { console.error("Failed to load shop bookings", e); }

      setLoading(false);
    });
    return () => unsub();
  }, [navigate, shop]);

  const handlePreSubmit = () => {
    if (!customService.trim()) { setError("Please describe the service you need."); return; }
    if (!vehicleId && vehicles.length > 0) { setError("Please select a vehicle."); return; }
    if (!vehicleId && vehicles.length === 0) { setError("Please add a vehicle first."); return; }
    if (!date) { setError("Please select a date."); return; }
    if (!time) { setError("Please select a time."); return; }
    setError("");
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    setSaving(true);

    const finalService = customService.trim();
    const vehicle = vehicles.find((v) => v.id === vehicleId);

    try {
      let imageUrl = null;
      if (issuePhotoFile) {
        imageUrl = await uploadToCloudinary(issuePhotoFile);
      }

      await addDoc(collection(db, "bookings"), {
        customerId: uid,
        customerName: customerName,
        shopId: shop.id,
        shopName: shop.name,
        serviceType: finalService,
        vehicleId: vehicleId || null,
        vehicleLabel: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.plate})` : null,
        issueImageUrl: imageUrl,
        date,
        time,
        notes: notes.trim(),
        status: "Pending",
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "adminAlerts"), {
        type: "booking_created",
        title: "New Booking! 📅",
        message: `${customerName} booked ${finalService} at ${shop.name} for ${date} at ${time}.`,
        shopId: shop.id,
        read: false,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        userId: uid,
        title: "Booking Confirmed! ✅",
        message: `Your booking for ${finalService} at ${shop.name} on ${date} at ${time} has been received.`,
        type: "booking_confirmed",
        read: false,
        createdAt: serverTimestamp(),
      });

      setDone(true);
    } catch (e) {
      setError("Failed to submit booking: " + e.message);
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

  if (loading) return <SkeletonLoader count={3} type="card" />;

  if (done) return (
    <div style={{ ...sh.page, justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column", padding: "2rem" }}>
      <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem" }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.info} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div style={{ fontSize: "20px", fontWeight: "700", color: colors.textPrimary, marginBottom: "8px", textAlign: "center" }}>Booking Submitted!</div>
      <div style={{ fontSize: "14px", color: colors.textSecondary, textAlign: "center", marginBottom: "2rem" }}>
        Your booking at {shop?.name} has been received. You'll be notified once it's confirmed.
      </div>
      <button onClick={() => navigate("/customer/dashboard")} style={sh.primaryBtn}>Back to Dashboard</button>
      <div style={{ height: "10px" }} />
      <button onClick={() => navigate("/customer/history")} style={sh.outlineBtn}>View My Bookings</button>
    </div>
  );

  return (
    <div style={sh.page}>
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BackButton />
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
      </div>

      <div style={sh.hero}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>{shop?.shortName}</span></div>
        <div style={sh.heroGreeting}>Book a Service</div>
        <div style={sh.heroSub}>{shop?.name}</div>
      </div>

      <div style={sh.content}>
        {error && (
          <div style={{ background: colors.dangerBg, border: `1px solid ${colors.danger}`, borderRadius: "12px", padding: "10px 14px", fontSize: "13px", color: colors.danger, marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        {/* VEHICLE INFORMATION */}
        <div style={{ ...sh.card, padding: "24px", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🚗</div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: colors.textPrimary }}>Vehicle Information</div>
          </div>
          
          {vehicles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div style={{ fontSize: "13px", color: colors.textMuted, marginBottom: "10px" }}>No vehicles saved yet.</div>
              <button
                onClick={() => navigate("/customer/vehicles")}
                style={{ ...sh.primaryBtn, width: "auto", padding: "10px 20px", fontSize: "13px", borderRadius: "14px" }}
              >
                + Add a vehicle
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px" }}>
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVehicleId(v.id)}
                  style={{
                    padding: "16px", borderRadius: "14px", fontSize: "13px",
                    fontWeight: "700", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    background: vehicleId === v.id ? `linear-gradient(135deg, ${colors.navy}, ${colors.blue})` : colors.bg,
                    color: vehicleId === v.id ? "#fff" : colors.textSecondary,
                    border: vehicleId === v.id ? "none" : `1px solid ${colors.border}`,
                    boxShadow: vehicleId === v.id ? "0 4px 12px rgba(26,58,92,0.2)" : "none",
                    transition: "all 0.2s",
                    display: "flex", flexDirection: "column", gap: "4px"
                  }}
                >
                  <span style={{ fontSize: "14px" }}>{v.year} {v.make}</span>
                  <span style={{ fontSize: "12px", opacity: 0.8, fontWeight: "500" }}>{v.plate}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SERVICE DETAILS */}
        <div style={{ ...sh.card, padding: "24px", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: colors.warningBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🔧</div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: colors.textPrimary }}>Service Details</div>
          </div>
          
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Select a Service *</div>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {(shop?.services?.length > 0 ? shop.services : ["Oil Change", "Brake Inspection", "Tire Rotation", "Aircon Cleaning", "Battery Replacement", "General Checkup"]).map((s) => (
                <button
                  key={s}
                  onClick={() => setCustomService(s)}
                  style={{
                    padding: "8px 16px", borderRadius: "20px", fontSize: "13px",
                    fontWeight: "700", cursor: "pointer", fontFamily: "inherit",
                    background: customService === s ? `linear-gradient(135deg, ${colors.navy}, ${colors.blue})` : colors.bg,
                    color: customService === s ? "#fff" : colors.textSecondary,
                    border: customService === s ? "none" : `1px solid ${colors.border}`,
                    boxShadow: customService === s ? "0 4px 12px rgba(26,58,92,0.2)" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          
          {/* UPLOAD PHOTO */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Photo of the Issue (optional)</div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input type="file" id="issuePhotoUpload" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setIssuePhotoFile(file);
                  setIssuePhotoPreview(URL.createObjectURL(file));
                }
              }} />
              {issuePhotoPreview ? (
                <div style={{ position: "relative", width: "100px", height: "100px", borderRadius: "14px", overflow: "hidden", border: `1.5px solid ${colors.border}`, background: colors.bg }}>
                   <img src={issuePhotoPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                   <button onClick={() => { setIssuePhotoFile(null); setIssuePhotoPreview(null); }} style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "14px" }}>×</button>
                </div>
              ) : (
                <button onClick={() => document.getElementById("issuePhotoUpload").click()} style={{ width: "100%", padding: "20px 14px", borderRadius: "14px", border: `1.5px dashed ${colors.border}`, background: "#f9fafb", color: colors.textSecondary, fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", transition: "all 0.2s ease" }}>
                  <span style={{ fontSize: "24px" }}>📷</span> Tap to upload photo
                </button>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Additional Notes</div>
          <textarea
              style={{ ...inputStyle, minHeight: "80px", resize: "vertical", marginBottom: 0 }}
              placeholder="Any special instructions or details about the issue..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        </div>

        {/* SCHEDULE */}
        <div style={{ ...sh.card, padding: "24px", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: colors.successBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>📅</div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: colors.textPrimary }}>Schedule</div>
          </div>
          
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Select Date *</div>
            
            {/* Calendar UI */}
            {(() => {
                const currentYearNum = new Date().getFullYear();
                const yearOptions = [];
                for(let y = currentYearNum; y <= currentYearNum + 2; y++) yearOptions.push(y);
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
                    <button onClick={prevMonth} style={{ background: colors.bg, border: `1px solid ${colors.border}`, padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: colors.textSecondary, flexShrink: 0 }}>←</button>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <select 
                        value={month} 
                        onChange={(e) => setCurrentDate(new Date(year, Number(e.target.value), 1))}
                        style={{ padding: '6px 12px', borderRadius: '10px', border: `1px solid ${colors.border}`, fontSize: '14px', fontWeight: '800', color: colors.navy, background: colors.white, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
                      >
                        {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
                      </select>
                      <select 
                        value={year} 
                        onChange={(e) => setCurrentDate(new Date(Number(e.target.value), month, 1))}
                        style={{ padding: '6px 12px', borderRadius: '10px', border: `1px solid ${colors.border}`, fontSize: '14px', fontWeight: '800', color: colors.navy, background: colors.white, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
                      >
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <button onClick={() => setCurrentDate(new Date())} style={{ background: colors.infoBg, color: colors.info, border: "none", padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>Today</button>
                    </div>
                    <button onClick={nextMonth} style={{ background: colors.bg, border: `1px solid ${colors.border}`, padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: colors.textSecondary, flexShrink: 0 }}>→</button>
                  </div>
                );
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '12px', fontWeight: '800', color: colors.textMuted, textTransform: "uppercase", marginBottom: "4px" }}>{d}</div>
                ))}
                {days.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} />;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const checkDate = new Date(year, month, day);
                  const isPast = checkDate < today;
                  const isSelected = date === dateStr;
                  
                  const maxCapacity = shop?.dailyCapacity || 8;
                  const almostFullThreshold = Math.max(1, Math.floor(maxCapacity * 0.7));

                  const dayBookingsCount = shopBookings.filter(b => b.date === dateStr).length;
                  let availabilityColor = colors.success;
                  let availabilityText = "Available";
                  let isFull = false;

                  if (dayBookingsCount >= maxCapacity) {
                    availabilityColor = colors.danger;
                    availabilityText = "Unavailable";
                    isFull = true;
                  } else if (dayBookingsCount >= almostFullThreshold) {
                    availabilityColor = colors.warning;
                    availabilityText = "Almost Full";
                  }

                  return (
                    <div 
                      key={dateStr}
                      onClick={() => { if (!isPast && !isFull) setDate(dateStr); }}
                      style={{ position: 'relative', background: isSelected ? colors.navy : (isPast ? colors.bg : colors.white), border: `1.5px solid ${isSelected ? colors.navy : colors.border}`, borderRadius: '14px', padding: '6px 2px', minHeight: '64px', cursor: isPast || isFull ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: "center", transition: "all 0.2s", opacity: isPast ? 0.5 : (isFull && !isSelected ? 0.6 : 1), boxShadow: isSelected ? "0 4px 12px rgba(26,58,92,0.25)" : "none" }}
                    >
                      <span style={{ fontSize: '15px', fontWeight: '800', color: isSelected ? "#fff" : colors.textPrimary, marginBottom: !isPast ? "2px" : "0" }}>{day}</span>
                      {!isPast && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: isSelected ? "#fff" : availabilityColor, marginBottom: "2px" }} />
                          <span style={{ fontSize: "8px", fontWeight: "800", color: isSelected ? "rgba(255,255,255,0.9)" : availabilityColor, textAlign: "center", lineHeight: 1.1, letterSpacing: "-0.2px" }}>{availabilityText}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Select Time *</div>
            <div className="time-scroll-container" style={{ 
              display: "flex", overflowX: "auto", gap: "10px", paddingBottom: "12px", 
              scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" 
            }}>
              <style>{`.time-scroll-container::-webkit-scrollbar { display: none; }`}</style>
              {["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM"].map((t) => {
                const isSelected = time === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTime(t)}
                    style={{
                      flexShrink: 0, padding: "12px 20px", borderRadius: "14px", fontSize: "13px",
                      fontWeight: "700", cursor: "pointer", fontFamily: "inherit",
                      background: isSelected ? `linear-gradient(135deg, ${colors.navy}, ${colors.blue})` : colors.white,
                      color: isSelected ? "#fff" : colors.textPrimary,
                      border: isSelected ? "none" : `1.5px solid ${colors.border}`,
                      boxShadow: isSelected ? "0 4px 12px rgba(26,58,92,0.25)" : "0 2px 4px rgba(0,0,0,0.02)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button onClick={handlePreSubmit} disabled={saving} style={{ ...sh.primaryBtn, padding: "16px", borderRadius: "16px", fontSize: "15px", boxShadow: "0 8px 20px rgba(42,82,152,0.25)", opacity: saving ? 0.75 : 1 }}>
          {saving ? "Submitting..." : "Book Appointment"}
        </button>
        <div style={{ height: "12px" }} />
        <button onClick={() => navigate(-1)} style={{ ...sh.outlineBtn, padding: "16px", borderRadius: "16px", fontSize: "15px", border: "none", background: colors.bg, color: colors.textSecondary, fontWeight: "700", marginBottom: "2rem" }}>Cancel</button>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowConfirm(false)}>
          <div style={{ background: colors.white, borderRadius: "24px", width: "90%", maxWidth: "340px", padding: "24px", textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: colors.infoBg, color: colors.info, fontSize: "28px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>📅</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: colors.textPrimary, fontWeight: "800" }}>Confirm Booking</h3>
            <p style={{ margin: "0 0 24px", fontSize: "13px", color: colors.textSecondary, lineHeight: "1.5" }}>
              Are you sure you want to book <strong>{customService}</strong> at <strong>{shop?.shortName || shop?.name}</strong> on {date} at {time}?
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: colors.bg, border: `1px solid ${colors.border}`, color: colors.textSecondary, fontWeight: "700", cursor: "pointer", fontFamily: "inherit", fontSize: "14px" }}>Cancel</button>
              <button onClick={handleSubmit} style={{ flex: 1, padding: "14px", borderRadius: "14px", background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, border: "none", color: "#fff", fontWeight: "700", cursor: "pointer", fontFamily: "inherit", fontSize: "14px", boxShadow: "0 4px 12px rgba(26,58,92,0.2)" }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}