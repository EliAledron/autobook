import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, getDocs, query, where, doc, updateDoc,
  addDoc, serverTimestamp, getDoc, orderBy, limit,
  deleteDoc
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { sh, colors, getGreeting, getInitials } from "./dashboardShared";
import TopbarAvatar from "./TopbarAvatar";

// ─── Quick Action SVG Icons ────────────────────────────────────────────────────
const IcoUsers    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.87"/></svg>;
const IcoShop     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1-5h16l1 5"/><path d="M3 9a5 5 0 005 5 5 5 0 005-5 5 5 0 005 5"/><path d="M5 21V14h14v7"/></svg>;
const IcoWrench   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>;
const IcoClip     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>;
const IcoStar     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcoChart    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IcoGear     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const IcoPlus     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
const IcoMega     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>;
const IcoFeed     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 10h16M4 14h10M4 18h7"/></svg>;
const IcoPin      = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;

const OWNER_ACTIONS = {
  users:    { Icon: IcoUsers,  iconColor: "#2a5298", iconBg: "#dbeafe" },
  profile:  { Icon: IcoShop,   iconColor: "#059669", iconBg: "#d1fae5" },
  mechanics:{ Icon: IcoWrench, iconColor: "#d97706", iconBg: "#fef3c7" },
  bookings: { Icon: IcoClip,   iconColor: "#7c3aed", iconBg: "#ede9fe" },
  reviews:  { Icon: IcoStar,   iconColor: "#f59e0b", iconBg: "#fffbeb" },
  reports:  { Icon: IcoChart,  iconColor: "#0891b2", iconBg: "#e0f7fa" },
  parts:    { Icon: IcoGear,   iconColor: "#1a3a5c", iconBg: "#e0f2fe" },
  order:    { Icon: IcoPlus,   iconColor: "#dc2626", iconBg: "#fee2e2" },
  post:     { Icon: IcoMega,   iconColor: "#7c3aed", iconBg: "#ede9fe" },
  feed:     { Icon: IcoFeed,   iconColor: "#d97706", iconBg: "#fef3c7" },
  requests: { Icon: IcoPin,    iconColor: "#059669", iconBg: "#d1fae5" },
};

