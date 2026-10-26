import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sh, colors, getInitials, ErrorModal, SuccessModal, CustomDropdown } from "./dashboardShared";
import { doc, updateDoc, addDoc, setDoc, collection, serverTimestamp, getDocs, query, where, orderBy, getDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import BackButton from "../components/BackButton";
import { Store, AlertTriangle, FileText, Check, Star, Edit, Flag, Calendar, Heart, Phone, MapPin, MessageSquare } from "lucide-react";
import { useUser } from "../UserContext";
import AdminLayout from "../components/AdminLayout";
import DesktopOnly from "../components/DesktopOnly";
import { STANDARD_SERVICES } from "../utils/servicesList";
import ReportReviewModal from "../components/ReportReviewModal";
import { calculateShopRating, getReportPenalty, recalculateAndSyncShopRating } from "../utils/ratingUtils";

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

// ─── Shop Edit Modal ──────────────────────────────────────────────────────────
function ShopEditModal({ shop, onClose, onSaved, ownerId }) {
  const [name, setName] = useState(shop?.name || "");
  const [shortName, setShortName] = useState(shop?.shortName || "");
  const [tagline, setTagline] = useState(shop?.tagline || "");
  const [phone, setPhone] = useState(shop?.phone || "");
  const [address, setAddress] = useState(shop?.address || "");
  const [icon, setIcon] = useState(shop?.icon || "store");
  const [bg, setBg] = useState(shop?.bg || colors.infoBg);
  const [accent, setAccent] = useState(shop?.accent || colors.info);
  const [services, setServices] = useState(shop?.services || []);
  const [serviceInput, setServiceInput] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(shop?.coverURL || "");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(shop?.logoURL || "");
  const [dtiFile, setDtiFile] = useState(null);
  const [dtiPreview, setDtiPreview] = useState(shop?.dtiURL || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputStyle = {
    width: "100%", padding: "16px", borderRadius: "16px",
    border: `1.5px solid ${colors.border}`, fontSize: "14px", fontWeight: "500",
    background: "#f8fafc", color: colors.textPrimary,
    fontFamily: "inherit", boxSizing: "border-box", outline: "none",
    transition: "all 0.2s ease",
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Shop name is required."); return; }
    setError("");
    setSaving(true);
    try {
      let finalCoverURL = shop?.coverURL || null;
      if (coverFile) finalCoverURL = await uploadToCloudinary(coverFile);

      let finalLogoURL = shop?.logoURL || null;
      if (logoFile) finalLogoURL = await uploadToCloudinary(logoFile);

      let finalDtiURL = shop?.dtiURL || null;
      if (dtiFile) finalDtiURL = await uploadToCloudinary(dtiFile);

      const updates = {
        name: name.trim(),
        shortName: shortName.trim(),
        tagline: tagline.trim(),
        phone: phone.trim(),
        address: address.trim(),
        icon: icon.trim() || "store",
        bg,
        accent,
        services,
        coverURL: finalCoverURL,
        logoURL: finalLogoURL,
        dtiURL: finalDtiURL
      };
      
      if (shop?.id) {
        await updateDoc(doc(db, "shops", shop.id), updates);
        onSaved(updates);
      } else {
        updates.ownerId = ownerId;
        updates.createdAt = serverTimestamp();
        updates.rating = 0;
        updates.reviews = 0;
        
        let customId = null;
        const sName = updates.name.toUpperCase();
        if (sName.includes("JME")) customId = "JME";
        else if (sName.includes("GRHE")) customId = "GRHE";

        if (customId) {
          await setDoc(doc(db, "shops", customId), updates);
          await updateDoc(doc(db, "users", ownerId), { shopId: customId, shopName: updates.name });
          onSaved({ id: customId, ...updates });
        } else {
          const shopRef = await addDoc(collection(db, "shops"), updates);
          await updateDoc(doc(db, "users", ownerId), { shopId: shopRef.id, shopName: updates.name });
          onSaved({ id: shopRef.id, ...updates });
        }
      }
    } catch (e) { setError("Failed to save: " + e.message); }
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "flex-end", animation: "ab-fade-in 0.2s ease-out" }} onClick={onClose}>
      <div style={{ background: colors.white, borderRadius: "32px 32px 0 0", width: "100%", padding: "2rem 1.5rem", maxHeight: "90vh", overflowY: "auto", animation: "ab-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards", boxShadow: "0 -4px 24px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", color: colors.info }}><Store size={24} /></div>
            <div>
              <div style={{ fontWeight: "800", fontSize: "18px", color: colors.textPrimary }}>Edit Shop Profile</div>
              <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "500", marginTop: "2px" }}>Update your shop details</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: colors.bg, border: "none", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", cursor: "pointer", color: colors.textSecondary }}>×</button>
        </div>

        <ErrorModal error={error} onClose={() => setError("")} />

        {/* IMAGE UPLOADS */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "1.25rem" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Cover Photo</div>
            <input type="file" id="coverPhotoUpload" accept="image/*" style={{ display: "none" }} onChange={(e) => {
              const file = e.target.files[0];
              if (file) { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); }
            }} />
            <div 
              onClick={() => document.getElementById("coverPhotoUpload").click()}
              style={{ width: "100%", height: "80px", background: colors.bg, borderRadius: "14px", border: `1.5px dashed ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", position: "relative" }}
            >
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="cover preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={(e) => { e.stopPropagation(); setCoverFile(null); setCoverPreview(""); }} style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px" }}>×</button>
                </>
              ) : (
                <span style={{ fontSize: "12px", color: colors.textMuted }}>Tap to upload</span>
              )}
            </div>
          </div>
          
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Profile Picture</div>
            <input type="file" id="logoPhotoUpload" accept="image/*" style={{ display: "none" }} onChange={(e) => {
              const file = e.target.files[0];
              if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
            }} />
            <div 
              onClick={() => document.getElementById("logoPhotoUpload").click()}
              style={{ width: "100%", height: "80px", background: colors.bg, borderRadius: "14px", border: `1.5px dashed ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", position: "relative" }}
            >
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="logo preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(""); }} style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px" }}>×</button>
                </>
              ) : (
                <span style={{ fontSize: "12px", color: colors.textMuted }}>Tap to upload</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>DTI Certificate</div>
          <input type="file" id="dtiPhotoUpload" accept="image/*" style={{ display: "none" }} onChange={(e) => {
            const file = e.target.files[0];
            if (file) { setDtiFile(file); setDtiPreview(URL.createObjectURL(file)); }
          }} />
          <div 
            onClick={() => document.getElementById("dtiPhotoUpload").click()}
            style={{ width: "100%", height: dtiPreview ? "160px" : "80px", background: colors.bg, borderRadius: "14px", border: `1.5px dashed ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", position: "relative" }}
          >
            {dtiPreview ? (
              <>
                <img src={dtiPreview} alt="DTI preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                <button onClick={(e) => { e.stopPropagation(); setDtiFile(null); setDtiPreview(""); }} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "14px" }}>×</button>
              </>
            ) : (
              <span style={{ fontSize: "12px", color: colors.textMuted, display: "flex", alignItems: "center", gap: "6px" }}><FileText size={14} /> Tap to upload DTI</span>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Shop Name *</div>
          <input type="text" style={inputStyle} value={name} onChange={e => setName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))} />
        </div>
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Short Name</div>
          <input type="text" style={inputStyle} placeholder="e.g. JME" value={shortName} onChange={e => setShortName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))} />
        </div>
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Tagline / About</div>
          <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} value={tagline} onChange={e => setTagline(e.target.value)} />
        </div>
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Phone Number</div>
          <input type="text" style={inputStyle} placeholder="e.g. 0912 345 6789" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Shop Address</div>
          <textarea style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }} placeholder="e.g. 123 Main St, City" value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Services Offered</div>
          
          {services.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px", padding: "12px", borderRadius: "16px", border: `1.5px solid ${colors.border}`, background: "#f9fafb" }}>
              {services.map(s => (
                <div key={s} style={{ background: `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`, color: "#fff", padding: "6px 12px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 6px rgba(42,82,152,0.2)" }}>
                  {s}
                  <button onClick={() => setServices(services.filter(x => x !== s))} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "16px", padding: 0, opacity: 0.8 }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.8}>&times;</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: "12px" }}>
            <CustomDropdown
              value=""
              onChange={val => {
                if (val && !services.includes(val)) setServices([...services, val]);
              }}
              options={STANDARD_SERVICES.filter(s => !services.includes(s)).map(s => ({ value: s, label: s }))}
              placeholder="Select from standard list..."
              style={{ width: "100%", padding: "16px 36px 16px 16px", borderRadius: "16px", border: `1.5px solid ${colors.border}`, background: "#f8fafc", fontSize: "14px", fontWeight: "500" }}
            />
          </div>
          
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Or type custom service here"
              value={serviceInput}
              onChange={e => setServiceInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const val = serviceInput.trim().replace(/,$/, '');
                  if (val && !services.includes(val)) {
                    setServices([...services, val]);
                    setServiceInput("");
                  }
                }
              }}
            />
            <button 
              onClick={() => {
                const val = serviceInput.trim().replace(/,$/, '');
                if (val && !services.includes(val)) {
                  setServices([...services, val]);
                  setServiceInput("");
                }
              }}
              disabled={!serviceInput.trim()}
              style={{ background: colors.blue, color: "#fff", border: "none", borderRadius: "16px", padding: "0 20px", fontWeight: "700", cursor: serviceInput.trim() ? "pointer" : "not-allowed", opacity: serviceInput.trim() ? 1 : 0.6, fontSize: "14px", whiteSpace: "nowrap" }}
            >
              Add Custom
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "1.5rem" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Icon (Emoji)</div>
            <input type="text" style={{ ...inputStyle, padding: "8px 16px", height: "48px" }} value={icon} onChange={e => setIcon(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Bg Color</div>
            <input type="color" style={{ ...inputStyle, padding: "8px", height: "48px" }} value={bg} onChange={e => setBg(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Accent Color</div>
            <input type="color" style={{ ...inputStyle, padding: "8px", height: "48px" }} value={accent} onChange={e => setAccent(e.target.value)} />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", padding: "16px", background: colors.blue, color: "#fff", border: "none", borderRadius: "16px", fontSize: "16px", fontWeight: "800", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", boxShadow: "0 8px 20px rgba(42, 82, 152, 0.25)", transition: "all 0.2s" }}>
          {saving ? "Saving..." : <><Check size={16} /> Save Changes</>}
        </button>
        <div style={{ height: "12px" }} />
        <button onClick={onClose} style={{ width: "100%", padding: "16px", borderRadius: "16px", fontSize: "15px", border: "none", background: "transparent", color: colors.textSecondary, fontWeight: "700", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

export default function AutoShopProfile() {
  const { userProfile } = useUser();
  const isAdmin = userProfile?.role?.toLowerCase() === "admin";
  const navigate = useNavigate();
  const location = useLocation();
  const [shop, setShop] = useState(location.state?.shop || null);
  const shopId = location.state?.shopId || location.state?.shop?.id;
  const prefilledService = location.state?.prefilledService;
  const isOwner = location.state?.isOwner;

  const [showEditModal, setShowEditModal] = useState(false);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("Posts");
  const [serviceSearch, setServiceSearch] = useState("");
  const [ownerData, setOwnerData] = useState(null);
  const [uid, setUid] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectedStarFilter, setSelectedStarFilter] = useState(0);
  const [reviewToReport, setReviewToReport] = useState(null);
  
  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportCount, setReportCount] = useState(0);
  const [loadingShop, setLoadingShop] = useState(!location.state?.shop && !!shopId);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUid(u?.uid || null);
      if (u?.uid) {
        const docSnap = await getDoc(doc(db, "users", u.uid));
        if (docSnap.exists()) setCurrentUser({ id: u.uid, ...docSnap.data() });
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!shop && !shopId) return;
    const fetchShopDetailsAndPosts = async () => {
      try {
        let sId = shop?.id || shopId;
        // Attempt to resolve shop ID if missing
        if (!sId && shop?.ownerId) {
          const sSnap = await getDocs(query(collection(db, "shops"), where("ownerId", "==", shop.ownerId)));
          if (!sSnap.empty) {
            sId = sSnap.docs[0].id;
          }
        }

        // Fetch up-to-date shop data from DB
        let dbShop = {};
        if (sId) {
          const shopDoc = await getDoc(doc(db, "shops", sId));
          if (shopDoc.exists()) {
            dbShop = { id: shopDoc.id, ...shopDoc.data() };
          }
        }

        // Fetch active report count for tiered penalty
        let currentReports = 0;
        if (sId) {
          try {
            const repSnap = await getDocs(query(collection(db, "adminAlerts"), where("type", "==", "shop_report"), where("shopId", "==", sId)));
            currentReports = repSnap.size;
          } catch(e) {}
        }
        setReportCount(currentReports);

        // Resolve dynamic rating based on bookings
        let rawBaseRating = dbShop.rawRating || dbShop.rating || shop.rating || 0;
        let finalReviews = dbShop.reviews || shop.reviews || 0;

        let ratedBookings = [];
        if (sId) {
          const bSnap = await getDocs(query(collection(db, "bookings"), where("shopId", "==", sId)));
          ratedBookings = bSnap.docs.map(d => d.data()).filter(b => b.rating && !isNaN(Number(b.rating)) && Number(b.rating) > 0 && !b.reviewHidden && b.reviewStatus !== "archived");
        }
        if (ratedBookings.length === 0 && (dbShop.name || shop.name)) {
          const nSnap = await getDocs(query(collection(db, "bookings"), where("shopName", "==", dbShop.name || shop.name)));
          ratedBookings = nSnap.docs.map(d => d.data()).filter(b => b.rating && !isNaN(Number(b.rating)) && Number(b.rating) > 0 && !b.reviewHidden && b.reviewStatus !== "archived");
        }

        if (ratedBookings.length > 0) {
          rawBaseRating = ratedBookings.reduce((sum, b) => sum + Number(b.rating), 0) / ratedBookings.length;
          finalReviews = ratedBookings.length;
        }

        const finalRating = calculateShopRating(rawBaseRating, currentReports);

        // Map rated bookings to review objects so they appear in the UI
        const bookingReviews = ratedBookings.map(b => ({
          id: b.id || Math.random().toString(36).substring(7),
          userName: b.customerName || "Customer",
          rating: Number(b.rating),
          text: b.review || "",
          createdAt: b.ratedAt || b.createdAt,
        }));

        const allReviews = [...bookingReviews].sort((a, b) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });

        setReviews(allReviews);

        // Update shop state with enriched information
        if (dbShop.id) {
          setShop(prev => ({ ...(prev || {}), ...dbShop, rating: finalRating, reviews: finalReviews }));
        } else {
          setShop(null);
        }

        // Fetch Posts
        const snap = await getDocs(collection(db, "posts"));
        const allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const shopPosts = allPosts.filter(p => {
          if (dbShop.ownerId && p.ownerId === dbShop.ownerId) return true;
          if (shop?.ownerId && p.ownerId === shop.ownerId) return true;
          if (sId && p.shopId === sId) return true;
          if (p.shopName && p.shopName === (dbShop.name || shop?.name)) return true;
          if (p.shopName && p.shopName === (dbShop.shortName || shop?.shortName)) return true;
          
          const sName = (dbShop.name || shop?.name || "").toUpperCase();
          const pName = (p.shopName || "").toUpperCase();
          if (sName.includes("JME") && (p.shopId === "JME" || pName.includes("JME"))) return true;
          if (sName.includes("GRHE") && (p.shopId === "GRHE" || pName.includes("GRHE"))) return true;
          return false;
        });
        
        const sorted = shopPosts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setPosts(sorted);

        const currentOwnerId = dbShop.ownerId || shop?.ownerId;
        if (currentOwnerId) {
          try {
            const snapOwner = await getDoc(doc(db, "users", currentOwnerId));
            if (snapOwner.exists()) setOwnerData(snapOwner.data());
          } catch (e) {}
        }
      } catch (e) {
        console.error("Error fetching shop details and posts:", e);
      } finally {
        setLoadingShop(false);
      }
    };

    fetchShopDetailsAndPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleLike = async (post) => {
    if (!uid) return;
    const hasLiked = post.likes?.includes(uid);
    
    setPosts(prev => prev.map(p => {
      if (p.id === post.id) {
        return {
          ...p,
          likes: hasLiked ? p.likes.filter(id => id !== uid) : [...(p.likes || []), uid]
        };
      }
      return p;
    }));

    try {
      await updateDoc(doc(db, "posts", post.id), {
        likes: hasLiked ? arrayRemove(uid) : arrayUnion(uid)
      });
    } catch (e) {
      console.error("Failed to like post:", e);
    }
  };

  const handleFlagShopClick = () => {
    if (!uid) return setErrorMsg("Please log in to flag a shop.");
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) return;
    setReporting(true);
    
    try {
      if (shop.id) {
        await updateDoc(doc(db, "shops", shop.id), {
          flags: arrayUnion(uid)
        });
        
        await addDoc(collection(db, "adminAlerts"), {
          type: "shop_report",
          shopId: shop.id,
          shopName: shop.name || "Unknown Shop",
          reporterId: uid,
          reporterName: currentUser?.displayName || "Customer",
          reason: reportReason.trim(),
          title: `Shop Reported: ${shop.name || "Unknown Shop"}`,
          message: `Reason: ${reportReason.trim()}`,
          read: false,
          createdAt: serverTimestamp(),
        });

        const syncResult = await recalculateAndSyncShopRating(db, shop.id);
        if (syncResult) {
          setReportCount(syncResult.reportCount);
          setShop(prev => prev ? ({ ...prev, rating: syncResult.rating, reviews: syncResult.reviews }) : null);
        } else {
          setReportCount(prev => prev + 1);
        }
      }
      setShowReportModal(false);
      setReportReason("");
      setSuccessMsg("Shop reported successfully. Our team will review this shop.");
    } catch (e) {
      setErrorMsg("Failed to report shop: " + e.message);
    }
    setReporting(false);
  };



  if (loadingShop) {
    const content = (
      <div style={sh.page}>
        {!isAdmin && (
          <div style={sh.topbar}>
            <BackButton />
            <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
          </div>
        )}
        <div style={{ padding: "4rem 2rem", textAlign: "center", color: colors.textSecondary }}>Loading shop details...</div>
      </div>
    );
    if (isAdmin) return <DesktopOnly><AdminLayout>{content}</AdminLayout></DesktopOnly>;
    return content;
  }

  if (!shop) {
    const content = (
      <div style={sh.page}>
        {!isAdmin && (
          <div style={sh.topbar}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <BackButton />
              <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
            </div>
          </div>
        )}
        <div style={{ padding: "40px", textAlign: "center", color: colors.textMuted }}>Shop not found.</div>
      </div>
    );
    if (isAdmin) return <DesktopOnly><AdminLayout>{content}</AdminLayout></DesktopOnly>;
    return content;
  }

  const displayServices = shop.services?.length > 0 
    ? shop.services 
    : ["Oil Change", "Brake Inspection", "Tire Rotation", "Aircon Cleaning", "Battery Replacement", "General Checkup"];

  const totalReviewsCount = reviews.length;
  const starCounts = {
    5: reviews.filter(r => Math.round(Number(r.rating)) === 5).length,
    4: reviews.filter(r => Math.round(Number(r.rating)) === 4).length,
    3: reviews.filter(r => Math.round(Number(r.rating)) === 3).length,
    2: reviews.filter(r => Math.round(Number(r.rating)) === 2).length,
    1: reviews.filter(r => Math.round(Number(r.rating)) === 1).length,
  };

  const rawAvgRating = totalReviewsCount > 0
    ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / totalReviewsCount
    : (shop?.rawRating || (shop?.rating && !isNaN(Number(shop.rating)) ? Number(shop.rawRating || shop.rating) : 0));

  const dynamicAvgRating = calculateShopRating(rawAvgRating, reportCount);
  const penaltyInfo = getReportPenalty(reportCount);

  const filteredReviews = selectedStarFilter > 0
    ? reviews.filter(r => Math.round(Number(r.rating)) === selectedStarFilter)
    : reviews;

  const content = (
    <div style={sh.page}>
      <SuccessModal message={successMsg} onClose={() => setSuccessMsg("")} />
      <ErrorModal error={errorMsg} onClose={() => setErrorMsg("")} />
      <style>
        {`
          @keyframes ab-fade-in { from { opacity: 0; } to { opacity: 1; } }
          @keyframes ab-slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `}
      </style>

      {!isAdmin && (
        <div style={sh.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <BackButton />
            <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
          </div>
        </div>
      )}

      {/* MODERN SHOP HEADER */}
      <div style={{ padding: "16px", maxWidth: "1200px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div style={{
          position: "relative", width: "100%", minHeight: "260px",
          borderRadius: "24px", overflow: "hidden",
          background: shop.coverURL ? `url(${shop.coverURL}) center/cover` : `linear-gradient(135deg, ${colors.navy}, ${colors.blue})`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column", justifyContent: "flex-end"
        }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,38,64,0.95) 0%, rgba(15,38,64,0.2) 60%, transparent 100%)" }} />
          
          <div style={{ position: "relative", zIndex: 1, padding: "20px 24px", display: "flex", gap: "20px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ width: "88px", height: "88px", borderRadius: "50%", background: shop.logoURL ? `url(${shop.logoURL}) center/cover` : colors.white, border: "3px solid rgba(255,255,255,0.2)", color: shop.accent || colors.info, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", fontWeight: "800", flexShrink: 0, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
              {!shop.logoURL && (shop.icon || getInitials(shop.name))}
            </div>
            
            <div style={{ flex: 1, minWidth: "200px" }}>
              <h1 style={{ margin: "0 0 4px 0", fontSize: "28px", fontWeight: "800", color: "#fff", letterSpacing: "-0.5px", textShadow: "0 2px 4px rgba(0,0,0,0.3)", lineHeight: 1.1, wordBreak: "break-word" }}>{shop.name}</h1>
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)", marginBottom: "8px", fontWeight: "500" }}>{shop.tagline || "Quality auto services"}</div>
              
              {shop.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Phone size={14} color="rgba(255,255,255,0.85)" />
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.9)", fontWeight: "600" }}>{shop.phone}</span>
                  </div>
                  {!isOwner && (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <a
                        href={`tel:${shop.phone}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          background: "#10b981",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: "700",
                          textDecoration: "none",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                        }}
                      >
                        <Phone size={12} /> Call
                      </a>
                      <a
                        href={`sms:${shop.phone}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          background: "#3b82f6",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: "700",
                          textDecoration: "none",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                        }}
                      >
                        <MessageSquare size={12} /> Text
                      </a>
                    </div>
                  )}
                </div>
              )}
              
              {shop.address && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <MapPin size={14} color="rgba(255,255,255,0.85)" />
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.9)", fontWeight: "600" }}>{shop.address}</span>
                </div>
              )}
              
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <Star fill="currentColor" size={16} style={{ color: "#f59e0b" }} />
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>
                  {dynamicAvgRating > 0 ? dynamicAvgRating.toFixed(1) : "New"}
                </span>
                {shop.reviews > 0 && <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>({shop.reviews} reviews)</span>}
                {penaltyInfo.isPenalized && (
                  <span style={{ fontSize: "11px", fontWeight: "700", background: "rgba(239,68,68,0.35)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.5)", padding: "2px 8px", borderRadius: "8px", marginLeft: "4px" }}>
                    -{penaltyInfo.penalty.toFixed(1)}★ penalty
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              {isOwner ? (
                <button 
                  onClick={() => setShowEditModal(true)}
                  style={{ padding: "12px 20px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "14px", fontWeight: "700", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", fontFamily: "inherit", backdropFilter: "blur(8px)", transition: "all 0.2s" }}
                >
                  <Edit size={14} /> Edit Profile
                </button>
              ) : (
                <>
                  <button 
                    onClick={handleFlagShopClick}
                    style={{ padding: "12px 16px", background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "14px", fontWeight: "700", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px", fontFamily: "inherit", backdropFilter: "blur(8px)", transition: "all 0.2s" }}
                  >
                    <Flag size={14} /> Flag Shop
                  </button>
                  <button 
                    onClick={() => navigate("/customer/book-service", { state: { shop, prefilledService } })}
                    style={{ padding: "12px 24px", background: "#fff", color: colors.navy, border: "none", borderRadius: "14px", fontWeight: "800", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", transition: "all 0.2s" }}
                  >
                    <Calendar size={14} /> Book Now
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 16px 16px", display: "flex", gap: "8px", justifyContent: "flex-start", maxWidth: "1200px", margin: "0 auto", width: "100%", boxSizing: "border-box", overflowX: "auto" }}>
        {["Posts", "About", "Reviews"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "10px 24px", borderRadius: "20px", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit",
            background: activeTab === tab ? colors.navy : colors.white,
            color: activeTab === tab ? "#fff" : colors.textSecondary,
            border: activeTab === tab ? "none" : `1px solid ${colors.border}`,
            boxShadow: activeTab === tab ? "0 4px 12px rgba(26,58,92,0.2)" : "none",
            transition: "all 0.2s ease"
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 16px 16px", width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "16px" }}>
        {activeTab === "Posts" && (
          <>
            {/* Intro Card */}
            <div style={{ background: colors.white, borderRadius: "20px", padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: `1px solid ${colors.border}` }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "800", color: colors.textPrimary }}>Intro</h3>
              <div style={{ fontSize: "14px", color: colors.textSecondary, marginBottom: "16px", lineHeight: "1.5" }}>{shop.tagline || "Quality auto services"}</div>
              
              {displayServices.length > 0 && (
                <>
                  <div style={{ borderTop: `1px solid ${colors.border}`, margin: "16px 0" }} />
                  {displayServices.map(s => (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", color: colors.textPrimary, fontSize: "14px", fontWeight: "600" }}>
                      <Check size={18} style={{ color: colors.info }} /> Provides {s}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Posts Feed */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {posts.length === 0 ? (
                <div style={{ background: colors.white, borderRadius: "20px", padding: "32px 16px", textAlign: "center", color: colors.textMuted, border: `1px solid ${colors.border}` }}>No posts yet.</div>
              ) : (
                posts.map(post => (
                  <div key={post.id} style={{ background: colors.white, borderRadius: "20px", padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: `1px solid ${colors.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                      <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: shop.logoURL ? `url(${shop.logoURL}) center/cover` : shop.bg || colors.infoBg, color: shop.accent || colors.info, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "800", border: `1px solid ${colors.border}` }}>
                        {!shop.logoURL && (shop.icon || getInitials(shop.name))}
                      </div>
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "15px", color: colors.textPrimary }}>{shop.name}</div>
                        <div style={{ fontSize: "12px", color: colors.textMuted, fontWeight: "500", marginTop: "2px" }}>
                          {timeAgo(post.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: "1.6", marginBottom: post.imageUrl ? "16px" : "12px", whiteSpace: "pre-wrap" }}>
                      {post.content}
                    </div>
                    
                    {post.imageUrl && (
                      <div style={{ borderRadius: "14px", overflow: "hidden", border: `1px solid ${colors.border}`, background: colors.bg, marginBottom: "12px" }}>
                        <img src={post.imageUrl} alt="Post attachment" style={{ width: "100%", maxHeight: "400px", objectFit: "contain", display: "block" }} />
                      </div>
                    )}
                    
                    {/* Engagement Action Buttons */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", borderTop: `1px solid ${colors.bg}`, paddingTop: "12px" }}>
                      <button 
                        onClick={() => toggleLike(post)} 
                        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: post.likes?.includes(uid) ? colors.danger : colors.textSecondary, fontSize: "13px", fontWeight: "700", padding: 0, transition: "color 0.2s" }}
                      >
                        <span style={{ transition: "transform 0.2s", transform: post.likes?.includes(uid) ? "scale(1.1)" : "scale(1)", display: "flex", alignItems: "center" }}>
                          {post.likes?.includes(uid) ? <Heart fill="currentColor" size={18} style={{color: colors.danger}} /> : <Heart size={18} />}
                        </span> 
                        {post.likes?.length || 0}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === "About" && (
          <div style={{ background: colors.white, borderRadius: "20px", padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: `1px solid ${colors.border}` }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "800", color: colors.textPrimary }}>About {shop.name}</h3>
            <div style={{ fontSize: "14px", color: colors.textSecondary, marginBottom: "16px", lineHeight: "1.6" }}>
              {shop.tagline || "No additional information provided."}
            </div>

            {shop.phone && (
              <div style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "14px",
                padding: "14px 16px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px"
              }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px" }}>Direct Contact</div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#14532d", marginTop: "2px" }}>{shop.phone}</div>
                </div>
                {!isOwner && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <a
                      href={`tel:${shop.phone}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        borderRadius: "10px",
                        background: "#10b981",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: "700",
                        textDecoration: "none"
                      }}
                    >
                      <Phone size={14} /> Call Shop
                    </a>
                    <a
                      href={`sms:${shop.phone}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        borderRadius: "10px",
                        background: "#3b82f6",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: "700",
                        textDecoration: "none"
                      }}
                    >
                      <MessageSquare size={14} /> Text Shop
                    </a>
                  </div>
                )}
              </div>
            )}
            
            <div style={{ borderTop: `1px solid ${colors.border}`, margin: "16px 0" }} />
            
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "800", color: colors.textPrimary }}>Services</h3>
            <input
              type="text"
              placeholder="Search available services..."
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "12px", boxSizing: "border-box",
                border: `1px solid ${colors.border}`, marginBottom: "16px",
                fontSize: "13px", outline: "none", backgroundColor: "#f9fafb"
              }}
            />
            {displayServices.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {displayServices
                  .filter(s => s.toLowerCase().includes(serviceSearch.toLowerCase()))
                  .map(s => (
                  <span key={s} style={{ background: colors.bg, color: colors.textPrimary, padding: "8px 14px", borderRadius: "12px", fontSize: "13px", fontWeight: "600", border: `1px solid ${colors.border}` }}>
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ color: colors.textMuted, fontSize: "14px" }}>No specific services listed.</div>
            )}

            {ownerData?.businessPermitUrl && (
              <>
                <div style={{ borderTop: `1px solid ${colors.border}`, margin: "20px 0 16px 0" }} />
                <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "800", color: colors.textPrimary }}>Business Permit / Certificate</h3>
                <div style={{ borderRadius: "12px", overflow: "hidden", border: `1px solid ${colors.border}`, display: "inline-block", padding: "4px", background: colors.bg }}>
                  <img src={ownerData.businessPermitUrl} alt="Business Permit" style={{ width: "100%", maxWidth: "400px", borderRadius: "8px", display: "block" }} />
                </div>
              </>
            )}

            {(shop.dtiURL || ownerData?.dtiUrl) && (
              <>
                <div style={{ borderTop: `1px solid ${colors.border}`, margin: "20px 0 16px 0" }} />
                <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "800", color: colors.textPrimary, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Check size={18} style={{ color: colors.info }} /> Verified DTI Certificate
                </h3>
                <div style={{ borderRadius: "12px", overflow: "hidden", border: `1px solid ${colors.border}`, display: "inline-block", padding: "4px", background: colors.bg }}>
                  <img src={shop.dtiURL || ownerData?.dtiUrl} alt="DTI Certificate" style={{ width: "100%", maxWidth: "400px", borderRadius: "8px", display: "block" }} />
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "Reviews" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* VISUAL STAR RATING BREAKDOWN CARD */}
            <div style={{
              background: colors.white,
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              border: `1px solid ${colors.border}`,
              display: "flex",
              flexDirection: "column",
              gap: "20px"
            }}>
              <div style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "28px",
                flexWrap: "wrap"
              }}>
                {/* Overall Score */}
                <div style={{
                  textAlign: "center",
                  minWidth: "130px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingRight: "16px",
                  borderRight: `1px solid ${colors.border}`
                }}>
                  <div style={{ fontSize: "48px", fontWeight: "900", color: colors.navy, lineHeight: 1 }}>
                    {dynamicAvgRating > 0 ? dynamicAvgRating.toFixed(1) : "0.0"}
                  </div>
                  {penaltyInfo.isPenalized && (
                    <div style={{ fontSize: "11px", fontWeight: "700", color: colors.danger, background: colors.dangerBg, padding: "3px 8px", borderRadius: "8px", marginTop: "6px" }}>
                      -{penaltyInfo.penalty.toFixed(1)}★ penalty ({reportCount} reports)
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "3px", margin: "10px 0 6px" }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        size={17}
                        fill={s <= Math.round(dynamicAvgRating) ? "#f59e0b" : "none"}
                        color={s <= Math.round(dynamicAvgRating) ? "#f59e0b" : "#d1d5db"}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "600" }}>
                    {totalReviewsCount} {totalReviewsCount === 1 ? "review" : "reviews"}
                  </div>
                </div>

                {/* 5★ to 1★ Distribution Bars */}
                <div style={{ flex: 1, minWidth: "240px", display: "flex", flexDirection: "column", gap: "7px" }}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = starCounts[star] || 0;
                    const pct = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
                    const isSelected = selectedStarFilter === star;

                    return (
                      <div
                        key={star}
                        onClick={() => count > 0 && setSelectedStarFilter(isSelected ? 0 : star)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          cursor: count > 0 ? "pointer" : "default",
                          padding: "3px 8px",
                          borderRadius: "8px",
                          background: isSelected ? "rgba(37,99,235,0.08)" : "transparent",
                          transition: "all 0.15s ease"
                        }}
                        title={count > 0 ? `Click to filter by ${star} star reviews` : "No reviews for this rating"}
                      >
                        {/* Star label */}
                        <div style={{ display: "flex", alignItems: "center", gap: "3px", width: "42px", flexShrink: 0 }}>
                          <span style={{ fontSize: "13px", fontWeight: isSelected ? "800" : "600", color: isSelected ? colors.blue : colors.textPrimary }}>{star}</span>
                          <Star size={13} fill="#f59e0b" color="#f59e0b" />
                        </div>

                        {/* Progress track */}
                        <div style={{ flex: 1, height: "10px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden", position: "relative" }}>
                          <div style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: isSelected ? colors.blue : "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)",
                            borderRadius: "999px",
                            transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease"
                          }} />
                        </div>

                        {/* Count & Percentage */}
                        <div style={{ width: "70px", textAlign: "right", fontSize: "12px", color: isSelected ? colors.blue : colors.textMuted, fontWeight: isSelected ? "700" : "500", flexShrink: 0 }}>
                          {count} <span style={{ opacity: 0.7 }}>({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Filter Chips */}
              {totalReviewsCount > 0 && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                  borderTop: `1px solid ${colors.border}`,
                  paddingTop: "14px"
                }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: colors.textSecondary, marginRight: "2px" }}>Filter:</span>
                  <button
                    onClick={() => setSelectedStarFilter(0)}
                    style={{
                      border: selectedStarFilter === 0 ? "none" : `1px solid ${colors.border}`,
                      background: selectedStarFilter === 0 ? colors.navy : "#f8fafc",
                      color: selectedStarFilter === 0 ? "#fff" : colors.textSecondary,
                      padding: "5px 12px",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    All ({totalReviewsCount})
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
                          padding: "5px 12px",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: isSelected ? "700" : "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          opacity: count === 0 && !isSelected ? 0.5 : 1,
                          transition: "all 0.15s ease"
                        }}
                      >
                        <span>{star}</span>
                        <Star size={11} fill={isSelected ? "#fff" : "#f59e0b"} color={isSelected ? "#fff" : "#f59e0b"} />
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
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        textDecoration: "underline"
                      }}
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Reviews List */}
            {filteredReviews.length === 0 ? (
              <div style={{ background: colors.white, borderRadius: "20px", padding: "36px 16px", textAlign: "center", color: colors.textMuted, border: `1px solid ${colors.border}` }}>
                {selectedStarFilter > 0 ? (
                  <div>
                    <div style={{ fontWeight: "700", color: colors.textPrimary, marginBottom: "8px", fontSize: "15px" }}>
                      No {selectedStarFilter}-star reviews found
                    </div>
                    <div style={{ fontSize: "13px", color: colors.textSecondary, marginBottom: "14px" }}>
                      There are currently no reviews matching this rating filter.
                    </div>
                    <button
                      onClick={() => setSelectedStarFilter(0)}
                      style={{
                        border: "none",
                        background: colors.navy,
                        color: "#fff",
                        padding: "8px 18px",
                        borderRadius: "12px",
                        fontSize: "13px",
                        fontWeight: "700",
                        cursor: "pointer"
                      }}
                    >
                      Show All Reviews
                    </button>
                  </div>
                ) : (
                  <div>
                    <Star fill="none" color={colors.textMuted} size={40} style={{ margin: "0 auto 10px" }} />
                    <div style={{ fontWeight: "700", color: colors.textPrimary, marginBottom: "4px" }}>No reviews yet</div>
                    <div style={{ fontSize: "13px", color: colors.textSecondary }}>When customers complete a service and leave feedback, it will appear here.</div>
                  </div>
                )}
              </div>
            ) : (
              filteredReviews.map(r => (
                <div key={r.id} style={{ background: colors.white, borderRadius: "20px", padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: `1px solid ${colors.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: colors.infoBg, color: colors.info, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "16px" }}>
                        {getInitials(r.userName || "Customer")}
                      </div>
                      <div>
                        <div style={{ fontWeight: "700", fontSize: "14px", color: colors.textPrimary }}>{r.userName || "Customer"}</div>
                        <div style={{ fontSize: "12px", color: colors.textMuted }}>{timeAgo(r.createdAt)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ color: "#f59e0b", fontSize: "14px", fontWeight: "700", display: "flex", gap: "2px" }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <span key={star} style={{ color: star <= r.rating ? "#f59e0b" : "#e5e7eb", display: "flex", alignItems: "center" }}>
                            <Star fill="currentColor" size={14} />
                          </span>
                        ))}
                      </div>
                      {uid && (
                        <button
                          onClick={() => setReviewToReport({
                            ...r,
                            source: "shop",
                            shopId: shop?.id || shopId,
                            shopName: shop?.name || "Auto Shop",
                          })}
                          title="Report this review"
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
                  {r.text && (
                    <div style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                      {r.text}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {reviewToReport && (
        <ReportReviewModal
          isOpen={!!reviewToReport}
          review={reviewToReport}
          currentUser={currentUser}
          onClose={() => setReviewToReport(null)}
          onSuccess={(msg) => setSuccessMsg(msg)}
        />
      )}

      {showEditModal && (
        <ShopEditModal
          shop={shop || {}}
          ownerId={shop.ownerId}
          onClose={() => setShowEditModal(false)}
          onSaved={(updates) => {
            setShop((prev) => ({ ...prev, ...updates }));
            setShowEditModal(false);
          }}
        />
      )}

      {/* REPORT MODAL */}
      {showReportModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => !reporting && setShowReportModal(false)}>
          <div style={{ background: colors.white, borderRadius: "24px", width: "100%", maxWidth: "400px", padding: "24px", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", position: "relative" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: colors.danger }}>
                <Flag size={20} />
              </div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: colors.textPrimary }}>Report Shop</h2>
            </div>
            
            <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: colors.textSecondary, lineHeight: "1.5" }}>
              If you believe this shop is fraudulent, inappropriate, or violates our terms of service, please let us know why.
            </p>
            
            <textarea
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              placeholder="e.g. Inappropriate content, Scam, Fake shop..."
              style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${colors.border}`, fontSize: "14px", fontFamily: "inherit", minHeight: "100px", resize: "vertical", boxSizing: "border-box", marginBottom: "20px", outline: "none", background: colors.bg }}
            />
            
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={() => setShowReportModal(false)}
                disabled={reporting}
                style={{ flex: 1, padding: "12px", background: colors.bg, color: colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "14px" }}
              >
                Cancel
              </button>
              <button 
                onClick={submitReport}
                disabled={reporting || !reportReason.trim()}
                style={{ flex: 1, padding: "12px", background: colors.danger, color: "#fff", border: "none", borderRadius: "12px", fontWeight: "700", cursor: reporting || !reportReason.trim() ? "not-allowed" : "pointer", fontSize: "14px", opacity: reporting || !reportReason.trim() ? 0.6 : 1 }}
              >
                {reporting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isAdmin) {
    return (
      <DesktopOnly>
        <AdminLayout>
          {content}
        </AdminLayout>
      </DesktopOnly>
    );
  }
  
  return content;
}
