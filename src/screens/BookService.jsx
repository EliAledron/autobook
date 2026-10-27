import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, getDocs, getDoc, doc, query, where, serverTimestamp } from "firebase/firestore";
import { sh, colors, CustomDropdown, ErrorModal } from "./dashboardShared";
import SkeletonLoader from "./SkeletonLoader";
import BackButton from "../components/BackButton";
import { Car, Wrench, Camera, Calendar, Clock, Users, Info, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { getServiceDuration, calculateReadyTime, getConcurrentBookingsAtSlot, ALL_TIME_SLOTS } from "../utils/serviceDurations";

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
  const [customerPhone, setCustomerPhone] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [shopBookings, setShopBookings] = useState([]);
  const [shopMechanics, setShopMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [customService, setCustomService] = useState(location.state?.prefilledService || "");
  const [serviceSearch, setServiceSearch] = useState("");
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
  const [cooldownUntil, setCooldownUntil] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const days = Array(startDay).fill(null).concat(Array.from({ length: daysInMon }, (_, i) => i + 1));
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Dynamic capacity & service duration estimates
  const shopCapacity = Math.max(1, shopMechanics.length > 0 ? shopMechanics.length : (shop?.bayCount || shop?.mechanicCount || 2));
  const durationInfo = getServiceDuration(customService);
  const calculatedReadyTime = time ? calculateReadyTime(time, durationInfo.durationMin) : "";

  useEffect(() => {
    if (!shop) { navigate("/customer/shop-select"); return; }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/"); return; }
      setUid(u.uid);
      setCustomerName(u.displayName || u.email || "Customer");

      try {
        const userSnap = await getDoc(doc(db, "users", u.uid));
        if (userSnap.exists()) {
          const ud = userSnap.data();
          setCustomerName(ud.displayName || u.displayName || "Unknown");
          if (ud.phone) setCustomerPhone(ud.phone);
          if (ud.cooldownUntil && ud.cooldownUntil > Date.now()) {
            setCooldownUntil(ud.cooldownUntil);
          }
        } else {
          setCustomerName(u.displayName || "Unknown");
        }
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

      try {
        const mSnap = await getDocs(query(collection(db, "shopMechanics"), where("shopId", "==", shop.id)));
        const mList = mSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((m) => m.available !== false);
        setShopMechanics(mList);
      } catch (e) {
        setShopMechanics([]);
      }

      setLoading(false);
    });
    return () => unsub();
  }, [navigate, shop]);

  const handlePreSubmit = () => {
    if (!customService.trim()) { setError("Please describe the service you need."); return; }
    if (!vehicleId && vehicles.length > 0) { setError("Please select a vehicle."); return; }
    if (!vehicleId && vehicles.length === 0) { setError("Please add a vehicle first."); return; }
    if (!date) { setError("Please select a date."); return; }
    if (!time) { setError("Please select a preferred drop-off time."); return; }
    setError("");
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    setSaving(true);

    const finalService = customService.trim();
    const vehicle = vehicles.find((v) => v.id === vehicleId);

    try {
      // Real-time concurrency check across shop's mechanics/bays
      const existingSnap = await getDocs(query(collection(db, "bookings"), where("shopId", "==", shop.id), where("date", "==", date)));
      const activeBookings = existingSnap.docs.map(d => d.data()).filter(b => (b.status || "Pending").toLowerCase() !== "cancelled");
      const concurrentAtSlot = getConcurrentBookingsAtSlot(activeBookings, time);
      
      if (concurrentAtSlot >= shopCapacity) {
        setError(`Sorry, all ${shopCapacity} mechanic bays are booked for ${time}. Please choose another drop-off time.`);
        setSaving(false);
        return;
      }

      let imageUrl = null;
      if (issuePhotoFile) {
        imageUrl = await uploadToCloudinary(issuePhotoFile);
      }

      await addDoc(collection(db, "bookings"), {
        customerId: uid,
        customerName: customerName,
        customerPhone: customerPhone || "",
        shopId: shop.id,
        shopName: shop.name,
        shopPhone: shop.phone || "",
        serviceType: finalService,
        vehicleId: vehicleId || null,
        vehicleLabel: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.plate})` : null,
        issueImageUrl: imageUrl,
        date,
        time,
        dropOffTime: time,
        estimatedDuration: durationInfo.display,
        estimatedMinutes: durationInfo.durationMin,
        expectedReadyTime: calculatedReadyTime,
        estimatedCompletionTime: calculatedReadyTime,
        notes: notes.trim(),
        status: "Pending",
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "adminAlerts"), {
        type: "booking_created",
        title: "New Booking!",
        message: `${customerName} booked ${finalService} at ${shop.name} for ${date} (Drop-off: ${time}, Est: ~${calculatedReadyTime}).`,
        shopId: shop.id,
        read: false,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        userId: uid,
        title: "Booking Confirmed!",
        message: `Your booking for ${finalService} at ${shop.name} is confirmed for ${date}. Preferred drop-off arrival is ${time} (Est. ready by: ~${calculatedReadyTime}).`,
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

  if (cooldownUntil && cooldownUntil > Date.now()) {
    return (
      <div style={{ ...sh.page, justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column", padding: "2rem", textAlign: "center" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "24px", background: colors.dangerBg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.danger, marginBottom: "1.5rem" }}>
          <Calendar size={40} />
        </div>
        <div style={{ fontSize: "20px", fontWeight: "800", color: colors.textPrimary, marginBottom: "12px" }}>Booking Cooldown Active</div>
        <div style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: "1.6", maxWidth: "300px", marginBottom: "2rem" }}>
          Due to multiple late cancellations, you are temporarily restricted from booking new services. 
          <br /><br />
          You will be able to book again on:<br />
          <strong>{new Date(cooldownUntil).toLocaleString()}</strong>
        </div>
        <button onClick={() => navigate("/customer/dashboard")} style={{ ...sh.primaryBtn, background: colors.navy }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

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

      <div style={sh.content} className="stagger-slide-up">
        <ErrorModal error={error} onClose={() => setError("")} />

        {/* VEHICLE INFORMATION */}
        <div style={{ ...sh.card, padding: "24px", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.info }}><Car size={16} /></div>
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
            <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: colors.warningBg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.warning }}><Wrench size={16} /></div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: colors.textPrimary }}>Service Details</div>
          </div>
          
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Select a Service *</div>
            
            <input
              type="text"
              placeholder="Search available services..."
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "12px", boxSizing: "border-box",
                border: `1px solid ${colors.border}`, marginBottom: "12px",
                fontSize: "13px", outline: "none", backgroundColor: "#f9fafb"
              }}
            />
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {(!shop?.services || shop.services.length === 0) ? (
                <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "14px", border: `1px dashed ${colors.border}`, color: colors.textMuted, fontSize: "13px", textAlign: "center", width: "100%" }}>
                  This auto shop has not listed any services yet.
                </div>
              ) : (
                shop.services
                  .filter(s => s.toLowerCase().includes(serviceSearch.toLowerCase()))
                  .map((s) => (
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
                  ))
              )}
            </div>

            {customService && (
              <div style={{ marginTop: "14px", padding: "12px 14px", borderRadius: "14px", background: "#f0f9ff", border: "1px solid #bae6fd", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "700", color: "#0369a1" }}>
                    <Clock size={14} /> Est. Duration: <strong>{durationInfo.display}</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "700", color: "#0284c7" }}>
                    <Users size={14} /> Shop Capacity: <strong>{shopCapacity} active bay{shopCapacity > 1 ? "s" : ""}</strong>
                  </div>
                </div>
                <div style={{ fontSize: "11px", color: "#0c4a6e", lineHeight: "1.4" }}>
                  ℹ️ Selected time is your vehicle drop-off arrival. Mechanics work concurrently across bays.
                </div>
              </div>
            )}
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
                  <Camera size={24} /> Tap to upload photo
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
            <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: colors.successBg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.success }}><Calendar size={16} /></div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '8px' }}>
                    <button onClick={prevMonth} style={{ background: colors.bg, border: `1px solid ${colors.border}`, padding: '8px 14px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: colors.textSecondary, flexShrink: 0 }}>←</button>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                      <CustomDropdown
                        value={month}
                        onChange={(val) => setCurrentDate(new Date(year, Number(val), 1))}
                        options={monthNames.map((m, i) => ({ value: i, label: m }))}
                        style={{ padding: '6px 28px 6px 12px', borderRadius: '10px', border: `1px solid ${colors.border}`, fontSize: '14px', fontWeight: '800', color: colors.navy, backgroundColor: colors.white, display: 'inline-flex' }}
                      />
                      <CustomDropdown
                        value={year}
                        onChange={(val) => setCurrentDate(new Date(Number(val), month, 1))}
                        options={yearOptions.map(y => ({ value: y, label: y }))}
                        style={{ padding: '6px 28px 6px 12px', borderRadius: '10px', border: `1px solid ${colors.border}`, fontSize: '14px', fontWeight: '800', color: colors.navy, backgroundColor: colors.white, display: 'inline-flex' }}
                      />
                      <button onClick={() => setCurrentDate(new Date())} style={{ background: colors.infoBg, color: colors.info, border: "none", padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>Today</button>
                    </div>
                    <button onClick={nextMonth} style={{ background: colors.bg, border: `1px solid ${colors.border}`, padding: '8px 14px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: colors.textSecondary, flexShrink: 0 }}>→</button>
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
                  
                  const maxCapacity = shop?.dailyCapacity || Math.max(8, shopCapacity * 5);
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <div style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Preferred Drop-off / Arrival Time *
              </div>
              <span style={{ fontSize: "11px", fontWeight: "700", color: colors.info, display: "flex", alignItems: "center", gap: "4px" }}>
                <Users size={12} /> {shopCapacity} bay{shopCapacity > 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ fontSize: "12px", color: colors.textSecondary, marginBottom: "14px", lineHeight: "1.4" }}>
              Choose what time you'll bring your car to the shop. Mechanics work concurrently across bays; slots fill up as bays become occupied.
            </div>

            <div>
              {(() => {
                if (!date) {
                  return (
                    <div style={{ fontSize: "13px", color: colors.textMuted, padding: "16px", background: "#f8fafc", borderRadius: "12px", textAlign: "center", border: `1px dashed ${colors.border}` }}>
                      Please select a date first to view available drop-off arrival times.
                    </div>
                  );
                }

                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                const dayBookings = shopBookings.filter(b => b.date === date);

                const slotData = ALL_TIME_SLOTS.map((t) => {
                  let isPast = false;
                  if (date === todayStr) {
                    const [timePart, modifier] = t.split(" ");
                    let [hours, minutes] = timePart.split(":");
                    hours = parseInt(hours, 10);
                    if (modifier === "PM" && hours !== 12) hours += 12;
                    if (modifier === "AM" && hours === 12) hours = 0;

                    const slotTime = new Date();
                    slotTime.setHours(hours, parseInt(minutes, 10), 0, 0);
                    isPast = slotTime <= today;
                  }

                  const concurrentCount = getConcurrentBookingsAtSlot(dayBookings, t);
                  const spotsLeft = Math.max(0, shopCapacity - concurrentCount);
                  const isFull = spotsLeft <= 0;

                  return { slot: t, isPast, isFull, spotsLeft };
                });

                const activeSlots = slotData.filter(s => !s.isPast);

                if (activeSlots.length === 0) {
                  return <div style={{ fontSize: "13px", color: colors.textSecondary, padding: "12px 0" }}>No drop-off times available for this date.</div>;
                }

                const morningSlots = slotData.filter(s => s.slot.includes("AM") || s.slot.startsWith("12:00 PM"));
                const afternoonSlots = slotData.filter(s => s.slot.includes("PM") && !s.slot.startsWith("12:00 PM"));

                const renderSlotBtn = ({ slot: t, isPast, isFull, spotsLeft }) => {
                  const isSelected = time === t;
                  const disabled = isPast || isFull;

                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={disabled}
                      onClick={() => setTime(t)}
                      style={{
                        padding: "8px 6px", borderRadius: "12px", fontSize: "12px",
                        fontWeight: "700", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
                        background: isSelected 
                          ? `linear-gradient(135deg, ${colors.navy}, ${colors.blue})` 
                          : (disabled ? "#f1f5f9" : colors.bg),
                        color: isSelected 
                          ? "#fff" 
                          : (disabled ? colors.textMuted : colors.textPrimary),
                        border: isSelected 
                          ? "none" 
                          : `1px solid ${disabled ? "#e2e8f0" : colors.border}`,
                        boxShadow: isSelected ? "0 4px 12px rgba(26,58,92,0.25)" : "none",
                        opacity: disabled ? 0.55 : 1,
                        transition: "all 0.2s ease", width: "100%", textAlign: "center",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        gap: "2px", minHeight: "52px"
                      }}
                    >
                      <span style={{ fontSize: "13px", fontWeight: "800" }}>{t}</span>
                      {isPast ? (
                        <span style={{ fontSize: "9px", fontWeight: "700", color: colors.textMuted }}>Passed</span>
                      ) : isFull ? (
                        <span style={{ fontSize: "9px", fontWeight: "800", color: colors.danger, textTransform: "uppercase" }}>Full</span>
                      ) : spotsLeft === 1 ? (
                        <span style={{ fontSize: "9px", fontWeight: "800", color: isSelected ? "#fed7aa" : "#ea580c" }}>1 bay left</span>
                      ) : (
                        <span style={{ fontSize: "9px", fontWeight: "700", color: isSelected ? "rgba(255,255,255,0.85)" : "#059669" }}>{spotsLeft} bays open</span>
                      )}
                    </button>
                  );
                };

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {morningSlots.length > 0 && (
                      <div>
                        <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600", marginBottom: "8px" }}>Morning Drop-off</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(95px, 1fr))", gap: "8px" }}>
                          {morningSlots.map(renderSlotBtn)}
                        </div>
                      </div>
                    )}
                    {afternoonSlots.length > 0 && (
                      <div>
                        <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600", marginBottom: "8px" }}>Afternoon Drop-off</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(95px, 1fr))", gap: "8px" }}>
                          {afternoonSlots.map(renderSlotBtn)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* DYNAMIC SCHEDULE SUMMARY CARD */}
            {date && time && (
              <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: "16px", padding: "16px", marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#166534", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Car size={15} /> Drop-off Arrival:
                  </span>
                  <span style={{ fontSize: "13px", color: "#14532d", fontWeight: "800" }}>{date} at {time}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#166534", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Clock size={15} /> Est. Ready By:
                  </span>
                  <span style={{ fontSize: "13px", color: "#14532d", fontWeight: "800" }}>~{calculatedReadyTime} ({durationInfo.display})</span>
                </div>
                <div style={{ fontSize: "11px", color: "#15803d", marginTop: "4px", lineHeight: "1.4", borderTop: "1px dashed #86efac", paddingTop: "8px" }}>
                  💡 <strong>Live Progress Updates:</strong> Mechanics service your car during this window. If a job finishes earlier or requires extra time, you'll be notified in real-time.
                </div>
              </div>
            )}
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
          <div style={{ background: colors.white, borderRadius: "24px", width: "90%", maxWidth: "360px", padding: "24px", textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: colors.infoBg, color: colors.info, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Calendar size={28} /></div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: colors.textPrimary, fontWeight: "800" }}>Confirm Appointment</h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: colors.textSecondary, lineHeight: "1.5" }}>
              Please review your drop-off and service details at <strong>{shop?.shortName || shop?.name}</strong>:
            </p>

            <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "12px 14px", textAlign: "left", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "8px", border: `1px solid ${colors.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: colors.textSecondary, fontWeight: "600" }}>Service:</span>
                <span style={{ color: colors.textPrimary, fontWeight: "700" }}>{customService}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: colors.textSecondary, fontWeight: "600" }}>Drop-off Arrival:</span>
                <span style={{ color: colors.textPrimary, fontWeight: "700" }}>{date} · {time}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: colors.textSecondary, fontWeight: "600" }}>Est. Ready:</span>
                <span style={{ color: colors.info, fontWeight: "800" }}>~{calculatedReadyTime} ({durationInfo.display})</span>
              </div>
            </div>

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