// ─── Cloudinary config (same as Profile.js) ───────────────────────────────────
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
    throw new Error(`Image upload failed: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

// ─── Animations ───────────────────────────────────────────────────────────────
const keyframes = `
  @keyframes owner-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.3); }
  }
  @keyframes owner-ring {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes ab-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes ab-slide-up {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @property --fill-angle {
    syntax: "<angle>";
    inherits: false;
    initial-value: 0deg;
  }
  @keyframes gauge-fill {
    from { --fill-angle: 0deg; }
    to { --fill-angle: 180deg; }
  }
  .gauge-chart-mask {
    position: absolute; top: -1px; left: -1px; width: calc(100% + 2px); height: calc(200% + 2px); border-radius: 50%;
    background: conic-gradient(from 270deg, transparent 0deg, transparent var(--fill-angle, 180deg), var(--card-bg, #ffffff) var(--fill-angle, 180deg), var(--card-bg, #ffffff) 180deg, transparent 180deg);
    animation: gauge-fill 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .gauge-needle {
    position: absolute; bottom: 0; left: 50%; width: 4px; height: calc(100% - 12px);
    background: #111827; border-radius: 4px 4px 0 0;
    transform-origin: bottom center;
    transform: translateX(-50%) rotate(calc(var(--fill-angle, 180deg) - 90deg));
    animation: gauge-fill 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    z-index: 2;
  }
  .gauge-needle::after {
    content: ""; position: absolute; bottom: -4px; left: -4px; width: 12px; height: 12px;
    background: #111827; border-radius: 50%;
  }
  .owner-card {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .owner-list-item {
    transition: all 0.15s ease-in-out;
  }
  ::-webkit-scrollbar { display: none; }
`;

function PulseDot({ color = colors.danger, size = 9 }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: color, animation: "owner-ring 1.2s ease-out infinite" }} />
      <span style={{ width: size, height: size, borderRadius: "50%", background: color, animation: "owner-pulse 1.2s ease-in-out infinite", position: "relative" }} />
    </span>
  );
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function toDate(val) {
  if (!val) return null;
  if (val?.seconds) return new Date(val.seconds * 1000);
  if (typeof val === "string") return new Date(val);
  if (val instanceof Date) return val;
  return null;
}

const SectionTitle = ({ title, badge, action }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", marginTop: "2rem" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ width: "5px", height: "20px", borderRadius: "3px", background: colors.accent }}></div>
      <span style={{ fontSize: "18px", fontWeight: "800", color: colors.textPrimary, letterSpacing: "-0.3px" }}>{title}</span>
      {badge > 0 && (
        <span style={{ background: colors.danger, color: "#fff", fontSize: "11px", fontWeight: "800", borderRadius: "12px", padding: "3px 8px", boxShadow: "0 2px 6px rgba(220,38,38,0.3)" }}>{badge}</span>
      )}
    </div>
    {action}
  </div>
);

// ─── Car Parts Modal ──────────────────────────────────────────────────────────
function CarPartsModal({ user, mechanics, onClose, onSaved, shopId }) {
  const [partName, setPartName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [assignedMechanicId, setAssignedMechanicId] = useState("");
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
    if (!partName.trim()) { setError("Please enter the part name."); return; }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) < 1) { setError("Please enter a valid quantity."); return; }
    setError("");
    setSaving(true);
    try {
      const assignedMechanic = mechanics.find(m => m.id === assignedMechanicId);
      const partData = {
        partName: partName.trim(), quantity: Number(quantity),
        notes: notes.trim(), mechanicId: assignedMechanicId || null,
        mechanicName: assignedMechanic?.name || user?.name || user?.role || "Owner",
        ownerId: user.uid || user.id, shopId, createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "carParts"), partData);
      await addDoc(collection(db, "adminAlerts"), {
        type: "car_part_ordered", title: "🔩 Car Part Ordered",
        message: `${user?.name || user?.role || "Owner"} ordered ${Number(quantity)}x ${partName.trim()}.`,
        mechanicName: assignedMechanic?.name || user?.name || user?.role || "Owner",
        partName: partName.trim(), quantity: Number(quantity),
        read: false, createdAt: serverTimestamp(),
      });
      onSaved(partData);
      onClose();
    } catch (e) { setError("Failed to save: " + e.message); }
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "flex-end", animation: "ab-fade-in 0.2s ease-out" }} onClick={onClose}>
      <div style={{ background: colors.white, borderRadius: "32px 32px 0 0", width: "100%", padding: "2rem 1.5rem", maxHeight: "90vh", overflowY: "auto", animation: "ab-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards", boxShadow: "0 -4px 24px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: colors.warningBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </div>
            <div>
              <div style={{ fontWeight: "800", fontSize: "18px", color: colors.textPrimary }}>Order Car Part</div>
              <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "500", marginTop: "2px" }}>Record parts needed for repair</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: colors.bg, border: "none", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", cursor: "pointer", color: colors.textSecondary }}>×</button>
        </div>
        {error && <div style={{ background: colors.dangerBg, border: `1px solid ${colors.danger}`, borderRadius: "12px", padding: "12px 16px", fontSize: "13px", color: colors.danger, marginBottom: "1.5rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}><span style={{ display: "flex" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></span> {error}</div>}
        
        {mechanics.length > 0 && (
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Assign to Mechanic (optional)</div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", display: "flex", color: colors.textMuted }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </span>
              <select value={assignedMechanicId} onChange={e => setAssignedMechanicId(e.target.value)} style={{ ...inputStyle, paddingLeft: "42px", appearance: "none" }}>
                <option value="">— No specific mechanic —</option>
                {mechanics.map(m => <option key={m.id} value={m.id}>{m.name || m.displayName}</option>)}
              </select>
              <span style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: colors.textMuted, pointerEvents: "none" }}>▼</span>
            </div>
          </div>
        )}

        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Part Name *</div>
          <input type="text" style={inputStyle} placeholder="e.g. Brake Pad, Air Filter..." value={partName} onChange={e => setPartName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))} />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Quantity *</div>
          <input type="number" style={inputStyle} placeholder="1" value={quantity} onChange={e => setQuantity(e.target.value.replace(/[^0-9]/g, ''))} min="1" />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Notes (optional)</div>
          <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} placeholder="e.g. For Toyota Vios, needed for brake job..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", padding: "16px", background: colors.blue, color: "#fff", border: "none", borderRadius: "16px", fontSize: "16px", fontWeight: "800", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", boxShadow: "0 8px 20px rgba(42, 82, 152, 0.25)", transition: "all 0.2s" }}>
          {saving ? "Saving..." : "✓ Submit Part Order"}
        </button>
        <div style={{ height: "12px" }} />
        <button onClick={onClose} style={{ width: "100%", padding: "16px", borderRadius: "16px", fontSize: "15px", border: "none", background: "transparent", color: colors.textSecondary, fontWeight: "700", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OwnerDashboard({ user }) {
  const navigate = useNavigate();
  const firstName = user?.name?.split(" ")[0] || user?.role || "Owner";
  const isAdmin = (user?.role || "").toLowerCase() === "admin";

  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [pendingBookings, setPendingBookings] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [unreadReviewAlertsCount, setUnreadReviewAlertsCount] = useState(0);
  const [newCarParts, setNewCarParts] = useState(0);
  const [shopData, setShopData] = useState(null);

  const [selMonth, setSelMonth] = useState(new Date().getMonth());
  const [selYear, setSelYear] = useState(new Date().getFullYear());

  const [mechanics, setMechanics] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [allCarParts, setAllCarParts] = useState([]);
  const [mechanicRequests, setMechanicRequests] = useState([]);

  // Post modal state
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [postImageFile, setPostImageFile] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState(null);

  const [showPartsModal, setShowPartsModal] = useState(false);
  const [partsToast, setPartsToast] = useState(null);
  const [myCarParts, setMyCarParts] = useState([]);

  const showToast = (msg) => { setPartsToast(msg); setTimeout(() => setPartsToast(null), 3000); };

  const fetchData = useCallback(async () => {
    let shopId = user?.shopId;
    if (!isAdmin && user?.shopName) {
      const sName = user.shopName.toUpperCase();
      if (sName.includes("JME")) shopId = "JME";
      else if (sName.includes("GRHE")) shopId = "GRHE";
    }
    if (!isAdmin && (user?.uid || user?.id)) {
      try {
        const sQuery = query(collection(db, "shops"), where("ownerId", "==", user.uid || user.id));
        const sSnap = await getDocs(sQuery);
        if (!sSnap.empty) {
          if (!shopId) shopId = sSnap.docs[0].id;
          for (const docSnap of sSnap.docs) {
            const fetchedName = (docSnap.data().name || "").toUpperCase();
            if (fetchedName.includes("JME")) { shopId = "JME"; break; }
            if (fetchedName.includes("GRHE")) { shopId = "GRHE"; break; }
          }
        }
      } catch (e) {}
    }

    if (shopId) {
      try {
        const shopSnap = await getDoc(doc(db, "shops", shopId));
        if (shopSnap.exists()) {
          const data = { id: shopSnap.id, ...shopSnap.data() };
          
          const bSnap = await getDocs(query(collection(db, "bookings"), where("shopId", "==", shopId)));
          const ratedBookings = bSnap.docs.map(d => d.data()).filter(b => b.rating && b.rating > 0);
          
          if (ratedBookings.length > 0) {
            const avg = ratedBookings.reduce((sum, b) => sum + b.rating, 0) / ratedBookings.length;
            
            // Sync the calculated rating back to the database for customers to see
            if (data.rating !== avg || data.reviews !== ratedBookings.length) {
              await updateDoc(doc(db, "shops", shopId), { rating: avg, reviews: ratedBookings.length });
            }

            data.rating = avg;
            data.reviews = ratedBookings.length;
          }
          setShopData(data);
        }
      } catch (e) { console.error("Failed to load shop:", e); }
    }

    const snap = await getDocs(shopId ? query(collection(db, "users"), where("shopId", "==", shopId)) : collection(db, "users"));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setUsers(list);
    setPendingUsers(list.filter(u => (u.status || "pending") === "pending"));
    setApprovedUsers(list.filter(u => u.status === "approved"));

    try {
      let originalShopId = user?.shopId;
      const bQuery = shopId ? query(collection(db, "bookings"), where("shopId", "==", shopId)) : collection(db, "bookings");
      const bSnap = await getDocs(bQuery);
      let bList = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (originalShopId && originalShopId !== shopId && !isAdmin) {
        try {
          const bSnapOld = await getDocs(query(collection(db, "bookings"), where("shopId", "==", originalShopId)));
          bList = [...bList, ...bSnapOld.docs.map(d => ({ id: d.id, ...d.data() }))];
        } catch(e) {}
      }

      if (shopId && user?.shopName && !isAdmin) {
        try {
          const nQuery = query(collection(db, "bookings"), where("shopName", "==", user.shopName));
          const nSnap = await getDocs(nQuery);
          bList = [...bList, ...nSnap.docs.map(d => ({ id: d.id, ...d.data() }))];
        } catch(e) {}
      }
      bList = Array.from(new Map(bList.map(b => [b.id, b])).values());
      bList = bList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setAllBookings(bList);
      setPendingBookings(bList.filter(b => (b.status || "Pending") === "Pending").length);
    } catch { setPendingBookings(0); }

    try {
      let aQuery;
      if (isAdmin) {
        aQuery = query(collection(db, "adminAlerts"), where("type", "==", "new_user"));
      } else {
        aQuery = query(collection(db, "adminAlerts"), where("shopId", "==", shopId || ""));
      }
      const aSnap = await getDocs(aQuery);
      const allUnread = aSnap.docs.filter(d => !d.data().read);
      
      setUnreadReviewAlertsCount(allUnread.filter(d => d.data().type === "new_rating").length);
      setUnreadAlerts(allUnread.filter(d => d.data().type !== "new_rating").length);
    } catch { 
      setUnreadAlerts(0); 
      setUnreadReviewAlertsCount(0); 
    }

    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const lastSeen = localStorage.getItem("carPartsLastSeen");
      const cpQuery = shopId ? query(collection(db, "carParts"), where("shopId", "==", shopId)) : collection(db, "carParts");
      const cpSnap = await getDocs(cpQuery);
      const allParts = cpSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllCarParts(allParts);
      setMyCarParts(allParts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      const unseen = allParts.filter(d => {
        if (!d.createdAt) return false;
        try {
          const date = d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000) : new Date(d.createdAt);
          if (isNaN(date.getTime())) return false;
          if (date.toISOString().slice(0, 10) !== todayStr) return false;
          if (lastSeen && date.getTime() <= Number(lastSeen)) return false;
          return true;
        } catch { return false; }
      });
      setNewCarParts(unseen.length);
    } catch { setNewCarParts(0); }

    try {
      let reqList = [];
      if (isAdmin) {
        const snap = await getDocs(collection(db, "mechanicRequests"));
        reqList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } else {
        const snap1 = await getDocs(query(collection(db, "mechanicRequests"), where("shopId", "==", shopId || "invalid")));
        reqList = snap1.docs.map(d => ({ id: d.id, ...d.data() }));
        if (reqList.length === 0 && (user?.id || user?.uid)) {
          const snap2 = await getDocs(query(collection(db, "mechanicRequests"), where("ownerId", "==", user.id || user.uid)));
          reqList = [...reqList, ...snap2.docs.map(d => ({ id: d.id, ...d.data() }))];
        }
      }
      const uniqueReqs = Array.from(new Map(reqList.map(r => [r.id, r])).values());
      setMechanicRequests(uniqueReqs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch { setMechanicRequests([]); }
  }, [user?.shopId]);

  const fetchMechanics = useCallback(async () => {
    try {
      const isAdmin = (user?.role || "").toLowerCase() === "admin";
      
      let shopId = user?.shopId;
      if (!isAdmin && user?.shopName) {
        const sName = user?.shopName.toUpperCase();
        if (sName.includes("JME")) shopId = "JME";
        else if (sName.includes("GRHE")) shopId = "GRHE";
      }
      if (!isAdmin && (user?.uid || user?.id)) {
        try {
          const sQuery = query(collection(db, "shops"), where("ownerId", "==", user.uid || user.id));
          const sSnap = await getDocs(sQuery);
          if (!sSnap.empty) {
            if (!shopId) shopId = sSnap.docs[0].id;
            for (const docSnap of sSnap.docs) {
              const fetchedName = (docSnap.data().name || "").toUpperCase();
              if (fetchedName.includes("JME")) { shopId = "JME"; break; }
              if (fetchedName.includes("GRHE")) { shopId = "GRHE"; break; }
            }
          }
        } catch (e) {}
      }

      const mQuery = isAdmin ? collection(db, "shopMechanics") : query(collection(db, "shopMechanics"), where("shopId", "==", shopId));
      const snap = await getDocs(mQuery);
      setMechanics(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      try {
        const snap2 = await getDocs(query(collection(db, "shopMechanics"), where("ownerId", "==", user?.id || user?.uid)));
        setMechanics(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { setMechanics([]); }
    }
  }, [user?.shopId, user?.role, user?.id, user?.uid]);

  useEffect(() => {
    fetchData();
    fetchMechanics();
    const handleFocus = () => { fetchData(); fetchMechanics(); };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchData, fetchMechanics]);

  const handleCarPartsClick = () => {
    localStorage.setItem("carPartsLastSeen", Date.now().toString());
    setNewCarParts(0);
    navigate("/admin/carparts");
  };

  const handlePartSaved = (partData) => {
    setMyCarParts(prev => [{ id: Date.now().toString(), ...partData }, ...prev]);
    showToast(`✅ ${partData.partName} recorded!`);
  };

  const handlePostImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPostImageFile(file);
    setPostImagePreview(URL.createObjectURL(file));
    setPostError("");
  };

  const resetPostModal = () => {
    setShowPostModal(false);
    setPostContent("");
    setPostImageFile(null);
    setPostImagePreview(null);
    setPostError("");
  };

  // ── Fixed: uses Cloudinary instead of Firebase Storage ──
  const handleCreatePost = async () => {
    const contentStr = postContent || "";
    if (!contentStr.trim() && !postImageFile) return;
    setPosting(true);
    setPostError("");
    try {
      let imageUrl = null;

      if (postImageFile) {
        // Upload to Cloudinary — no Firebase Storage needed
        imageUrl = await uploadToCloudinary(postImageFile);
      }

      await addDoc(collection(db, "posts"), {
        shopId: user?.shopId || "unknown",
        ownerId: user?.uid || user?.id || "unknown",
        shopName: user?.shopName || user?.name || "Our Shop",
        content: contentStr.trim(),
        imageUrl: imageUrl || null,
        likes: [],
        createdAt: serverTimestamp(),
      });

      resetPostModal();
      showToast("📢 Post published to feed!");
    } catch (e) {
      setPostError(e.message || "Failed to publish post.");
    }
    setPosting(false);
  };

  const pendingRequests = mechanicRequests.filter(r => (r.status || "Pending") === "Pending");

  const monthTarget = new Date(selYear, selMonth, 1);
  const completedThisMonth = allBookings.filter(b => {
    if ((b.status || "").toLowerCase() !== "completed") return false;
    const d = toDate(b.createdAt || b.date);
    return d && d.getFullYear() === monthTarget.getFullYear() && d.getMonth() === monthTarget.getMonth();
  });
  const totalCompletedThisMonth = completedThisMonth.length;
  const servicesBreakdown = {};
  completedThisMonth.forEach(b => {
    const sType = b.serviceType || "Other";
    servicesBreakdown[sType] = (servicesBreakdown[sType] || 0) + 1;
  });
  
  let topServices = Object.entries(servicesBreakdown)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
    
  if (topServices.length > 5) {
    const othersCount = topServices.slice(4).reduce((sum, s) => sum + s.count, 0);
    topServices = [
      ...topServices.slice(0, 4),
      { name: "Others", count: othersCount }
    ];
  }

  const PIE_COLORS = [colors.navy, colors.blue, colors.info, colors.success, colors.warning, colors.orange, colors.danger];
  let currentPct = 0;
  const gradientStops = totalCompletedThisMonth > 0 ? topServices.map((ts, i) => {
    const pct = (ts.count / totalCompletedThisMonth) * 50;
    const start = currentPct;
    const end = currentPct + pct;
    currentPct = end;
    return `${PIE_COLORS[i % PIE_COLORS.length]} ${start}% ${end}%`;
  }).join(", ") : "";
  const fullGradient = totalCompletedThisMonth > 0 ? `conic-gradient(from 270deg, ${gradientStops}, transparent 50%)` : `conic-gradient(from 270deg, ${colors.border} 0% 50%, transparent 50%)`;

  const roleStyle = (r) => {
    if (r === "Owner" || r === "Admin") return sh.badge(colors.dangerBg, colors.danger);
    return sh.badge(colors.infoBg, colors.info);
  };

  return (
    <div style={sh.page}>
      <style>{keyframes}</style>

      {partsToast && (
        <div style={{ position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", background: colors.navy, color: "#fff", padding: "10px 20px", borderRadius: "12px", fontSize: "13px", fontWeight: "600", zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
          {partsToast}
        </div>
      )}

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        <div style={sh.topbarRight}>
          <div style={sh.topbarMeta}>
            <div style={sh.topbarName}>{user?.name}</div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>{user?.role || "Owner"}</div>
          </div>
          <TopbarAvatar onClick={() => navigate("/profile")} />
        </div>
      </div>

      {/* HERO */}
      <div style={{ ...sh.hero, paddingBottom: "2.5rem", borderRadius: "0 0 24px 24px", marginBottom: "0", position: "relative", zIndex: 1 }}>
        <div style={sh.rolePill}>
          <div style={sh.roleDot} />
          <span style={sh.roleText}>{user?.role || "Owner"}{user?.shopName ? ` · ${user.shopName}` : ""}</span>
        </div>
        <div style={{ fontSize: "24px", fontWeight: "800", color: "#fff", marginBottom: "0.25rem" }}>{getGreeting()}, {firstName}!</div>
        <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)" }}>
          Manage your shop, mechanic, bookings & more.
        </div>
      </div>

      <div style={{ ...sh.content, paddingTop: "2rem", position: "relative", zIndex: 2 }} className="stagger-slide-up">

        {/* ALERT BANNERS */}
        {!isAdmin && pendingRequests.length > 0 && (
          <div className="owner-card" onClick={() => navigate("/mechanic/requests")} style={{ background: colors.white, borderRadius: "16px", padding: "16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: `1px solid ${colors.border}` }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: colors.warningBg, display: "flex", alignItems: "center", justifyContent: "center" }}><PulseDot color={colors.warning} size={12} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "15px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>{pendingRequests.length} unassigned request{pendingRequests.length > 1 ? "s" : ""}</div>
              <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500" }}>Tap to assign a mechanic</div>
            </div>
            <div style={{ color: colors.textMuted, fontSize: "20px" }}>›</div>
          </div>
        )}
        {!isAdmin && pendingBookings > 0 && (
          <div className="owner-card" onClick={() => navigate("/admin/bookings")} style={{ background: colors.white, borderRadius: "16px", padding: "16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: `1px solid ${colors.border}` }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center" }}><PulseDot color={colors.info} size={12} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "15px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>{pendingBookings} pending booking{pendingBookings > 1 ? "s" : ""}</div>
              <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500" }}>Tap to review and assign</div>
            </div>
            <div style={{ color: colors.textMuted, fontSize: "20px" }}>›</div>
          </div>
        )}
        {unreadAlerts > 0 && (
          <div className="owner-card" onClick={() => navigate("/admin/alerts")} style={{ background: colors.white, borderRadius: "16px", padding: "16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: `1px solid ${colors.border}` }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: colors.dangerBg, display: "flex", alignItems: "center", justifyContent: "center" }}><PulseDot color={colors.danger} size={12} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "15px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>{unreadAlerts} new system alert{unreadAlerts > 1 ? "s" : ""}</div>
              <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500" }}>Activity updates & more</div>
            </div>
            <div style={{ color: colors.textMuted, fontSize: "20px" }}>›</div>
          </div>
        )}
        {!isAdmin && newCarParts > 0 && (
          <div className="owner-card" onClick={handleCarPartsClick} style={{ background: colors.white, borderRadius: "16px", padding: "16px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: `1px solid ${colors.border}` }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: colors.successBg, display: "flex", alignItems: "center", justifyContent: "center" }}><PulseDot color={colors.success} size={12} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "15px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>{newCarParts} new car part order{newCarParts > 1 ? "s" : ""}</div>
              <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500" }}>Tap to review orders</div>
            </div>
            <div style={{ color: colors.textMuted, fontSize: "20px" }}>›</div>
          </div>
        )}

        {/* MONTHLY OVERVIEW */}
        {!isAdmin && (
          <>
            <SectionTitle title="Monthly Overview" />
            <div style={{ display: "flex", gap: "10px", marginBottom: "1rem", alignItems: "center" }}>
              <select value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))} style={{ padding: "12px 14px", borderRadius: "12px", border: `1.5px solid ${colors.border}`, fontSize: "13px", fontWeight: "600", background: colors.white, color: colors.textPrimary, fontFamily: "inherit", outline: "none", flex: 1 }}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select value={selYear} onChange={(e) => setSelYear(Number(e.target.value))} style={{ padding: "12px 14px", borderRadius: "12px", border: `1.5px solid ${colors.border}`, fontSize: "13px", fontWeight: "600", background: colors.white, color: colors.textPrimary, fontFamily: "inherit", outline: "none", flex: 1 }}>
                {[new Date().getFullYear() - 1, new Date().getFullYear()].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "1.5rem" }}>
              <div style={{ ...sh.card, display: "flex", alignItems: "center", gap: "20px", marginBottom: 0 }}>
                <div style={{
                  width: "140px", height: "70px", flexShrink: 0, position: "relative", overflow: "hidden",
                  display: "flex", alignItems: "flex-end", justifyContent: "center"
                }}>
                  <div style={{
                    position: "absolute", top: 0, left: 0, width: "140px", height: "140px", borderRadius: "50%",
                    background: fullGradient,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                  }} />
                  {totalCompletedThisMonth > 0 && <div className="gauge-chart-mask" style={{ "--card-bg": colors.white }} />}
                  <div className="gauge-needle" />
                  <div style={{
                    width: "90px", height: "45px", background: colors.white, borderRadius: "45px 45px 0 0",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                    paddingBottom: "6px", position: "relative", zIndex: 3, boxShadow: "inset 0 4px 8px rgba(0,0,0,0.05)"
                  }}>
                    <span style={{ fontSize: "24px", fontWeight: "800", color: colors.textPrimary, lineHeight: 1 }}>{totalCompletedThisMonth}</span>
                    <span style={{ fontSize: "9px", color: colors.textSecondary, fontWeight: "700", marginTop: "2px" }}>SERVICES</span>
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                  {topServices.length > 0 ? topServices.map((ts, i) => (
                    <div key={ts.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }}></div>
                        <span style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={ts.name}>{ts.name}</span>
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: colors.textPrimary, paddingLeft: "8px" }}>{ts.count}</span>
                    </div>
                  )) : (
                    <div style={{ fontSize: "12px", color: colors.textMuted }}>No services completed.</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <SectionTitle title="Shop Management" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "1.5rem" }}>
          {[
            isAdmin ? { id: "users", label: "Users", sub: pendingUsers.length > 0 ? `${pendingUsers.length} pending` : "Approve & manage", path: "/admin/users", badge: pendingUsers.length } : null,
            !isAdmin ? { id: "profile", label: "Shop Profile", sub: "View & Edit", onClick: () => navigate("/customer/shop-profile", { state: { shop: shopData || { ownerId: user?.uid || user?.id, name: user?.shopName || "My Shop" }, isOwner: true } }) } : null,
            !isAdmin ? { id: "mechanics", label: "Mechanic", sub: "Manage team", path: "/admin/mechanics" } : null,
            !isAdmin ? { id: "bookings", label: "Bookings", sub: pendingBookings > 0 ? `${pendingBookings} pending` : "Monitor services", path: "/admin/bookings", badge: pendingBookings } : null,
            !isAdmin ? { id: "reviews", label: "Reviews", sub: unreadReviewAlertsCount > 0 ? `${unreadReviewAlertsCount} new review${unreadReviewAlertsCount > 1 ? "s" : ""}` : "Read feedback", path: "/admin/reviews", badge: unreadReviewAlertsCount } : null,
            !isAdmin ? { id: "reports", label: "Reports", sub: "Analytics", path: "/admin/reports" } : null,
            !isAdmin ? { id: "parts", label: "All Parts", sub: newCarParts > 0 ? `${newCarParts} new today` : "Parts ordered", path: "/admin/carparts", badge: newCarParts } : null,
            !isAdmin ? { id: "order", label: "Order Parts", sub: "Record car parts", onClick: () => setShowPartsModal(true) } : null,
            { id: "post", label: "Post Update", sub: "Promote on feed", onClick: () => setShowPostModal(true) },
            { id: "feed", label: "Shop Feed", sub: "View community", path: "/customer/feed" },
            !isAdmin ? { id: "requests", label: "Requests", sub: pendingRequests.length > 0 ? `${pendingRequests.length} to assign` : "Visit requests", path: "/mechanic/requests", badge: pendingRequests.length } : null,
          ].filter(Boolean).map((item) => {
            const iconData = OWNER_ACTIONS[item.id] || { Icon: IcoFeed, iconColor: colors.navy, iconBg: colors.infoBg };
            const { Icon, iconColor, iconBg } = iconData;
            return (
              <div key={item.id} className="owner-card" style={{ background: colors.white, borderRadius: "20px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "12px", cursor: "pointer", border: `1px solid ${colors.border}`, position: "relative", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }} onClick={item.onClick || (() => navigate(item.path))}>
                {item.badge > 0 && <span style={{ position: "absolute", top: "12px", right: "12px", background: colors.danger, color: "#fff", fontSize: "11px", fontWeight: "800", borderRadius: "12px", padding: "3px 8px" }}>{item.badge}</span>}
                <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor }}>
                  <Icon />
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: colors.textPrimary, marginBottom: "2px" }}>{item.label}</div>
                  <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "500" }}>{item.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {isAdmin && (
          (() => {
            const totalU = users.length;
            const pendingU = pendingUsers.length;
            const approvedU = approvedUsers.length;
            const rejectedU = totalU - pendingU - approvedU;
            
            const userGradient = totalU > 0
              ? `conic-gradient(from 270deg,
                  ${colors.warning} 0% ${(pendingU / totalU) * 50}%,
                  ${colors.success} ${(pendingU / totalU) * 50}% ${((pendingU + approvedU) / totalU) * 50}%,
                  ${colors.danger} ${((pendingU + approvedU) / totalU) * 50}% 50%,
                  transparent 50%
                )`
              : `conic-gradient(from 270deg, ${colors.border} 0% 50%, transparent 50%)`;
  
            return (
              <>
                <SectionTitle title="System Overview" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "1.5rem" }}>
                  <div className="owner-card" style={{ ...sh.card, display: "flex", alignItems: "center", gap: "20px", marginBottom: 0 }}>
                    <div style={{
                      width: "120px", height: "60px", flexShrink: 0, position: "relative", overflow: "hidden",
                      display: "flex", alignItems: "flex-end", justifyContent: "center"
                    }}>
                      <div style={{
                        position: "absolute", top: 0, left: 0, width: "120px", height: "120px", borderRadius: "50%",
                        background: userGradient,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                      }} />
                      {totalU > 0 && <div className="gauge-chart-mask" style={{ "--card-bg": colors.white }} />}
                      <div className="gauge-needle" />
                      <div style={{
                        width: "80px", height: "40px", background: colors.white, borderRadius: "40px 40px 0 0",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                        paddingBottom: "4px", position: "relative", zIndex: 3, boxShadow: "inset 0 4px 8px rgba(0,0,0,0.05)"
                      }}>
                        <span style={{ fontSize: "20px", fontWeight: "800", color: colors.textPrimary, lineHeight: 1 }}>{totalU}</span>
                        <span style={{ fontSize: "8px", color: colors.textSecondary, fontWeight: "700", marginTop: "2px" }}>USERS</span>
                      </div>
                    </div>
  
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "12px", height: "12px", borderRadius: "4px", background: colors.warning }}></div>
                          <span style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "600" }}>Pending</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary }}>{pendingU}</span>
                          {pendingU > 0 && <PulseDot color={colors.warning} size={6} />}
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "12px", height: "12px", borderRadius: "4px", background: colors.success }}></div>
                          <span style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "600" }}>Approved</span>
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary }}>{approvedU}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "12px", height: "12px", borderRadius: "4px", background: colors.danger }}></div>
                          <span style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "600" }}>Rejected</span>
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: "800", color: colors.textPrimary }}>{rejectedU}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()
        )}

        {isAdmin && pendingUsers.length > 0 && (
          <>
            <SectionTitle title="Pending Approvals" badge={pendingUsers.length} />
            <div style={{ background: colors.white, borderRadius: "24px", border: `1px solid ${colors.border}`, boxShadow: "0 4px 24px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: "1.5rem" }}>
              {pendingUsers.map((u, i) => (
                <div key={u.id} className="owner-list-item" style={{ ...sh.rowItem, padding: "16px", borderBottom: i === pendingUsers.length - 1 ? "none" : `1px solid #f1f5f9` }}>
                  <div style={{ width: "42px", height: "42px", borderRadius: "14px", background: colors.warningBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "800", color: colors.warning, flexShrink: 0, marginRight: "12px" }}>{getInitials(u.displayName || u.email || "U")}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "800", fontSize: "15px", color: colors.textPrimary, marginBottom: "2px" }}>{u.displayName || u.email?.split("@")[0] || "No name"}</div>
                    <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500" }}>{u.email}</div>
                  </div>
                  <span style={{ ...roleStyle(u.role), padding: "4px 10px", borderRadius: "8px", fontSize: "12px" }}>{u.role || "User"}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {isAdmin && (
          <>
            <SectionTitle title="Active Users" />
            <div style={{ background: colors.white, borderRadius: "24px", border: `1px solid ${colors.border}`, boxShadow: "0 4px 24px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: "1.5rem" }}>
              {approvedUsers.length === 0 ? (
                <div style={{ padding: "24px", fontSize: "14px", color: colors.textMuted, textAlign: "center" }}>No active users yet.</div>
              ) : approvedUsers.map((u, i) => (
                <div key={u.id} className="owner-list-item" style={{ ...sh.rowItem, padding: "16px", borderBottom: i === approvedUsers.length - 1 ? "none" : `1px solid #f1f5f9` }}>
                  <div style={{ width: "42px", height: "42px", borderRadius: "14px", background: colors.infoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "800", color: colors.info, flexShrink: 0, marginRight: "12px" }}>{getInitials(u.displayName || u.email || "U")}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "800", fontSize: "15px", color: colors.textPrimary, marginBottom: "2px" }}>{u.displayName || u.email?.split("@")[0] || "No name"}</div>
                    <div style={{ fontSize: "13px", color: colors.textSecondary, fontWeight: "500" }}>{u.email}</div>
                  </div>
                  <span style={{ ...roleStyle(u.role), padding: "4px 10px", borderRadius: "8px", fontSize: "12px" }}>{u.role || "User"}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* MODALS */}
      {showPartsModal && <CarPartsModal user={user} mechanics={mechanics} onClose={() => setShowPartsModal(false)} onSaved={handlePartSaved} shopId={user?.shopId} />}

      {/* CREATE POST MODAL */}
      {showPostModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 110, display: "flex", alignItems: "flex-end", animation: "ab-fade-in 0.2s ease-out" }} onClick={resetPostModal}>
          <div style={{ background: colors.white, borderRadius: "28px 28px 0 0", width: "100%", padding: "2rem 1.5rem", maxHeight: "90vh", overflowY: "auto", animation: "ab-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards", boxShadow: "0 -4px 24px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontWeight: "800", fontSize: "18px", color: colors.navy }}>📢 Create Shop Post</div>
              <button onClick={resetPostModal} style={{ background: colors.bg, border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", cursor: "pointer", color: colors.textSecondary }}>×</button>
            </div>

            {/* Error banner */}
            {postError && (
              <div style={{ background: colors.dangerBg, border: `1px solid ${colors.danger}`, borderRadius: "12px", padding: "10px 14px", fontSize: "13px", color: colors.danger, marginBottom: "1rem", fontWeight: "600" }}>
                ❌ {postError}
              </div>
            )}

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Post Content</div>
              <textarea
                style={{ width: "100%", padding: "14px 16px", borderRadius: "14px", border: `1.5px solid ${colors.border}`, fontSize: "14px", background: "#f9fafb", color: colors.textPrimary, fontFamily: "inherit", boxSizing: "border-box", outline: "none", minHeight: "100px", resize: "vertical" }}
                placeholder="What's new? Share promos, available services, or shop updates..."
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <input type="file" id="postImageUpload" accept="image/*" style={{ display: "none" }} onChange={handlePostImageChange} />
              {postImagePreview ? (
                <div style={{ position: "relative", width: "100%", borderRadius: "14px", overflow: "hidden", border: `1.5px solid ${colors.border}`, background: colors.bg }}>
                  <img src={postImagePreview} alt="Preview" style={{ width: "100%", height: "auto", maxHeight: "250px", objectFit: "contain", display: "block" }} />
                  <button onClick={() => { setPostImageFile(null); setPostImagePreview(null); }} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "16px" }}>×</button>
                </div>
              ) : (
                <button onClick={() => document.getElementById("postImageUpload").click()} style={{ width: "100%", padding: "14px", borderRadius: "14px", border: `1.5px dashed ${colors.border}`, background: colors.bg, color: colors.textSecondary, fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <span style={{ fontSize: "18px" }}>📷</span> Add Photo (optional)
                </button>
              )}
            </div>

            <button onClick={handleCreatePost} disabled={posting || (!postContent.trim() && !postImageFile)} style={{ width: "100%", padding: "16px", background: colors.blue, color: "#fff", border: "none", borderRadius: "16px", fontSize: "16px", fontWeight: "800", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", boxShadow: "0 8px 20px rgba(42, 82, 152, 0.25)", transition: "all 0.2s", opacity: posting || (!postContent.trim() && !postImageFile) ? 0.6 : 1 }}>
              {posting ? "Publishing..." : "✓ Publish Post"}
            </button>
            <div style={{ height: "12px" }} />
            <button onClick={resetPostModal} style={{ width: "100%", padding: "16px", borderRadius: "16px", fontSize: "15px", border: "none", background: "transparent", color: colors.textSecondary, fontWeight: "700", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}
          </div>
  );
}
