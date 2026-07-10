import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sh, colors, getInitials } from "./dashboardShared";
import { useUser } from "../UserContext";
import BackButton from "../components/BackButton";

const CLOUDINARY_CLOUD = "dpwojan8w";
const CLOUDINARY_PRESET = "autobook_uploads";

function isEmail(str) {
  return typeof str === "string" && str.includes("@");
}

function resolveName(a, b) {
  if (a && !isEmail(a)) return a;
  if (b && !isEmail(b)) return b;
  return "User";
}

const emptyCert = () => ({
  name: "", issuingBody: "", date: "",
  photoURL: "", photoFile: null, localPreview: null,
});

// Upload a file to Cloudinary and return the secure URL
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
    throw new Error(`Cloudinary upload failed: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { refreshUserProfile } = useUser();

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const [error, setError] = useState("");

  const [uid, setUid] = useState("");
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [shopName, setShopName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [localPhotoPreview, setLocalPhotoPreview] = useState(null);
  const [certs, setCerts] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate("/"); return; }
      setUid(user.uid);
      setEmail(user.email || "");
      setPhotoURL(user.photoURL || "");
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setName(resolveName(d.displayName, user.displayName));
        setRole(d.role || "Customer");
        setPhone(d.phone || "");
        setAddress(d.address || "");
        setPhotoURL(d.photoURL || user.photoURL || "");
        setShopName(d.shopName || d.shopId || "");
        setCerts(d.certifications || []);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(false), 2500);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setLocalPhotoPreview(URL.createObjectURL(file));
  };

  const handleCertPhotoChange = (e, idx) => {
    const file = e.target.files[0];
    if (!file) return;
    const updated = [...certs];
    updated[idx] = { ...updated[idx], photoFile: file, localPreview: URL.createObjectURL(file) };
    setCerts(updated);
  };

  const addCert = () => setCerts([...certs, emptyCert()]);
  const removeCert = (idx) => setCerts(certs.filter((_, i) => i !== idx));
  const updateCert = (idx, field, value) => {
    const updated = [...certs];
    updated[idx] = { ...updated[idx], [field]: value };
    setCerts(updated);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Full name cannot be empty."); return; }
    setError("");
    setSaving(true);
    try {
      let finalPhotoURL = photoURL;

      if (photoFile) {
        finalPhotoURL = await uploadToCloudinary(photoFile);
      }

      const resolvedCerts = await Promise.all(
        certs.map(async (cert, idx) => {
          let certPhotoURL = cert.photoURL || "";
          if (cert.photoFile) {
            certPhotoURL = await uploadToCloudinary(cert.photoFile);
          }
          return { name: cert.name, issuingBody: cert.issuingBody, date: cert.date, photoURL: certPhotoURL };
        })
      );

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: name.trim(),
          photoURL: finalPhotoURL || auth.currentUser.photoURL || "",
        });
      }

      await updateDoc(doc(db, "users", uid), {
        displayName: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        photoURL: finalPhotoURL,
        certifications: resolvedCerts,
      });

      setPhotoURL(finalPhotoURL);
      setPhotoFile(null);
      setLocalPhotoPreview(null);
      setCerts(resolvedCerts.map((c) => ({ ...c, photoFile: null, localPreview: null })));
      setEditing(false);
      await refreshUserProfile(); // update avatar globally across all screens
      showToast("Profile saved!");
    } catch (err) {
      // Show the real error message so you know exactly what's wrong
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", fontSize: "14px",
    border: `1.5px solid ${colors.border}`, borderRadius: "10px",
    outline: "none", background: colors.bg, color: colors.textPrimary,
    boxSizing: "border-box", fontFamily: "inherit",
    transition: "border-color 0.2s",
  };

  const handleLogout = async () => {
    const { signOut } = await import("firebase/auth");
    await signOut(auth);
    navigate("/");
  };

  const displayPhoto = localPhotoPreview || photoURL;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: colors.bg }}>
        <p style={{ color: colors.textMuted, fontFamily: "'Segoe UI', sans-serif" }}>Loading…</p>
      </div>
    );
  }

  const getRoleColor = (r) => {
    const roleLower = (r || "").toLowerCase();
    if (roleLower === "owner") return { bg: "rgba(249, 115, 22, 0.15)", border: "rgba(249, 115, 22, 0.4)", text: colors.orange };
    if (roleLower === "mechanic") return { bg: "rgba(22, 163, 74, 0.15)", border: "rgba(22, 163, 74, 0.4)", text: colors.success };
    return { bg: "rgba(70, 233, 255, 0.15)", border: "rgba(70, 233, 255, 0.4)", text: colors.accent };
  };
  const roleStyle = getRoleColor(role);

  return (
    <div style={{ ...sh.page, position: "relative" }}>
      <style>
        {`
          @keyframes slideUpFade {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .profile-avatar-wrap {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
          }
          .profile-avatar-wrap:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          }
          .profile-camera-overlay {
            opacity: 0;
            transition: opacity 0.2s ease;
          }
          .profile-avatar-wrap:hover .profile-camera-overlay {
            opacity: 1;
          }
          .profile-save-btn {
            background-size: 200% auto;
            transition: all 0.3s ease;
          }
          .profile-save-btn:hover:not(:disabled) {
            background-position: right center;
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(42, 82, 152, 0.25);
          }
          .profile-save-btn:active:not(:disabled) {
            transform: translateY(0);
          }
          .profile-danger-btn {
            transition: all 0.2s ease;
          }
          .profile-danger-btn:hover {
            background: ${colors.danger} !important;
            color: #fff !important;
          }
          .profile-card {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .profile-input-row {
            animation: slideUpFade 0.3s ease backwards;
          }
          .profile-edit-btn {
            transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
          }
          .profile-edit-btn:active {
            transform: scale(0.95);
          }
        `}
      </style>

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <BackButton />
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
        <button
          className="profile-edit-btn"
          onClick={() => { setEditing(!editing); setError(""); }}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: editing ? "rgba(255,255,255,0.15)" : colors.accent,
            border: "none",
            color: editing ? "#fff" : colors.navy,
            fontSize: "13px", fontWeight: "700",
            padding: "8px 16px", borderRadius: "24px", cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: editing ? "none" : "0 4px 12px rgba(70, 233, 255, 0.2)",
          }}
        >
          {editing ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              Edit
            </>
          )}
        </button>
      </div>

      {/* HERO */}
      <div style={{ 
        background: `linear-gradient(145deg, #0f2640 0%, #1a3a5c 40%, #2a5298 100%)`, 
        padding: "1.5rem 1.25rem 3rem", 
        alignItems: "center", display: "flex", flexDirection: "column", 
        borderBottomLeftRadius: "32px", borderBottomRightRadius: "32px",
        boxShadow: "0 10px 30px rgba(15, 38, 64, 0.15)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Subtle geometric pattern overlay */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: "radial-gradient(circle at 15% 50%, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(circle at 85% 30%, rgba(70,233,255,0.04) 0%, transparent 50%)",
          pointerEvents: "none", zIndex: 0
        }} />

        <div style={{ position: "relative", marginBottom: "16px", zIndex: 1 }} className={editing ? "profile-avatar-wrap" : ""}>
          <div
            onClick={editing ? () => fileInputRef.current?.click() : undefined}
            style={{
              width: "92px", height: "92px", borderRadius: "50%",
              border: `3px solid rgba(255,255,255,0.3)`,
              overflow: "hidden",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "28px", fontWeight: "700", color: "#fff",
              cursor: editing ? "pointer" : "default", flexShrink: 0,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              position: "relative"
            }}
          >
            {displayPhoto
              ? <img src={displayPhoto} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span>{getInitials(name)}</span>
            }
            {editing && (
              <div className="profile-camera-overlay" style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(0,0,0,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              </div>
            )}
          </div>
          {editing && (
            <div style={{ position: "absolute", bottom: "2px", right: "2px", background: colors.navy, width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid #ffffff`, pointerEvents: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.2)", animation: "ab-zoom-in 0.3s ease backwards" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </div>
          )}
        </div>

        {editing && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
          </>
        )}

        <div style={{...sh.heroGreeting, zIndex: 1, textShadow: "0 2px 4px rgba(0,0,0,0.1)"}}>{name}</div>
        <div style={{ ...sh.heroSub, marginBottom: "12px", zIndex: 1, opacity: 0.9 }}>{email}</div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: roleStyle.bg, border: `1px solid ${roleStyle.border}`,
          borderRadius: "20px", padding: "4px 12px", marginBottom: "0.5rem",
          zIndex: 1, backdropFilter: "blur(4px)"
        }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: roleStyle.text }} />
          <span style={{ fontSize: "11px", color: roleStyle.text, fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            {role}{(role || "").toLowerCase() === "owner" && shopName ? ` · ${shopName}` : ""}
          </span>
        </div>
      </div>

      <div style={sh.content}>

        {/* ERROR */}
        {error && (
          <div style={{
            background: colors.dangerBg, border: `1px solid ${colors.danger}`,
            borderRadius: "12px", padding: "10px 14px", fontSize: "13px",
            color: colors.danger, marginBottom: "1rem",
            display: "flex", alignItems: "flex-start", gap: "8px",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: colors.danger, flexShrink: 0, display: "inline-block", marginTop: "5px" }} />
            <span>{error}</span>
          </div>
        )}

        {/* PROFILE DETAILS */}
        <div style={sh.sectionLabel}>Profile details</div>
        <div className="profile-card" style={{ ...sh.card, padding: 0, overflow: "hidden", borderRadius: "20px", boxShadow: "0 8px 24px rgba(0,0,0,0.03)", marginBottom: "20px", border: `1px solid ${colors.border}` }}>
          
          <div className="profile-input-row" style={{ padding: "20px", borderBottom: `1px solid ${colors.border}`, animationDelay: "0.05s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ color: colors.blue, display: "flex", background: "rgba(42, 82, 152, 0.1)", padding: "6px", borderRadius: "8px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </span>
              <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Full name
              </div>
            </div>
            <div style={{ paddingLeft: "42px" }}>
              {editing
                ? <input style={{ ...inputStyle, background: "#f8fafc" }} value={name} onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))} placeholder="Full name" />
                : <div style={{ fontSize: "16px", color: colors.textPrimary, fontWeight: "600" }}>{name}</div>
              }
            </div>
          </div>

        </div>

        {/* CONTACT DETAILS */}
        <div style={sh.sectionLabel}>Contact information</div>
        <div className="profile-card" style={{ ...sh.card, padding: 0, overflow: "hidden", borderRadius: "20px", boxShadow: "0 8px 24px rgba(0,0,0,0.03)", marginBottom: "20px", border: `1px solid ${colors.border}` }}>

          {/* Email */}
          <div className="profile-input-row" style={{ padding: "20px", borderBottom: `1px solid ${colors.border}`, animationDelay: "0.1s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ color: colors.blue, display: "flex", background: "rgba(42, 82, 152, 0.1)", padding: "6px", borderRadius: "8px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </span>
              <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Email
              </div>
            </div>
            <div style={{ paddingLeft: "42px" }}>
              <div style={{ fontSize: "16px", color: colors.textPrimary, fontWeight: "500" }}>{email}</div>
              <div style={{ fontSize: "12px", color: colors.textMuted, marginTop: "2px" }}>Email cannot be changed here</div>
            </div>
          </div>

          {/* Phone */}
          <div className="profile-input-row" style={{ padding: "20px", animationDelay: "0.15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ color: colors.blue, display: "flex", background: "rgba(42, 82, 152, 0.1)", padding: "6px", borderRadius: "8px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </span>
              <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Contact number
              </div>
            </div>
            <div style={{ paddingLeft: "42px" }}>
              {editing
                ? <input style={{ ...inputStyle, background: "#f8fafc" }} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="+63 9XX XXX XXXX" type="tel" />
                : <div style={{ fontSize: "16px", color: phone ? colors.textPrimary : colors.textMuted, fontStyle: phone ? "normal" : "italic", fontWeight: phone ? "500" : "normal" }}>{phone || "Not set"}</div>
              }
            </div>
          </div>
        </div>

        {/* LOCATION & BUSINESS */}
        <div style={sh.sectionLabel}>Location & Business</div>
        <div className="profile-card" style={{ ...sh.card, padding: 0, overflow: "hidden", borderRadius: "20px", boxShadow: "0 8px 24px rgba(0,0,0,0.03)", marginBottom: "24px", border: `1px solid ${colors.border}` }}>

          {/* Shop Name (Owners only) */}
          {(role || "").toLowerCase() === "owner" && shopName && (
            <div className="profile-input-row" style={{ padding: "20px", borderBottom: `1px solid ${colors.border}`, animationDelay: "0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ color: colors.orange, display: "flex", background: "rgba(249, 115, 22, 0.1)", padding: "6px", borderRadius: "8px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </span>
                <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Shop Name
                </div>
              </div>
              <div style={{ paddingLeft: "42px" }}>
                <div style={{ fontSize: "16px", color: colors.textPrimary, fontWeight: "600" }}>{shopName}</div>
                <div style={{ fontSize: "12px", color: colors.textMuted, marginTop: "2px" }}>Your registered shop</div>
              </div>
            </div>
          )}

          {/* Address */}
          <div className="profile-input-row" style={{ padding: "20px", animationDelay: "0.25s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ color: colors.blue, display: "flex", background: "rgba(42, 82, 152, 0.1)", padding: "6px", borderRadius: "8px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </span>
              <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Address
              </div>
            </div>
            <div style={{ paddingLeft: "42px" }}>
              {editing
                ? <input style={{ ...inputStyle, background: "#f8fafc" }} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, Province" />
                : <div style={{ fontSize: "16px", color: address ? colors.textPrimary : colors.textMuted, fontStyle: address ? "normal" : "italic", fontWeight: address ? "500" : "normal" }}>{address || "Not set"}</div>
              }
            </div>
          </div>
        </div>

        {/* SAVE BUTTON */}
        {editing && (
          <button
            className="profile-save-btn profile-input-row"
            style={{ 
              width: "100%", padding: "16px",
              background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.blue} 50%, #4facfe 100%)`,
              color: "#fff", fontSize: "15px", fontWeight: "700",
              border: "none", borderRadius: "16px", cursor: "pointer", 
              fontFamily: "inherit", marginBottom: "20px",
              opacity: saving ? 0.75 : 1,
              animationDelay: "0.3s"
            }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        )}

        {/* SIGN OUT */}
        <div style={sh.sectionLabel}>Account</div>
        <div className="profile-card" style={{ ...sh.card, padding: 0, borderRadius: "20px", border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.03)" }}>
          <button
            className="profile-danger-btn"
            style={{
              width: "100%", padding: "16px",
              background: "rgba(220, 38, 38, 0.08)", color: colors.danger,
              fontSize: "15px", fontWeight: "700",
              border: `1px solid rgba(220, 38, 38, 0.2)`,
              borderRadius: "20px", cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
            onClick={handleLogout}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>

      </div>
      
      {/* TOAST */}
      <div
        style={{
          position: "fixed", bottom: "24px", left: "50%",
          transform: toast ? "translate(-50%, 0)" : "translate(-50%, 80px)",
          background: colors.navy, color: "#fff",
          padding: "10px 20px", borderRadius: "20px",
          fontSize: "13px", fontWeight: "600",
          transition: "transform 0.3s ease", zIndex: 100,
          whiteSpace: "nowrap",
        }}
      >
        {toast}
      </div>
    </div>
  );
}